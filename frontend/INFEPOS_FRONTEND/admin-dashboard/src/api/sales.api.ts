import client from './client';
import type { Sale, FindSalesQuery, SaleReturnable } from '../types/sales';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getSales = async (
  query?: FindSalesQuery
): Promise<PaginatedResponse<Sale>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<Sale>>>('/sales', {
    params: query,
  });
  return response.data.data;
};

export const getSaleById = async (id: string): Promise<Sale> => {
  const response = await client.get<BackendResponse<Sale>>(`/sales/${id}`);
  return response.data.data;
};

export const getSaleReturnable = async (id: string): Promise<SaleReturnable> => {
  const response = await client.get<BackendResponse<SaleReturnable>>(`/sales/${id}/returnable`);
  return response.data.data;
};
