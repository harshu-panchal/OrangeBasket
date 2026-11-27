/**
 * Helpers to track a rider's progress along a road route (encoded polyline).
 * Used by the delivery and customer panels to trim the drawn route and to
 * compute a live ETA without calling the Directions API on every GPS tick.
 */

/** Decode a Google encoded polyline into [{ lat, lng }]. */
export function decodePolyline(encoded) {
  if (typeof encoded !== "string" || !encoded) return [];
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let b;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Project p onto segment a→b (local flat approximation, fine at city scale). */
function projectOnSegment(p, a, b) {
  const kx = Math.cos(rad(p.lat)) * R * (Math.PI / 180);
  const ky = R * (Math.PI / 180);
  const ax = (a.lng - p.lng) * kx;
  const ay = (a.lat - p.lat) * ky;
  const bx = (b.lng - p.lng) * kx;
  const by = (b.lat - p.lat) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return {
    t,
    dist: Math.sqrt(px * px + py * py),
    point: { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) },
  };
}

/**
 * Where is `point` on `path`?
 * Returns { snapped, segmentIndex, offRouteMeters, remainingMeters, totalMeters, remainingPath }
 * or null when the path is unusable.
 */
export function routeProgress(path, point) {
  if (!Array.isArray(path) || path.length < 2 || !point) return null;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;

  let best = null;
  for (let i = 0; i < path.length - 1; i++) {
    const proj = projectOnSegment(point, path[i], path[i + 1]);
    if (!best || proj.dist < best.dist) best = { ...proj, i };
  }

  let totalMeters = 0;
  let remainingMeters = haversine(best.point, path[best.i + 1]);
  for (let i = 0; i < path.length - 1; i++) {
    const seg = haversine(path[i], path[i + 1]);
    totalMeters += seg;
    if (i > best.i) remainingMeters += seg;
  }

  return {
    snapped: best.point,
    segmentIndex: best.i,
    offRouteMeters: best.dist,
    remainingMeters,
    totalMeters,
    remainingPath: [best.point, ...path.slice(best.i + 1)],
  };
}

/**
 * Remaining seconds, scaling the Directions duration by the share of the route left.
 * Falls back to null when there is no usable duration.
 */
export function remainingDurationSeconds(durationSeconds, progress) {
  const d = Number(durationSeconds);
  if (!Number.isFinite(d) || d <= 0 || !progress || !(progress.totalMeters > 0)) {
    return null;
  }
  return d * (progress.remainingMeters / progress.totalMeters);
}
