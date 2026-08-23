/** טיפוסים עבור ה-Dashboard - משותף לקליינט ולשרת */

export interface TodaysOrdersCountResponse {
  todaysOrdersCount: number;
}

export interface DashboardStats {
  todaysOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
}

// --- Sales Analytics ---

/** הכנסות לפי קטגוריית מוצר */
export interface RevenueByCategory {
  category: string;
  totalRevenue: number;
  totalProductsSold: number;
}

/** לקוח עם הוצאה גבוהה */
export interface TopCustomer {
  customerId: string;
  name: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
}

/** מגמת הזמנות שבועית */
export interface WeeklyTrend {
  week: string;
  orderCount: number;
  revenue: number;
}

/** סגמנט לקוחות */
export interface CustomerSegment {
  segment: string;
  count: number;
  minSpent: number;
  maxSpent: number;
}

/** Query params אופציונליים לאנדפוינט sales-analytics */
export interface SalesAnalyticsQuery {
  startDate?: string;
  endDate?: string;
}

/** תשובת אנדפוינט sales-analytics */
export interface SalesAnalyticsResponse {
  revenueByCategory: RevenueByCategory[];
  topCustomers: TopCustomer[];
  weeklyTrend: WeeklyTrend[];
  customerSegmentation: CustomerSegment[];
}
