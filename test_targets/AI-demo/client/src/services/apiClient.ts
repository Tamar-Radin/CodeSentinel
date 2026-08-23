/**
 * apiClient — מופע Axios מרכזי לשימוש בכל קבצי ה-services בצד הלקוח.
 * כולל baseURL מהסביבה, withCredentials, ו-interceptor אחיד לנירמול שגיאות מהשרת.
 */
import axios from 'axios';
import { navigateRef } from './navigateRef';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — אחיד לטיפול בשגיאות מהשרת + טיפול ב-401 (logout שקט)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // אם השרת מחזיר 401 ואנחנו לא כבר בדף הלוגין - מפנים ללוגין
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      localStorage.removeItem('user');
      if (navigateRef.current) {
        navigateRef.current('/login', { replace: true });
      } else {
        window.location.href = '/login';
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'שגיאה לא צפויה';
    return Promise.reject(new Error(message));
  }
);
