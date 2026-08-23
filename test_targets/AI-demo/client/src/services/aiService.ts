import { apiClient } from './apiClient';
import type {
  AiDescriptionRequest,
  AiDescriptionResponse,
  AiVisionRequest,
  AiVisionResponse,
} from '@architect/shared';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const generateDescription = async (
  payload: AiDescriptionRequest,
  signal?: AbortSignal,
): Promise<AiDescriptionResponse> => {
  const { data } = await apiClient.post<AiDescriptionResponse>('/ai/description', payload, { signal });
  return data;
};

export const analyzeImage = async (
  payload: AiVisionRequest,
  signal?: AbortSignal,
): Promise<AiVisionResponse> => {
  const { data } = await apiClient.post<AiVisionResponse>('/ai/vision', payload, { signal });
  return data;
};

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('שגיאה בקריאת הקובץ'));
    };
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
    reader.readAsDataURL(file);
  });

export const validateImageFile = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'סוג קובץ לא נתמך. יש להעלות JPEG, PNG או WebP בלבד';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'הקובץ גדול מדי (מקסימום 5MB)';
  }
  return null;
};
