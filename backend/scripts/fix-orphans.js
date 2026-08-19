import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../app/models/order.js";
import Payment from "../app/models/payment.js";
import PaymentWebhookEvent from "../app/models/paymentWebhookEvent.js";
import OrderOtp from "../app/models/orderOtp.js";

dotenv.config();

async function fixOrphans() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Fixing OrderOtp...");
        const otps = await OrderOtp.find({ orderId: { $regex: /^ORD-.{15,}$/ } }).exec();
        console.log(`Found ${otps.length} OrderOtps with long IDs.`);
        for (const otp of otps) {
            const order = await Order.findById(otp.orderMongoId).exec();
            if (order) {
                otp.orderId = order.orderId;
                await otp.save({ validateBeforeSave: false });
            }
        }

        console.log("Fixing PaymentWebhookEvent...");
        const webhooks = await PaymentWebhookEvent.find({ publicOrderId: { $regex: /^ORD-.{15,}$/ } }).exec();
        console.log(`Found ${webhooks.length} PaymentWebhookEvents with long IDs.`);
        for (const wh of webhooks) {
            const payment = await Payment.findById(wh.payment).exec();
            if (payment) {
                wh.publicOrderId = payment.publicOrderId;
                await wh.save({ validateBeforeSave: false });
            }
        }

        console.log("Cleanup complete!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixOrphans();
