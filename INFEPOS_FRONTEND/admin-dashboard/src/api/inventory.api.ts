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

export interface BulkImportInventoryResult {
  updatedCount: number;
  createdCount: number;
  skippedCount: number;
  totalProcessed: number;
  errors: string[];
}

export interface InventoryExportItem {
  inventoryId: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  productId: string;
  sku: string;
  barcode: string;
  productName: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  quantityToAdd: number;
  editExistingStock?: number | string;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
  status: string;
}

export const getInventoryExportData = async (storeId?: string): Promise<InventoryExportItem[]> => {
  const response = await client.get<BackendResponse<InventoryExportItem[]>>('/inventory/export', {
    params: { storeId },
  });
  return response.data.data;
};

export const bulkImportInventory = async (
  items: any[],
  mode: 'ADD' | 'SET' = 'ADD',
  defaultStoreId?: string,
): Promise<BulkImportInventoryResult> => {
  const response = await client.post<BackendResponse<BulkImportInventoryResult>>('/inventory/bulk-import', {
    items,
    mode,
    defaultStoreId,
  });
  return response.data.data;
};

