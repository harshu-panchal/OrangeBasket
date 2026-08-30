import mongoose from "mongoose";

const festivalDealsCardSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
  },
  offerText: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    trim: true,
  },
  backgroundColor: {
    type: String,
    default: "#FFF8E7",
  },
  textColor: {
    type: String,
    default: "#B45309",
  },
  buttonColor: {
    type: String,
    default: "#D97706",
  },
  buttonText: {
    type: String,
    default: "SHOP NOW",
    trim: true,
  },
  redirectType: {
    type: String,
    enum: ["category", "product", "custom"],
    default: "custom",
  },
  redirectUrl: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  }
});

const festivalDealsSectionSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "Top Festival Deals",
      trim: true,
    },
    viewAll: {
      enabled: {
        type: Boolean,
        default: true,
      },
      text: {
        type: String,
        default: "View All",
        trim: true,
      },
      url: {
        type: String,
        trim: true,
      }
    },
    cards: [festivalDealsCardSchema],
  },
  { timestamps: true }
);

export default mongoose.model("FestivalDealsSection", festivalDealsSectionSchema);
