import client from './client';
import type {
  Inventory,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  FindInventoryQuery,
  PaginatedResponse,
  BackendResponse,
} from '../types/inventory';

export const getInventoryList = async (
  query?: FindInventoryQuery
): Promise<PaginatedResponse<Inventory>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<Inventory>>>('/inventory', {
    params: query,
  });
  return response.data.data;
};

export const getInventoryItem = async (id: string): Promise<Inventory> => {
  const response = await client.get<BackendResponse<Inventory>>(`/inventory/${id}`);
  return response.data.data;
};

export const createInventory = async (data: CreateInventoryRequest): Promise<Inventory> => {
  const response = await client.post<BackendResponse<Inventory>>('/inventory', data);
  return response.data.data;
};

export const updateInventory = async (id: string, data: UpdateInventoryRequest): Promise<Inventory> => {
  const response = await client.patch<BackendResponse<Inventory>>(`/inventory/${id}`, data);
  return response.data.data;
};

export const deleteInventory = async (id: string): Promise<Inventory> => {
  const response = await client.delete<BackendResponse<Inventory>>(`/inventory/${id}`);
  return response.data.data;
};
