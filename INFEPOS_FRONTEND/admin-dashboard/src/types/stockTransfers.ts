export type TransferType = 'STORE_TO_STORE' | 'STORE_TO_WAREHOUSE' | 'WAREHOUSE_TO_STORE';
export type TransferStatus = 'DRAFT' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  unit: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  createdAt: string;
}

export interface StockTransfer {
  id: string;
  tenantId: string;
  transferNumber: string;
  transferType: TransferType;
  sourceStoreId: string;
  destinationStoreId: string;
  status: TransferStatus;
  notes: string | null;
  receivedNotes: string | null;
  carrier: string | null;
  vehicleNumber: string | null;
  trackingNumber: string | null;
  createdBy: string;
  shippedBy: string | null;
  receivedBy: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sourceStore?: {
    name: string;
    code: string;
  };
  destinationStore?: {
    name: string;
    code: string;
  };
  createdByUser?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  shippedByUser?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  receivedByUser?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  items?: StockTransferItem[];
}

export interface CreateStockTransferItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateStockTransferRequest {
  transferType?: TransferType;
  sourceStoreId: string;
  destinationStoreId: string;
  notes?: string;
  carrier?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
  items: CreateStockTransferItemRequest[];
}

export interface UpdateStockTransferRequest {
  notes?: string;
  carrier?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
  items?: CreateStockTransferItemRequest[];
}

export interface ReceiveStockTransferRequest {
  receivedNotes?: string;
}

export interface FindStockTransfersQuery {
  page?: number;
  limit?: number;
  search?: string;
  sourceStoreId?: string;
  destinationStoreId?: string;
  status?: TransferStatus;
  date?: string;
  createdBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
