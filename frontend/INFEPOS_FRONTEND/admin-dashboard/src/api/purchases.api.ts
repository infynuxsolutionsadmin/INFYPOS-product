import client from './client';
import type {
  Purchase,
  CreatePurchasePayload,
  UpdatePurchasePayload,
  FindPurchasesQuery,
} from '../types/purchases';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getPurchases = async (
  query?: FindPurchasesQuery
): Promise<PaginatedResponse<Purchase>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<Purchase>>>('/purchases', {
    params: query,
  });
  return response.data.data;
};

export const getPurchaseById = async (id: string): Promise<Purchase> => {
  const response = await client.get<BackendResponse<Purchase>>(`/purchases/${id}`);
  return response.data.data;
};

export const createPurchase = async (data: CreatePurchasePayload): Promise<Purchase> => {
  const response = await client.post<BackendResponse<Purchase>>('/purchases', data);
  return response.data.data;
};

export const updatePurchase = async (id: string, data: UpdatePurchasePayload): Promise<Purchase> => {
  const response = await client.patch<BackendResponse<Purchase>>(`/purchases/${id}`, data);
  return response.data.data;
};

export const deletePurchase = async (id: string): Promise<Purchase> => {
  const response = await client.delete<BackendResponse<Purchase>>(`/purchases/${id}`);
  return response.data.data;
};
