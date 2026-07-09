import Order from "../models/order.js";
import Transaction from "../models/transaction.js";
import { handleResponse } from "../utils/helper.js";
import mongoose from "mongoose";
import Wallet from "../models/wallet.js";

/* ===============================
   GET WAREHOUSE DASHBOARD STATS
================================ */
export const getWarehouseStats = async (req, res) => {
    try {
        const warehouseId = new mongoose.Types.ObjectId(req.user.id);
        const range = req.query?.range || "7d";

        const now = new Date();
        const startDate = new Date(now);
        if (range === "30d") startDate.setDate(now.getDate() - 30);
        else if (range === "90d") startDate.setDate(now.getDate() - 90);
        else startDate.setDate(now.getDate() - 7);

        const [overview, recentOrders, categoryMix] = await Promise.all([
            Order.aggregate([
                { $match: { seller: warehouseId, status: { $ne: "cancelled" } } },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: { $ifNull: ["$pricing.total", 0] } },
                        totalOrders: { $sum: 1 },
                        avgOrderValue: { $avg: { $ifNull: ["$pricing.total", 0] } },
                    },
                },
            ]),
            Order.find({ seller: warehouseId, createdAt: { $gte: startDate } })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),
            Order.aggregate([
                { $match: { seller: warehouseId, status: { $ne: "cancelled" } } },
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
        ]);

        const overviewData = overview[0] || { totalSales: 0, totalOrders: 0, avgOrderValue: 0 };

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const salesTrend = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dayStr = d.toDateString();
            const dayOrders = recentOrders.filter(
                (o) => new Date(o.createdAt).toDateString() === dayStr,
            );
            return {
                name: dayNames[d.getDay()],
                sales: dayOrders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0),
            };
        });

        return handleResponse(res, 200, "Stats fetched successfully", {
            overview: {
                totalSales: `₹${Number(overviewData.totalSales || 0).toLocaleString("en-IN")}`,
                totalOrders: overviewData.totalOrders || 0,
                avgOrderValue: `₹${Math.round(overviewData.avgOrderValue || 0).toLocaleString("en-IN")}`,
            },
            salesTrend,
            categoryMix: (categoryMix || []).map((c) => ({
                subject: c._id || "Other",
                A: c.count,
            })),
        });
    } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};

/* ===============================
   GET WAREHOUSE EARNINGS / TRANSACTIONS
================================ */
export const getWarehouseEarnings = async (req, res) => {
    try {
        const warehouseId = req.user.id;
        const warehouseOid = new mongoose.Types.ObjectId(warehouseId);

        const transactions = await Transaction.find({ user: warehouseId, userModel: "Warehouse" })
            .sort({ createdAt: -1 })
            .populate("order", "orderId");

        const settledBalance = transactions
            .filter((t) => t.status === "Settled")
            .reduce((acc, t) => acc + t.amount, 0);

        const pendingPayouts = transactions
            .filter((t) => t.type === "Withdrawal" && (t.status === "Pending" || t.status === "Processing"))
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        const wallet = await Wallet.findOne({ ownerType: "WAREHOUSE", ownerId: warehouseId });
        const onHoldBalance = wallet ? wallet.pendingBalance : 0;
        const liveAvailableBalance = wallet ? wallet.availableBalance : settledBalance;

        const [orderRevenueAgg] = await Order.aggregate([
            { $match: { seller: warehouseOid, status: { $ne: "cancelled" } } },
            { $group: { _id: null, totalRevenue: { $sum: { $ifNull: ["$pricing.total", 0] } } } },
        ]);
        const totalRevenue = Number(orderRevenueAgg?.totalRevenue || 0);

        const totalWithdrawn = transactions
            .filter((t) => t.type === "Withdrawal" && t.status === "Settled")
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyAggregation = await Transaction.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(warehouseId),
                    userModel: "Warehouse",
                    type: "Order Payment",
                    createdAt: { $gte: sixMonthsAgo },
                },
            },
            { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$amount" } } },
            { $sort: { _id: 1 } },
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const dateStr = d.toISOString().slice(0, 7);
            const data = monthlyAggregation.find((m) => m._id === dateStr);
            chartData.push({ name: monthNames[d.getMonth()], revenue: data ? data.revenue : 0 });
        }

        return handleResponse(res, 200, "Earnings fetched successfully", {
            balances: {
                settledBalance,
                pendingPayouts,
                onHoldBalance,
                availableBalance: liveAvailableBalance,
                totalRevenue,
                totalWithdrawn,
            },
            monthlyChart: chartData,
            ledger: transactions.map((t) => ({
                id: (t.reference || t._id).toString(),
                type: t.type,
                amount: t.amount,
                status: t.status,
                date: t.createdAt.toISOString().split("T")[0],
                time: t.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                customer: t.type === "Withdrawal" ? "Bank Transfer" : "Customer",
                ref: t.order ? `#${t.order.orderId}` : t.reference || t._id,
            })),
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
