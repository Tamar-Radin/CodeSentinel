import { HttpError } from "../utils/HttpError";

// תקרת גודל תמונה: 5MB בינארי, ~6.7MB אחרי קידוד base64
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_DATA_URL_LENGTH =
  Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100;

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const CATEGORY_WHITELIST = [
  "Computers",
  "Accessories",
  "Peripherals",
  "Networking",
  "Storage",
  "Other",
] as const;

export type AllowedCategory = (typeof CATEGORY_WHITELIST)[number];

export const aiConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  textModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
  visionModel: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
  visionConfidenceThreshold: Number(
    process.env.AI_VISION_CONFIDENCE_THRESHOLD ?? "0.95"
  ),
  visionMaxRetries: Number(process.env.AI_VISION_MAX_RETRIES ?? "2"),
  cacheTtlMs: Number(process.env.AI_CACHE_TTL_MS ?? "600000"),
  requestTimeoutMs: 25_000,
};

export function isAiEnabled(): boolean {
  return Boolean(aiConfig.openaiApiKey);
}

export function ensureAiEnabled(): void {
  if (!isAiEnabled()) {
    throw new HttpError(
      503,
      "AI_DISABLED",
      "תכונת ה-AI אינה מופעלת. הגדר OPENAI_API_KEY בקובץ .env"
    );
  }
}
