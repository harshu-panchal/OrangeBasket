import express from "express";
import { getBestsellerConfig, updateBestsellerConfig, getAllBestsellerConfigs } from "../controller/bestsellerConfigController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin Routes
router.get("/admin", verifyToken, allowRoles("admin"), getAllBestsellerConfigs);
router.put("/admin/:headerId", verifyToken, allowRoles("admin"), updateBestsellerConfig);
router.get("/admin/:headerId", verifyToken, allowRoles("admin"), getBestsellerConfig);

// Customer/Public Routes
router.get("/customer/:headerId", getBestsellerConfig);

export default router;
