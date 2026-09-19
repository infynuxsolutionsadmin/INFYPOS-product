
export type ReturnReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'CUSTOMER_CHANGE_MIND' | 'OTHER';
export type ReturnStatus = 'COMPLETED' | 'CANCELLED';
export type ReturnType = 'FULL_RETURN' | 'PARTIAL_RETURN';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

export interface SaleReturnItem {
  id: string;
  saleReturnId: string;
  saleItemId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  quantity: string | number;
  unitPrice: string | number;
  vatRate: string | number;
  lineTotal: string | number;
  reason: ReturnReason;
  createdAt: string;
}

export interface SaleReturnCustomer {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  customerCode?: string;
}

export interface SaleReturnUser {
  id: string;
  firstName: string;
  lastName: string | null;
}

export interface SaleReturnStore {
  id: string;
  name: string;
  code: string;
}

export interface SaleReturnOriginalSale {
  saleNumber: string;
}

// Used in list response (includes, but originalSale is partial)
export interface SaleReturn {
  id: string;
  tenantId: string;
  storeId: string;
  userId: string;
  customerId: string | null;
  originalSaleId: string;
  returnNumber: string;
  returnType: ReturnType;
  subtotal: string | number;
  taxAmount: string | number;
  refundTotal: string | number;
  refundMethod: PaymentMethod;
  status: ReturnStatus;
  notes: string | null;
  shiftId: string | null;
  createdAt: string;
  updatedAt: string;
  // Includes from findAll
  store?: SaleReturnStore;
  customer?: SaleReturnCustomer | null;
  originalSale?: SaleReturnOriginalSale;
  // Includes from findOne (full)
  user?: SaleReturnUser;
  items?: SaleReturnItem[];
}

export interface CreateSaleReturnItemPayload {
  saleItemId: string;
  quantity: number;
  reason: ReturnReason;
}

export interface CreateSaleReturnPayload {
  shiftId?: string;
  originalSaleId: string;
  refundMethod?: PaymentMethod;
  notes?: string;
  items: CreateSaleReturnItemPayload[];
}

export interface FindSaleReturnsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReturnStatus;
  returnType?: ReturnType;
  storeId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Used in return creation form — from GET /sales/:id/returnable
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
