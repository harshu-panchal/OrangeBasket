import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: "../backend/.env" });

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/orangebasket";
console.log("Connecting to:", uri);

const WarehouseSchema = new mongoose.Schema({}, { strict: false });
const Warehouse = mongoose.model("Warehouse", WarehouseSchema, "warehouses");

const SellerSchema = new mongoose.Schema({}, { strict: false });
const Seller = mongoose.model("Seller", SellerSchema, "sellers");

const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", ProductSchema, "products");

async function check() {
  await mongoose.connect(uri);
  console.log("Connected successfully!");

  const warehouses = await Warehouse.find({}).lean();
  console.log("\nWAREHOUSES:");
  warehouses.forEach(w => {
    console.log(`- ID: ${w._id}, Name: ${w.name || w.username}, Active: ${w.isActive}, Location: ${JSON.stringify(w.location)}, Radius: ${w.serviceRadius}`);
  });

  const sellers = await Seller.find({}).lean();
  console.log("\nSELLERS:");
  sellers.forEach(s => {
    console.log(`- ID: ${s._id}, ShopName: ${s.shopName}, Active: ${s.isActive}, Location: ${JSON.stringify(s.location)}, Radius: ${s.serviceRadius}`);
  });

  // Check product banana
  const banana = await Product.findOne({ name: /banana/i }).lean();
  if (banana) {
    console.log("\nBANANA PRODUCT:");
    console.log(`- ID: ${banana._id}, SellerId/WarehouseId: ${banana.sellerId}, Status: ${banana.status}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
