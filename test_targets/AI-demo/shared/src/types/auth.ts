/** טיפוסים לאימות משתמשים - משותף לקליינט ולשרת */

export type UserRole = "admin" | "manager" | "user";

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: IUser;
  // נשאר אופציונלי לתאימות; באסטרטגיית cookie-based לא מוחזר
  token?: string;
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "USER_EXISTS"
  | "TOKEN_EXPIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN";

export interface AuthErrorResponse {
  error: string;
  code?: AuthErrorCode;
}
