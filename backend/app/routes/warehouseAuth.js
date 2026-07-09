import express from "express";
import {
    signupWarehouse,
    loginWarehouse,
    sendWarehouseSignupOtp,
    verifyWarehouseSignupOtp,
    sendWarehouseResetOtp,
    verifyWarehouseResetOtp,
    resetWarehousePassword,
    checkWarehouseExists,
} from "../controller/warehouseAuthController.js";
import { getWarehouseProfile, updateWarehouseProfile, requestWarehouseWithdrawal, getNearbyWarehouses } from "../controller/warehouseController.js";
import { getWarehouseStats, getWarehouseEarnings } from "../controller/warehouseStatsController.js";
import { getSellerWalletSummaryController } from "../controller/adminFinanceController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import {
    authRouteRateLimiter,
    createContentLengthGuard,
    otpRouteRateLimiter,
} from "../middleware/securityMiddlewares.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const warehouseOtpPayloadGuard = createContentLengthGuard(
    parseInt(process.env.AUTH_MAX_PAYLOAD_BYTES || "16384", 10),
    "Verification payload too large",
);

router.post(
    "/verification/send-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    warehouseOtpPayloadGuard,
    sendWarehouseSignupOtp
);
router.post(
    "/verification/verify-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    warehouseOtpPayloadGuard,
    verifyWarehouseSignupOtp
);

router.post("/signup", upload.any(), signupWarehouse);
router.post("/check-exists", checkWarehouseExists);
router.post("/login", loginWarehouse);
router.get("/nearby", getNearbyWarehouses);

// Forgot password
router.post(
    "/forgot-password/send-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    warehouseOtpPayloadGuard,
    sendWarehouseResetOtp
);
router.post(
    "/forgot-password/verify-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    warehouseOtpPayloadGuard,
    verifyWarehouseResetOtp
);
router.post("/reset-password", resetWarehousePassword);

// Profile routes
router.get("/profile", verifyToken, allowRoles("warehouse"), getWarehouseProfile);
router.put("/profile", verifyToken, allowRoles("warehouse"), updateWarehouseProfile);

// Analytics & Financials
router.get("/stats", verifyToken, allowRoles("warehouse"), getWarehouseStats);
router.get("/earnings", verifyToken, allowRoles("warehouse"), getWarehouseEarnings);
router.get("/wallet/summary", verifyToken, allowRoles("warehouse"), getSellerWalletSummaryController);
router.post("/request-withdrawal", verifyToken, allowRoles("warehouse"), requestWarehouseWithdrawal);

export default router;
