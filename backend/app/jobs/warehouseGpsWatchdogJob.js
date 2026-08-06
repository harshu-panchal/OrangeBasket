/**
 * warehouseGpsWatchdogJob.js
 * Registers the repeatable GPS watchdog job that runs every 60 seconds.
 */
import { warehouseGpsWatchdogQueue, JOB_NAMES } from "../queues/orderQueues.js";
import { runGpsWatchdog } from "../services/warehouseGpsWatchdog.js";
import { isRedisEnabled } from "../config/redis.js";
import logger from "../services/logger.js";

const WATCHDOG_INTERVAL_MS = parseInt(process.env.GPS_WATCHDOG_INTERVAL_MS || "60000", 10);

export function registerWarehouseGpsWatchdogProcessor() {
  if (!isRedisEnabled()) {
    logger.info("[GPS Watchdog] Redis disabled — skipping job registration");
    return;
  }

  // Register processor
  warehouseGpsWatchdogQueue.process(JOB_NAMES.WAREHOUSE_GPS_WATCHDOG, async (job) => {
    try {
      const result = await runGpsWatchdog();
      logger.info("[GPS Watchdog] Job completed", result);
      return result;
    } catch (err) {
      logger.error("[GPS Watchdog] Job failed", { error: err.message });
      throw err;
    }
  });

  // Schedule repeatable job
  warehouseGpsWatchdogQueue.add(
    JOB_NAMES.WAREHOUSE_GPS_WATCHDOG,
    {},
    {
      repeat: { every: WATCHDOG_INTERVAL_MS },
      removeOnComplete: 5,
      removeOnFail: 5,
      jobId: "warehouse-gps-watchdog-repeatable",
    },
  );

  warehouseGpsWatchdogQueue.on("failed", (job, err) => {
    logger.error("[GPS Watchdog] Queue job failed", { jobId: job?.id, error: err?.message });
  });

  logger.info("[GPS Watchdog] Registered", { intervalMs: WATCHDOG_INTERVAL_MS });
}
