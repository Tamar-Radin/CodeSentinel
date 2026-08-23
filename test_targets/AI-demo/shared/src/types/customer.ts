/** טיפוסי לקוח - ללא שדות רגישים כגון סיסמה (בטוח לשליחה לקליינט) */

export interface ICustomerBase {
  id: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  createdAt: string; // ISO date string עבור העברת JSON
}
