import mongoose from "mongoose";
import dotenv from "dotenv";
import { applyDeliveredSettlement } from "./app/services/orderSettlement.js";
import Order from "./app/models/order.js";

dotenv.config({ path: ".env" });

async function check() {
  await mongoose.connect("mongodb+srv://orangebasket:orange123098@orangebasket.el1udca.mongodb.net/orangebasket");
  const order = await Order.findOne({ orderId: "ORD-1M0EV55FNJNRE" }).lean();
  try {
    await applyDeliveredSettlement(order, "ORD-1M0EV55FNJNRE");
  } catch (e) {
    if (e.errors) {
      console.log(e.errors);
    } else {
      console.error(e);
    }
  }
  process.exit(0);
}

check();
