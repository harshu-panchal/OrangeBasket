/**
 * warehouseGpsWatchdog.js
 * Periodic job processor: verifies GPS presence for all checked-in riders.
 * Also runs inactivity eviction.
 * Called by BullMQ repeatable job every 60 seconds.
 */
import WarehouseCheckin from "../models/warehouseCheckin.js";
import Warehouse from "../models/warehouse.js";
import { verifyRiderStillPresent, evictInactiveRiders } from "./warehouseCheckinService.js";
import logger from "./logger.js";

/**
 * Main watchdog processor — called by the BullMQ job processor.
 */
export async function runGpsWatchdog() {
  logger.info("[GPS Watchdog] Starting cycle");

  // 1. Fetch all active checkins
  const activeCheckins = await WarehouseCheckin.find({ status: "active" })
    .select("_id deliveryId warehouseId currentOrderId")
    .lean();

  if (activeCheckins.length === 0) {
    logger.info("[GPS Watchdog] No active checkins, cycle done");
    return { processed: 0, evicted: 0 };
  }

  let evictedCount = 0;

  // 2. Verify GPS presence for each checked-in rider
  // Skip riders who are currently mid-delivery (don't evict them for leaving warehouse)
  const gpsCheckResults = await Promise.allSettled(
    activeCheckins
      .filter((c) => !c.currentOrderId) // Don't GPS-evict riders on active delivery
      .map((c) => verifyRiderStillPresent(c._id)),
  );

  for (const result of gpsCheckResults) {
    if (result.status === "fulfilled" && result.value?.present === false) {
      evictedCount++;
    }
  }

  // 3. Inactivity eviction — per warehouse
  const warehouseIds = [...new Set(activeCheckins.map((c) => String(c.warehouseId)))];
  const inactivityResults = await Promise.allSettled(
    warehouseIds.map((wid) => evictInactiveRiders(wid)),
  );

  for (const r of inactivityResults) {
    if (r.status === "fulfilled") evictedCount += r.value;
  }

  logger.info("[GPS Watchdog] Cycle complete", {
    totalChecked: activeCheckins.length,
    evicted: evictedCount,
  });

  return { processed: activeCheckins.length, evicted: evictedCount };
}
