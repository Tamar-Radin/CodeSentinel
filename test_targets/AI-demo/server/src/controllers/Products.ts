import { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import Product from "../models/Product";
import { HttpError } from "../utils/HttpError";
import type { CreateProductInput } from "../schemas/index";

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: קבלת כל המוצרים (ציבורי)
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: רשימת מוצרים
 */
export const getAllProducts = asyncHandler(async (_req, res: Response) => {
  const products = await Product.find({});
  res.json({ products });
});

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: ניהול מוצרים
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: הוספת מוצר חדש למערכת (admin בלבד)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *                 example: מחשב נייד
 *               description:
 *                 type: string
 *                 example: מחשב נייד בעל ביצועים גבוהים
 *               price:
 *                 type: number
 *                 example: 3999
 *               category:
 *                 type: string
 *                 example: Electronics
 *               stock:
 *                 type: integer
 *                 example: 50
 *     responses:
 *       201:
 *         description: המוצר נוצר בהצלחה
 *       400:
 *         description: נתונים לא תקינים
 *       401:
 *         description: לא מחובר
 *       403:
 *         description: אין הרשאה - נדרש תפקיד admin
 *       409:
 *         description: מוצר עם שם זה כבר קיים
 */
export const createProduct = asyncHandler(async (req, res: Response) => {
  const { name, description, price, category, stock } = req.body as CreateProductInput;

  // בדיקת כפילות לפי שם
  const existing = await Product.findOne({ name });
  if (existing) {
    throw new HttpError(409, "PRODUCT_EXISTS", "מוצר עם שם זה כבר קיים במערכת");
  }

  const product = await Product.create({ name, description, price, category, stock });

  res.status(201).json({ product });
});
