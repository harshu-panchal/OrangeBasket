import express from "express";
import {
  signupDelivery,
  loginDelivery,
  verifyDeliveryOTP,
  getDeliveryProfile,
  updateDeliveryProfile,
} from "../controller/deliveryAuthController.js";
import {
  getDeliveryStats,
  getDeliveryEarnings,
  getDeliveryCodCashSummary,
  submitDeliveryCodCashToAdmin,
  getMyDeliveryOrders,
  requestWithdrawal,
  updateDeliveryLocation,
} from "../controller/deliveryController.js";
import {
  triggerSOS,
  updateEmergencyContacts,
} from "../controller/sosController.js";
import { getRiderWalletSummaryController } from "../controller/adminFinanceController.js";

import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import multer from "multer";
import {
  getWarehouseQueueHandler,
  warehouseCheckin,
  warehouseCheckinByLocation,
  warehouseCheckout,
  getCheckinStatus,
} from "../controller/warehouseCheckinController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/send-signup-otp",
  upload.any(),
  signupDelivery,
);
router.post("/send-login-otp", loginDelivery);
router.post("/verify-otp", verifyDeliveryOTP);

// Profile routes
router.get("/profile", verifyToken, getDeliveryProfile);
router.put("/profile", verifyToken, updateDeliveryProfile);
router.get("/stats", verifyToken, getDeliveryStats);
router.get("/earnings", verifyToken, getDeliveryEarnings);
router.get("/cod/summary", verifyToken, allowRoles("delivery"), getDeliveryCodCashSummary);
router.post("/cod/pay", verifyToken, allowRoles("delivery"), submitDeliveryCodCashToAdmin);
router.get("/wallet/summary", verifyToken, allowRoles("delivery"), getRiderWalletSummaryController);
router.get(
  "/order-history",
  verifyToken,
  allowRoles("delivery"),
  getMyDeliveryOrders,
);
router.post("/request-withdrawal", verifyToken, requestWithdrawal);
router.post("/location", verifyToken, updateDeliveryLocation);

// SOS & Emergency Contacts
router.post("/sos/trigger", verifyToken, allowRoles("delivery"), triggerSOS);
router.put("/emergency-contacts", verifyToken, allowRoles("delivery"), updateEmergencyContacts);

// Warehouse Check-in / Queue
router.get("/warehouse/queue", verifyToken, allowRoles("delivery"), getWarehouseQueueHandler);
router.post("/warehouse/checkin", verifyToken, allowRoles("delivery"), warehouseCheckin);
router.post("/warehouse/checkin/location", verifyToken, allowRoles("delivery"), warehouseCheckinByLocation);
router.post("/warehouse/checkout", verifyToken, allowRoles("delivery"), warehouseCheckout);
router.get("/warehouse/checkin-status", verifyToken, allowRoles("delivery"), getCheckinStatus);

// NOTE: Delivery-completion OTP generation/validation lives on the
// canonical workflow routes:
//   POST /orders/workflow/:orderId/otp/request
//   POST /orders/workflow/:orderId/otp/verify
// The previous /delivery/orders/:orderId/(generate|validate)-otp
// endpoints were removed once the workflow state machine became the
// single source of truth (see backend/app/services/orderWorkflowService.js
// requestHandoffOtpAtomic / verifyHandoffOtpAndDeliver).

export default router;
