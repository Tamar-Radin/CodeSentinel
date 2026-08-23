import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../middleware/validate";
import {
  aiDescriptionRequestSchema,
  aiVisionRequestSchema,
} from "../schemas/ai";
import {
  analyzeImageHandler,
  generateDescriptionHandler,
} from "../controllers/Ai";

const router = Router();

// כל ראוטי AI מוגנים: התחברות + admin בלבד
router.use(requireAuth);
router.use(requireRole("admin"));

// keyGenerator לפי משתמש מאומת. fallback ל-IP עובר דרך ipKeyGenerator
// כדי להתמודד נכון עם IPv6 ולמנוע bypass.
const userKey = (req: import("express").Request): string =>
  req.user?.id ?? ipKeyGenerator(req.ip ?? "anon");

// rate-limit נפרד לכל endpoint — vision יקר יותר ולכן מוגבל יותר
const descriptionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: userKey,
  message: {
    error: "חרגת ממכסת הבקשות לייצור תיאור. נסה שוב בעוד מספר דקות.",
    code: "RATE_LIMITED",
  },
});

const visionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: userKey,
  message: {
    error: "חרגת ממכסת בקשות זיהוי תמונה. נסה שוב בעוד מספר דקות.",
    code: "RATE_LIMITED",
  },
});

router.post(
  "/description",
  descriptionLimiter,
  validate(aiDescriptionRequestSchema),
  generateDescriptionHandler
);

router.post(
  "/vision",
  visionLimiter,
  validate(aiVisionRequestSchema),
  analyzeImageHandler
);

export default router;
