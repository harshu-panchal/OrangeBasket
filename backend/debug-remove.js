import mongoose from "mongoose";
import dotenv from "dotenv";
import { removeFromCart } from "./app/controller/cartController.js";

dotenv.config();

async function debug() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("Connected to MongoDB!");

    // Let's mock req and res
    // Product ID: "6a5a03a046c7e2622c4ae109"
    // Variant SKU: "banan-001-eu4axt"
    // User ID: Let's find a user who has this cart
    const req = {
      user: { id: "6a4f69047f84cc0169eed5e5" }, // Cart owner we saw in previous log
      params: { productId: "6a5a03a046c7e2622c4ae109" },
      query: { variantSku: "banan-001-eu4axt" }
    };

    const res = {
      status(code) {
        console.log("Response Status:", code);
        return this;
      },
      json(data) {
        console.log("Response JSON Data:", JSON.stringify(data, null, 2));
        return this;
      }
    };

    console.log("Calling removeFromCart...");
    await removeFromCart(req, res);
    console.log("removeFromCart call finished.");

  } catch (err) {
    console.error("CRITICAL ERROR IN RUNNING CONTROLLER:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

debug();
