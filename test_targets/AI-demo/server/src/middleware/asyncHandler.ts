import { Request, Response, NextFunction, RequestHandler } from "express";

// עוטף פונקציית Express אסינכרונית ותופס שגיאות באופן אוטומטי, ומעביר אותן ל-next
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
