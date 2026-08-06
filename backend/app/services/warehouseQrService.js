/**
 * warehouseQrService.js
 * Generates and verifies HMAC-SHA256 signed QR tokens for warehouse check-in.
 * Tokens are permanent (no expiry) but can be regenerated (invalidating old ones).
 */
import crypto from "crypto";
import Warehouse from "../models/warehouse.js";
import logger from "./logger.js";

const APP_HMAC_FALLBACK = process.env.QR_HMAC_FALLBACK_SECRET || "ob_qr_fallback_secret_change_me";

/**
 * Signs a payload with HMAC-SHA256 using the warehouse's stored secret.
 */
function signPayload(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Generates (or regenerates) the QR secret + returns the signed token for a warehouse.
 * The token encodes: { warehouseId, iat } and includes a HMAC signature.
 * Format: base64url( JSON({ warehouseId, iat, sig }) )
 */
export async function generateWarehouseQR(warehouseId) {
  // Generate a fresh random secret
  const secret = crypto.randomBytes(32).toString("hex");

  const warehouse = await Warehouse.findByIdAndUpdate(
    warehouseId,
    {
      $set: {
        qrCodeSecret: secret,
        qrCodeGeneratedAt: new Date(),
      },
    },
    { new: true, select: "warehouseId name warehouseName qrCodeGeneratedAt" },
  );

  if (!warehouse) {
    const err = new Error("Warehouse not found");
    err.statusCode = 404;
    throw err;
  }

  const payload = {
    warehouseId: String(warehouseId),
    iat: Math.floor(warehouse.qrCodeGeneratedAt.getTime() / 1000),
  };
  payload.sig = signPayload(payload, secret);

  const payloadString = JSON.stringify(payload);
  logger.info("[QR] Generated QR token for warehouse", { warehouseId });
  return {
    token: Buffer.from(payloadString).toString("base64url"),
    generatedAt: warehouse.qrCodeGeneratedAt,
  };
}

/**
 * Gets the current QR token without regenerating the secret.
 */
export async function getCurrentWarehouseQR(warehouseId) {
  const warehouse = await Warehouse.findById(warehouseId).select("qrCodeSecret qrCodeGeneratedAt");
  if (!warehouse || !warehouse.qrCodeSecret) {
    return null; // No QR generated yet
  }

  const payload = {
    warehouseId: warehouse._id.toString(),
    iat: Math.floor(warehouse.qrCodeGeneratedAt.getTime() / 1000),
  };
  payload.sig = signPayload(payload, warehouse.qrCodeSecret);

  const payloadString = JSON.stringify(payload);
  return {
    token: Buffer.from(payloadString).toString("base64url"),
    generatedAt: warehouse.qrCodeGeneratedAt,
  };
}

/**
 * Verifies a QR token and returns the warehouseId if valid.
 * Throws with statusCode 400/401 on invalid token.
 */
export async function verifyWarehouseQRToken(token) {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    const err = new Error("Invalid QR token format");
    err.statusCode = 400;
    throw err;
  }

  const { warehouseId, iat, sig } = parsed || {};
  if (!warehouseId || !iat || !sig) {
    const err = new Error("Malformed QR token");
    err.statusCode = 400;
    throw err;
  }

  // Fetch the warehouse's current secret (select: false field — must explicitly select)
  const warehouse = await Warehouse.findById(warehouseId)
    .select("qrCodeSecret isActive isVerified")
    .lean();

  if (!warehouse) {
    const err = new Error("Warehouse not found");
    err.statusCode = 404;
    throw err;
  }

  if (!warehouse.isActive || !warehouse.isVerified) {
    const err = new Error("Warehouse is not active");
    err.statusCode = 403;
    throw err;
  }

  const secret = warehouse.qrCodeSecret || APP_HMAC_FALLBACK;
  const expected = signPayload({ warehouseId, iat }, secret);

  if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
    const err = new Error("Invalid QR code — please ask the warehouse to regenerate");
    err.statusCode = 401;
    throw err;
  }

  return String(warehouseId);
}
