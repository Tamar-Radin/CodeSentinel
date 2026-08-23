import { z } from "zod";
import type { OrderStatus } from "@architect/shared";

// סכמת ולידציה ליצירת לקוח חדש
export const createCustomerSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת מייל לא תקינה"),
  password: z.string().min(8, "סיסמה חייבת להכיל לפחות 8 תווים"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// סכמת ולידציה ליצירת מוצר חדש
export const createProductSchema = z.object({
  name: z.string().min(2, "שם מוצר חייב להכיל לפחות 2 תווים"),
  description: z.string().optional(),
  price: z.number().positive("מחיר חייב להיות חיובי"),
  category: z.string().optional(),
  stock: z.number().int().nonnegative("מלאי לא יכול להיות שלילי").optional(),
});

// סכמת ולידציה ליצירת הזמנה חדשה
export const createOrderSchema = z.object({
  customer: z.string().regex(/^[a-f\d]{24}$/i, "מזהה לקוח לא תקין"),
  items: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "מזהה מוצר לא תקין"))
    .min(1, "הזמנה חייבת לכלול לפחות מוצר אחד"),
  totalAmount: z.number().positive("סכום הזמנה חייב להיות חיובי"),
  status: z
    .enum(["pending", "paid", "shipped", "cancelled", "returned"] as [
      OrderStatus,
      ...OrderStatus[]
    ])
    .optional(),
});

// סכמת ולידציה לעדכון סטטוס הזמנה
export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "cancelled", "returned"] as [
    OrderStatus,
    ...OrderStatus[]
  ]),
});

// סכמת ולידציה ל-query params של sales-analytics
export const salesAnalyticsQuerySchema = z.object({
  startDate: z.iso
    .date({ message: "startDate חייב להיות בפורמט YYYY-MM-DD" })
    .optional(),
  endDate: z.iso
    .date({ message: "endDate חייב להיות בפורמט YYYY-MM-DD" })
    .optional(),
});

// טיפוסים שנגזרים מהסכמות
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type SalesAnalyticsQueryInput = z.infer<typeof salesAnalyticsQuerySchema>;
