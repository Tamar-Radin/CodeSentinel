import jwt, { SignOptions } from "jsonwebtoken";
import type { UserRole } from "@architect/shared";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me-32chars-min";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"];

export interface TokenPayload {
  sub: string; // user id
  role: UserRole;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  if (typeof decoded.sub !== "string" || typeof decoded.role !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub: decoded.sub, role: decoded.role as UserRole };
};

// אופציות עוגייה אחידות לכל מקום שמגדיר/מוחק את עוגיית הטוקן
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 24 * 60 * 60 * 1000, // 24h
  path: "/",
};
