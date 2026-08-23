/** טיפוסים משותפים לפיצ'רי AI ביצירת מוצר (description + vision) */

// ===== Description (Form -> AI) =====

export interface AiDescriptionRequest {
  name: string;
  category?: string;
  audience?: string;
  price?: number;
  keyFeatures?: string[];
  language?: "he" | "en";
}

export interface AiDescriptionResult {
  description: string;
  bullets: string[];
  seoTags: string[];
}

export interface AiDescriptionResponse extends AiDescriptionResult {
  meta: AiResponseMeta;
}

// ===== Vision (Image -> AI) =====

export interface AiVisionRequest {
  /** data URL: data:image/(jpeg|png|webp);base64,xxxxx */
  imageDataUrl: string;
  /** הקשר משלים מהמשתמש כש-confidence נמוך */
  extraContext?: string;
}

export interface AiPriceRange {
  min: number;
  max: number;
}

export interface AiVisionResult {
  name: string;
  category: string;
  description: string;
  priceRange: AiPriceRange;
  /** 0..1 */
  confidence: number;
}

export interface AiVisionResponse extends AiVisionResult {
  /** true אם confidence < AI_VISION_CONFIDENCE_THRESHOLD */
  needsMoreInfo: boolean;
  meta: AiResponseMeta;
}

// ===== Common =====

export interface AiResponseMeta {
  model: string;
  latencyMs: number;
  cached?: boolean;
}
