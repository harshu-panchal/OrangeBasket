import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Lower-cased name used for per-warehouse uniqueness
    nameKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // Brand-wise margin percentage. null = not set (falls through to subcategory/default)
    margin: {
      type: Number,
      default: null,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

brandSchema.index({ warehouseId: 1, nameKey: 1 }, { unique: true });

export default mongoose.model("Brand", brandSchema);
