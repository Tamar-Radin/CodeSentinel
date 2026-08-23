import { z } from "zod";
import {
  CATEGORY_WHITELIST,
  MAX_IMAGE_DATA_URL_LENGTH,
} from "../config/aiConfig";

// ===== Request schemas =====

export const aiDescriptionRequestSchema = z.object({
  name: z.string().trim().min(2, "שם חייב להיות לפחות 2 תווים").max(120),
  category: z.string().trim().max(60).optional(),
  audience: z.string().trim().max(120).optional(),
  price: z
    .number()
    .positive("מחיר חייב להיות חיובי")
    .max(1_000_000)
    .optional(),
  keyFeatures: z
    .array(z.string().trim().min(2).max(120))
    .max(10, "מקסימום 10 מאפיינים")
    .optional(),
  language: z.enum(["he", "en"]).optional(),
});

export const aiVisionRequestSchema = z.object({
  imageDataUrl: z
    .string()
    .regex(
      /^data:image\/(jpeg|png|webp);base64,/,
      "פורמט תמונה לא תקין (חובה JPEG/PNG/WEBP)"
    )
    .max(MAX_IMAGE_DATA_URL_LENGTH, "תמונה גדולה מדי (מעל 5MB)"),
  extraContext: z
    .string()
    .trim()
    .max(500, "תיאור משלים עד 500 תווים")
    .optional(),
});

// ===== Response schemas (validate model output) =====

export const aiDescriptionResultSchema = z.object({
  description: z.string().min(40).max(600),
  bullets: z.array(z.string().min(2).max(160)).min(3).max(5),
  seoTags: z
    .array(z.string().regex(/^[a-z0-9 _-]+$/))
    .min(3)
    .max(8),
});

export const aiVisionResultSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  description: z.string().min(20).max(600),
  priceRange: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
    })
    .refine((p) => p.min <= p.max, {
      message: "priceRange.min חייב להיות <= max",
    }),
  confidence: z.number().min(0).max(1),
});

// ===== Inferred types =====

export type AiDescriptionRequestInput = z.infer<
  typeof aiDescriptionRequestSchema
>;
export type AiVisionRequestInput = z.infer<typeof aiVisionRequestSchema>;
export type AiDescriptionResultModel = z.infer<
  typeof aiDescriptionResultSchema
>;
export type AiVisionResultModel = z.infer<typeof aiVisionResultSchema>;

// ===== JSON schemas for OpenAI structured outputs =====

export const AI_DESCRIPTION_JSON_SCHEMA = {
  name: "ProductDescription",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      description: { type: "string" },
      bullets: { type: "array", items: { type: "string" } },
      seoTags: { type: "array", items: { type: "string" } },
    },
    required: ["description", "bullets", "seoTags"],
  },
} as const;

export const AI_VISION_JSON_SCHEMA = {
  name: "ProductAnalysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      category: { type: "string", enum: CATEGORY_WHITELIST as unknown as string[] },
      description: { type: "string" },
      priceRange: {
        type: "object",
        additionalProperties: false,
        properties: {
          min: { type: "number" },
          max: { type: "number" },
        },
        required: ["min", "max"],
      },
      confidence: { type: "number" },
    },
    required: ["name", "category", "description", "priceRange", "confidence"],
  },
} as const;
