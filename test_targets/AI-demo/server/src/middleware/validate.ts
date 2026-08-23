import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type ValidationTarget = "body" | "query";

// מידלוור ולידציה גנרי שמקבל סכמת Zod ומוודא את גוף הבקשה או ה-query params
export const validate =
  (schema: ZodSchema, target: ValidationTarget = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    // החלפת הנתונים במקור המתאים בנתונים המאומתים והמנוקים
    if (target === "query") {
      // ב-Express 5 הפרופרטי query הוא getter בלבד, לכן צריך לדרוס אותו כך
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      req.body = result.data;
    }
    next();
  };
