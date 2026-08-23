import { Request, Response, NextFunction } from "express";
import type { UserRole } from "@architect/shared";
import { HttpError } from "../utils/HttpError";

/**
 * requireRole - מאפשר גישה רק למשתמשים עם אחד מהתפקידים שצוינו.
 * חייב לרוץ אחרי `requireAuth` (תלוי ב-`req.user`).
 */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new HttpError(401, "UNAUTHORIZED", "נדרשת התחברות");
    }
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, "FORBIDDEN", "אין הרשאה לפעולה זו");
    }
    next();
  };
