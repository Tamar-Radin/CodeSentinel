import { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { aiConfig } from "../config/aiConfig";
import { generateDescription } from "../services/aiDescriptionService";
import { analyzeProductImage } from "../services/aiVisionService";
import { cacheGet, cacheSet, hashInput } from "../services/aiCache";
import type {
  AiDescriptionRequestInput,
  AiVisionRequestInput,
} from "../schemas/ai";
import type {
  AiDescriptionResponse,
  AiVisionResponse,
} from "@architect/shared";

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: יצירת תוכן מוצר בעזרת AI (admin בלבד)
 */

/**
 * @swagger
 * /api/ai/description:
 *   post:
 *     summary: ייצור תיאור מוצר אוטומטי על בסיס שדות הטופס (admin בלבד)
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: אוזניות אלחוטיות }
 *               category: { type: string, example: Accessories }
 *               audience: { type: string, example: גיימרים מקצועיים }
 *               price: { type: number, example: 499 }
 *               keyFeatures:
 *                 type: array
 *                 items: { type: string }
 *                 example: [ביטול רעשים פעיל, סוללה ל-30 שעות]
 *               language: { type: string, enum: [he, en] }
 *     responses:
 *       200: { description: תיאור נוצר בהצלחה }
 *       400: { description: ולידציה נכשלה }
 *       401: { description: לא מחובר }
 *       403: { description: נדרש admin }
 *       429: { description: חרגת ממכסת הבקשות }
 *       502: { description: שגיאה משירות AI חיצוני }
 *       503: { description: AI לא מופעל / סכימה לא תקפה }
 */
export const generateDescriptionHandler = asyncHandler(
  async (req, res: Response<AiDescriptionResponse>) => {
    const input = req.body as AiDescriptionRequestInput;

    const cacheKey = `desc:${hashInput(input)}`;
    const cached = cacheGet<AiDescriptionResponse>(cacheKey);
    if (cached) {
      res.json({ ...cached, meta: { ...cached.meta, cached: true } });
      return;
    }

    const { result, meta } = await generateDescription(input);
    const response: AiDescriptionResponse = {
      ...result,
      meta: { ...meta, cached: false },
    };
    cacheSet(cacheKey, response);
    res.json(response);
  }
);

/**
 * @swagger
 * /api/ai/vision:
 *   post:
 *     summary: זיהוי מוצר אוטומטי מתוך תמונה (admin בלבד)
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageDataUrl]
 *             properties:
 *               imageDataUrl:
 *                 type: string
 *                 description: data URL של התמונה (image/jpeg|png|webp)
 *               extraContext:
 *                 type: string
 *                 description: הקשר נוסף מהמשתמש לסיבוב חוזר כשה-confidence נמוך
 *     responses:
 *       200: { description: תוצאת זיהוי כולל needsMoreInfo ו-confidence }
 *       400: { description: ולידציה נכשלה / תמונה גדולה מדי }
 *       401: { description: לא מחובר }
 *       403: { description: נדרש admin }
 *       429: { description: חרגת ממכסת הבקשות }
 *       502: { description: שגיאה משירות AI חיצוני }
 *       503: { description: AI לא מופעל / סכימה לא תקפה }
 */
export const analyzeImageHandler = asyncHandler(
  async (req, res: Response<AiVisionResponse>) => {
    const input = req.body as AiVisionRequestInput;

    const cacheKey = `vis:${hashInput(input)}`;
    const cached = cacheGet<AiVisionResponse>(cacheKey);
    if (cached) {
      res.json({ ...cached, meta: { ...cached.meta, cached: true } });
      return;
    }

    const { result, meta } = await analyzeProductImage(input);
    const response: AiVisionResponse = {
      ...result,
      needsMoreInfo: result.confidence < aiConfig.visionConfidenceThreshold,
      meta: { ...meta, cached: false },
    };
    cacheSet(cacheKey, response);
    res.json(response);
  }
);
