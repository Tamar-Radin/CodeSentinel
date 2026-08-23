import { z } from "zod";

export const feedbackSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "שם חייב להכיל לפחות 2 תווים")
      .max(100, "שם לא יכול להכיל יותר מ-100 תווים"),
    email: z
      .string()
      .trim()
      .min(5, "כתובת אימייל קצרה מדי")
      .max(254, "כתובת אימייל ארוכה מדי")
      .email("כתובת אימייל לא תקינה"),
    message: z
      .string()
      .trim()
      .min(10, "הודעה חייבת להכיל לפחות 10 תווים")
      .max(2000, "הודעה לא יכולה להכיל יותר מ-2000 תווים"),
  })
  .strip();

export type FeedbackInput = z.infer<typeof feedbackSchema>;
