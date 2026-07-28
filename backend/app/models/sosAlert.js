import mongoose from "mongoose";

const sosAlertSchema = new mongoose.Schema(
    {
        deliveryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
            required: true,
            index: true,
        },

        deliveryName: {
            type: String,
            required: true,
        },

        deliveryPhone: {
            type: String,
            required: true,
        },

        emergencyContacts: [
            {
                name: { type: String },
                phone: { type: String },
            },
        ],

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

        status: {
            type: String,
            enum: ["active", "acknowledged", "resolved"],
            default: "active",
            index: true,
        },

        acknowledgedAt: {
            type: Date,
        },

        resolvedAt: {
            type: Date,
        },

        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

sosAlertSchema.index({ location: "2dsphere" });
sosAlertSchema.index({ createdAt: -1 });

sosAlertSchema.virtual("id").get(function () {
    return this._id.toHexString();
});

export default mongoose.model("SOSAlert", sosAlertSchema);
