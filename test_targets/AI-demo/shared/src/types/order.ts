/** טיפוסי הזמנה - משותף לקליינט ולשרת */

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "cancelled"
  | "returned";

export interface IOrderBase {
  id: string;
  customerId: string;
  items: string[]; // מזהי מוצרים
  totalAmount: number;
  status: OrderStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
