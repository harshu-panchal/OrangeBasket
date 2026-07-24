/**
 * DeliveryEarningsService
 *
 * Owns the read-side aggregations for the delivery partner's dashboard:
 *   - getDeliveryStats         ← getDeliveryStats handler
 *   - getDeliveryEarnings      ← getDeliveryEarnings handler
 *   - getDeliveryCodCashSummary ← getDeliveryCodCashSummary handler
 *
 * Framework-agnostic. Inputs are primitives; output shapes match the
 * existing HTTP response payloads byte-for-byte so frontend consumers see
 * no change.
 *
 * Throws errors with `err.statusCode` for the auth-failure cases the COD
 * summary handler used to handle inline.
 */

import mongoose from "mongoose";
import Order from "../../models/order.js";
import Transaction from "../../models/transaction.js";
import Wallet from "../../models/wallet.js";
import { roundCurrency } from "../../utils/money.js";
import { buildKey, getOrSet, getTTL } from "../cacheService.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function svcErr(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toDeliveryBoyId(rawId) {
  if (rawId == null) {
    throw svcErr("Unauthorized", 401);
  }
  if (!mongoose.Types.ObjectId.isValid(String(rawId))) {
    throw svcErr("Invalid user id", 401);
  }
  return new mongoose.Types.ObjectId(String(rawId));
}

/**
 * Dashboard summary: total deliveries, today's earnings, incentives, cash in hand.
 * Cached for ~30s (`deliveryStats` TTL) to absorb dashboard polling.
 */
export async function getDeliveryStats(rawId) {
  const deliveryBoyId = toDeliveryBoyId(rawId);
  const cacheKey = buildKey("delivery", "stats", String(deliveryBoyId));
  return getOrSet(
    cacheKey,
    () => computeDeliveryStats(deliveryBoyId),
    getTTL("deliveryStats"),
  );
}

async function computeDeliveryStats(deliveryBoyId) {
  const orders = await Order.find({
    deliveryBoy: deliveryBoyId,
    status: "delivered",
  })
    .select("_id")
    .lean();
  const totalDeliveries = orders.length;

  const pendingOrders = await Order.countDocuments({
    deliveryBoy: deliveryBoyId,
    status: { $nin: ["delivered", "cancelled"] },
  });

  const cancelledOrders = await Order.countDocuments({
    deliveryBoy: deliveryBoyId,
    status: "cancelled",
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const allTransactions = await Transaction.find({
    user: deliveryBoyId,
    userModel: "Delivery",
    createdAt: { $gte: startOfToday },
  })
    .populate("order", "pricing paymentBreakdown")
    .lean();

  const todayEarnings = allTransactions
    .filter(
      (t) =>
        t.status === "Settled" &&
        (t.type === "Delivery Earning" ||
          t.type === "Incentive" ||
          t.type === "Bonus"),
    )
    .reduce((acc, t) => acc + t.amount, 0);

  const incentives = allTransactions
    .filter(
      (t) =>
        t.status === "Settled" &&
        (t.type === "Incentive" || t.type === "Bonus"),
    )
    .reduce((acc, t) => acc + t.amount, 0);

  const tipsReceived = allTransactions
    .filter((t) => t.type === "Delivery Earning" && t.status === "Settled")
    .reduce(
      (acc, t) =>
        acc +
        Number(
          t?.meta?.tipAmount ??
            t?.order?.paymentBreakdown?.riderTipAmount ??
            t?.order?.pricing?.tip ??
            0,
        ),
      0,
    );

  const wallet = await Wallet.findOne({
    ownerType: "DELIVERY_PARTNER",
    ownerId: deliveryBoyId,
  })
    .select("cashInHand")
    .lean();
  const cashCollected = roundCurrency(wallet?.cashInHand || 0);

  // Simple incentive tier mock logic for UI
  const targetOrders = 10;
  const remainingOrders = targetOrders - (totalDeliveries % targetOrders);
  const incentiveAmount = 300;

  return {
    today: todayEarnings,
    deliveries: totalDeliveries,
    pendingDeliveries: pendingOrders,
    cancelledDeliveries: cancelledOrders,
    incentiveData: {
      remainingOrders: remainingOrders === 0 ? targetOrders : remainingOrders,
      amount: incentiveAmount,
      tipsReceived: tipsReceived
    },
    incentives,
    cashCollected,
  };
}

/**
 * Earnings page payload: totals, 7-day chart, latest 20 transactions.
 * Cached for ~30s (`deliveryEarnings` TTL) to absorb dashboard polling.
 */
export async function getDeliveryEarnings(rawId, timeframe = "weekly", targetDateStr = null) {
  const deliveryBoyId = toDeliveryBoyId(rawId);
  const dateKey = targetDateStr ? targetDateStr.split('T')[0] : "now";
  const cacheKey = buildKey("delivery", "earnings", String(deliveryBoyId), timeframe, dateKey);
  return getOrSet(
    cacheKey,
    () => computeDeliveryEarnings(deliveryBoyId, timeframe, targetDateStr),
    getTTL("deliveryEarnings"),
  );
}

async function computeDeliveryEarnings(deliveryBoyId, timeframe = "weekly", targetDateStr = null) {
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  
  let startBound = new Date(targetDate);
  let endBound = new Date(targetDate);
  
  if (timeframe === "daily") {
    startBound.setHours(0, 0, 0, 0);
    endBound.setHours(23, 59, 59, 999);
  } else if (timeframe === "monthly") {
    startBound = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    endBound = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    const day = targetDate.getDay(); 
    const diffToMonday = targetDate.getDate() - day + (day === 0 ? -6 : 1);
    startBound = new Date(targetDate.setDate(diffToMonday));
    startBound.setHours(0, 0, 0, 0);
    endBound = new Date(startBound);
    endBound.setDate(startBound.getDate() + 6);
    endBound.setHours(23, 59, 59, 999);
  }

  const transactions = await Transaction.find({
    user: deliveryBoyId,
    userModel: "Delivery",
    createdAt: { $gte: startBound, $lte: endBound }
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("order", "orderId pricing paymentBreakdown");

  const wallet = await Wallet.findOne({
    ownerType: "DELIVERY_PARTNER",
    ownerId: deliveryBoyId,
  })
    .select("cashInHand")
    .lean();

  const totalEarnings = transactions
    .filter(
      (t) =>
        t.status === "Settled" &&
        (t.type === "Delivery Earning" ||
          t.type === "Incentive" ||
          t.type === "Bonus"),
    )
    .reduce((acc, t) => acc + t.amount, 0);

  const tipsReceived = transactions
    .filter((t) => t.type === "Delivery Earning" && t.status === "Settled")
    .reduce(
      (acc, t) =>
        acc +
        Number(
          t?.meta?.tipAmount ??
            t?.order?.paymentBreakdown?.riderTipAmount ??
            t?.order?.pricing?.tip ??
            0,
        ),
      0,
    );

  const onlinePay = transactions
    .filter((t) => t.type === "Delivery Earning" && t.status === "Settled")
    .reduce((acc, t) => acc + t.amount, 0);

  const incentives = transactions
    .filter(
      (t) =>
        (t.type === "Incentive" || t.type === "Bonus") && t.status === "Settled",
    )
    .reduce((acc, t) => acc + t.amount, 0);

  const cashCollected = roundCurrency(wallet?.cashInHand || 0);

  const chartData = [];
  
  if (timeframe === "daily") {
    const blocks = ["12AM", "4AM", "8AM", "12PM", "4PM", "8PM"];
    const blockTotals = [0, 0, 0, 0, 0, 0];
    const blockIncentives = [0, 0, 0, 0, 0, 0];
    
    transactions.forEach(t => {
      if (t.status === "Settled" && ["Delivery Earning", "Incentive", "Bonus"].includes(t.type)) {
        const hour = new Date(t.createdAt).getHours();
        const blockIndex = Math.floor(hour / 4);
        blockTotals[blockIndex] += t.amount;
        if (t.type === "Incentive" || t.type === "Bonus") {
          blockIncentives[blockIndex] += t.amount;
        }
      }
    });
    
    for (let i = 0; i < 6; i++) {
      chartData.push({
        name: blocks[i],
        earnings: blockTotals[i] - blockIncentives[i],
        incentives: blockIncentives[i]
      });
    }
  } else if (timeframe === "monthly") {
    const weekTotals = [0, 0, 0, 0, 0];
    const weekIncentives = [0, 0, 0, 0, 0];
    
    transactions.forEach(t => {
      if (t.status === "Settled" && ["Delivery Earning", "Incentive", "Bonus"].includes(t.type)) {
        const date = new Date(t.createdAt).getDate();
        const weekIndex = Math.min(Math.floor((date - 1) / 7), 4);
        weekTotals[weekIndex] += t.amount;
        if (t.type === "Incentive" || t.type === "Bonus") {
          weekIncentives[weekIndex] += t.amount;
        }
      }
    });
    
    for (let i = 0; i < 5; i++) {
      chartData.push({
        name: `W${i+1}`,
        earnings: weekTotals[i] - weekIncentives[i],
        incentives: weekIncentives[i]
      });
    }
  } else {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayIncentives = [0, 0, 0, 0, 0, 0, 0];
    
    transactions.forEach(t => {
      if (t.status === "Settled" && ["Delivery Earning", "Incentive", "Bonus"].includes(t.type)) {
        let dayIndex = new Date(t.createdAt).getDay() - 1;
        if (dayIndex === -1) dayIndex = 6;
        dayTotals[dayIndex] += t.amount;
        if (t.type === "Incentive" || t.type === "Bonus") {
          dayIncentives[dayIndex] += t.amount;
        }
      }
    });
    
    for (let i = 0; i < 7; i++) {
      chartData.push({
        name: days[i],
        earnings: dayTotals[i] - dayIncentives[i],
        incentives: dayIncentives[i]
      });
    }
  }

  return {
    totalEarnings,
    onlinePay,
    incentives,
    tipsReceived,
    cashCollected,
    chartData,
    transactions: transactions.slice(0, 20),
  };
}

/**
 * COD cash summary: system float, cash in hand, per-order toRemit/toCollect.
 * Cached for ~30s (`deliveryCodSummary` TTL).
 */
export async function getDeliveryCodCashSummary(rawId) {
  const deliveryBoyId = toDeliveryBoyId(rawId);
  const cacheKey = buildKey("delivery", "codSummary", String(deliveryBoyId));
  return getOrSet(
    cacheKey,
    () => computeDeliveryCodCashSummary(deliveryBoyId),
    getTTL("deliveryCodSummary"),
  );
}

async function computeDeliveryCodCashSummary(deliveryBoyId) {
  const wallet = await Wallet.findOne({
    ownerType: "DELIVERY_PARTNER",
    ownerId: deliveryBoyId,
  })
    .select("cashInHand")
    .lean();

  const orders = await Order.find({
    deliveryBoy: deliveryBoyId,
    paymentMode: "COD",
    status: { $ne: "cancelled" },
    orderStatus: { $ne: "cancelled" },
  })
    .select(
      "orderId status orderStatus deliveredAt createdAt financeFlags paymentBreakdown pricing",
    )
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const normalized = orders.map((order) => {
    const codMarkedCollected = Boolean(
      order.financeFlags?.codMarkedCollected,
    );
    const gross = roundCurrency(
      order.paymentBreakdown?.grandTotal ?? order.pricing?.total ?? 0,
    );
    const riderCommission = roundCurrency(
      order.paymentBreakdown?.riderPayoutTotal ?? 0,
    );

    const estimatedNet = roundCurrency(Math.max(gross - riderCommission, 0));
    const pendingNet = roundCurrency(
      order.paymentBreakdown?.codPendingAmount ?? 0,
    );
    const contribution = codMarkedCollected ? pendingNet : estimatedNet;

    return {
      orderId: order.orderId,
      status: order.status,
      orderStatus: order.orderStatus,
      deliveredAt: order.deliveredAt || null,
      createdAt: order.createdAt || null,
      codMarkedCollected,
      amountGross: gross,
      riderCommission,
      amountNetExpected: estimatedNet,
      amountNetPending: pendingNet,
      systemFloatContribution: contribution,
    };
  });

  const systemFloatCOD = roundCurrency(
    normalized.reduce(
      (sum, row) => sum + Number(row.systemFloatContribution || 0),
      0,
    ),
  );

  const toRemit = normalized
    .filter(
      (row) => row.codMarkedCollected && Number(row.amountNetPending || 0) > 0,
    )
    .slice(0, 50);

  const toCollect = normalized
    .filter(
      (row) =>
        !row.codMarkedCollected && Number(row.amountNetExpected || 0) > 0,
    )
    .slice(0, 50);

  return {
    systemFloatCOD,
    cashInHand: roundCurrency(wallet?.cashInHand || 0),
    toRemit,
    toCollect,
  };
}

export default {
  getDeliveryStats,
  getDeliveryEarnings,
  getDeliveryCodCashSummary,
};
