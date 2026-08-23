import { asyncHandler } from "./asyncHandler";
import { verifyToken } from "../services/tokenService";
import { HttpError } from "../utils/HttpError";

/**
 * requireAuth - בדיקת JWT מעוגיית `token` והזרקת `req.user`.
 * זורק 401 אם אין טוקן או שהוא לא תקף.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    throw new HttpError(401, "UNAUTHORIZED", "נדרשת התחברות");
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new HttpError(401, "TOKEN_EXPIRED", "הסשן פג תוקף");
  }
});
