/**
 * orderProcessingService.js
 * Warehouse "Order Processing / Scan" step: staff scan each ordered item's
 * barcode/SKU. Every valid scan deducts stock through the central inventory
 * system (same guarded pattern as stockService.js) and writes a StockHistory
 * record tied to the order, so admins can audit exactly when/how much/which
 * order caused a deduction. Once every line is fully scanned the order
 * auto-flips to READY_FOR_ASSIGNMENT so the warehouse can manually pick a
 * delivery boy (see warehouseQueueAssignmentService.assignDeliveryBoyManually).
 */
import mongoose from "mongoose";
import Order from "../models/order.js";
import Product from "../models/product.js";
import StockHistory from "../models/stockHistory.js";
import { WORKFLOW_STATUS, legacyStatusFromWorkflow } from "../constants/orderWorkflow.js";
import { requireCanonicalOrderId } from "../utils/orderLookup.js";
import { createLowStockAlertCandidate, isLowStockAlertsEnabled } from "./lowStockAlertService.js";
import { emitOrderStatusUpdate } from "./orderSocketEmitter.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import logger from "./logger.js";

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

async function loadOrderForWarehouse(warehouseId, orderId) {
  const canonicalOrderId = await requireCanonicalOrderId(orderId);
  const order = await Order.findOne({
    orderId: canonicalOrderId,
    warehouseId: toObjectId(warehouseId),
    workflowVersion: { $gte: 2 },
  }).populate("pendingDeliveryBoy", "name phone vehicleType");
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }
  return order;
}

function formatProgress(order) {
  const scannedItems = order.processing?.scannedItems || [];
  const items = (order.items || []).map((item, idx) => {
    const progress = scannedItems.find((s) => s.itemIndex === idx) || {};
    return {
      itemIndex: idx,
      product: item.product,
      name: item.name,
      image: item.image,
      orderedQty: item.quantity,
      scannedQty: progress.scannedQty || 0,
      remainingQty: Math.max(0, item.quantity - (progress.scannedQty || 0)),
    };
  });
  const totalOrdered = items.reduce((sum, i) => sum + i.orderedQty, 0);
  const totalScanned = items.reduce((sum, i) => sum + i.scannedQty, 0);
  return {
    orderId: order.orderId,
    workflowStatus: order.workflowStatus,
    startedAt: order.processing?.startedAt || null,
    completedAt: order.processing?.completedAt || null,
    items,
    totalOrdered,
    totalScanned,
    isComplete: totalOrdered > 0 && totalScanned >= totalOrdered,
    pendingDeliveryBoy: order.pendingDeliveryBoy || null,
    pendingOfferExpiresAt: order.pendingOfferExpiresAt || null,
    deliveryBoy: order.deliveryBoy || null,
  };
}

/**
 * GET scan progress for the Order Processing page.
 */
export async function getScanProgress(warehouseId, orderId) {
  const order = await loadOrderForWarehouse(warehouseId, orderId);
  return formatProgress(order);
}

/**
 * Resolve a scanned barcode/SKU string to a Product that belongs to this order.
 */
async function resolveScannedProduct(code, order) {
  const trimmed = String(code || "").trim();
  if (!trimmed) {
    const err = new Error("Scanned code is empty");
    err.statusCode = 400;
    throw err;
  }

  const product = await Product.findOne({
    $or: [{ barcode: trimmed.toUpperCase() }, { sku: trimmed }],
  }).select("_id name stock lowStockAlert warehouseId sellerId");

  if (!product) {
    const err = new Error("No product matches this barcode/SKU");
    err.statusCode = 404;
    throw err;
  }

  const itemIndex = (order.items || []).findIndex(
    (item) => String(item.product) === String(product._id),
  );
  if (itemIndex === -1) {
    const err = new Error(`${product.name} is not part of this order`);
    err.statusCode = 409;
    throw err;
  }

  return { product, itemIndex };
}

/**
 * Records one unit scan: verifies the product belongs to the order and isn't
 * already fully scanned, atomically decrements Product.stock by 1, writes a
 * StockHistory audit record, and bumps the order's scanned counter.
 * Auto-completes the order (READY_FOR_ASSIGNMENT) once every line is done.
 */
export async function scanOrderItem(warehouseId, orderId, code) {
  const order = await loadOrderForWarehouse(warehouseId, orderId);

  if (order.workflowStatus !== WORKFLOW_STATUS.WAREHOUSE_PROCESSING) {
    const err = new Error(
      order.workflowStatus === WORKFLOW_STATUS.READY_FOR_ASSIGNMENT
        ? "All items are already scanned for this order"
        : "This order is not in the scanning stage",
    );
    err.statusCode = 409;
    throw err;
  }

  const { product, itemIndex } = await resolveScannedProduct(code, order);
  const orderItem = order.items[itemIndex];

  const progressEntry = (order.processing?.scannedItems || []).find(
    (s) => s.itemIndex === itemIndex,
  );
  const currentScanned = progressEntry?.scannedQty || 0;

  if (currentScanned >= orderItem.quantity) {
    const err = new Error(`${orderItem.name} is already fully scanned`);
    err.statusCode = 409;
    throw err;
  }

  // Atomic, guarded stock deduction — same invariant as stockService.reserveStockForItems.
  const updatedProduct = await Product.findOneAndUpdate(
    { _id: product._id, stock: { $gte: 1 } },
    { $inc: { stock: -1 } },
    { new: true },
  );
  if (!updatedProduct) {
    const err = new Error(`Insufficient stock for ${orderItem.name}`);
    err.statusCode = 409;
    throw err;
  }

  await StockHistory.create({
    product: product._id,
    warehouseId: toObjectId(warehouseId),
    type: "Sale",
    quantity: -1,
    note: `Order #${order.orderId} scanned during warehouse processing`,
    order: order._id,
  });

  const alertCandidate = createLowStockAlertCandidate({
    product: updatedProduct,
    previousStock: Number(updatedProduct.stock) + 1,
    currentStock: Number(updatedProduct.stock),
  });
  if (alertCandidate && (await isLowStockAlertsEnabled())) {
    emitNotificationEvent(NOTIFICATION_EVENTS.LOW_STOCK_ALERT, alertCandidate);
  }

  const newScannedQty = currentScanned + 1;
  if (progressEntry) {
    await Order.updateOne(
      { _id: order._id, "processing.scannedItems.itemIndex": itemIndex },
      { $set: { "processing.scannedItems.$.scannedQty": newScannedQty } },
    );
  } else {
    await Order.updateOne(
      { _id: order._id },
      {
        $push: {
          "processing.scannedItems": {
            itemIndex,
            product: product._id,
            orderedQty: orderItem.quantity,
            scannedQty: newScannedQty,
          },
        },
      },
    );
  }

  const refreshed = await Order.findById(order._id);
  const progress = formatProgress(refreshed);

  if (progress.isComplete && refreshed.workflowStatus === WORKFLOW_STATUS.WAREHOUSE_PROCESSING) {
    refreshed.workflowStatus = WORKFLOW_STATUS.READY_FOR_ASSIGNMENT;
    refreshed.status = legacyStatusFromWorkflow(WORKFLOW_STATUS.READY_FOR_ASSIGNMENT);
    refreshed.processing.completedAt = new Date();
    await refreshed.save();
    progress.workflowStatus = refreshed.workflowStatus;
    progress.completedAt = refreshed.processing.completedAt;

    emitOrderStatusUpdate(
      refreshed.orderId,
      { workflowStatus: WORKFLOW_STATUS.READY_FOR_ASSIGNMENT },
      refreshed.customer,
    );
  }

  return {
    scannedProduct: { id: product._id, name: orderItem.name, remainingStock: updatedProduct.stock },
    progress,
  };
}
