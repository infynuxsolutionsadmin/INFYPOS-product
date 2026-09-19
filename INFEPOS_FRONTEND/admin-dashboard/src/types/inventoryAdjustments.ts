export type AdjustmentReason = 
  | 'DAMAGED'
  | 'EXPIRED'
  | 'THEFT'
  | 'LOST'
  | 'FOUND'
  | 'STOCK_COUNT'
  | 'MANUAL';

export type AdjustmentStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

export interface InventoryAdjustmentItem {
  id: string;
  adjustmentId: string;
  productId: string;
  productName: string;
  sku: string;
  quantityChange: number;
  unitCost: number;
  totalValue: number;
  createdAt: string;
}

export interface InventoryAdjustment {
  id: string;
  tenantId: string;
  storeId: string;
  adjustmentNumber: string;
  reason: AdjustmentReason;
  status: AdjustmentStatus;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  store?: {
    name: string;
    code: string;
  };
  createdByUser?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  items?: InventoryAdjustmentItem[];
}

export interface CreateInventoryAdjustmentItemRequest {
  productId: string;
  quantityChange: number;
}

export interface CreateInventoryAdjustmentRequest {
  storeId: string;
  reason: AdjustmentReason;
  notes?: string;
  items: CreateInventoryAdjustmentItemRequest[];
}

export interface FindInventoryAdjustmentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  storeId?: string;
  reason?: AdjustmentReason;
  status?: AdjustmentStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
