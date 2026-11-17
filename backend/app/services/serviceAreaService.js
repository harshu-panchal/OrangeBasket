import Setting from "../models/setting.js";

/**
 * Default when nothing is configured. Keep in sync with frontend SettingsDefaults.js
 * Centred on the "orangebasket warehouse" with its 20 km delivery radius, so the
 * area where the app opens is exactly the area that warehouse delivers to.
 */
export const DEFAULT_CITY = Object.freeze({
  name: "Nagpur",
  centerLat: 21.173187,
  centerLng: 79.128415,
  radiusKm: 20,
  isActive: true,
});

export const DEFAULT_SERVICE_AREA = Object.freeze({
  isEnabled: true,
  cities: [DEFAULT_CITY],
  customMessage: "",
});

const CACHE_MS = 30 * 1000;
let cached = null;
let cachedAt = 0;

export function clearServiceAreaCache() {
  cached = null;
  cachedAt = 0;
}

function normalizeCity(c) {
  const lat = Number(c?.centerLat);
  const lng = Number(c?.centerLng);
  const radius = Number(c?.radiusKm);
  const name = String(c?.name || "").trim();
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || !(radius > 0)) return null;
  return { name, centerLat: lat, centerLng: lng, radiusKm: radius, isActive: c?.isActive !== false };
}

/**
 * Normalizes stored settings into { isEnabled, cities[], customMessage, message }.
 * - Missing settings → Nagpur default.
 * - Legacy single-city shape (cityName/centerLat/...) → converted into one city.
 */
export function normalizeServiceArea(raw) {
  const r = raw || {};
  let cities;
  if (Array.isArray(r.cities) && r.cities.length) {
    cities = r.cities.map(normalizeCity).filter(Boolean);
  } else if (r.cityName || Number.isFinite(Number(r.centerLat))) {
    const legacy = normalizeCity({
      name: r.cityName || DEFAULT_CITY.name,
      centerLat: r.centerLat ?? DEFAULT_CITY.centerLat,
      centerLng: r.centerLng ?? DEFAULT_CITY.centerLng,
      radiusKm: r.radiusKm ?? DEFAULT_CITY.radiusKm,
      isActive: true,
    });
    cities = legacy ? [legacy] : [{ ...DEFAULT_CITY }];
  } else {
    cities = [{ ...DEFAULT_CITY }];
  }

  const customMessage = String(r.customMessage || "").trim();
  const area = {
    isEnabled: r.isEnabled !== false,
    cities,
    customMessage,
  };
  area.message = buildServiceAreaMessage(area);
  return area;
}

/** "Only available in Nagpur" / "Only available in Nagpur and Pune" / "Only available in A, B and C" */
export function buildServiceAreaMessage(area) {
  if (area?.customMessage) return area.customMessage;
  const names = (area?.cities || []).filter((c) => c.isActive !== false).map((c) => c.name);
  if (!names.length) return "Delivery is currently not available";
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Only available in ${list}`;
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

/** Pure check against all active cities. Unknown coordinates are not blocked here. */
export function checkServiceArea(area, lat, lng) {
  const a = area?.cities ? area : normalizeServiceArea(area);
  if (!a.isEnabled) return { ok: true, area: a };
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return { ok: true, area: a, unknown: true };
  for (const city of a.cities) {
    if (city.isActive === false) continue;
    const d = distanceKm(Number(lat), Number(lng), city.centerLat, city.centerLng);
    if (d <= city.radiusKm) return { ok: true, city: city.name, distanceKm: Math.round(d * 10) / 10, area: a };
  }
  return { ok: false, area: a };
}

/** Throws a 400 when the delivery location is outside every active service city. */
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
