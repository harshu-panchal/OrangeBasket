/**
 * queueOfferTimeoutJob.js
 * Registers the 20-second offer timeout processor for warehouse queue order offers.
 * When a rider doesn't respond within 20s, the offer moves to the next rider.
 */
import { queueOfferTimeoutQueue, JOB_NAMES } from "../queues/orderQueues.js";
import { handleOfferTimeout } from "../services/warehouseQueueAssignmentService.js";
import { isRedisEnabled } from "../config/redis.js";
import logger from "../services/logger.js";

export function registerQueueOfferTimeoutProcessor() {
  if (!isRedisEnabled()) {
    logger.info("[QueueOfferTimeout] Redis disabled — skipping job registration");
    return;
  }

  queueOfferTimeoutQueue.process(JOB_NAMES.QUEUE_OFFER_TIMEOUT, async (job) => {
    const { orderId, warehouseId, riderId, skippedIds, offeredAt } = job.data;
    const elapsedMs = Date.now() - (offeredAt || 0);

    logger.info("[QueueOfferTimeout] Processing timeout", { orderId, riderId, elapsedMs });

    try {
      await handleOfferTimeout({ orderId, warehouseId, riderId, skippedIds });
    } catch (err) {
      logger.error("[QueueOfferTimeout] Failed to process timeout", {
        orderId,
        riderId,
        error: err.message,
      });
      throw err;
    }
  });

  queueOfferTimeoutQueue.on("failed", (job, err) => {
    logger.error("[QueueOfferTimeout] Job failed", {
      jobId: job?.id,
      orderId: job?.data?.orderId,
      error: err?.message,
    });
  });

  logger.info("[QueueOfferTimeout] Processor registered");
}
