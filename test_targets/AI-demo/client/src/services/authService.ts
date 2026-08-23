import { apiClient } from './apiClient';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  IUser,
} from '@architect/shared';

/**
 * authService - שכבת שירות לאימות מול ה-API.
 * האסטרטגיה: cookie-based (httpOnly) - הטוקן עצמו לא נשמר ב-localStorage.
 * ב-localStorage נשמר רק `user` לתצוגה מהירה ב-UI; הרשאות נאכפות תמיד בשרת.
 */

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return data;
};

export const register = async (payload: RegisterRequest): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/register', payload);
  return data;
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    // גם אם הקריאה נכשלת - לוקלית מנקים את ה-session
    localStorage.removeItem('user');
  }
};

export const fetchMe = async (): Promise<IUser> => {
  const { data } = await apiClient.get<{ user: IUser }>('/auth/me');
  return data.user;
};

export const getSession = (): IUser | null => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IUser;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export const saveSession = (data: LoginResponse): void => {
  localStorage.setItem('user', JSON.stringify(data.user));
};
