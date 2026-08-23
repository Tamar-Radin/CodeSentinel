import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/Auth";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { loginSchema, registerSchema } from "../schemas/auth";

const router = Router();

// rate-limit על endpoints רגישים: 10 ניסיונות ב-15 דקות
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "יותר מדי ניסיונות, נסה שוב בעוד 15 דקות" },
});

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

export default router;
