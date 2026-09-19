import client from './client';
import type { DashboardQuery, DashboardSummary } from '../types/dashboard';

export const getDashboardSummary = async (query: DashboardQuery): Promise<DashboardSummary> => {
  const params = new URLSearchParams();
  if (query.storeId) params.append('storeId', query.storeId);
  if (query.fromDate) params.append('fromDate', query.fromDate);
  if (query.toDate) params.append('toDate', query.toDate);

  const response = await client.get('/dashboard/summary', { params });
  return response.data.data;
};

