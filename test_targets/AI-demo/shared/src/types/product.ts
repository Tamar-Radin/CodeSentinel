/** טיפוסי מוצר - משותף לקליינט ולשרת */

export interface IProductBase {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  stock: number;
  createdAt: string; // ISO date string עבור העברת JSON
}
