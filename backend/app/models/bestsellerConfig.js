import mongoose from "mongoose";

const bestsellerConfigSchema = new mongoose.Schema(
  {
    headerId: {
      type: String, // 'all' for Home page, or ObjectId string for specific Header Categories
      required: true,
      unique: true,
    },
    mainCategoryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
  },
  { timestamps: true }
);

const BestsellerConfig = mongoose.model("BestsellerConfig", bestsellerConfigSchema);
export default BestsellerConfig;
