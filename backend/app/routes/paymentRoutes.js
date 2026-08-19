import express from "express";
import {
  createPaymentOrder,
  verifyPaymentStatus,
  handleRazorpayWebhook,
} from "../controller/paymentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { paymentRouteRateLimiter } from "../middleware/securityMiddlewares.js";

const paymentRoute = express.Router();

/**
 * Initiate a PhonePe payment order for a specific CheckoutGroupId or OrderId.
 * Auth: Required (Customer paying for their own order)
 */
paymentRoute.post(
  "/create-order",
  verifyToken,
  paymentRouteRateLimiter,
  createPaymentOrder,
);

/**
 * Verify payment status from client side (after redirect back from PhonePe).
 * Auth: Required
 */
paymentRoute.get(
  "/status/:id",
  verifyToken,
  paymentRouteRateLimiter,
  verifyPaymentStatus,
);

/**
 * Razorpay Server-to-Server Webhook.
 */
paymentRoute.post(
  "/webhook/razorpay",
  express.raw({ type: "application/json" }), 
  handleRazorpayWebhook,
);

export default paymentRoute;
