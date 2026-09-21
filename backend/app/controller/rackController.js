/**
 * rackController.js
 * CRUD for warehouse rack/shelf locations, used by product placement + the
 * "which product is in which rack" lookup on the warehouse Rack Management page.
 */
import { handleResponse } from "../utils/helper.js";
import Rack from "../models/rack.js";
import Product from "../models/product.js";

function resolveWarehouseId(req) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role === "admin" && req.query.warehouseId) return req.query.warehouseId;
  return req.user.id;
}

/**
 * GET /api/warehouse/racks
 */
export const listRacks = async (req, res) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const racks = await Rack.find({ warehouseId }).sort({ rackCode: 1 }).lean();

    const rackIds = racks.map((r) => r._id);
    const productCounts = await Product.aggregate([
      { $match: { rackId: { $in: rackIds } } },
      { $group: { _id: "$rackId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      productCounts.map((c) => [String(c._id), c.count]),
    );

    const result = racks.map((r) => ({
      ...r,
      productCount: countMap[String(r._id)] || 0,
    }));

    return handleResponse(res, 200, "Racks fetched", result);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/warehouse/racks/:id
 * Returns rack details plus the products currently assigned to it.
 */
export const getRackById = async (req, res) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const rack = await Rack.findOne({ _id: req.params.id, warehouseId }).lean();
    if (!rack) return handleResponse(res, 404, "Rack not found");

    const products = await Product.find({ rackId: rack._id })
      .select("name slug sku barcode stock mainImage status")
      .sort({ name: 1 })
      .lean();

    return handleResponse(res, 200, "Rack fetched", { ...rack, products });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/**
 * POST /api/warehouse/racks
 * Body: { rackCode, name, description, capacity }
 */
export const createRack = async (req, res) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const { rackCode, name, description, capacity } = req.body;

    if (!rackCode || !String(rackCode).trim()) {
      return handleResponse(res, 400, "Rack code is required");
    }

    const normalizedCode = String(rackCode).trim().toUpperCase();
    const existing = await Rack.findOne({ warehouseId, rackCode: normalizedCode });
    if (existing) {
      return handleResponse(res, 400, `Rack "${normalizedCode}" already exists`);
    }

    const rack = await Rack.create({
      warehouseId,
      rackCode: normalizedCode,
      name: name || "",
      description: description || "",
      capacity: Number(capacity) || 0,
    });

    return handleResponse(res, 201, "Rack created successfully", rack);
  } catch (error) {
    if (error.code === 11000) {
      return handleResponse(res, 400, "Rack code already exists");
    }
    return handleResponse(res, 500, error.message);
  }
};

/**
 * PUT /api/warehouse/racks/:id
 */
export const updateRack = async (req, res) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const { rackCode, name, description, capacity, isActive } = req.body;

    const rack = await Rack.findOne({ _id: req.params.id, warehouseId });
    if (!rack) return handleResponse(res, 404, "Rack not found");

    if (rackCode !== undefined) {
      const normalizedCode = String(rackCode).trim().toUpperCase();
      if (normalizedCode !== rack.rackCode) {
        const existing = await Rack.findOne({
          warehouseId,
          rackCode: normalizedCode,
          _id: { $ne: rack._id },
        });
        if (existing) {
          return handleResponse(res, 400, `Rack "${normalizedCode}" already exists`);
        }
        rack.rackCode = normalizedCode;
      }
    }
    if (name !== undefined) rack.name = name;
    if (description !== undefined) rack.description = description;
    if (capacity !== undefined) rack.capacity = Number(capacity) || 0;
    if (isActive !== undefined) rack.isActive = Boolean(isActive);

    await rack.save();
    return handleResponse(res, 200, "Rack updated successfully", rack);
  } catch (error) {
    if (error.code === 11000) {
      return handleResponse(res, 400, "Rack code already exists");
    }
    return handleResponse(res, 500, error.message);
  }
};

/**
 * DELETE /api/warehouse/racks/:id
 */
export const deleteRack = async (req, res) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const rack = await Rack.findOne({ _id: req.params.id, warehouseId });
    if (!rack) return handleResponse(res, 404, "Rack not found");

    const assignedCount = await Product.countDocuments({ rackId: rack._id });
    if (assignedCount > 0) {
      return handleResponse(
        res,
        400,
        `Cannot delete rack — ${assignedCount} product(s) are still assigned to it. Reassign them first.`,
      );
    }

    await Rack.deleteOne({ _id: rack._id });
    return handleResponse(res, 200, "Rack deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
