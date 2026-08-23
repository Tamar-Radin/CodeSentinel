import { apiClient } from './apiClient';
import type { Feedback, FeedbackRequest, ApiResponse } from '@architect/shared';
import { AxiosError } from 'axios';

export interface ValidationError {
  code: string;
  path: (string | number)[];
  message: string;
}

export class FeedbackValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(errors: ValidationError[]) {
    super('שגיאת ולידציה בשרת');
    this.fieldErrors = {};
    for (const err of errors) {
      const field = err.path[0];
      if (typeof field === 'string' && !this.fieldErrors[field]) {
        this.fieldErrors[field] = err.message;
      }
    }
  }
}

export const submitFeedback = async (data: FeedbackRequest): Promise<ApiResponse<Feedback>> => {
  try {
    const res = await apiClient.post<ApiResponse<Feedback>>('/feedback', data);
    return res.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 400 && Array.isArray(err.response.data?.errors)) {
      throw new FeedbackValidationError(err.response.data.errors);
    }
    throw err;
  }
};
