import Setting from "../models/setting.js";

/** Defaults used when the settings document has no serviceArea yet. Keep in sync with the frontend. */
export const DEFAULT_SERVICE_AREA = Object.freeze({
  isEnabled: true,
  cityName: "Nagpur",
  centerLat: 21.1458,
  centerLng: 79.0882,
  radiusKm: 25,
  message: "Only available in Nagpur",
});

const CACHE_MS = 30 * 1000;
let cached = null;
let cachedAt = 0;

export function clearServiceAreaCache() {
  cached = null;
  cachedAt = 0;
}

export function normalizeServiceArea(raw) {
  const a = { ...DEFAULT_SERVICE_AREA, ...(raw || {}) };
  return {
    isEnabled: a.isEnabled !== false,
    cityName: String(a.cityName || DEFAULT_SERVICE_AREA.cityName),
    centerLat: Number.isFinite(Number(a.centerLat)) ? Number(a.centerLat) : DEFAULT_SERVICE_AREA.centerLat,
    centerLng: Number.isFinite(Number(a.centerLng)) ? Number(a.centerLng) : DEFAULT_SERVICE_AREA.centerLng,
    radiusKm: Number(a.radiusKm) > 0 ? Number(a.radiusKm) : DEFAULT_SERVICE_AREA.radiusKm,
    message: String(a.message || DEFAULT_SERVICE_AREA.message),
  };
}

export async function getServiceArea({ session = null } = {}) {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;
  const q = Setting.findOne({ $or: [{ tenantId: null }, { tenantId: { $exists: false } }] })
    .select("serviceArea")
    .lean();
  if (session) q.session(session);
  const doc = await q;
  cached = normalizeServiceArea(doc?.serviceArea);
  cachedAt = Date.now();
  return cached;
}

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Pure check. Unknown coordinates are not blocked here (other checks require a location). */
export function checkServiceArea(area, lat, lng) {
  const a = normalizeServiceArea(area);
  if (!a.isEnabled) return { ok: true, area: a };
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return { ok: true, area: a, unknown: true };
  const d = distanceKm(Number(lat), Number(lng), a.centerLat, a.centerLng);
  return { ok: d <= a.radiusKm, distanceKm: Math.round(d * 10) / 10, area: a };
}

/** Throws a 400 when the delivery location is outside the service area. */
export async function assertInServiceArea(location, { session = null } = {}) {
  const area = await getServiceArea({ session });
  const result = checkServiceArea(area, location?.lat, location?.lng);
  if (!result.ok) {
    const err = new Error(area.message);
    err.statusCode = 400;
    err.code = "OUTSIDE_SERVICE_AREA";
    throw err;
  }
  return result;
}
