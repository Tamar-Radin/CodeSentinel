import { Router } from "express";
import * as productsController from "../controllers/Products";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { createProductSchema } from "../schemas/index";

const router = Router();


// GET /api/products - רשימת מוצרים ציבורית (ללא התחברות)
router.get("/", productsController.getAllProducts);

// כל שאר ראוטי המוצרים דורשים משתמש מאומת
router.use(requireAuth);

// POST /api/products - הוספת מוצר חדש, admin בלבד
router.post(
  "/",
  requireRole("admin"),
  validate(createProductSchema),
  productsController.createProduct
);

export default router;
