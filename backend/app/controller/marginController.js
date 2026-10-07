/**
 * marginController.js
 * Warehouse-only margin management (default / subcategory / brand margins)
 * and brand CRUD. All handlers act on the authenticated warehouse's own data.
 */
import { handleResponse } from "../utils/helper.js";
import Brand from "../models/brand.js";
import Category from "../models/category.js";
import Product from "../models/product.js";
import WarehouseMargin from "../models/warehouseMargin.js";
import {
  MarginError,
  getMarginConfig,
  parseMargin,
  recalculateWarehousePrices,
  resolveMargin,
} from "../services/marginService.js";
import { buildKey, invalidate } from "../services/cacheService.js";
import logger from "../services/logger.js";

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

// Margin input rules: blank => clear (null), otherwise 0-1000 %.
const readMargin = (value, { allowBlank }) => {
  const parsed = parseMargin(value);
  if (parsed === null) {
    if (!allowBlank) throw new MarginError("Margin is required");
    return null;
  }
  if (Number.isNaN(parsed) || parsed > 1000) {
    throw new MarginError("Margin must be a number between 0 and 1000");
  }
  return parsed;
};

const fail = (res, error, fallback = "Request failed") => {
  if (error instanceof MarginError) return handleResponse(res, 400, error.message);
  if (error?.code === 11000) return handleResponse(res, 400, "A brand with this name already exists");
  logger.error(fallback, { scope: "marginController", error });
  return handleResponse(res, 500, error.message || fallback);
};

const invalidateProductCaches = async () => {
  try {
    await invalidate(buildKey("catalog", "productList", "*"));
    await invalidate("cache:catalog:product:*");
  } catch (error) {
    logger.error("Cache invalidation error", { scope: "marginController", error });
  }
};

/* ============ MARGINS ============ */

// GET /api/warehouse/margins
export const getMargins = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const [config, brands] = await Promise.all([
      getMarginConfig(warehouseId),
      Brand.find({ warehouseId }).sort({ name: 1 }).lean(),
    ]);
    return handleResponse(res, 200, "Margins fetched", {
      defaultMargin: config.defaultMargin,
      subcategoryMargins: config.subcategoryMargins,
      brandMargins: brands.map((b) => ({ brandId: b._id, name: b.name, margin: b.margin })),
    });
  } catch (error) {
    return fail(res, error, "Failed to fetch margins");
  }
};

// PUT /api/warehouse/margins/default  { margin }
export const setDefaultMargin = async (req, res) => {
  try {
    const margin = readMargin(req.body.margin, { allowBlank: false });
    const doc = await WarehouseMargin.findOneAndUpdate(
      { warehouseId: req.user.id },
      { $set: { defaultMargin: margin } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return handleResponse(res, 200, "Default margin saved", { defaultMargin: doc.defaultMargin });
  } catch (error) {
    return fail(res, error, "Failed to save default margin");
  }
};

// PUT /api/warehouse/margins/subcategory/:subcategoryId  { margin }  (blank clears)
export const setSubcategoryMargin = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const { subcategoryId } = req.params;
    if (!isObjectId(subcategoryId)) return handleResponse(res, 400, "Invalid subcategory");

    const subcategory = await Category.findOne({ _id: subcategoryId, type: "subcategory" })
      .select("_id")
      .lean();
    if (!subcategory) return handleResponse(res, 404, "Subcategory not found");

    const margin = readMargin(req.body.margin, { allowBlank: true });

    // Remove any existing entry first, then push the new value (keeps one entry per subcategory)
    await WarehouseMargin.updateOne(
      { warehouseId },
      { $pull: { subcategoryMargins: { subcategoryId } } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    if (margin !== null) {
      await WarehouseMargin.updateOne(
        { warehouseId },
        { $push: { subcategoryMargins: { subcategoryId, margin } } },
      );
    }
    const config = await getMarginConfig(warehouseId);
    return handleResponse(res, 200, "Subcategory margin saved", config);
  } catch (error) {
    return fail(res, error, "Failed to save subcategory margin");
  }
};

// PUT /api/warehouse/margins/brand/:brandId  { margin }  (blank clears)
export const setBrandMargin = async (req, res) => {
  try {
    const { brandId } = req.params;
    if (!isObjectId(brandId)) return handleResponse(res, 400, "Invalid brand");
    const margin = readMargin(req.body.margin, { allowBlank: true });
    const brand = await Brand.findOneAndUpdate(
      { _id: brandId, warehouseId: req.user.id },
      { $set: { margin } },
      { new: true },
    );
    if (!brand) return handleResponse(res, 404, "Brand not found");
    return handleResponse(res, 200, "Brand margin saved", brand);
  } catch (error) {
    return fail(res, error, "Failed to save brand margin");
  }
};

// POST /api/warehouse/margins/resolve  { subcategoryId, brandId, marginType, individualMargin }
// Used by the product form to preview the applicable margin.
export const previewMargin = async (req, res) => {
  try {
    const { subcategoryId, brandId, marginType, individualMargin } = req.body;
    const result = await resolveMargin({
      warehouseId: req.user.id,
      subcategoryId: isObjectId(subcategoryId) ? subcategoryId : null,
      brandId: isObjectId(brandId) ? brandId : null,
      marginType,
      individualMargin,
    });
    return handleResponse(res, 200, "Margin resolved", result);
  } catch (error) {
    return fail(res, error, "Failed to resolve margin");
  }
};

// POST /api/warehouse/margins/recalculate
// Re-applies current margins to existing products that have a purchase price.
export const recalculatePrices = async (req, res) => {
  try {
    const result = await recalculateWarehousePrices(req.user.id);
    await invalidateProductCaches();
    return handleResponse(res, 200, `Updated ${result.updated} product(s)`, result);
  } catch (error) {
    return fail(res, error, "Failed to recalculate prices");
  }
};

/* ============ BRANDS ============ */

const normalizeName = (value) => String(value || "").trim().replace(/\s+/g, " ");

// GET /api/warehouse/brands
export const listBrands = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const brands = await Brand.find({ warehouseId }).sort({ name: 1 }).lean();
    const counts = await Product.aggregate([
      { $match: { brandId: { $in: brands.map((b) => b._id) } } },
      { $group: { _id: "$brandId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
    return handleResponse(
      res,
      200,
      "Brands fetched",
      brands.map((b) => ({ ...b, productCount: countMap[String(b._id)] || 0 })),
    );
  } catch (error) {
    return fail(res, error, "Failed to fetch brands");
  }
};

// POST /api/warehouse/brands  { name, margin? }
export const createBrand = async (req, res) => {
  try {
    const name = normalizeName(req.body.name);
    if (!name) return handleResponse(res, 400, "Brand name is required");
    const margin = readMargin(req.body.margin, { allowBlank: true });
    const brand = await Brand.create({
      warehouseId: req.user.id,
      name,
      nameKey: name.toLowerCase(),
      margin,
    });
    return handleResponse(res, 201, "Brand created successfully", brand);
  } catch (error) {
    return fail(res, error, "Failed to create brand");
  }
};

// PUT /api/warehouse/brands/:id  { name?, isActive?, margin? }
export const updateBrand = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const brand = await Brand.findOne({ _id: req.params.id, warehouseId });
    if (!brand) return handleResponse(res, 404, "Brand not found");

    let renamed = false;
    if (req.body.name !== undefined) {
      const name = normalizeName(req.body.name);
      if (!name) return handleResponse(res, 400, "Brand name is required");
      renamed = name !== brand.name;
      brand.name = name;
      brand.nameKey = name.toLowerCase();
    }
    if (req.body.isActive !== undefined) brand.isActive = Boolean(req.body.isActive);
    if (req.body.margin !== undefined) brand.margin = readMargin(req.body.margin, { allowBlank: true });

    await brand.save();
    if (renamed) {
      await Product.updateMany({ warehouseId, brandId: brand._id }, { $set: { brand: brand.name } });
      await invalidateProductCaches();
    }
    return handleResponse(res, 200, "Brand updated successfully", brand);
  } catch (error) {
    return fail(res, error, "Failed to update brand");
  }
};

// DELETE /api/warehouse/brands/:id
export const deleteBrand = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const brand = await Brand.findOneAndDelete({ _id: req.params.id, warehouseId });
    if (!brand) return handleResponse(res, 404, "Brand not found");
    // Products keep their brand name text but lose the margin link
    await Product.updateMany({ warehouseId, brandId: brand._id }, { $set: { brandId: null } });
    await invalidateProductCaches();
    return handleResponse(res, 200, "Brand deleted successfully");
  } catch (error) {
    return fail(res, error, "Failed to delete brand");
  }
};
