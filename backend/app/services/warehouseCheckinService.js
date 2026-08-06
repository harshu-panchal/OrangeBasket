/**
 * warehouseCheckinService.js
 * Core check-in/check-out logic, FIFO queue management, and GPS presence verification.
 */
import mongoose from "mongoose";
import WarehouseCheckin from "../models/warehouseCheckin.js";
import Warehouse from "../models/warehouse.js";
import Delivery from "../models/delivery.js";
import { verifyWarehouseQRToken } from "./warehouseQrService.js";
import { distanceMeters } from "../utils/geoUtils.js";
import { getIO } from "../socket/socketManager.js";
import logger from "./logger.js";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function emitQueueEvent(warehouseId, event, payload) {
  try {
    const io = getIO();
    const wid = String(warehouseId);
    const fullPayload = { ...payload, warehouseId: wid };
    io.to(`warehouse:${wid}`).emit(event, fullPayload);
    io.to("admin:monitors").emit(event, fullPayload);
  } catch {
    /* socket not yet initialized — safe to ignore */
  }
}

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

/* ─── Check-in ────────────────────────────────────────────────────────────── */

/**
 * Check a rider into a warehouse after verifying QR token and GPS proximity.
 *
 * @param {string} deliveryId  - Rider's MongoDB ObjectId
 * @param {string} qrToken     - Signed token scanned from warehouse QR code
 * @param {number} riderLat    - Rider's current latitude
 * @param {number} riderLng    - Rider's current longitude
 */
export async function checkInRider(deliveryId, qrToken, riderLat, riderLng) {
  // 1. Validate inputs
  if (!Number.isFinite(riderLat) || !Number.isFinite(riderLng)) {
    const err = new Error("Valid GPS coordinates are required for check-in");
    err.statusCode = 400;
    throw err;
  }

  // 2. Verify QR token → get warehouseId
  const warehouseId = await verifyWarehouseQRToken(qrToken);

  // 3. Fetch warehouse GPS + checkinRadius
  const warehouse = await Warehouse.findById(warehouseId)
    .select("location checkinRadius gpsAutoEvict warehouseName name isActive isVerified")
    .lean();

  if (!warehouse?.location?.coordinates?.length) {
    const err = new Error("Warehouse GPS location is not configured");
    err.statusCode = 422;
    throw err;
  }

  const [wLng, wLat] = warehouse.location.coordinates;
  const checkinRadius = warehouse.checkinRadius || 100;
  const distance = distanceMeters(riderLat, riderLng, wLat, wLng);

  if (distance > checkinRadius) {
    const err = new Error(
      `You are ${Math.round(distance)}m from the warehouse. Must be within ${checkinRadius}m to check in.`,
    );
    err.statusCode = 403;
    err.code = "OUTSIDE_RADIUS";
    err.data = { distance: Math.round(distance), required: checkinRadius };
    throw err;
  }

  // 4. Check if rider is already checked in somewhere
  const existingCheckin = await WarehouseCheckin.findOne({
    deliveryId: toObjectId(deliveryId),
    status: "active",
  }).lean();

  if (existingCheckin) {
    if (String(existingCheckin.warehouseId) === String(warehouseId)) {
      // Already checked in here — idempotent: return current position
      const position = await getQueuePosition(deliveryId, warehouseId);
      return { alreadyCheckedIn: true, position, warehouseId, warehouseName: warehouse.warehouseName || warehouse.name };
    }
    // Checked in at different warehouse — auto check-out first
    await checkOutRider(deliveryId, "new_checkin_elsewhere");
  }

  // 5. Create check-in record
  const checkin = await WarehouseCheckin.create({
    deliveryId: toObjectId(deliveryId),
    warehouseId: toObjectId(warehouseId),
    checkinTime: new Date(),
    gpsLat: riderLat,
    gpsLng: riderLng,
    status: "active",
    lastGpsVerifiedAt: new Date(),
    lastActivityAt: new Date(),
  });

  // 6. Update Delivery record
  await Delivery.findByIdAndUpdate(deliveryId, {
    $set: {
      activeCheckinId: checkin._id,
      activeWarehouseId: toObjectId(warehouseId),
      queueStatus: "waiting",
    },
  });

  // 7. Compute queue position (1-indexed)
  const position = await getQueuePosition(deliveryId, warehouseId);

  // 8. Emit real-time event
  const rider = await Delivery.findById(deliveryId).select("name phone vehicleType").lean();
  emitQueueEvent(warehouseId, "queue:rider_joined", {
    checkinId: checkin._id,
    rider: { id: deliveryId, name: rider?.name, vehicleType: rider?.vehicleType },
    position,
    checkinTime: checkin.checkinTime,
  });

  logger.info("[Checkin] Rider checked in", { deliveryId, warehouseId, position, distance });
  return { success: true, position, checkinId: checkin._id, warehouseId, warehouseName: warehouse.warehouseName || warehouse.name };
}

/**
 * Check in rider automatically by GPS location.
 */
export async function checkInRiderByLocation(deliveryId, riderLat, riderLng) {
  // 1. Validate inputs
  if (riderLat == null || riderLng == null) {
    throw { statusCode: 400, message: "Valid GPS coordinates are required for auto check-in" };
  }

  // 2. Find the closest warehouse within check-in radius
  const warehouses = await Warehouse.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [riderLng, riderLat] },
      }
    }
  }).limit(5);

  if (!warehouses || warehouses.length === 0) {
    throw { statusCode: 404, message: "No warehouses found nearby." };
  }

  let matchedWarehouse = null;
  let finalDistance = 0;

  for (const wh of warehouses) {
    const whLng = wh.location.coordinates[0];
    const whLat = wh.location.coordinates[1];
    const distance = distanceMeters(riderLat, riderLng, whLat, whLng);
    const radius = wh.checkinRadius || 50;

    if (distance <= radius) {
      matchedWarehouse = wh;
      finalDistance = distance;
      break;
    }
  }

  if (!matchedWarehouse) {
    throw { statusCode: 403, message: "You are not within the check-in radius of any warehouse." };
  }

  const warehouseId = matchedWarehouse._id;

  // 3. Ensure rider is not already checked in
  const existing = await WarehouseCheckin.findOne({ deliveryId: toObjectId(deliveryId), status: "active" });
  if (existing) {
    if (String(existing.warehouseId) === String(warehouseId)) {
      return { success: true, alreadyCheckedIn: true, message: "Already checked in here." };
    } else {
      throw { statusCode: 400, message: "You are already checked in at another warehouse. Please check out first." };
    }
  }

  // 4. Create check-in record
  const checkin = await WarehouseCheckin.create({
    deliveryId: toObjectId(deliveryId),
    warehouseId: toObjectId(warehouseId),
    checkinTime: new Date(),
    gpsLat: riderLat,
    gpsLng: riderLng,
    status: "active",
    lastGpsVerifiedAt: new Date(),
    lastActivityAt: new Date(),
  });

  // 5. Update Delivery record
  await Delivery.findByIdAndUpdate(deliveryId, {
    $set: {
      activeCheckinId: checkin._id,
      activeWarehouseId: toObjectId(warehouseId),
      queueStatus: "waiting",
    },
  });

  // 6. Compute queue position (1-indexed)
  const position = await getQueuePosition(deliveryId, warehouseId);

  // 7. Emit real-time event
  const rider = await Delivery.findById(deliveryId).select("name phone vehicleType").lean();
  emitQueueEvent(warehouseId, "queue:rider_joined", {
    checkinId: checkin._id,
    rider: { id: deliveryId, name: rider?.name, vehicleType: rider?.vehicleType },
    position,
    checkinTime: checkin.checkinTime,
  });

  logger.info("[Checkin] Rider auto-checked in via GPS", { deliveryId, warehouseId, position, finalDistance });
  return { success: true, position, checkinId: checkin._id, warehouseId, warehouseName: matchedWarehouse.warehouseName || matchedWarehouse.name };
}

/* ─── Check-out ───────────────────────────────────────────────────────────── */

/**
 * Check a rider out of their current warehouse (manual or forced).
 * @param {string} deliveryId
 * @param {string} reason  e.g. "manual", "gps_evicted", "offline", "inactive", "new_checkin_elsewhere"
 */
export async function checkOutRider(deliveryId, reason = "manual") {
  const checkin = await WarehouseCheckin.findOneAndUpdate(
    { deliveryId: toObjectId(deliveryId), status: "active" },
    {
      $set: {
        status: reason === "manual" || reason === "new_checkin_elsewhere" ? "checked_out" : "auto_evicted",
        checkoutTime: new Date(),
        evictionReason: reason,
      },
    },
    { new: true },
  );

  if (!checkin) return null; // Already checked out — idempotent

  // Clear Delivery queue fields
  const statusMap = {
    offline: "offline",
    manual: "not_checked_in",
    new_checkin_elsewhere: "not_checked_in",
  };
  await Delivery.findByIdAndUpdate(deliveryId, {
    $set: {
      activeCheckinId: null,
      activeWarehouseId: null,
      queueStatus: statusMap[reason] || "not_checked_in",
    },
  });

  emitQueueEvent(checkin.warehouseId, "queue:rider_left", {
    riderId: String(deliveryId),
    reason,
    checkinId: checkin._id,
  });

  // Broadcast updated full queue snapshot
  broadcastQueueUpdate(checkin.warehouseId).catch(() => {});

  logger.info("[Checkin] Rider checked out", { deliveryId, reason, warehouseId: checkin.warehouseId });
  return checkin;
}

/* ─── Queue Queries ───────────────────────────────────────────────────────── */

/**
 * Returns the full FIFO-ordered queue for a warehouse with populated rider + order info.
 */
export async function getWarehouseQueue(warehouseId) {
  const checkins = await WarehouseCheckin.find({
    warehouseId: toObjectId(warehouseId),
    status: "active",
  })
    .sort({ checkinTime: 1 }) // FIFO: earliest check-in first
    .populate("deliveryId", "name phone vehicleType isOnline queueStatus location")
    .populate("currentOrderId", "orderId pricing.total workflowStatus address.address")
    .lean();

  return checkins.map((c, idx) => ({
    queuePosition: idx + 1,
    checkinId: c._id,
    checkinTime: c.checkinTime,
    lastActivityAt: c.lastActivityAt,
    lastGpsVerifiedAt: c.lastGpsVerifiedAt,
    gpsLat: c.gpsLat,
    gpsLng: c.gpsLng,
    status: c.status,
    rider: c.deliveryId,
    currentOrder: c.currentOrderId,
    skippedOrderCount: (c.skippedOrderIds || []).length,
  }));
}

/**
 * Returns the 1-indexed position of a specific rider in the warehouse queue.
 */
export async function getQueuePosition(deliveryId, warehouseId) {
  const queue = await WarehouseCheckin.find({
    warehouseId: toObjectId(warehouseId),
    status: "active",
  })
    .sort({ checkinTime: 1 })
    .select("deliveryId")
    .lean();

  const idx = queue.findIndex((c) => String(c.deliveryId) === String(deliveryId));
  return idx === -1 ? null : idx + 1;
}

/**
 * Returns the first eligible rider from the queue for an order.
 * Eligibility: online, no active delivery, not already offered this order, active checkin.
 *
 * @param {string} warehouseId
 * @param {string[]} skipRiderIds - IDs of riders already attempted for this order
 */
export async function getNextEligibleRider(warehouseId, skipRiderIds = []) {
  const checkins = await WarehouseCheckin.find({
    warehouseId: toObjectId(warehouseId),
    status: "active",
    deliveryId: { $nin: skipRiderIds.map((id) => toObjectId(id)).filter(Boolean) },
    currentOrderId: null, // not currently handling an order
  })
    .sort({ checkinTime: 1 })
    .populate("deliveryId", "isOnline queueStatus activeCheckinId name")
    .lean();

  for (const checkin of checkins) {
    const rider = checkin.deliveryId;
    if (!rider) continue;
    if (!rider.isOnline) continue;
    if (rider.queueStatus === "delivering" || rider.queueStatus === "order_assigned") continue;
    return checkin; // First eligible
  }

  return null;
}

/* ─── GPS Verification ────────────────────────────────────────────────────── */

/**
 * Checks if a rider is still within the warehouse check-in radius.
 * Used by the GPS watchdog job.
 */
export async function verifyRiderStillPresent(checkinId) {
  const checkin = await WarehouseCheckin.findById(checkinId)
    .populate("deliveryId", "location isOnline")
    .populate("warehouseId", "location checkinRadius gpsAutoEvict")
    .lean();

  if (!checkin || checkin.status !== "active") return { present: false, reason: "not_active" };

  const rider = checkin.deliveryId;
  const warehouse = checkin.warehouseId;

  // If rider is offline, evict
  if (!rider?.isOnline) {
    await checkOutRider(String(checkin.deliveryId._id || checkin.deliveryId), "offline");
    return { present: false, reason: "offline" };
  }

  if (!warehouse?.location?.coordinates?.length) return { present: true }; // Can't verify — give benefit of doubt

  const [wLng, wLat] = warehouse.location.coordinates;
  const coords = rider?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return { present: true }; // No GPS fix yet — keep

  const [rLng, rLat] = coords;
  if (Math.abs(rLat) < 1e-5 && Math.abs(rLng) < 1e-5) return { present: true }; // GPS not initialized

  const radius = warehouse.checkinRadius || 100;
  const dist = distanceMeters(rLat, rLng, wLat, wLng);

  // Update lastGpsVerifiedAt regardless
  await WarehouseCheckin.findByIdAndUpdate(checkinId, {
    $set: { lastGpsVerifiedAt: new Date() },
  });

  if (dist > radius && warehouse.gpsAutoEvict !== false) {
    await checkOutRider(String(rider._id || checkin.deliveryId), "gps_evicted");
    logger.info("[GPS Watchdog] Rider evicted — outside radius", {
      riderId: rider._id,
      dist: Math.round(dist),
      radius,
    });
    return { present: false, reason: "gps_evicted", distance: Math.round(dist) };
  }

  return { present: true, distance: Math.round(dist) };
}

/* ─── Inactivity Check ────────────────────────────────────────────────────── */

/**
 * Evicts riders who have been inactive longer than the warehouse's configured timeout.
 */
export async function evictInactiveRiders(warehouseId) {
  const warehouse = await Warehouse.findById(warehouseId)
    .select("inactivityTimeoutMinutes")
    .lean();
  const timeoutMs = (warehouse?.inactivityTimeoutMinutes || 30) * 60 * 1000;
  const cutoff = new Date(Date.now() - timeoutMs);

  const stale = await WarehouseCheckin.find({
    warehouseId: toObjectId(warehouseId),
    status: "active",
    currentOrderId: null, // don't evict riders mid-delivery
    lastActivityAt: { $lt: cutoff },
  }).lean();

  for (const c of stale) {
    await checkOutRider(String(c.deliveryId), "inactive");
  }

  return stale.length;
}

/* ─── Broadcast Helper ────────────────────────────────────────────────────── */

export async function broadcastQueueUpdate(warehouseId) {
  try {
    const queue = await getWarehouseQueue(warehouseId);
    emitQueueEvent(warehouseId, "queue:updated", { warehouseId: String(warehouseId), queue });
  } catch {
    /* non-fatal */
  }
}

/* ─── Status ──────────────────────────────────────────────────────────────── */

/**
 * Returns the current check-in status for a rider.
 */
export async function getRiderCheckinStatus(deliveryId) {
  const checkin = await WarehouseCheckin.findOne({
    deliveryId: toObjectId(deliveryId),
    status: "active",
  })
    .populate("warehouseId", "warehouseName name location checkinRadius")
    .lean();

  if (!checkin) return { isCheckedIn: false };

  const position = await getQueuePosition(deliveryId, checkin.warehouseId._id);
  return {
    isCheckedIn: true,
    checkinId: checkin._id,
    warehouseId: checkin.warehouseId._id,
    warehouseName: checkin.warehouseId?.warehouseName || checkin.warehouseId?.name,
    checkinTime: checkin.checkinTime,
    queuePosition: position,
    currentOrderId: checkin.currentOrderId,
  };
}
