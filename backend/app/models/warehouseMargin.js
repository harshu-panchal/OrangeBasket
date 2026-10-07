import mongoose from "mongoose";

// One document per warehouse holding its default + subcategory margins.
// Brand margins live on the Brand document itself.
const warehouseMarginSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      unique: true,
    },
    defaultMargin: {
      type: Number,
      default: 0,
      min: 0,
    },
    subcategoryMargins: [
      {
        subcategoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        margin: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("WarehouseMargin", warehouseMarginSchema);
