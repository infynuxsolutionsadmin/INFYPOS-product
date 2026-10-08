export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

export interface CreateSaleItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateSaleRequest {
  shiftId?: string;
  storeId: string;
  customerId?: string;
  customerPhone?: string;
  discountAmount?: number;
  payments: Array<{
    paymentMethod: PaymentMethod;
    amount: number;
    transactionReference?: string;
  }>;
  notes?: string;
  items: CreateSaleItemRequest[];
}

export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'REFUNDED';

export interface Sale {
  id: string;
  tenantId: string;
  storeId: string;
  userId: string;
  customerId: string | null;
  customerName: string | null;
  customerCode: string | null;
  saleNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  shiftId: string | null;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
  createdAt: string;
}
