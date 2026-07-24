import express from "express";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import * as kitController from "../controller/kitController.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Customer endpoints (public)
router.get("/home-data", kitController.getHomeData);
router.get("/:id", kitController.getKitById);

// Warehouse endpoints
router.post("/warehouse", verifyToken, allowRoles("warehouse"), upload.any(), kitController.createKit);
router.get("/warehouse", verifyToken, allowRoles("warehouse"), kitController.getWarehouseKits);
router.put("/warehouse/:id", verifyToken, allowRoles("warehouse"), upload.any(), kitController.updateKit);

// Admin endpoints
router.get("/admin/approvals", verifyToken, allowRoles("admin"), kitController.getPendingKits);
router.put("/admin/:id/approve", verifyToken, allowRoles("admin"), kitController.approveKit);

export default router;
