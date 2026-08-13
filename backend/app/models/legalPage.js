import mongoose from "mongoose";

const legalPageSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["terms", "privacy"],
            required: true,
        },
        audience: {
            type: String,
            enum: ["customer", "seller", "warehouse", "delivery"],
            required: true,
        },
        title: {
            type: String,
            default: "",
        },
        content: {
            type: String,
            default: "",
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

legalPageSchema.index({ type: 1, audience: 1 }, { unique: true });

export default mongoose.model("LegalPage", legalPageSchema);
