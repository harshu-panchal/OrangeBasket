import Warehouse from "../../models/warehouse.js";
import { escapeRegExp } from "./shared/sellerAdminUtils.js";

export function formatWarehouseDocuments(documents) {
  const WAREHOUSE_DOC_LABELS = {
    tradeLicense: "Trade License",
    gstCertificate: "GST Certificate",
    idProof: "ID Proof",
    businessRegistration: "Business Registration",
    fssaiLicense: "FSSAI License",
    other: "Other Document",
  };

  if (!documents || typeof documents !== "object") return [];

  return Object.entries(documents)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => WAREHOUSE_DOC_LABELS[key] || key.replace(/([A-Z])/g, " $1").trim());
}

export function formatWarehouseDocumentFiles(documents) {
  const WAREHOUSE_DOC_LABELS = {
    tradeLicense: "Trade License",
    gstCertificate: "GST Certificate",
    idProof: "ID Proof",
    businessRegistration: "Business Registration",
    fssaiLicense: "FSSAI License",
    other: "Other Document",
  };

  if (!documents || typeof documents !== "object") return [];

  return Object.entries(documents)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => {
      const normalizedValue = String(value).trim();
      const label = WAREHOUSE_DOC_LABELS[key] || key.replace(/([A-Z])/g, " $1").trim();
      const isUrl = /^https?:\/\//i.test(normalizedValue);
      const lowerValue = normalizedValue.toLowerCase();

      return {
        key,
        label,
        value: normalizedValue,
        url: isUrl ? normalizedValue : "",
        fileName: isUrl ? normalizedValue.split("/").pop()?.split("?")[0] || label : normalizedValue,
        isViewable: isUrl,
        fileType: lowerValue.includes(".pdf") ? "pdf" : "image",
      };
    });
}

export function formatWarehouseApplication(warehouse) {
  const docs = formatWarehouseDocuments(warehouse.documents);
  const documentFiles = formatWarehouseDocumentFiles(warehouse.documents);
  const createdAt = warehouse.createdAt ? new Date(warehouse.createdAt) : new Date();
  const missingInfo = !warehouse.address || docs.length < 3;

  return {
    id: String(warehouse._id),
    shopName: warehouse.warehouseName || warehouse.shopName || "Unnamed Warehouse",
    warehouseName: warehouse.warehouseName || warehouse.shopName || "Unnamed Warehouse",
    ownerName: warehouse.name || "Unnamed Owner",
    email: warehouse.email || "",
    phone: warehouse.phone || "",
    category: warehouse.category || "General",
    applicationDate: createdAt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    receivedAt: createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: warehouse.applicationStatus || (warehouse.isVerified ? "approved" : "pending"),
    documents: docs,
    documentFiles,
    location: warehouse.address || "Not provided",
    description: warehouse.description || "No application note provided.",
    verificationScore: docs.length
      ? Math.min(100, 55 + docs.length * 12 + (warehouse.address ? 10 : 0))
      : 40,
    missingInfo,
  };
}

export async function getPendingWarehouseApplications({ q = "", status = "pending", page, limit, skip }) {
  const normalizedStatus = String(status || "pending").trim().toLowerCase();
  let baseStatusQuery = { isVerified: { $ne: true } };

  if (normalizedStatus === "pending") {
    baseStatusQuery = {
      isVerified: { $ne: true },
      $or: [
        { applicationStatus: "pending" },
        { applicationStatus: { $exists: false } },
        { applicationStatus: null },
      ],
    };
  } else if (normalizedStatus !== "all") {
    baseStatusQuery = { isVerified: { $ne: true }, applicationStatus: normalizedStatus };
  }

  const conditions = [baseStatusQuery];
  const search = String(q || "").trim();
  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    conditions.push({
      $or: [
        { name: regex },
        { warehouseName: regex },
        { shopName: regex },
        { email: regex },
        { phone: regex },
        { address: regex },
      ],
    });
  }

  const query = conditions.length > 1 ? { $and: conditions } : conditions[0];

  const [warehouses, total, allPendingForStats] = await Promise.all([
    Warehouse.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Warehouse.countDocuments(query),
    Warehouse.find({
      isVerified: { $ne: true },
      $or: [{ applicationStatus: "pending" }, { applicationStatus: { $exists: false } }],
    }).select("address documents createdAt").lean(),
  ]);

  const items = warehouses.map(formatWarehouseApplication);
  const totalApplications = allPendingForStats.length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const receivedToday = allPendingForStats.filter(
    (w) => w.createdAt && new Date(w.createdAt) >= todayStart,
  ).length;

  const missingInfo = allPendingForStats.filter((w) => {
    const docs = formatWarehouseDocuments(w.documents);
    return !w.address || docs.length < 3;
  }).length;

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    stats: { totalApplications, receivedToday, missingInfo, avgReviewTimeHours: 24 },
  };
}

export async function approveWarehouseApplicationById({ warehouseId, reviewedBy }) {
  const warehouse = await Warehouse.findByIdAndUpdate(
    warehouseId,
    {
      $set: {
        isVerified: true,
        isActive: true,
        applicationStatus: "approved",
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason: null,
      },
    },
    { new: true },
  );

  if (!warehouse) return null;
  return formatWarehouseApplication(warehouse);
}

export async function rejectWarehouseApplicationById({ warehouseId, reviewedBy, reason }) {
  const warehouse = await Warehouse.findByIdAndUpdate(
    warehouseId,
    {
      $set: {
        isVerified: false,
        isActive: false,
        applicationStatus: "rejected",
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason: reason || "",
      },
    },
    { new: true },
  );

  if (!warehouse) return null;
  return formatWarehouseApplication(warehouse);
}

export async function getActiveWarehousesList({ q = "", page, limit, skip }) {
  const search = String(q || "").trim();
  const conditions = [{ isVerified: true, isActive: true }];

  if (search) {
    const regex = new RegExp(escapeRegExp(search), "i");
    conditions.push({
      $or: [{ name: regex }, { warehouseName: regex }, { email: regex }, { phone: regex }],
    });
  }

  const query = conditions.length > 1 ? { $and: conditions } : conditions[0];

  const [warehouses, total] = await Promise.all([
    Warehouse.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Warehouse.countDocuments(query),
  ]);

  const monthStart = new Date();
  monthStart.setHours(0, 0, 0, 0);
  monthStart.setDate(1);

  const newThisMonth = await Warehouse.countDocuments({
    ...query,
    createdAt: { $gte: monthStart }
  });

  return {
    items: warehouses.map(formatWarehouseApplication),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    stats: {
      totalActiveSellers: total,
      totalOrders: 0,
      totalRevenue: 0,
      newThisMonth,
      highVolume: 0,
    }
  };
}
