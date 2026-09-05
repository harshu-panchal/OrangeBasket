import mongoose from "mongoose";

/**
 * KitAddonItem — standalone add-on items that customers can attach
 * to any monthly kit order (e.g. Atta, Oil, Rice).
 * Managed exclusively by Admin; displayed on the Kit Detail page.
 */
const kitAddonItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    mainImage: {
      type: String, // Cloudinary URL
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      trim: true,
      default: "1 kg", // e.g. "1 kg", "1 L", "5 kg"
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxQtyPerOrder: {
      type: Number,
      default: 10,
      min: 1,
    },

    applicableKits: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },
  },
  { timestamps: true }
);

kitAddonItemSchema.index({ status: 1, sortOrder: 1 });

export default mongoose.model("KitAddonItem", kitAddonItemSchema);
