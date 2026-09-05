import express from "express";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import * as kitController from "../controller/kitController.js";
import * as kitAddonController from "../controller/kitAddonController.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// ─── Customer endpoints (public) ──────────────────────────────────────────
router.get("/home-data", kitController.getHomeData);
router.get("/addons", kitAddonController.getActiveAddons);

// ─── Warehouse endpoints ──────────────────────────────────────────────────
router.post("/warehouse", verifyToken, allowRoles("warehouse"), upload.any(), kitController.createKit);
router.get("/warehouse", verifyToken, allowRoles("warehouse"), kitController.getWarehouseKits);
router.put("/warehouse/:id", verifyToken, allowRoles("warehouse"), upload.any(), kitController.updateKit);
router.delete("/warehouse/:id", verifyToken, allowRoles("warehouse"), kitController.deleteKit);
router.get("/warehouse/addon-summary", verifyToken, allowRoles("warehouse"), kitAddonController.getAddonOrderSummary);

// ─── Admin endpoints ──────────────────────────────────────────────────────
router.get("/admin/approvals", verifyToken, allowRoles("admin"), kitController.getPendingKits);
router.put("/admin/:id/approve", verifyToken, allowRoles("admin"), kitController.approveKit);
router.put("/admin/edit/:id", verifyToken, allowRoles("admin"), upload.any(), kitController.updateKit);
router.delete("/admin/:id", verifyToken, allowRoles("admin"), kitController.deleteKit);

// Warehouse add-on management
router.post("/warehouse/addons", verifyToken, allowRoles("warehouse"), upload.any(), kitAddonController.createAddon);
router.get("/warehouse/addons", verifyToken, allowRoles("warehouse"), kitAddonController.getWarehouseAddons);
router.put("/warehouse/addons/:id", verifyToken, allowRoles("warehouse"), upload.any(), kitAddonController.updateAddon);
router.delete("/warehouse/addons/:id", verifyToken, allowRoles("warehouse"), kitAddonController.deleteAddon);

// Put ID route last to prevent it from matching other paths like /warehouse
router.get("/:id", kitController.getKitById);

export default router;
