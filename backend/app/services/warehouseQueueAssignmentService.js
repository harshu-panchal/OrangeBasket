/**
 * warehouseQueueAssignmentService.js
 * Orchestrates FIFO order assignment through the warehouse queue with a 20-second accept/reject timer.
 * Integrates with existing deliveryAcceptAtomic() for the final assignment step.
 */
import mongoose from "mongoose";
import Order from "../models/order.js";
import WarehouseCheckin from "../models/warehouseCheckin.js";
import Delivery from "../models/delivery.js";
import { getNextEligibleRider, broadcastQueueUpdate } from "./warehouseCheckinService.js";
import { getIO } from "../socket/socketManager.js";
import { queueOfferTimeoutQueue, JOB_NAMES } from "../queues/orderQueues.js";
// NOTE: deliveryAcceptAtomic is dynamically imported to avoid circular deps
import logger from "./logger.js";

const OFFER_TIMEOUT_SECONDS = parseInt(process.env.QUEUE_OFFER_TIMEOUT_SECONDS || "60", 10);

function getIo() {
  try {
    return getIO();
  } catch {
    return null;
  }
}

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

/* ─── Warehouse Order Acceptance ────────────────────────────────────────────── */

/**
 * Called when a warehouse accepts an order.
 *
 * P0 change: warehouses no longer auto-pop the delivery queue on accept.
 * Instead the order moves into WAREHOUSE_PROCESSING so staff can scan every
 * ordered item (deducting stock per scan via orderProcessingService.js).
 * Once fully scanned the order flips to READY_FOR_ASSIGNMENT and a delivery
 * boy must be picked manually — see assignDeliveryBoyManually().
 */
export async function warehouseAcceptAtomic(warehouseId, orderId) {
  const { requireCanonicalOrderId } = await import("../utils/orderLookup.js");
  const { legacyStatusFromWorkflow, WORKFLOW_STATUS } = await import("../constants/orderWorkflow.js");
  const { removeSellerTimeoutJob } = await import("./orderWorkflowService.js");
  const { emitOrderStatusUpdate } = await import("./orderSocketEmitter.js");

  const canonicalOrderId = await requireCanonicalOrderId(orderId);
  const now = new Date();

  const existing = await Order.findOne({
    orderId: canonicalOrderId,
    warehouseId: toObjectId(warehouseId),
    workflowVersion: { $gte: 2 },
    workflowStatus: WORKFLOW_STATUS.SELLER_PENDING,
    sellerPendingExpiresAt: { $gt: now },
  }).select("items");

  if (!existing) {
    const err = new Error("Order not available for acceptance or expired");
    err.statusCode = 409;
    throw err;
  }

  const scannedItems = (existing.items || []).map((item, idx) => ({
    itemIndex: idx,
    product: item.product,
    orderedQty: item.quantity,
    scannedQty: 0,
  }));

  const updated = await Order.findOneAndUpdate(
    {
      orderId: canonicalOrderId,
      warehouseId: toObjectId(warehouseId),
      workflowVersion: { $gte: 2 },
      workflowStatus: WORKFLOW_STATUS.SELLER_PENDING,
      sellerPendingExpiresAt: { $gt: now },
    },
    {
      $set: {
        workflowStatus: WORKFLOW_STATUS.WAREHOUSE_PROCESSING,
        status: legacyStatusFromWorkflow(WORKFLOW_STATUS.WAREHOUSE_PROCESSING),
        sellerAcceptedAt: now,
        "processing.startedAt": now,
        "processing.completedAt": null,
        "processing.scannedItems": scannedItems,
      },
      $unset: { expiresAt: 1, sellerPendingExpiresAt: 1 },
    },
    { new: true },
  )
    .populate("customer", "name phone")
    .populate("warehouseId", "name location");

  if (!updated) {
    const err = new Error("Order not available for acceptance or expired");
    err.statusCode = 409;
    throw err;
  }

  await removeSellerTimeoutJob(canonicalOrderId);

  emitOrderStatusUpdate(
    updated.orderId,
    { workflowStatus: WORKFLOW_STATUS.WAREHOUSE_PROCESSING },
    updated.customer?._id || updated.customer,
  );

  return updated;
}

/* ─── Manual Delivery Boy Assignment (warehouse-initiated) ─────────────────── */

const MANUAL_OFFER_TIMEOUT_SECONDS = parseInt(
  process.env.MANUAL_ASSIGN_OFFER_TIMEOUT_SECONDS || "120",
  10,
);

function manualOfferJobId(orderId, riderId) {
  return `manual-offer:${orderId}:${riderId}`;
}

async function removeManualOfferTimeoutJob(orderId, riderId) {
  try {
    const job = await queueOfferTimeoutQueue.getJob(manualOfferJobId(orderId, riderId));
    if (job) await job.remove();
  } catch {
    /* ignore — job may have already fired */
  }
}

/**
 * Warehouse staff manually pick a rider from the live queue after scanning
 * is complete (workflowStatus === READY_FOR_ASSIGNMENT). This sends that
 * rider a real accept/reject offer (reusing the same OrderOfferModal UI as
 * the queue-broadcast flow) with a timeout. On accept the rider is assigned;
 * on reject or timeout the order reverts to READY_FOR_ASSIGNMENT — it is
 * NOT auto-offered to the next rider — so the warehouse picks again.
 */
export async function assignDeliveryBoyManually(warehouseId, orderId, riderId) {
  const { requireCanonicalOrderId } = await import("../utils/orderLookup.js");
  const { legacyStatusFromWorkflow, WORKFLOW_STATUS } = await import("../constants/orderWorkflow.js");
  const { emitOrderStatusUpdate } = await import("./orderSocketEmitter.js");

  const canonicalOrderId = await requireCanonicalOrderId(orderId);
  const riderOid = toObjectId(riderId);
  if (!riderOid) {
    const err = new Error("Invalid delivery boy");
    err.statusCode = 400;
    throw err;
  }

  const checkin = await WarehouseCheckin.findOne({
    deliveryId: riderOid,
    warehouseId: toObjectId(warehouseId),
    status: "active",
  }).populate("deliveryId", "isOnline queueStatus name");

  if (!checkin) {
    const err = new Error("Selected delivery boy is not checked in at this warehouse");
    err.statusCode = 409;
    throw err;
  }
  const rider = checkin.deliveryId;
  if (!rider?.isOnline) {
    const err = new Error("Selected delivery boy is offline");
    err.statusCode = 409;
    throw err;
  }
  if (checkin.currentOrderId || ["delivering", "order_assigned", "order_offered"].includes(rider.queueStatus)) {
    const err = new Error("Selected delivery boy is already handling another order");
    err.statusCode = 409;
    throw err;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + MANUAL_OFFER_TIMEOUT_SECONDS * 1000);

  const updated = await Order.findOneAndUpdate(
    {
      orderId: canonicalOrderId,
      warehouseId: toObjectId(warehouseId),
      workflowVersion: { $gte: 2 },
      workflowStatus: WORKFLOW_STATUS.READY_FOR_ASSIGNMENT,
      deliveryBoy: null,
    },
    {
      $set: {
        workflowStatus: WORKFLOW_STATUS.DELIVERY_OFFER_PENDING,
        status: legacyStatusFromWorkflow(WORKFLOW_STATUS.DELIVERY_OFFER_PENDING),
        pendingDeliveryBoy: riderOid,
        pendingOfferExpiresAt: expiresAt,
      },
    },
    { new: true },
  )
    .populate("customer", "name phone")
    .populate("warehouseId", "name");

  if (!updated) {
    const err = new Error("Order is not ready for assignment or already assigned");
    err.statusCode = 409;
    throw err;
  }

  await WarehouseCheckin.findByIdAndUpdate(checkin._id, {
    $set: { lastActivityAt: now },
  });
  await Delivery.findByIdAndUpdate(riderOid, { $set: { queueStatus: "order_offered" } });

  const io = getIo();
  if (io) {
    io.to(`delivery:${riderOid}`).emit("queue:order_offered", {
      orderId: updated.orderId,
      countdown: MANUAL_OFFER_TIMEOUT_SECONDS,
      preview: {
        pickup: updated.warehouseId?.name || "Warehouse",
        drop: updated.address?.address || "Customer",
        total: updated.paymentBreakdown?.grandTotal ?? updated.pricing?.total ?? 0,
      },
      offeredAt: now.toISOString(),
      warehouseId: String(warehouseId),
    });
  }

  await queueOfferTimeoutQueue.add(
    JOB_NAMES.MANUAL_OFFER_TIMEOUT,
    { orderId: canonicalOrderId, warehouseId: String(warehouseId), riderId: String(riderOid) },
    {
      jobId: manualOfferJobId(canonicalOrderId, riderOid),
      delay: MANUAL_OFFER_TIMEOUT_SECONDS * 1000,
      removeOnComplete: true,
      removeOnFail: true,
    },
  );

  emitOrderStatusUpdate(
    updated.orderId,
    {
      workflowStatus: WORKFLOW_STATUS.DELIVERY_OFFER_PENDING,
      pendingOfferExpiresAt: expiresAt,
    },
    updated.customer?._id || updated.customer,
  );

  broadcastQueueUpdate(warehouseId).catch(() => {});

  logger.info("[QueueAssign] Offered order to manually-selected rider", {
    orderId: canonicalOrderId,
    riderId: String(riderOid),
    warehouseId: String(warehouseId),
    expiresAt,
  });

  return updated;
}

/**
 * Shared accept/reject-or-timeout resolution for a manual offer. Accept
 * assigns the order to the rider (same terminal state as the old direct
 * assignment). Reject/timeout always revert to READY_FOR_ASSIGNMENT so the
 * warehouse can pick a different rider — never auto-cycles to "next in queue".
 */
async function resolveManualOffer(canonicalOrderId, riderOid, { accepted, reason }) {
  const { legacyStatusFromWorkflow, WORKFLOW_STATUS } = await import("../constants/orderWorkflow.js");
  const { emitOrderStatusUpdate } = await import("./orderSocketEmitter.js");
  const { emitNotificationEvent } = await import("../modules/notifications/notification.emitter.js");
  const { NOTIFICATION_EVENTS } = await import("../modules/notifications/notification.constants.js");

  await removeManualOfferTimeoutJob(canonicalOrderId, riderOid);

  if (accepted) {
    const now = new Date();
    const updated = await Order.findOneAndUpdate(
      {
        orderId: canonicalOrderId,
        workflowVersion: { $gte: 2 },
        workflowStatus: WORKFLOW_STATUS.DELIVERY_OFFER_PENDING,
        pendingDeliveryBoy: riderOid,
        pendingOfferExpiresAt: { $gt: now },
      },
      {
        $set: {
          deliveryBoy: riderOid,
          workflowStatus: WORKFLOW_STATUS.DELIVERY_ASSIGNED,
          status: legacyStatusFromWorkflow(WORKFLOW_STATUS.DELIVERY_ASSIGNED),
          assignedAt: now,
          deliveryRiderStep: 1,
          pendingDeliveryBoy: null,
          pendingOfferExpiresAt: null,
        },
        $inc: { assignmentVersion: 1 },
      },
      { new: true },
    ).populate("customer", "name phone");

    if (!updated) {
      const err = new Error("This offer has expired or was already handled");
      err.statusCode = 409;
      throw err;
    }

    await WarehouseCheckin.findOneAndUpdate(
      { deliveryId: riderOid, status: "active" },
      { $set: { currentOrderId: updated._id, lastActivityAt: now } },
    );
    await Delivery.findByIdAndUpdate(riderOid, { $set: { queueStatus: "order_assigned" } });

    emitNotificationEvent(NOTIFICATION_EVENTS.DELIVERY_ASSIGNED, {
      orderId: updated.orderId,
      deliveryId: riderOid,
      customerId: updated.customer,
      sellerId: updated.seller,
    });

    emitOrderStatusUpdate(
      updated.orderId,
      { workflowStatus: WORKFLOW_STATUS.DELIVERY_ASSIGNED, deliveryBoyId: riderOid.toString() },
      updated.customer?._id || updated.customer,
    );

    const io = getIo();
    if (io) {
      io.to(`delivery:${riderOid}`).emit("order:assigned", {
        orderId: updated.orderId,
        assignedAt: now.toISOString(),
      });
      if (updated.warehouseId) {
        io.to(`warehouse:${updated.warehouseId}`).emit("order:assignment_accepted", {
          orderId: updated.orderId,
          riderId: String(riderOid),
        });
      }
    }

    broadcastQueueUpdate(updated.warehouseId).catch(() => {});
    logger.info("[QueueAssign] Manual offer accepted", { orderId: canonicalOrderId, riderId: String(riderOid) });
    return { success: true, accepted: true, order: updated };
  }

  // Rejected or timed out — revert to READY_FOR_ASSIGNMENT for the
  // warehouse to pick again (no auto-cycling to another rider).
  const updated = await Order.findOneAndUpdate(
    {
      orderId: canonicalOrderId,
      workflowVersion: { $gte: 2 },
      workflowStatus: WORKFLOW_STATUS.DELIVERY_OFFER_PENDING,
      pendingDeliveryBoy: riderOid,
    },
    {
      $set: {
        workflowStatus: WORKFLOW_STATUS.READY_FOR_ASSIGNMENT,
        status: legacyStatusFromWorkflow(WORKFLOW_STATUS.READY_FOR_ASSIGNMENT),
        pendingDeliveryBoy: null,
        pendingOfferExpiresAt: null,
      },
    },
    { new: true },
  );

  await Delivery.findByIdAndUpdate(riderOid, { $set: { queueStatus: "waiting" } });

  if (updated) {
    emitOrderStatusUpdate(
      updated.orderId,
      { workflowStatus: WORKFLOW_STATUS.READY_FOR_ASSIGNMENT },
      updated.customer,
    );
    const io = getIo();
    if (io && updated.warehouseId) {
      io.to(`warehouse:${updated.warehouseId}`).emit("order:assignment_declined", {
        orderId: updated.orderId,
        riderId: String(riderOid),
        reason,
      });
    }
    broadcastQueueUpdate(updated.warehouseId).catch(() => {});
  }

  logger.info("[QueueAssign] Manual offer not accepted — reverted to READY_FOR_ASSIGNMENT", {
    orderId: canonicalOrderId,
    riderId: String(riderOid),
    reason,
  });

  return { success: true, accepted: false };
}

/**
 * Called when a rider explicitly accepts/rejects a manually-sent offer.
 */
export async function handleManualOfferResponse(riderId, orderId, accepted) {
  const { requireCanonicalOrderId } = await import("../utils/orderLookup.js");
  const canonicalOrderId = await requireCanonicalOrderId(orderId);
  const riderOid = toObjectId(riderId);
  return resolveManualOffer(canonicalOrderId, riderOid, {
    accepted,
    reason: accepted ? "accepted" : "rejected",
  });
}

/**
 * Called by the BullMQ processor when a manual offer's timeout fires.
 */
export async function handleManualOfferTimeout({ orderId, riderId }) {
  const { requireCanonicalOrderId } = await import("../utils/orderLookup.js");
  const canonicalOrderId = await requireCanonicalOrderId(orderId);
  const riderOid = toObjectId(riderId);

  const io = getIo();
  if (io) {
    io.to(`delivery:${riderId}`).emit("queue:order_offer_expired", { orderId: canonicalOrderId });
  }

  return resolveManualOffer(canonicalOrderId, riderOid, { accepted: false, reason: "timeout" });
}

/**
 * Unified dispatcher for the "queue:offer_response" socket event — routes
 * to the FIFO-queue offer flow or the warehouse manual-offer flow depending
 * on which one the order is currently in.
 */
export async function handleOfferResponse(riderId, orderId, accepted) {
  const { requireCanonicalOrderId } = await import("../utils/orderLookup.js");
  const { WORKFLOW_STATUS } = await import("../constants/orderWorkflow.js");

  const canonicalOrderId = await requireCanonicalOrderId(orderId);
  const order = await Order.findOne({ orderId: canonicalOrderId }).select("workflowStatus").lean();
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.workflowStatus === WORKFLOW_STATUS.DELIVERY_OFFER_PENDING) {
    return handleManualOfferResponse(riderId, canonicalOrderId, accepted);
  }
  return handleQueueRiderResponse(riderId, canonicalOrderId, accepted);
}

/* ─── Offer to next rider ─────────────────────────────────────────────────── */

/**
 * Offers the order to the next eligible rider in the warehouse queue.
 * If all riders are exhausted, falls back to broadcast mode.
 *
 * @param {string} orderId        - Canonical order ID (e.g. "ORD-12345")
 * @param {string} warehouseId    - MongoDB ObjectId of warehouse
 * @param {string[]} skippedIds   - Rider IDs already attempted for this order
 */
export async function offerToNextInQueue(orderId, warehouseId, skippedIds = []) {
  const order = await Order.findOne({ orderId }).select("orderId pricing address workflowStatus warehouseId seller").lean();
  if (!order) {
    logger.warn("[QueueAssign] Order not found", { orderId });
    return { offered: false, reason: "order_not_found" };
  }

  // Find next eligible rider
  const checkin = await getNextEligibleRider(warehouseId, skippedIds);

  if (!checkin) {
    // No riders in queue — fall back to radius-based broadcast
    logger.info("[QueueAssign] Queue exhausted, falling back to broadcast", { orderId, warehouseId });
    await fallbackToBroadcast(orderId);
    return { offered: false, reason: "queue_exhausted", fallback: "broadcast" };
  }

  const riderId = String(checkin.deliveryId?._id || checkin.deliveryId);

  // Mark rider as "order_offered" to prevent double-offering
  await Delivery.findByIdAndUpdate(riderId, { $set: { queueStatus: "order_offered" } });
  // Track this offer on the checkin doc
  await WarehouseCheckin.findByIdAndUpdate(checkin._id, {
    $set: { lastActivityAt: new Date() },
  });

  // Build preview payload
  const preview = {
    pickup: order.address?.address || "Warehouse",
    drop: order.address?.address || "Customer",
    total: order.pricing?.total ?? 0,
  };

  const offerPayload = {
    orderId: order.orderId,
    countdown: OFFER_TIMEOUT_SECONDS,
    preview,
    offeredAt: new Date().toISOString(),
    warehouseId: String(warehouseId),
  };

  // Emit to the specific rider's socket room
  const io = getIo();
  if (io) {
    io.to(`delivery:${riderId}`).emit("queue:order_offered", offerPayload);
  }

  // Schedule 60-second timeout job
  await queueOfferTimeoutQueue.add(
    JOB_NAMES.QUEUE_OFFER_TIMEOUT,
    {
      orderId,
      warehouseId: String(warehouseId),
      riderId,
      skippedIds: [...skippedIds, riderId],
      offeredAt: Date.now(),
    },
    { delay: OFFER_TIMEOUT_SECONDS * 1000, removeOnComplete: true, removeOnFail: true },
  );

  logger.info("[QueueAssign] Order offered to rider", { orderId, riderId, position: 1 + skippedIds.length });
  broadcastQueueUpdate(warehouseId).catch(() => {});
  return { offered: true, riderId };
}

/* ─── Rider Response ──────────────────────────────────────────────────────── */

/**
 * Called when a rider explicitly accepts or rejects a queue offer.
 * If accepted: delegates to existing deliveryAcceptAtomic().
 * If rejected: offers to next rider.
 */
export async function handleQueueRiderResponse(riderId, orderId, accepted) {
  // Remove the pending timeout job so it doesn't double-fire
  await removeOfferTimeoutJob(orderId, riderId);

  if (accepted) {
    // Use the existing atomic accept (first-wins mutex) — dynamic import to avoid circular dep
    try {
      const { deliveryAcceptAtomic } = await import("./orderWorkflowService.js");
      const result = await deliveryAcceptAtomic(riderId, orderId, null);
      // Update checkin record — assign current order
      await WarehouseCheckin.findOneAndUpdate(
        { deliveryId: toObjectId(riderId), status: "active" },
        { $set: { currentOrderId: result._id, lastActivityAt: new Date() } },
      );
      await Delivery.findByIdAndUpdate(riderId, { $set: { queueStatus: "order_assigned" } });
      broadcastQueueUpdate(result.warehouseId || result.seller).catch(() => {});
      return { success: true, accepted: true };
    } catch (err) {
      logger.error("[QueueAssign] deliveryAcceptAtomic failed", { riderId, orderId, error: err.message });
      return { success: false, error: err.message };
    }
  } else {
    // Rejected — reset rider's queueStatus and offer to next
    await Delivery.findByIdAndUpdate(riderId, { $set: { queueStatus: "waiting" } });
    const order = await Order.findOne({ orderId }).select("warehouseId").lean();
    const wid = order?.warehouseId;
    if (wid) {
      // Get skipped IDs from the pending job data stored in the order attempt meta
      const warehouseCheckin = await WarehouseCheckin.findOne({
        deliveryId: toObjectId(riderId),
        status: "active",
      }).lean();
      // We track via the recursive call — the skippedIds come from the job payload
      await offerToNextInQueue(orderId, String(wid), [riderId]);
    }
    return { success: true, accepted: false };
  }
}

/* ─── Timeout Handler ─────────────────────────────────────────────────────── */

/**
 * Called by the BullMQ processor when the 20-second offer times out.
 * Resets rider status and offers to the next in queue.
 */
export async function handleOfferTimeout({ orderId, warehouseId, riderId, skippedIds }) {
  logger.info("[QueueAssign] Offer timed out", { orderId, riderId });

  // Notify the rider their offer expired
  const io = getIo();
  if (io) {
    io.to(`delivery:${riderId}`).emit("queue:order_offer_expired", { orderId });
  }

  // Reset rider to waiting
  await Delivery.findByIdAndUpdate(riderId, { $set: { queueStatus: "waiting" } });

  // Offer to next
  await offerToNextInQueue(orderId, warehouseId, skippedIds || [riderId]);
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Clears a pending 60s timeout job for a specific order+rider.
 * We use a job naming convention so we can look it up.
 */
async function removeOfferTimeoutJob(orderId, riderId) {
  try {
    const jobId = `offer:${orderId}:${riderId}`;
    const job = await queueOfferTimeoutQueue.getJob(jobId);
    if (job) await job.remove();
  } catch {
    /* ignore — job may have already fired */
  }
}

/**
 * Falls back to broadcasting the order to all online riders in the area
 * (reuses existing emitDeliveryBroadcastForSeller logic via re-import).
 */
async function fallbackToBroadcast(orderId) {
  try {
    // Dynamic import to avoid circular dependency
    const { emitDeliveryBroadcastForSeller } = await import("./orderSocketEmitter.js");
    const order = await Order.findOne({ orderId })
      .populate("seller", "shopName location serviceRadius")
      .populate("warehouseId", "name location serviceRadius")
      .lean();
    if (order?.seller) {
      await emitDeliveryBroadcastForSeller(order.seller, {
        orderId: order.orderId,
        preview: {
          pickup: order.seller.shopName || "Seller",
          drop: order.address?.address || "Customer",
          total: order.pricing?.total ?? 0,
        },
      });
    } else if (order?.warehouseId) {
      await emitDeliveryBroadcastForSeller(order.warehouseId, {
        orderId: order.orderId,
        preview: {
          pickup: order.warehouseId.name || "Warehouse",
          drop: order.address?.address || "Customer",
          total: order.pricing?.total ?? 0,
        },
      });
    }
  } catch (err) {
    logger.error("[QueueAssign] Fallback broadcast failed", { orderId, error: err.message });
  }
}
