import type { Store } from './stores';

export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'PARTIALLY_RETURNED';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  quantity: string | number;
  unitPrice: string | number;
  vatRate: string | number;
  lineTotal: string | number;
  returnedQuantity: string | number;
  createdAt: string;
}

export interface SaleUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

export interface Sale {
  id: string;
  tenantId: string;
  saleNumber: string;
  storeId: string;
  userId: string;
  customerId: string | null;
  customerName: string | null;
  customerCode: string | null;
  shiftId: string | null;
  subtotal: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  grandTotal: string | number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  store?: Store;
  user?: SaleUser;
  items?: SaleItem[];
}

export interface FindSalesQuery {
  page?: number;
  limit?: number;
  storeId?: string;
  userId?: string;
  status?: SaleStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReturnableItem {
  saleItemId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  unitPrice: string | number;
  soldQuantity: string | number;
  returnedQuantity: string | number;
  availableToReturn: string | number;
}

export interface SaleReturnable {
  saleId: string;
  saleNumber: string;
  returnableItems: ReturnableItem[];
}
