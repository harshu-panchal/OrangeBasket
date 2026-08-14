import Category from "../models/category.js";
import Seller from "../models/seller.js";
import Warehouse from "../models/warehouse.js";
import { buildKey, getOrSet, getTTL, invalidate } from "./cacheService.js";

/**
 * Resolve a category name by ID (cache-backed, 1-hour TTL).
 * @param {string|ObjectId} id
 * @returns {Promise<string|null>}
 */
export async function resolveCategoryName(id) {
  if (!id) return null;
  const key = buildKey("catalog", "categoryName", String(id));
  const cat = await getOrSet(
    key,
    () => Category.findById(id).select("name").lean(),
    getTTL("categoryName"),
  );
  return cat?.name ?? null;
}

/**
 * Resolve a seller shop name by ID (cache-backed, 1-hour TTL).
 * @param {string|ObjectId} id
 * @returns {Promise<string|null>}
 */
export async function resolveSellerName(id) {
  if (!id) return null;
  const key = buildKey("catalog", "sellerName", String(id));
  const seller = await getOrSet(
    key,
    () => Seller.findById(id).select("shopName").lean(),
    getTTL("categoryName"), // same 1-hour TTL
  );
  return seller?.shopName ?? null;
}

/**
 * Resolve a warehouse name by ID (cache-backed, 1-hour TTL).
 * @param {string|ObjectId} id
 * @returns {Promise<string|null>}
 */
export async function resolveWarehouseName(id) {
  if (!id) return null;
  const key = buildKey("catalog", "warehouseName", String(id));
  const warehouse = await getOrSet(
    key,
    () => Warehouse.findById(id).select("name").lean(),
    getTTL("categoryName"), // same 1-hour TTL
  );
  return warehouse?.name ?? null;
}

/**
 * Invalidate the cached category name for a given ID.
 * @param {string|ObjectId} id
 */
export async function invalidateCategoryName(id) {
  await invalidate(buildKey("catalog", "categoryName", String(id)));
}

/**
 * Invalidate the cached seller name for a given ID.
 * @param {string|ObjectId} id
 */
export async function invalidateSellerName(id) {
  await invalidate(buildKey("catalog", "sellerName", String(id)));
}
