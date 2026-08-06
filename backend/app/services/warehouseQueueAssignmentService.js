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

const OFFER_TIMEOUT_SECONDS = parseInt(process.env.QUEUE_OFFER_TIMEOUT_SECONDS || "20", 10);

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
 * Transitions order to DELIVERY_SEARCH and immediately pops the queue to assign.
 */
export async function warehouseAcceptAtomic(warehouseId, orderId) {
  const { requireCanonicalOrderId } = await import("../utils/orderLookup.js");
  const { legacyStatusFromWorkflow, WORKFLOW_STATUS } = await import("../constants/orderWorkflow.js");
  const { removeSellerTimeoutJob, scheduleDeliveryTimeoutJob } = await import("./orderWorkflowService.js");
  const { INITIAL_DELIVERY_RADIUS_M } = await import("../constants/orderWorkflow.js");
  const DeliveryAssignment = (await import("../models/deliveryAssignment.js")).default;
  const { emitOrderStatusUpdate } = await import("./orderSocketEmitter.js");

  const canonicalOrderId = await requireCanonicalOrderId(orderId);
  const now = new Date();
  
  // WAREHOUSES don't broadcast to the map. They pop from the queue.
  // Delivery timeout represents the queue's 20-second offer timeout.
  const deliveryMs = parseInt(process.env.QUEUE_OFFER_TIMEOUT_SECONDS || "20", 10) * 1000;

  const updated = await Order.findOneAndUpdate(
    {
      orderId: canonicalOrderId,
      warehouseId: warehouseId,
      workflowVersion: { $gte: 2 },
      workflowStatus: WORKFLOW_STATUS.SELLER_PENDING,
      sellerPendingExpiresAt: { $gt: now },
    },
    {
      $set: {
        workflowStatus: WORKFLOW_STATUS.DELIVERY_SEARCH,
        status: legacyStatusFromWorkflow(WORKFLOW_STATUS.DELIVERY_SEARCH),
        sellerAcceptedAt: now,
        deliverySearchExpiresAt: new Date(now.getTime() + deliveryMs),
        deliverySearchMeta: {
          radiusMeters: INITIAL_DELIVERY_RADIUS_M ? INITIAL_DELIVERY_RADIUS_M() : 5000,
          attempt: 1,
          lastBroadcastAt: now,
          isWarehouseQueue: true,
        },
      },
      $unset: { expiresAt: 1 },
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

  // We do NOT create a broadcasting DeliveryAssignment right away,
  // because offerToNextInQueue handles creating it!
  
  emitOrderStatusUpdate(
    updated.orderId,
    {
      workflowStatus: WORKFLOW_STATUS.DELIVERY_SEARCH,
      deliverySearchExpiresAt: updated.deliverySearchExpiresAt,
    },
    updated.customer?._id || updated.customer,
  );

  // Auto-assign from queue!
  const queueResult = await offerToNextInQueue(updated.orderId, String(warehouseId), []);
  if (!queueResult.offered && queueResult.reason === "queue_exhausted") {
    logger.warn("[warehouseAccept] Queue empty on accept, fell back to broadcast", { orderId: canonicalOrderId });
  }

  return updated;
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

  // Schedule 20-second timeout job
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
 * Clears a pending 20s timeout job for a specific order+rider.
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
    }
  } catch (err) {
    logger.error("[QueueAssign] Fallback broadcast failed", { orderId, error: err.message });
  }
}
