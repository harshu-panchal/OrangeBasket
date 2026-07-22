import Seller from "../models/seller.js";
import Warehouse from "../models/warehouse.js";
import { calculateDistance } from "../utils/helper.js";
import { buildKey, getOrSet, getTTL } from "./cacheService.js";

const MAX_SELLER_SEARCH_DISTANCE_M = 100000;

export function parseCustomerCoordinates(query = {}) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, lat: null, lng: null };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, lat: null, lng: null };
  }

  return { valid: true, lat, lng };
}

/**
 * Round lat/lng to 4 decimal places (~11m precision) for cache key.
 * This groups nearby requests into the same cache bucket.
 */
function buildNearbySellersKey(lat, lng) {
  const rLat = Number(lat).toFixed(4);
  const rLng = Number(lng).toFixed(4);
  return buildKey("sellers", "nearby", `${rLat}:${rLng}`);
}

export async function getNearbySellerIdsForCustomer(lat, lng) {
  const fetchFn = async () => {
    const [sellers, warehouses] = await Promise.all([
      Seller.find({
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
            $maxDistance: MAX_SELLER_SEARCH_DISTANCE_M,
          },
        },
      })
        .select("_id location serviceRadius")
        .lean(),
      Warehouse.find({
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
            $maxDistance: MAX_SELLER_SEARCH_DISTANCE_M,
          },
        },
      })
        .select("_id location serviceRadius")
        .lean()
    ]);

    const allEntities = [...sellers, ...warehouses];

    return allEntities
      .filter((entity) => {
        const coords = entity?.location?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return false;
        const [entityLng, entityLat] = coords;
        if (!Number.isFinite(entityLat) || !Number.isFinite(entityLng)) {
          return false;
        }
        const distanceKm = calculateDistance(lat, lng, entityLat, entityLng);
        return distanceKm <= (entity.serviceRadius || 5);
      })
      .map((entity) => String(entity._id));
  };

  return getOrSet(buildNearbySellersKey(lat, lng), fetchFn, getTTL("nearbySellers"));
}

