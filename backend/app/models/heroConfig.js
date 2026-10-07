import mongoose from "mongoose";

const promotionalBannerItemSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: false },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    discountPrefix: { type: String, trim: true },
    discountBadge: { type: String, trim: true },
    originalPrice: { type: Number },
    offerPrice: { type: Number },
    ctaText: { type: String, trim: true },
    icon: { type: String, trim: true },
    cardSize: {
      type: String,
      enum: ["large_vertical", "square", "strip"],
      default: "square",
    },
    bgColor: { type: String, trim: true, default: "" },
    textColor: { type: String, trim: true, default: "" },
    prefixBgColor: { type: String, trim: true, default: "" },
    badgeBgColor: { type: String, trim: true, default: "" },
    linkType: {
      type: String,
      enum: ["none", "header", "category", "subcategory", "product", "url"],
      default: "none",
    },
    linkValue: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { _id: true }
);

const heroBannerItemSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    linkType: {
      type: String,
      enum: ["none", "header", "category", "subcategory", "product", "url"],
      default: "none",
    },
    linkValue: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { _id: false }
);

const heroConfigSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      enum: ["home", "header", "monthly_basket"],
      required: true,
    },
    headerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    bannerType: {
      type: String,
      enum: ["standard", "promotional"],
      default: "standard",
    },
    banners: {
      items: [heroBannerItemSchema],
      default: [],
    },
    promotionalBanners: {
      items: { type: [promotionalBannerItemSchema], default: [] },
      bgColor: { type: String, trim: true, default: "" },
    },
    categoryIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],
  },
  { timestamps: true }
);

heroConfigSchema.index({ pageType: 1, headerId: 1 }, { unique: true });

export default mongoose.model("HeroConfig", heroConfigSchema);
