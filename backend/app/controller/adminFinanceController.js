import Payout from "../models/payout.js";
import Wallet from "../models/wallet.js";
import Seller from "../models/seller.js";
import Delivery from "../models/delivery.js";
import Warehouse from "../models/warehouse.js";
import Transaction from "../models/transaction.js";
import Notification from "../models/notification.js";
import handleResponse from "../utils/helper.js";
import { getAdminFinanceSummary, debitWallet } from "../services/finance/walletService.js";
import { getLedgerEntries } from "../services/finance/ledgerService.js";
import { bulkProcessPayouts } from "../services/finance/payoutService.js";
import { exportFinanceStatement } from "../services/finance/statementService.js";
import {
  FINANCE_AUDIT_ACTION,
  OWNER_TYPE,
} from "../constants/finance.js";
import {
  getOrCreateFinanceSettings,
  updateDeliveryFinanceSettings,
} from "../services/finance/financeSettingsService.js";
import { createFinanceAuditLog } from "../services/finance/auditLogService.js";
import {
  financeLedgerQuerySchema,
  payoutProcessSchema,
  updateDeliverySettingsSchema,
} from "../validation/financeValidation.js";
import { validateBodySafe as validateWithJoi } from "../middleware/validate.js";

export const getAdminFinanceSummaryController = async (req, res) => {
  try {
    const summary = await getAdminFinanceSummary();
    return handleResponse(res, 200, "Admin finance summary fetched", summary);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getAdminFinanceLedgerController = async (req, res) => {
  try {
    const validated = validateWithJoi(financeLedgerQuerySchema, req.query || {});
    if (!validated.isValid) {
      return handleResponse(res, 400, validated.message);
    }
    const ledger = await getLedgerEntries(validated.value);
    return handleResponse(res, 200, "Finance ledger fetched", ledger);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getAdminFinancePayoutsController = async (req, res) => {
  try {
    const {
      seller,
      rider,
      status,
      page = 1,
      limit = 25,
    } = req.query;

    const query = {};
    if (status) query.status = status;

    const includeSeller = String(seller).toLowerCase() === "true";
    const includeRider = String(rider).toLowerCase() === "true";
    if (includeSeller && !includeRider) query.payoutType = "SELLER";
    if (!includeSeller && includeRider) query.payoutType = "DELIVERY_PARTNER";

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const skip = (safePage - 1) * safeLimit;

    const [rawItems, total] = await Promise.all([
      Payout.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate("relatedOrderIds", "orderId paymentMode paymentStatus status")
        .lean(),
      Payout.countDocuments(query),
    ]);

    const sellerIds = rawItems
      .filter((item) => item.payoutType === "SELLER")
      .map((item) => item.beneficiaryId);
    const riderIds = rawItems
      .filter((item) => item.payoutType === "DELIVERY_PARTNER")
      .map((item) => item.beneficiaryId);

    const [sellers, riders] = await Promise.all([
      Seller.find({ _id: { $in: sellerIds } })
        .select("_id shopName name phone")
        .lean(),
      Delivery.find({ _id: { $in: riderIds } })
        .select("_id name phone")
        .lean(),
    ]);

    const sellerMap = new Map(sellers.map((seller) => [String(seller._id), seller]));
    const riderMap = new Map(riders.map((rider) => [String(rider._id), rider]));

    const items = rawItems.map((item) => {
      const beneficiary =
        item.payoutType === "SELLER"
          ? sellerMap.get(String(item.beneficiaryId))
          : riderMap.get(String(item.beneficiaryId));
      return {
        ...item,
        beneficiary: beneficiary || null,
      };
    });

    return handleResponse(res, 200, "Finance payouts fetched", {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const processAdminFinancePayoutsController = async (req, res) => {
  try {
    const validated = validateWithJoi(payoutProcessSchema, req.body || {});
    if (!validated.isValid) {
      return handleResponse(res, 400, validated.message);
    }

    const result = await bulkProcessPayouts({
      payoutIds: validated.value.payoutIds,
      payoutType: validated.value.payoutType,
      limit: validated.value.limit,
      remarks: validated.value.remarks || "",
      adminId: req.user?.id || null,
    });

    return handleResponse(res, 200, "Payout processing completed", result);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getAdminFinanceOutstandingBalances = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role && role !== "all") {
      const roleMap = {
        seller: "SELLER",
        delivery: "DELIVERY_PARTNER",
        warehouse: "WAREHOUSE",
      };
      if (roleMap[role]) {
        query.ownerType = roleMap[role];
      }
    } else {
      query.ownerType = { $in: ["SELLER", "DELIVERY_PARTNER", "WAREHOUSE"] };
    }

    const [sellers, deliveries, warehouses, wallets, allPendingTxns] = await Promise.all([
      (role === 'all' || role === 'seller') ? Seller.find({}).select("name phone shopName email bankDetails").lean() : [],
      (role === 'all' || role === 'delivery') ? Delivery.find({}).select("name phone email vehicleType bankDetails").lean() : [],
      (role === 'all' || role === 'warehouse') ? Warehouse.find({}).select("name phone email warehouseName bankDetails").lean() : [],
      Wallet.find(query).lean(),
      Transaction.find({
        type: "Withdrawal",
        status: { $in: ["Pending", "Processing"] },
      }).lean(),
    ]);

    const walletMap = new Map();
    wallets.forEach((w) => {
      walletMap.set(`${w.ownerType}_${String(w.ownerId)}`, w);
    });

    const pendingMap = new Map();
    allPendingTxns.forEach((t) => {
      const key = String(t.user);
      const amt = Math.abs(t.amount || 0);
      const existing = pendingMap.get(key) || { totalPending: 0, count: 0 };
      existing.totalPending += amt;
      existing.count += 1;
      pendingMap.set(key, existing);
    });

    const partnerItems = [];
    const processedKeys = new Set();

    if (role === 'all' || role === 'seller') {
      sellers.forEach((s) => {
        const key = `SELLER_${String(s._id)}`;
        processedKeys.add(key);
        const w = walletMap.get(key);
        const pendingInfo = pendingMap.get(String(s._id)) || { totalPending: 0, count: 0 };
        partnerItems.push({
          walletId: w?._id || `virtual_${s._id}`,
          ownerId: s._id,
          ownerType: "SELLER",
          availableBalance: w?.availableBalance || 0,
          pendingBalance: pendingInfo.totalPending,
          hasPendingRequest: pendingInfo.totalPending > 0,
          pendingRequestCount: pendingInfo.count,
          userDetails: s,
        });
      });
    }

    if (role === 'all' || role === 'delivery') {
      deliveries.forEach((d) => {
        const key = `DELIVERY_PARTNER_${String(d._id)}`;
        processedKeys.add(key);
        const w = walletMap.get(key);
        const pendingInfo = pendingMap.get(String(d._id)) || { totalPending: 0, count: 0 };
        partnerItems.push({
          walletId: w?._id || `virtual_${d._id}`,
          ownerId: d._id,
          ownerType: "DELIVERY_PARTNER",
          availableBalance: w?.availableBalance || 0,
          pendingBalance: pendingInfo.totalPending,
          hasPendingRequest: pendingInfo.totalPending > 0,
          pendingRequestCount: pendingInfo.count,
          userDetails: d,
        });
      });
    }

    if (role === 'all' || role === 'warehouse') {
      warehouses.forEach((wh) => {
        const key = `WAREHOUSE_${String(wh._id)}`;
        processedKeys.add(key);
        const w = walletMap.get(key);
        const pendingInfo = pendingMap.get(String(wh._id)) || { totalPending: 0, count: 0 };
        partnerItems.push({
          walletId: w?._id || `virtual_${wh._id}`,
          ownerId: wh._id,
          ownerType: "WAREHOUSE",
          availableBalance: w?.availableBalance || 0,
          pendingBalance: pendingInfo.totalPending,
          hasPendingRequest: pendingInfo.totalPending > 0,
          pendingRequestCount: pendingInfo.count,
          userDetails: wh,
        });
      });
    }

    wallets.forEach((w) => {
      const key = `${w.ownerType}_${String(w.ownerId)}`;
      if (!processedKeys.has(key)) {
        const pendingInfo = pendingMap.get(String(w.ownerId)) || { totalPending: 0, count: 0 };
        partnerItems.push({
          walletId: w._id,
          ownerId: w.ownerId,
          ownerType: w.ownerType,
          availableBalance: w.availableBalance || 0,
          pendingBalance: pendingInfo.totalPending,
          hasPendingRequest: pendingInfo.totalPending > 0,
          pendingRequestCount: pendingInfo.count,
          userDetails: { name: "Unknown Partner", phone: "N/A" },
        });
      }
    });

    partnerItems.sort((a, b) => {
      if (a.hasPendingRequest !== b.hasPendingRequest) {
        return b.hasPendingRequest ? 1 : -1;
      }
      if (b.availableBalance !== a.availableBalance) {
        return b.availableBalance - a.availableBalance;
      }
      return (a.userDetails?.name || '').localeCompare(b.userDetails?.name || '');
    });

    const total = partnerItems.length;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (safePage - 1) * safeLimit;
    const paginatedItems = partnerItems.slice(skip, skip + safeLimit);

    const [summaryAgg, pendingSummaryAgg] = await Promise.all([
      Wallet.aggregate([
        { $match: { ownerType: { $in: ["SELLER", "DELIVERY_PARTNER", "WAREHOUSE"] } } },
        { $group: { _id: "$ownerType", totalAvailable: { $sum: "$availableBalance" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            type: "Withdrawal",
            status: { $in: ["Pending", "Processing"] },
            userModel: { $in: ["Seller", "Delivery", "Warehouse"] },
          },
        },
        {
          $group: {
            _id: "$userModel",
            totalRequested: { $sum: { $abs: "$amount" } },
          },
        },
      ]),
    ]);

    const summary = {
      SELLER: 0,
      DELIVERY_PARTNER: 0,
      WAREHOUSE: 0,
      TOTAL: 0,
      REQUESTED_SELLER: 0,
      REQUESTED_DELIVERY: 0,
      REQUESTED_WAREHOUSE: 0,
      TOTAL_REQUESTED: 0,
    };

    summaryAgg.forEach((s) => {
      summary[s._id] = s.totalAvailable;
      summary.TOTAL += s.totalAvailable;
    });

    const roleModelMap = {
      Seller: "REQUESTED_SELLER",
      Delivery: "REQUESTED_DELIVERY",
      Warehouse: "REQUESTED_WAREHOUSE",
    };

    pendingSummaryAgg.forEach((ps) => {
      const key = roleModelMap[ps._id];
      if (key) {
        summary[key] = ps.totalRequested;
      }
      summary.TOTAL_REQUESTED += ps.totalRequested;
    });

    return handleResponse(res, 200, "Outstanding balances fetched", {
      items: paginatedItems,
      summary,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const settleOutstandingBalance = async (req, res) => {
  try {
    const { ownerType, ownerId, amount, remarks } = req.body;
    
    if (!ownerType || !ownerId || !amount) {
      return handleResponse(res, 400, "Missing required fields");
    }

    const settleAmt = Number(amount);
    if (isNaN(settleAmt) || settleAmt <= 0) {
      return handleResponse(res, 400, "Please enter a valid settlement amount");
    }

    const userModelMap = {
      SELLER: "Seller",
      DELIVERY_PARTNER: "Delivery",
      WAREHOUSE: "Warehouse",
    };
    const userModel = userModelMap[ownerType] || "Seller";

    // 1. Strict Enforcement: Verify that partner has an active pending withdrawal request
    const pendingTxns = await Transaction.find({
      user: ownerId,
      userModel: userModel,
      type: "Withdrawal",
      status: { $in: ["Pending", "Processing"] },
    }).sort({ createdAt: 1 });

    const totalPendingRequested = pendingTxns.reduce(
      (acc, t) => acc + Math.abs(t.amount || 0),
      0
    );

    if (!pendingTxns.length || totalPendingRequested <= 0) {
      return handleResponse(
        res,
        400,
        "Settlement failed: Settlement cannot be processed without an active withdrawal request from the partner."
      );
    }

    if (settleAmt > totalPendingRequested) {
      return handleResponse(
        res,
        400,
        `Settlement amount (₹${settleAmt}) cannot exceed total pending requested withdrawal amount (₹${totalPendingRequested}).`
      );
    }

    // 2. Perform wallet debit
    const { wallet, ledgerEntry } = await debitWallet({
      ownerType,
      ownerId,
      amount: settleAmt,
      bucket: "available",
      ledgerType: "WITHDRAWAL",
      ledgerDescription: remarks || "Manual Admin Settlement for Withdrawal Request",
    });

    // 3. Mark pending withdrawal transaction(s) as Settled
    let remainingToSettle = settleAmt;
    for (const txn of pendingTxns) {
      if (remainingToSettle <= 0) break;
      const txnAmt = Math.abs(txn.amount);
      txn.status = "Settled";
      txn.notes = remarks || "Settled by Admin";
      await txn.save();
      remainingToSettle -= txnAmt;
    }

    // 4. Send notification to partner
    try {
      await Notification.create({
        recipient: ownerId,
        recipientModel: userModel,
        title: "Withdrawal Settled",
        message: `Your withdrawal request of ₹${settleAmt} has been processed and settled successfully.${remarks ? ` (Ref: ${remarks})` : ""}`,
        type: "payment",
        data: { amount: settleAmt, remarks },
      });
    } catch (notifErr) {
      console.error("Failed to send settlement notification:", notifErr);
    }

    return handleResponse(res, 200, "Withdrawal request settled successfully", { wallet, ledgerEntry });
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const exportAdminFinanceStatementController = async (req, res) => {
  try {
    const statement = await exportFinanceStatement(req.query || {});
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${statement.fileName}"`,
    );
    return res.status(200).send(statement.csv);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getDeliverySettingsController = async (req, res) => {
  try {
    const settings = await getOrCreateFinanceSettings();
    return handleResponse(res, 200, "Delivery finance settings fetched", settings);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const updateDeliverySettingsController = async (req, res) => {
  try {
    const validated = validateWithJoi(updateDeliverySettingsSchema, req.body || {});
    if (!validated.isValid) {
      return handleResponse(res, 400, validated.message);
    }
    const updated = await updateDeliveryFinanceSettings(validated.value);
    await createFinanceAuditLog({
      action: FINANCE_AUDIT_ACTION.DELIVERY_SETTINGS_UPDATED,
      actorType: OWNER_TYPE.ADMIN,
      actorId: req.user?.id || null,
      metadata: {
        updatedFields: Object.keys(validated.value || {}),
      },
    });
    return handleResponse(res, 200, "Delivery finance settings updated", updated);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getSellerWalletSummaryController = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    const role = req.user?.role;
    const ownerType = role === "warehouse" ? "WAREHOUSE" : "SELLER";
    const wallet = await Wallet.findOne({ ownerType, ownerId }).lean();
    return handleResponse(res, 200, "Wallet summary fetched", {
      availableBalance: wallet?.availableBalance || 0,
      pendingBalance: wallet?.pendingBalance || 0,
      totalCredited: wallet?.totalCredited || 0,
      totalDebited: wallet?.totalDebited || 0,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getRiderWalletSummaryController = async (req, res) => {
  try {
    const riderId = req.user?.id;
    const wallet = await Wallet.findOne({
      ownerType: "DELIVERY_PARTNER",
      ownerId: riderId,
    }).lean();
    return handleResponse(res, 200, "Rider wallet summary fetched", {
      availableBalance: wallet?.availableBalance || 0,
      pendingBalance: wallet?.pendingBalance || 0,
      cashInHand: wallet?.cashInHand || 0,
      totalCredited: wallet?.totalCredited || 0,
      totalDebited: wallet?.totalDebited || 0,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
