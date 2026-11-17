import express from "express";
import {
    listCoupons,
    listPublicCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
} from "../controller/couponController.js";
import { verifyToken, optionalVerifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin management (admin login required)
const adminOnly = [verifyToken, allowRoles("admin")];
router.get("/admin/coupons", ...adminOnly, listCoupons);
router.post("/admin/coupons", ...adminOnly, createCoupon);
router.put("/admin/coupons/:id", ...adminOnly, updateCoupon);
router.delete("/admin/coupons/:id", ...adminOnly, deleteCoupon);

// Customer‑facing
// optionalVerifyToken: when logged in, the real customer id is used for per-user limits.
router.post("/coupons/validate", optionalVerifyToken, validateCoupon);
// Public list never includes creator (influencer) coupons.
router.get("/coupons", listPublicCoupons);

export default router;
