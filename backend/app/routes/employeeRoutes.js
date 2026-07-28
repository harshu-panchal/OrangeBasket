import express from "express";
import {
    createEmployee,
    listEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeCustomers,
    getLeaderboard,
    validateReferralCode,
} from "../controller/employeeController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route for signup validation
router.get("/validate/:code", validateReferralCode);

// Admin-only routes
router.post("/", verifyToken, allowRoles("admin"), createEmployee);
router.get("/", verifyToken, allowRoles("admin"), listEmployees);
router.get("/leaderboard", verifyToken, allowRoles("admin"), getLeaderboard);
router.get("/:id", verifyToken, allowRoles("admin"), getEmployee);
router.patch("/:id", verifyToken, allowRoles("admin"), updateEmployee);
router.delete("/:id", verifyToken, allowRoles("admin"), deleteEmployee);
router.get("/:id/customers", verifyToken, allowRoles("admin"), getEmployeeCustomers);

export default router;
