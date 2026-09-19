import type { Purchase, PurchaseItem } from './purchases';
import type { Store } from './stores';
import type { AuthUser } from './auth';

export type GoodsReceiptStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  purchaseItemId: string;
  productId: string;
  productName: string;
  sku: string;
  receivedQuantity: string | number;
  unitCost: string | number;
  vatRate: string | number;
  lineTotal: string | number;
  createdAt: string;
  purchaseItem?: PurchaseItem;
}

export interface GoodsReceipt {
  id: string;
  tenantId: string;
  purchaseId: string;
  storeId: string;
  receivedBy: string;
  receiptNumber: string;
  status: GoodsReceiptStatus;
  notes: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  store?: Store;
  purchase?: Purchase;
  receivedByUser?: AuthUser;
  items?: GoodsReceiptItem[];
}

export interface CreateGoodsReceiptItemPayload {
  purchaseItemId: string;
  receivedQuantity: number;
}

export interface CreateGoodsReceiptPayload {
  purchaseId: string;
  notes?: string;
  items: CreateGoodsReceiptItemPayload[];
}

export interface FindGoodsReceiptsQuery {
  page?: number;
  limit?: number;
  search?: string;
  storeId?: string;
  purchaseId?: string;
  status?: GoodsReceiptStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
