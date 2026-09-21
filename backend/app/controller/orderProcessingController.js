/**
 * orderProcessingController.js
 * HTTP endpoints for the warehouse Order Processing / Scan flow:
 * scan progress, per-unit barcode scan (stock deduction), eligible riders,
 * and manual delivery-boy assignment.
 */
import { handleResponse } from "../utils/helper.js";
import { getScanProgress, scanOrderItem } from "../services/orderProcessingService.js";
import { getWarehouseQueue } from "../services/warehouseCheckinService.js";
import { assignDeliveryBoyManually } from "../services/warehouseQueueAssignmentService.js";

/**
 * GET /api/orders/:orderId/warehouse/scan-progress
 */
export const getScanProgressHandler = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const progress = await getScanProgress(warehouseId, req.params.orderId);
    return handleResponse(res, 200, "Scan progress fetched", progress);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * POST /api/orders/:orderId/warehouse/scan
 * Body: { code } — the scanned barcode or SKU
 */
export const scanOrderItemHandler = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const { code } = req.body;
    if (!code || !String(code).trim()) {
      return handleResponse(res, 400, "Scanned code is required");
    }
    const result = await scanOrderItem(warehouseId, req.params.orderId, code);
    return handleResponse(res, 200, "Item scanned successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * GET /api/orders/:orderId/warehouse/eligible-riders
 * Thin wrapper over the existing warehouse queue, filtered to riders who
 * are online and not already busy with another order.
 */
export const getEligibleRidersHandler = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const queue = await getWarehouseQueue(warehouseId);
    const eligible = queue.map((entry) => ({
      ...entry,
      isEligible: Boolean(
        entry.rider?.isOnline &&
        !entry.currentOrder &&
        !["delivering", "order_assigned", "order_offered"].includes(entry.rider?.queueStatus),
      ),
    }));
    return handleResponse(res, 200, "Warehouse queue fetched", eligible);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * POST /api/orders/:orderId/warehouse/assign-delivery
 * Body: { riderId }
 * Sends the selected rider an accept/reject offer (with a timeout) rather
 * than assigning immediately — see assignDeliveryBoyManually().
 */
export const assignDeliveryBoyHandler = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const { riderId } = req.body;
    if (!riderId) {
      return handleResponse(res, 400, "riderId is required");
    }
    const order = await assignDeliveryBoyManually(warehouseId, req.params.orderId, riderId);
    return handleResponse(res, 200, "Offer sent to delivery boy — waiting for response", order);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};
