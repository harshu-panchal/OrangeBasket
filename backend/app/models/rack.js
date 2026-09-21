import mongoose from "mongoose";

const rackSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    rackCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

rackSchema.index({ warehouseId: 1, rackCode: 1 }, { unique: true });
rackSchema.index({ warehouseId: 1, isActive: 1 });

export default mongoose.model("Rack", rackSchema);
