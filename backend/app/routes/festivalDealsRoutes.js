import express from "express";
import {
  getSection,
  createSection,
  updateSection,
  updateStatus,
  deleteSection,
  addCard,
  updateCard,
  deleteCard,
  reorderCards
} from "../controller/festivalDealsController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route to get section data for frontend
router.get("/", getSection);

// Admin routes
router.use(verifyToken, allowRoles("admin"));

// Section level config
router.post("/", createSection);
router.put("/", updateSection);
router.delete("/", deleteSection);

// Status and Reorder
router.put("/status", updateStatus);
router.put("/reorder", reorderCards);

// Card level ops
router.post("/cards", addCard);
router.put("/cards/:id", updateCard);
router.delete("/cards/:id", deleteCard);

export default router;
