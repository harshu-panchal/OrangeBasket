import KitAddonItem from "../models/kitAddonItem.js";
import Order from "../models/order.js";
import handleResponse from "../utils/helper.js";
import { uploadToCloudinary } from "../services/mediaService.js";
import logger from "../services/logger.js";

/* ─── Admin Endpoints ────────────────────────────────────────────────────── */

/**
 * POST /api/kits/admin/addons
 * Create a new kit add-on item (Atta / Oil / Rice etc.)
 */
export const createAddon = async (req, res) => {
  try {
    const data = { ...req.body };

    // Handle image upload
    const files = req.files || [];
    for (const file of files) {
      if (file.fieldname === "mainImage") {
        try {
          const url = await uploadToCloudinary(file.buffer, "kit-addons", {
            mimeType: file.mimetype,
            resourceType: "image",
          });
          data.mainImage = url;
        } catch (err) {
          logger.error("Cloudinary upload failed", { scope: "createAddon", error: err });
        }
      }
    }

    // Parse numeric fields from form-data
    if (data.price) data.price = Number(data.price);
    if (data.stock) data.stock = Number(data.stock);
    if (data.maxQtyPerOrder) data.maxQtyPerOrder = Number(data.maxQtyPerOrder);
    if (data.sortOrder) data.sortOrder = Number(data.sortOrder);
    
    if (data.applicableKits) {
        try {
            // FormData sends arrays as JSON strings or comma separated
            data.applicableKits = typeof data.applicableKits === 'string' 
                ? JSON.parse(data.applicableKits) 
                : data.applicableKits;
        } catch(e) {
            data.applicableKits = [];
        }
    } else {
        data.applicableKits = [];
    }

    data.warehouseId = req.user.id;

    const addon = new KitAddonItem(data);
    await addon.save();

    return handleResponse(res, 201, "Add-on item created successfully", addon);
  } catch (error) {
    logger.error("Create Addon Error:", { scope: "createAddon", error });
    return handleResponse(res, 500, "Failed to create add-on item", { error: error.message });
  }
};

/**
 * GET /api/kits/warehouse/addons
 * List all add-on items for the warehouse
 */
export const getWarehouseAddons = async (req, res) => {
  try {
    const addons = await KitAddonItem.find({ warehouseId: req.user.id })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return handleResponse(res, 200, "Add-on items fetched", addons);
  } catch (error) {
    return handleResponse(res, 500, "Failed to fetch add-on items");
  }
};

/**
 * PUT /api/kits/admin/addons/:id
 * Update an add-on item
 */
export const updateAddon = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    // Handle image upload
    const files = req.files || [];
    for (const file of files) {
      if (file.fieldname === "mainImage") {
        try {
          const url = await uploadToCloudinary(file.buffer, "kit-addons", {
            mimeType: file.mimetype,
            resourceType: "image",
          });
          data.mainImage = url;
        } catch (err) {
          logger.error("Cloudinary upload failed", { scope: "updateAddon", error: err });
        }
      }
    }

    // Parse numeric fields
    if (data.price) data.price = Number(data.price);
    if (data.stock) data.stock = Number(data.stock);
    if (data.maxQtyPerOrder) data.maxQtyPerOrder = Number(data.maxQtyPerOrder);
    if (data.sortOrder) data.sortOrder = Number(data.sortOrder);
    
    if (data.applicableKits !== undefined) {
        if (data.applicableKits) {
            try {
                data.applicableKits = typeof data.applicableKits === 'string' 
                    ? JSON.parse(data.applicableKits) 
                    : data.applicableKits;
            } catch(e) {
                data.applicableKits = [];
            }
        } else {
            data.applicableKits = [];
        }
    }

    const addon = await KitAddonItem.findOneAndUpdate({ _id: id, warehouseId: req.user.id }, data, { new: true });
    if (!addon) {
      return handleResponse(res, 404, "Add-on item not found or unauthorized");
    }

    return handleResponse(res, 200, "Add-on item updated successfully", addon);
  } catch (error) {
    logger.error("Update Addon Error:", { scope: "updateAddon", error });
    return handleResponse(res, 500, "Failed to update add-on item");
  }
};

/**
 * DELETE /api/kits/warehouse/addons/:id
 * Delete an add-on item
 */
export const deleteAddon = async (req, res) => {
  try {
    const { id } = req.params;
    const addon = await KitAddonItem.findOneAndDelete({ _id: id, warehouseId: req.user.id });
    if (!addon) {
      return handleResponse(res, 404, "Add-on item not found or unauthorized");
    }
    return handleResponse(res, 200, "Add-on item deleted successfully");
  } catch (error) {
    logger.error("Delete Addon Error:", { scope: "deleteAddon", error });
    return handleResponse(res, 500, "Failed to delete add-on item");
  }
};

/* ─── Customer Endpoints ─────────────────────────────────────────────────── */

/**
 * GET /api/kits/addons
 * Get all active add-on items (public endpoint for kit detail page)
 */
export const getActiveAddons = async (req, res) => {
  try {
    const { kitId } = req.query;
    
    // Base query: only active add-ons
    const query = { status: "active" };
    
    // If a kitId is provided, only return add-ons where applicableKits contains the kitId
    // OR where applicableKits is empty (applies to all kits by default)
    if (kitId) {
        query.$or = [
            { applicableKits: kitId },
            { applicableKits: { $size: 0 } } // applies to all if empty
        ];
    }

    const addons = await KitAddonItem.find(query)
      .sort({ sortOrder: 1 })
      .select("-createdBy")
      .lean();
    return handleResponse(res, 200, "Active add-on items fetched", addons);
  } catch (error) {
    return handleResponse(res, 500, "Failed to fetch add-on items");
  }
};

/* ─── Warehouse Endpoints ────────────────────────────────────────────────── */

/**
 * GET /api/kits/warehouse/addon-summary
 * Aggregated add-on quantities across active monthly kit orders for this warehouse
 */
export const getAddonOrderSummary = async (req, res) => {
  try {
    const warehouseId = req.user.id;

    // Get date range from query params (default: current month)
    const now = new Date();
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Find orders with kit add-ons for this warehouse
    const orders = await Order.find({
      warehouseId,
      "kitAddons.0": { $exists: true },
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: ["cancelled"] },
    })
      .select("orderId kitAddons status createdAt customer")
      .populate("customer", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate totals per add-on item
    const addonTotals = {};
    for (const order of orders) {
      for (const addon of order.kitAddons || []) {
        const key = addon.addonId?.toString() || addon.name;
        if (!addonTotals[key]) {
          addonTotals[key] = {
            addonId: addon.addonId,
            name: addon.name,
            image: addon.image,
            unit: addon.unit,
            totalQuantity: 0,
            totalAmount: 0,
            orderCount: 0,
          };
        }
        addonTotals[key].totalQuantity += addon.quantity;
        addonTotals[key].totalAmount += addon.subtotal || addon.quantity * addon.price;
        addonTotals[key].orderCount += 1;
      }
    }

    return handleResponse(res, 200, "Add-on summary fetched", {
      summary: Object.values(addonTotals),
      orders,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    logger.error("Addon Summary Error:", { scope: "getAddonOrderSummary", error });
    return handleResponse(res, 500, "Failed to fetch add-on summary");
  }
};
