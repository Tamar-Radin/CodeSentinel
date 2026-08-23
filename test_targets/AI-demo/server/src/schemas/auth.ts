import { z } from "zod";

// סכמת רישום משתמש
export const registerSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת מייל לא תקינה").toLowerCase().trim(),
  password: z.string().min(8, "סיסמה חייבת להכיל לפחות 8 תווים"),
});

// סכמת התחברות
export const loginSchema = z.object({
  email: z.string().email("כתובת מייל לא תקינה").toLowerCase().trim(),
  password: z.string().min(1, "סיסמה נדרשת"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
