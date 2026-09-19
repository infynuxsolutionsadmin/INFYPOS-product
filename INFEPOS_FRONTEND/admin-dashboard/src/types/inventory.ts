export type InventoryStatus = 'ACTIVE' | 'INACTIVE';

export interface InventoryStore {
  id: string;
  name: string;
  code: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
}

export interface Inventory {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
  status: InventoryStatus;
  createdAt: string;
  updatedAt: string;
  store: InventoryStore;
  product: InventoryProduct;
}

export interface CreateInventoryRequest {
  storeId: string;
  productId: string;
  quantityOnHand: number;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
}

export interface UpdateInventoryRequest {
  quantityOnHand?: number;
  reservedQuantity?: number;
  minimumStock?: number;
  maximumStock?: number;
  reorderLevel?: number;
  status?: InventoryStatus;
}

export interface FindInventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  storeId?: string;
  productId?: string;
  status?: InventoryStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BackendResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
}
