import express from "express";
import { getPublicLegalPage, upsertLegalPage } from "../controller/legalPageController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: anyone can read legal pages
router.get("/", getPublicLegalPage);

// Admin only: create/update legal pages
router.put("/", verifyToken, allowRoles("admin"), upsertLegalPage);

export default router;
