/**
 * warehouseMonitorService.js
 * Aggregated data for the queue monitoring dashboard (Warehouse + Admin views).
 */
import mongoose from "mongoose";
import WarehouseCheckin from "../models/warehouseCheckin.js";
import Warehouse from "../models/warehouse.js";

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

/**
 * Returns a detailed queue snapshot for one warehouse.
 */
export async function getQueueSnapshot(warehouseId) {
  const [checkins, warehouse] = await Promise.all([
    WarehouseCheckin.find({ warehouseId: toObjectId(warehouseId), status: "active" })
      .sort({ checkinTime: 1 })
      .populate("deliveryId", "name phone vehicleType isOnline queueStatus location")
      .populate("currentOrderId", "orderId pricing.total workflowStatus address.address customer")
      .lean(),
    Warehouse.findById(warehouseId).select("warehouseName name location checkinRadius").lean(),
  ]);

  const queue = checkins.map((c, idx) => ({
    queuePosition: idx + 1,
    checkinId: c._id,
    checkinTime: c.checkinTime,
    lastActivityAt: c.lastActivityAt,
    lastGpsVerifiedAt: c.lastGpsVerifiedAt,
    status: c.status,
    rider: {
      id: c.deliveryId?._id,
      name: c.deliveryId?.name,
      phone: c.deliveryId?.phone,
      vehicleType: c.deliveryId?.vehicleType,
      isOnline: c.deliveryId?.isOnline,
      queueStatus: c.deliveryId?.queueStatus,
    },
    gpsStatus: {
      checkinLat: c.gpsLat,
      checkinLng: c.gpsLng,
      lastVerifiedAt: c.lastGpsVerifiedAt,
    },
    currentOrder: c.currentOrderId
      ? {
          orderId: c.currentOrderId.orderId,
          total: c.currentOrderId.pricing?.total,
          status: c.currentOrderId.workflowStatus,
          dropAddress: c.currentOrderId.address?.address,
        }
      : null,
  }));

  const stats = computeStats(queue, warehouseId);

  return {
    warehouseId: String(warehouseId),
    warehouseName: warehouse?.warehouseName || warehouse?.name,
    queue,
    stats,
    generatedAt: new Date(),
  };
}

/**
 * Returns snapshots for ALL warehouses (Admin view).
 */
export async function getAllWarehouseSnapshots() {
  const warehouses = await Warehouse.find({})
    .select("_id warehouseName name")
    .lean();

  const snapshots = await Promise.all(
    warehouses.map(async (w) => {
      try {
        return await getQueueSnapshot(w._id);
      } catch (err) {
        console.error("QueueSnapshot Error for", w._id, err);
        return null;
      }
    })
  );

  return snapshots.filter(Boolean);
}

/**
 * Returns queue stats for a single warehouse.
 */
export async function getQueueStats(warehouseId) {
  const snapshot = await getQueueSnapshot(warehouseId);
  return snapshot.stats;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function computeStats(queue, warehouseId) {
  const waiting = queue.filter((r) => !r.currentOrder && r.rider?.queueStatus === "waiting").length;
  const offered = queue.filter((r) => r.rider?.queueStatus === "order_offered").length;
  const delivering = queue.filter(
    (r) => r.rider?.queueStatus === "delivering" || r.rider?.queueStatus === "order_assigned",
  ).length;
  const total = queue.length;

  return {
    total,
    waiting,
    offered,
    delivering,
    firstInQueue: queue[0]?.rider?.name || null,
    lastInQueue: queue[queue.length - 1]?.rider?.name || null,
    firstCheckinTime: queue[0]?.checkinTime || null,
  };
}
