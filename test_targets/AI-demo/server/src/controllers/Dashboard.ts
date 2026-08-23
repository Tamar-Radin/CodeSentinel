import { Request, Response } from "express";
import Order from "../models/Order";
import Customer from "../models/Customer";
import Product from "../models/Product";
import type { SalesAnalyticsResponse, DashboardStats } from "@architect/shared";

/**
 * @swagger
 * /api/dashboard/todays-orders:
 *   get:
 *     summary: מחזיר את מספר ההזמנות של היום
 *     description: >
 *       סופר את ההזמנות שנוצרו היום (00:00 עד 23:59) ומתעלם מהזמנות
 *       עם סטטוס cancelled או returned.
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: מספר ההזמנות של היום
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TodaysOrdersCountResponse'
 *       500:
 *         description: שגיאת שרת פנימית
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getTodaysOrdersCount = async (_req: Request, res: Response): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const count = await Order.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      status: { $nin: ["cancelled", "returned"] },
    });

    res.json({ todaysOrdersCount: count });
  } catch (error) {
    console.error("Error fetching today's orders count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /api/dashboard/sales-analytics:
 *   get:
 *     summary: דוח אנליטיקת מכירות מורכב
 *     description: >
 *       מחזיר דוח מקיף הכולל הכנסות לפי קטגוריה, חמשת הלקוחות המובילים,
 *       מגמת הזמנות שבועית וחלוקת לקוחות לסגמנטים.
 *       משתמש ב-MongoDB Aggregation Pipeline עם $facet.
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: תאריך התחלה בפורמט YYYY-MM-DD
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: תאריך סיום בפורמט YYYY-MM-DD
 *     responses:
 *       200:
 *         description: דוח אנליטיקת מכירות
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesAnalyticsResponse'
 *       500:
 *         description: שגיאת שרת פנימית
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // פילטר תאריכים אופציונלי
    const dateMatch: Record<string, any> = {};
    if (startDate || endDate) {
      dateMatch.createdAt = {};
      if (startDate) dateMatch.createdAt.$gte = new Date(startDate);
      if (endDate) dateMatch.createdAt.$lte = new Date(endDate);
    }

    // פילטר בסיס – התעלמות מהזמנות שבוטלו/הוחזרו
    const baseMatch = {
      status: { $nin: ["cancelled", "returned"] },
      ...dateMatch,
    };

    // חישוב תאריך 12 שבועות אחורה עבור weeklyTrend
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const weeklyMatch = {
      ...baseMatch,
      createdAt: {
        ...dateMatch.createdAt,
        $gte: dateMatch.createdAt?.$gte ?? twelveWeeksAgo,
      },
    };

    const [result] = await Order.aggregate<SalesAnalyticsResponse>([
      {
        $facet: {
          // 1. הכנסות לפי קטגוריית מוצר
          revenueByCategory: [
            { $match: baseMatch },
            {
              $lookup: {
                from: "products",
                localField: "items",
                foreignField: "_id",
                as: "productDetails",
              },
            },
            { $unwind: "$productDetails" },
            {
              $group: {
                _id: "$productDetails.category",
                totalRevenue: { $sum: "$productDetails.price" },
                totalProductsSold: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                category: { $ifNull: ["$_id", "ללא קטגוריה"] },
                totalRevenue: 1,
                totalProductsSold: 1,
              },
            },
            { $sort: { totalRevenue: -1 } },
          ],

          // 2. חמשת הלקוחות עם ההוצאה הגבוהה ביותר
          topCustomers: [
            { $match: baseMatch },
            {
              $group: {
                _id: "$customer",
                totalSpent: { $sum: "$totalAmount" },
                orderCount: { $sum: 1 },
              },
            },
            {
              $addFields: {
                avgOrderValue: { $divide: ["$totalSpent", "$orderCount"] },
              },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "customers",
                localField: "_id",
                foreignField: "_id",
                as: "customerInfo",
              },
            },
            { $unwind: "$customerInfo" },
            {
              $project: {
                _id: 0,
                customerId: { $toString: "$_id" },
                name: "$customerInfo.name",
                email: "$customerInfo.email",
                totalSpent: 1,
                orderCount: 1,
                avgOrderValue: { $round: ["$avgOrderValue", 2] },
              },
            },
          ],

          // 3. מגמת הזמנות ב-12 השבועות האחרונים
          weeklyTrend: [
            { $match: weeklyMatch },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-W%V", date: "$createdAt" },
                },
                orderCount: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
            {
              $project: {
                _id: 0,
                week: "$_id",
                orderCount: 1,
                revenue: { $round: ["$revenue", 2] },
              },
            },
            { $sort: { week: 1 } },
          ],

          // 4. חלוקת לקוחות לסגמנטים
          customerSegmentation: [
            { $match: baseMatch },
            {
              $group: {
                _id: "$customer",
                totalSpent: { $sum: "$totalAmount" },
              },
            },
            {
              $bucket: {
                groupBy: "$totalSpent",
                boundaries: [0, 500, 2000, 5000],
                default: 5000,
                output: {
                  count: { $sum: 1 },
                  minSpent: { $min: "$totalSpent" },
                  maxSpent: { $max: "$totalSpent" },
                },
              },
            },
            {
              $addFields: {
                segment: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$_id", 0] }, then: "Bronze" },
                      { case: { $eq: ["$_id", 500] }, then: "Silver" },
                      { case: { $eq: ["$_id", 2000] }, then: "Gold" },
                    ],
                    default: "Platinum",
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                segment: 1,
                count: 1,
                minSpent: { $round: ["$minSpent", 2] },
                maxSpent: { $round: ["$maxSpent", 2] },
              },
            },
          ],
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    console.error("Error fetching sales analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: סטטיסטיקות כלליות עבור ה-Dashboard
 *     description: >
 *       מחזיר סטטיסטיקות מצרפיות עבור ה-Dashboard - כולל מספר ההזמנות של היום
 *       (ללא מבוטלות/מוחזרות), סך ההכנסות הכולל, מספר הלקוחות הכולל ומספר המוצרים.
 *       כל השאילתות רצות במקביל לביצועים אופטימליים.
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: אובייקט הסטטיסטיקות
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 *       500:
 *         description: שגיאת שרת פנימית
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // טווח התאריכים של היום (00:00 עד 23:59)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // פילטר בסיס - התעלמות מהזמנות שבוטלו/הוחזרו
    const activeOrdersFilter = { status: { $nin: ["cancelled", "returned"] } };

    // הרצת כל ארבע השאילתות במקביל לביצועים אופטימליים
    const [todaysOrders, revenueResult, totalCustomers, totalProducts] = await Promise.all([
      Order.countDocuments({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        ...activeOrdersFilter,
      }),
      Order.aggregate<{ _id: null; total: number }>([
        { $match: activeOrdersFilter },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Customer.countDocuments({}),
      Product.countDocuments({}),
    ]);

    const stats: DashboardStats = {
      todaysOrders,
      totalRevenue: revenueResult[0]?.total ?? 0,
      totalCustomers,
      totalProducts,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
