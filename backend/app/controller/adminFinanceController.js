import Payout from "../models/payout.js";
import Wallet from "../models/wallet.js";
import Seller from "../models/seller.js";
import Delivery from "../models/delivery.js";
import Warehouse from "../models/warehouse.js";
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

    const query = { availableBalance: { $gt: 0 } };

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

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const [wallets, total] = await Promise.all([
      Wallet.find(query).sort({ availableBalance: -1 }).skip(skip).limit(safeLimit).lean(),
      Wallet.countDocuments(query),
    ]);

    const sellerIds = [];
    const deliveryIds = [];
    const warehouseIds = [];

    wallets.forEach((w) => {
      if (w.ownerType === "SELLER") sellerIds.push(w.ownerId);
      else if (w.ownerType === "DELIVERY_PARTNER") deliveryIds.push(w.ownerId);
      else if (w.ownerType === "WAREHOUSE") warehouseIds.push(w.ownerId);
    });

    const [sellers, deliveries, warehouses] = await Promise.all([
      Seller.find({ _id: { $in: sellerIds } }).select("name phone shopName email bankDetails").lean(),
      Delivery.find({ _id: { $in: deliveryIds } }).select("name phone email vehicleType bankDetails").lean(),
      Warehouse.find({ _id: { $in: warehouseIds } }).select("name phone email warehouseName bankDetails").lean(),
    ]);

    const sellerMap = new Map(sellers.map((s) => [String(s._id), s]));
    const deliveryMap = new Map(deliveries.map((d) => [String(d._id), d]));
    const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w]));

    const items = wallets.map((w) => {
      let userDetails = null;
      if (w.ownerType === "SELLER") userDetails = sellerMap.get(String(w.ownerId));
      else if (w.ownerType === "DELIVERY_PARTNER") userDetails = deliveryMap.get(String(w.ownerId));
      else if (w.ownerType === "WAREHOUSE") userDetails = warehouseMap.get(String(w.ownerId));

      return {
        walletId: w._id,
        ownerId: w.ownerId,
        ownerType: w.ownerType,
        availableBalance: w.availableBalance,
        pendingBalance: w.pendingBalance,
        userDetails: userDetails || { name: "Unknown", phone: "N/A" },
      };
    });

    const summaryAgg = await Wallet.aggregate([
      { $match: { ownerType: { $in: ["SELLER", "DELIVERY_PARTNER", "WAREHOUSE"] } } },
      { $group: { _id: "$ownerType", totalAvailable: { $sum: "$availableBalance" } } },
    ]);
    
    const summary = { SELLER: 0, DELIVERY_PARTNER: 0, WAREHOUSE: 0, TOTAL: 0 };
    summaryAgg.forEach((s) => {
      summary[s._id] = s.totalAvailable;
      summary.TOTAL += s.totalAvailable;
    });

    return handleResponse(res, 200, "Outstanding balances fetched", {
      items,
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

    const { wallet, ledgerEntry } = await debitWallet({
      ownerType,
      ownerId,
      amount: Number(amount),
      bucket: "available",
      ledgerType: "WITHDRAWAL",
      ledgerDescription: remarks || "Manual Admin Settlement",
    });

    return handleResponse(res, 200, "Balance settled successfully", { wallet, ledgerEntry });
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
