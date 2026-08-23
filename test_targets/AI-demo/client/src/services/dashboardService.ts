import type {
  DashboardStats,
  TodaysOrdersCountResponse,
  SalesAnalyticsQuery,
  SalesAnalyticsResponse,
} from '@architect/shared';
import { apiClient } from './apiClient';

export const getStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<DashboardStats>('/dashboard/stats');
  return response.data;
};

export const getTodaysOrdersCount = async (): Promise<TodaysOrdersCountResponse> => {
  const response = await apiClient.get<TodaysOrdersCountResponse>('/dashboard/todays-orders');
  return response.data;
};

export const getSalesAnalytics = async (
  query?: SalesAnalyticsQuery
): Promise<SalesAnalyticsResponse> => {
  const response = await apiClient.get<SalesAnalyticsResponse>('/dashboard/sales-analytics', {
    params: query,
  });
  return response.data;
};
