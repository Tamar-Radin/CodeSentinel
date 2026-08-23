import crypto from "crypto";
import { aiConfig } from "../config/aiConfig";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const MAX_ENTRIES = 100;
const cache = new Map<string, CacheEntry>();

export function hashInput(obj: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(obj))
    .digest("hex");
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  // העברה לסוף כדי לשמור על LRU על בסיס הוספה אחרונה
  cache.delete(key);
  cache.set(key, entry);
  return entry.value as T;
}

export function cacheSet(key: string, value: unknown): void {
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + aiConfig.cacheTtlMs,
  });
}
