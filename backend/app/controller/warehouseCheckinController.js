/**
 * warehouseCheckinController.js
 * HTTP endpoints for warehouse check-in/check-out and queue monitoring.
 */
import handleResponse from "../utils/helper.js";
import {
  checkInRider,
  checkOutRider,
  getWarehouseQueue,
  getRiderCheckinStatus,
  checkInRiderByLocation,
} from "../services/warehouseCheckinService.js";
import {
  getQueueSnapshot,
  getQueueStats,
  getAllWarehouseSnapshots,
} from "../services/warehouseMonitorService.js";

/* ─── Delivery Partner Endpoints ─────────────────────────────────────────── */

/**
 * POST /api/delivery/warehouse/checkin
 * Body: { qrToken, lat, lng }
 */
export const warehouseCheckin = async (req, res) => {
  try {
    const deliveryId = req.user.id;
    const { qrToken, lat, lng } = req.body;

    if (!qrToken) return handleResponse(res, 400, "QR token is required");
    if (lat === undefined || lng === undefined) {
      return handleResponse(res, 400, "GPS coordinates (lat, lng) are required");
    }

    const result = await checkInRider(deliveryId, qrToken, Number(lat), Number(lng));
    return handleResponse(res, 200, "Checked in successfully", result);
  } catch (err) {
    return handleResponse(res, err.statusCode || 500, err.message, err.data || null);
  }
};

/**
 * POST /api/delivery/warehouse/checkin/location
 * Body: { lat, lng }
 */
export const warehouseCheckinByLocation = async (req, res) => {
  try {
    const deliveryId = req.user.id;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return handleResponse(res, 400, "GPS coordinates (lat, lng) are required");
    }

    const result = await checkInRiderByLocation(deliveryId, Number(lat), Number(lng));
    return handleResponse(res, 200, "Checked in via location successfully", result);
  } catch (err) {
    return handleResponse(res, err.statusCode || 500, err.message, err.data || null);
  }
};

/**
 * POST /api/delivery/warehouse/checkout
 */
export const warehouseCheckout = async (req, res) => {
  try {
    const deliveryId = req.user.id;
    await checkOutRider(deliveryId, "manual");
    return handleResponse(res, 200, "Checked out successfully");
  } catch (err) {
    return handleResponse(res, err.statusCode || 500, err.message);
  }
};

/**
 * GET /api/delivery/warehouse/checkin-status
 */
export const getCheckinStatus = async (req, res) => {
  try {
    const deliveryId = req.user.id;
    const status = await getRiderCheckinStatus(deliveryId);
    return handleResponse(res, 200, "Checkin status fetched", status);
  } catch (err) {
    return handleResponse(res, err.statusCode || 500, err.message);
  }
};

/* ─── Warehouse / Admin Endpoints ────────────────────────────────────────── */

/**
 * GET /api/warehouse/:warehouseId/queue
 */
export const getWarehouseQueueHandler = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    // Warehouse staff can only see their own queue
    if (req.user.role === "warehouse" && String(req.user.id) !== String(warehouseId)) {
      return handleResponse(res, 403, "Access denied");
    }
    const queue = await getWarehouseQueue(warehouseId);
    return handleResponse(res, 200, "Queue fetched", { queue, total: queue.length });
  } catch (err) {
    return handleResponse(res, err.statusCode || 500, err.message);
  }
};

/**
 * GET /api/warehouse/:warehouseId/queue/snapshot
 */
export const getQueueSnapshotHandler = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    if (req.user.role === "warehouse" && String(req.user.id) !== String(warehouseId)) {
      return handleResponse(res, 403, "Access denied");
    }
    const snapshot = await getQueueSnapshot(warehouseId);
    return handleResponse(res, 200, "Queue snapshot fetched", snapshot);
  } catch (err) {
    return handleResponse(res, err.statusCode || 500, err.message);
  }
};

/**
 * GET /api/warehouse/:warehouseId/queue/stats
 */
export const getQueueStatsHandler = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    if (req.user.role === "warehouse" && String(req.user.id) !== String(warehouseId)) {
      return handleResponse(res, 403, "Access denied");
    }
    const stats = await getQueueStats(warehouseId);
    return handleResponse(res, 200, "Queue stats fetched", stats);
  } catch (err) {
    return handleResponse(res, err.statusCode || 500, err.message);
  }
};

/**
 * GET /api/admin/warehouse-queue/all
 * Admin-only: all warehouses' queue snapshots
 */
export const getAllWarehouseQueuesHandler = async (req, res) => {
  try {
    const snapshots = await getAllWarehouseSnapshots();
    return handleResponse(res, 200, "All warehouse queues fetched", snapshots);
  } catch (err) {
    return handleResponse(res, err.statusCode || 500, err.message);
  }
};
