import mongoose from "mongoose";
import dotenv from "dotenv";
import { buildPublicOrderId, buildCheckoutGroupId } from "../app/services/orderIdService.js";
import Order from "../app/models/order.js";
import CheckoutGroup from "../app/models/checkoutGroup.js";
import Payment from "../app/models/payment.js";
import PaymentWebhookEvent from "../app/models/paymentWebhookEvent.js";
import OrderOtp from "../app/models/orderOtp.js";

dotenv.config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Fetching orders to map old to new Order IDs...");
        const orders = await Order.find({ orderId: { $regex: /^ORD-.{15,}$/ } }).exec();
        const checkoutGroups = await CheckoutGroup.find({ checkoutGroupId: { $regex: /^CHK-.{15,}$/ } }).exec();

        console.log(`Found ${orders.length} orders and ${checkoutGroups.length} checkout groups to migrate.`);

        const orderIdMap = {};
        const chkIdMap = {};

        for (const order of orders) {
            orderIdMap[order.orderId] = buildPublicOrderId();
        }

        for (const chk of checkoutGroups) {
            chkIdMap[chk.checkoutGroupId] = buildCheckoutGroupId();
        }

        console.log("Updating Orders...");
        for (const order of orders) {
            const newOrderId = orderIdMap[order.orderId];
            order.orderId = newOrderId;
            if (order.checkoutGroupId && chkIdMap[order.checkoutGroupId]) {
                order.checkoutGroupId = chkIdMap[order.checkoutGroupId];
            }
            await order.save({ validateBeforeSave: false });
        }

        console.log("Updating CheckoutGroups...");
        for (const chk of checkoutGroups) {
            const newChkId = chkIdMap[chk.checkoutGroupId];
            chk.checkoutGroupId = newChkId;
            
            if (chk.publicOrderIds && Array.isArray(chk.publicOrderIds)) {
                chk.publicOrderIds = chk.publicOrderIds.map(id => orderIdMap[id] || id);
            }
            
            if (chk.snapshot && Array.isArray(chk.snapshot.orders)) {
                chk.snapshot.orders.forEach(o => {
                    if (o.publicOrderId && orderIdMap[o.publicOrderId]) {
                        o.publicOrderId = orderIdMap[o.publicOrderId];
                    }
                });
            }
            
            await chk.save({ validateBeforeSave: false });
        }

        console.log("Updating Payments...");
        const payments = await Payment.find().exec();
        for (const p of payments) {
            let updated = false;
            if (p.publicOrderId && orderIdMap[p.publicOrderId]) {
                p.publicOrderId = orderIdMap[p.publicOrderId];
                updated = true;
            }
            if (p.checkoutGroupId && chkIdMap[p.checkoutGroupId]) {
                p.checkoutGroupId = chkIdMap[p.checkoutGroupId];
                updated = true;
            }
            if (updated) {
                await p.save({ validateBeforeSave: false });
            }
        }

        console.log("Updating other string-based records...");
        for (const oldId of Object.keys(orderIdMap)) {
            const newId = orderIdMap[oldId];
            await PaymentWebhookEvent.updateMany({ publicOrderId: oldId }, { $set: { publicOrderId: newId } });
            await OrderOtp.updateMany({ orderId: oldId }, { $set: { orderId: newId } });
        }

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
