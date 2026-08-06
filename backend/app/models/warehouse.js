import mongoose from "mongoose";
import bcrypt from "bcrypt";

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    warehouseName: {
      type: String,
      required: true,
      trim: true,
    },

    // Alias for compatibility with admin/seller utilities
    shopName: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },
    locality: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },

    documents: {
      tradeLicense: { type: String, trim: true },
      gstCertificate: { type: String, trim: true },
      idProof: { type: String, trim: true },
      businessRegistration: { type: String, trim: true },
      fssaiLicense: { type: String, trim: true },
      other: { type: String, trim: true },
    },

    role: {
      type: String,
      default: "warehouse",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reviewedAt: {
      type: Date,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    serviceRadius: {
      type: Number,
      default: 5,
    },
    lastLogin: Date,

    // ── Warehouse Check-in / QR System ──────────────────────────────────
    /** Radius in METERS within which riders must be to check in (default 100m) */
    checkinRadius: {
      type: Number,
      default: 100,
      min: 10,
      max: 2000,
    },

    /** HMAC-SHA256 secret used to sign/verify QR tokens for this warehouse */
    qrCodeSecret: {
      type: String,
      select: false, // never exposed in API responses
    },

    /** When the QR code was last generated/regenerated */
    qrCodeGeneratedAt: {
      type: Date,
      default: null,
    },

    /** Auto-evict riders from queue when GPS moves outside checkinRadius */
    gpsAutoEvict: {
      type: Boolean,
      default: true,
    },

    /** Minutes of rider inactivity before auto-eviction (default 30 min) */
    inactivityTimeoutMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 480,
    },
  },
  { timestamps: true },
);

warehouseSchema.index({ location: "2dsphere" });
warehouseSchema.index({ isActive: 1, isVerified: 1 });

// Sync warehouseName -> shopName alias before save
warehouseSchema.pre("save", function (next) {
  if (this.warehouseName && !this.shopName) {
    this.shopName = this.warehouseName;
  }
  next();
});

// Hash password before saving
warehouseSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
warehouseSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Warehouse", warehouseSchema);
