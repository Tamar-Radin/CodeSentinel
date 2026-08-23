import { Router } from "express";
import * as dashboardController from "../controllers/Dashboard";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { salesAnalyticsQuerySchema } from "../schemas";

const router = Router();

// כל ראוטר ה-Dashboard דורש משתמש מאומת
router.use(requireAuth);

// GET /api/dashboard/todays-orders
router.get("/todays-orders", dashboardController.getTodaysOrdersCount);

// GET /api/dashboard/stats
router.get("/stats", dashboardController.getStats);

// GET /api/dashboard/sales-analytics - רק admin/manager
router.get(
  "/sales-analytics",
  requireRole("admin", "manager"),
  validate(salesAnalyticsQuerySchema, "query"),
  dashboardController.getSalesAnalytics
);

export default router;
