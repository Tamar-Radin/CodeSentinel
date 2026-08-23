import OpenAI from "openai";
import { aiConfig, ensureAiEnabled } from "../config/aiConfig";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  ensureAiEnabled();
  if (!client) {
    client = new OpenAI({ apiKey: aiConfig.openaiApiKey });
  }
  return client;
}

export interface NormalizedAiError {
  status: number;
  code: string;
  message: string;
}

// ממפה שגיאת SDK של OpenAI להודעת שגיאה אחידה ל-Client
export function describeOpenAIError(err: unknown): NormalizedAiError {
  if (err instanceof OpenAI.APIError) {
    const body = (err as { error?: { code?: string } }).error;
    if (err.status === 429 && body?.code === "insufficient_quota") {
      return {
        status: 502,
        code: "AI_QUOTA_EXCEEDED",
        message: "מכסת השימוש ב-OpenAI נגמרה. פנה למנהל המערכת.",
      };
    }
    if (err.status === 429) {
      return {
        status: 502,
        code: "AI_RATE_LIMITED_UPSTREAM",
        message: "שרת ה-AI עמוס כעת. נסה שוב בעוד דקה.",
      };
    }
    return {
      status: 502,
      code: "AI_UPSTREAM_ERROR",
      message: `שגיאה מ-OpenAI: ${err.message}`,
    };
  }

  if (err instanceof Error && err.name === "AbortError") {
    return {
      status: 502,
      code: "AI_TIMEOUT",
      message: "הבקשה ל-AI עברה את זמן ההמתנה.",
    };
  }

  return {
    status: 502,
    code: "AI_UPSTREAM_ERROR",
    message: "שגיאה לא ידועה בחיבור ל-AI.",
  };
}
