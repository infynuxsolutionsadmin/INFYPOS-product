import type { Supplier } from './suppliers';
import type { Store } from './stores';

export type PurchaseStatus = 'DRAFT' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  orderedQuantity: string | number;
  receivedQuantity: string | number;
  unitCost: string | number;
  vatRate: string | number;
  lineTotal: string | number;
  createdAt: string;
}

export interface Purchase {
  id: string;
  tenantId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  storeId: string;
  userId: string;
  currency: string;
  orderDate: string | null;
  expectedDate: string | null;
  subtotal: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  grandTotal: string | number;
  status: PurchaseStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  store?: Store;
  items?: PurchaseItem[];
}

export interface CreatePurchaseItemPayload {
  productId: string;
  orderedQuantity: number;
  unitCost: number;
  taxRate?: number;
}

export interface CreatePurchasePayload {
  storeId: string;
  supplierId: string;
  notes?: string;
  orderDate?: string;
  expectedDate?: string;
  discountAmount?: number;
  items: CreatePurchaseItemPayload[];
}

export interface UpdatePurchasePayload {
  status?: PurchaseStatus;
  notes?: string;
  orderDate?: string;
  expectedDate?: string;
  discountAmount?: number;
  items?: CreatePurchaseItemPayload[];
}

export interface FindPurchasesQuery {
  page?: number;
  limit?: number;
  search?: string;
  storeId?: string;
  supplierId?: string;
  status?: PurchaseStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
