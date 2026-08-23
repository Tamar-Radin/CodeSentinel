import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import dashboardRoutes from "./routes/dashboardRoutes";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import aiRoutes from "./routes/aiRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";
import errorHandler from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 3000;

// אבטחת headers - חייב להיות בראש שרשרת ה-middleware
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
// JSON parser גלובלי - מעלים את הגבול ל-8mb כדי לתמוך במוצרים עם תמונה כ-base64.
// מדלגים על /api/ai כי הוא מקבל parser נפרד משלו עם אותו limit.
app.use((req, res, next) => {
  if (req.path.startsWith("/api/ai")) return next();
  return express.json({ limit: "8mb" })(req, res, next);
});
app.use(cookieParser(process.env.COOKIE_SECRET));

// חיבור ל-MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/techstore";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Swagger UI - זמין בנתיב /api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// נתיבי Auth (פתוחים, עם rate-limit פנימי)
app.use("/api/auth", authRoutes);

// נתיבי Dashboard (מוגנים ב-requireAuth בתוך הראוטר עצמו)
app.use("/api/dashboard", dashboardRoutes);

// נתיבי Products (מוגנים ב-requireAuth + requireRole("admin") בתוך הראוטר)
app.use("/api/products", productRoutes);

// נתיבי AI - דורשים body גדול יותר בגלל תמונה כ-base64 (מוגבל ב-vision route בלבד)
app.use("/api/ai", express.json({ limit: "8mb" }), aiRoutes);

// נתיבי Feedback - ציבורי, ללא אימות
app.use("/api/feedback", feedbackRoutes);

// מידלוור מרכזי לטיפול בשגיאות - חייב להירשם אחרי כל הנתיבים
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});

export default app;
