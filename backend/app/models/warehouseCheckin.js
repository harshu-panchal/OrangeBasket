import mongoose from "mongoose";

/**
 * Tracks a delivery rider's check-in session at a warehouse.
 * One "active" document per rider at a time (enforced by service layer).
 * Queue position is derived by sorting `checkinTime ASC` — not stored.
 */
const warehouseCheckinSchema = new mongoose.Schema(
  {
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
      required: true,
      index: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },

    checkinTime: {
      type: Date,
      default: Date.now,
      index: true,
    },

    checkoutTime: {
      type: Date,
      default: null,
    },

    checkinMethod: {
      type: String,
      enum: ["qr_scan", "manual"],
      default: "qr_scan",
    },

    /** Rider's GPS at the time of check-in */
    gpsLat: { type: Number },
    gpsLng: { type: Number },

    status: {
      type: String,
      enum: ["active", "checked_out", "auto_evicted", "offline", "inactive"],
      default: "active",
      index: true,
    },

    /** Reason for non-active status */
    evictionReason: {
      type: String,
      default: null,
    },

    /** Last time GPS was verified by the watchdog */
    lastGpsVerifiedAt: {
      type: Date,
      default: null,
    },

    /** Updated on any rider action (GPS push, order accept, etc.) */
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    /** The order currently being handled by this rider (null = waiting) */
    currentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    /** Track which orders were offered and skipped/timed-out */
    skippedOrderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
  },
  { timestamps: true },
);

// Compound index for efficient FIFO queue queries
warehouseCheckinSchema.index({ warehouseId: 1, status: 1, checkinTime: 1 });
// Enforce at most one active session per rider
warehouseCheckinSchema.index(
  { deliveryId: 1, status: 1 },
  { partialFilterExpression: { status: "active" } },
);

export default mongoose.model("WarehouseCheckin", warehouseCheckinSchema);
