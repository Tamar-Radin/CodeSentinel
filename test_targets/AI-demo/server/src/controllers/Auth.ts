import { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import Customer from "../models/Customer";
import { signToken, cookieOptions } from "../services/tokenService";
import { HttpError } from "../utils/HttpError";
import type { LoginInput, RegisterInput } from "../schemas/auth";
import type { LoginResponse, IUser } from "@architect/shared";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: אימות והרשמה
 */

/**
 * ממיר Customer document לתגובת IUser בטוחה (ללא password)
 */
const toIUser = (doc: {
  _id: unknown;
  name: string;
  email: string;
  role: IUser["role"];
  createdAt: Date;
}): IUser => ({
  id: String(doc._id),
  name: doc.name,
  email: doc.email,
  role: doc.role,
  createdAt: doc.createdAt?.toISOString(),
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: רישום משתמש חדש (תפקיד `user` בלבד)
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: משתמש נוצר והוגדר cookie
 *       409:
 *         description: כתובת מייל כבר קיימת
 */
export const register = asyncHandler(async (req, res: Response<LoginResponse>) => {
  const { name, email, password } = req.body as RegisterInput;

  const existing = await Customer.findOne({ email });
  if (existing) {
    throw new HttpError(409, "USER_EXISTS", "כתובת המייל כבר רשומה במערכת");
  }

  // יצירה דרך new + save כדי שה-pre('save') hash יופעל
  const user = new Customer({ name, email, password, role: "user" });
  await user.save();

  const token = signToken({ sub: String(user._id), role: user.role });
  res.cookie("token", token, cookieOptions);

  res.status(201).json({ user: toIUser(user) });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: התחברות עם email/password והגדרת cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: התחברות הצליחה
 *       401:
 *         description: פרטים שגויים
 */
export const login = asyncHandler(async (req, res: Response<LoginResponse>) => {
  const { email, password } = req.body as LoginInput;

  // חובה לבחור password במפורש בגלל select: false
  const user = await Customer.findOne({ email }).select("+password");
  if (!user) {
    // הודעה גנרית כדי לא לחשוף אילו אימיילים קיימים
    throw new HttpError(401, "INVALID_CREDENTIALS", "אימייל או סיסמה שגויים");
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "אימייל או סיסמה שגויים");
  }

  const token = signToken({ sub: String(user._id), role: user.role });
  res.cookie("token", token, cookieOptions);

  res.status(200).json({ user: toIUser(user) });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: התנתקות (מחיקת ה-cookie)
 *     tags: [Auth]
 *     responses:
 *       204:
 *         description: התנתקות הצליחה
 */
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("token", { ...cookieOptions, maxAge: 0 });
  res.status(204).send();
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: מחזיר את המשתמש המחובר הנוכחי (לרענון session בלקוח)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: פרטי המשתמש
 *       401:
 *         description: לא מחובר
 */
export const me = asyncHandler(async (req, res: Response<{ user: IUser }>) => {
  // requireAuth כבר ודא שיש req.user
  const user = await Customer.findById(req.user!.id);
  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "המשתמש לא נמצא");
  }
  res.status(200).json({ user: toIUser(user) });
});
