import client from './client';
import type { CreateSaleRequest, Sale } from '../types/sale';
import type { BackendResponse } from '../types/product';

export const createSale = async (data: CreateSaleRequest): Promise<Sale> => {
  const response = await client.post<BackendResponse<Sale>>('/sales', data);
  return response.data.data;
};

export const getSalesHistory = async (params?: any): Promise<{ items: Sale[]; pagination: any }> => {
  const response = await client.get<BackendResponse<{ items: Sale[]; pagination: any }>>('/sales', { params });
  return response.data.data;
};

export const getReturnableSale = async (saleId: string): Promise<any> => {
  const response = await client.get<BackendResponse<any>>(`/sales/${saleId}/returnable`);
  return response.data.data;
};

export const createSaleReturn = async (data: any): Promise<any> => {
  const response = await client.post<BackendResponse<any>>('/sales-returns', data);
  return response.data.data;
};

