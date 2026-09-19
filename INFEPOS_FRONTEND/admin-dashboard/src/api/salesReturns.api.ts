import client from './client';
import type { SaleReturn, FindSaleReturnsQuery, CreateSaleReturnPayload } from '../types/salesReturns';
import type { SaleReturnable } from '../types/salesReturns';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getSaleReturns = async (
  query?: FindSaleReturnsQuery
): Promise<PaginatedResponse<SaleReturn>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<SaleReturn>>>('/sales-returns', {
    params: query,
  });
  return response.data.data;
};

export const getSaleReturnById = async (id: string): Promise<SaleReturn> => {
  const response = await client.get<BackendResponse<SaleReturn>>(`/sales-returns/${id}`);
  return response.data.data;
};

export const createSaleReturn = async (data: CreateSaleReturnPayload): Promise<SaleReturn> => {
  const response = await client.post<BackendResponse<SaleReturn>>('/sales-returns', data);
  return response.data.data;
};

// Reuses the Sales endpoint to get returnable items for a given sale
export const getSaleReturnable = async (saleId: string): Promise<SaleReturnable> => {
  const response = await client.get<BackendResponse<SaleReturnable>>(`/sales/${saleId}/returnable`);
  return response.data.data;
};
