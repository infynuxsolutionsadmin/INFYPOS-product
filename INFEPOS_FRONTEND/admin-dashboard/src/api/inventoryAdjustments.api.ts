import client from './client';
import type {
  InventoryAdjustment,
  CreateInventoryAdjustmentRequest,
  FindInventoryAdjustmentsQuery,
} from '../types/inventoryAdjustments';
import type { PaginatedResponse, BackendResponse } from '../types/inventory';

export const getInventoryAdjustments = async (
  query?: FindInventoryAdjustmentsQuery
): Promise<PaginatedResponse<InventoryAdjustment>> => {
  const response = await client.get<BackendResponse<PaginatedResponse<InventoryAdjustment>>>('/inventory-adjustments', {
    params: query,
  });
  return response.data.data;
};

export const getInventoryAdjustmentById = async (id: string): Promise<InventoryAdjustment> => {
  const response = await client.get<BackendResponse<InventoryAdjustment>>(`/inventory-adjustments/${id}`);
  return response.data.data;
};

export const createInventoryAdjustment = async (
  data: CreateInventoryAdjustmentRequest
): Promise<InventoryAdjustment> => {
  const response = await client.post<BackendResponse<InventoryAdjustment>>('/inventory-adjustments', data);
  return response.data.data;
};
