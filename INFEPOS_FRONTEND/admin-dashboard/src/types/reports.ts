// ===== Common =====
export interface ReportDateQuery {
  fromDate?: string;
  toDate?: string;
  storeId?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ===== Sales Summary =====
export interface SalesSummary {
  totalSales: number;
  grossSales: string;
  totalReturns: string;
  netSales: string;
  averageBasket: string;
}

// ===== Sales List =====
export interface SaleReportItem {
  id: string;
  saleNumber: string;
  grandTotal: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string | null;
  paymentMethod: string;
  status: string;
  createdAt: string;
  store: { code: string; name: string };
  user: { firstName: string; lastName: string | null };
}

export interface SalesReportResponse {
  items: SaleReportItem[];
  pagination: PaginationMeta;
}

// ===== Sales by Product =====
export interface SalesByProductItem {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: string;
  grossSales: string;
  averageSellingPrice: string;
}

// ===== Sales by Payment Method =====
export interface SalesByPaymentMethodItem {
  paymentMethod: string;
  transactionCount: number;
  amount: string;
}

// ===== Sales by Store =====
export interface SalesByStoreItem {
  storeId: string;
  storeCode: string;
  storeName: string;
  grossSales: string;
  returns: string;
  netSales: string;
  transactionCount: number;
  averageBasket: string;
}

// ===== Purchases =====
export interface PurchaseReportItem {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  supplierCode: string;
  grandTotal: string;
  status: string;
  createdAt: string;
}

export interface PurchasesReportResponse {
  items: PurchaseReportItem[];
  pagination: PaginationMeta;
}

export interface PurchasesSummary {
  totalPurchaseOrders: number;
  totalPurchaseValue: string;
  draftOrders: number;
  approvedOrders: number;
  orderedOrders: number;
  partiallyReceivedOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
}

export interface PurchasesBySupplierItem {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  purchaseOrders: number;
  totalPurchaseValue: string;
}

// ===== Inventory =====
export interface InventoryReportItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  storeId: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableStock: number;
  reorderLevel: number;
  status: string;
}

export interface InventoryReportResponse {
  items: InventoryReportItem[];
  pagination: PaginationMeta;
}

export interface InventoryValuationItem {
  storeId: string;
  storeName: string;
  totalQuantity: string;
  inventoryValue: string;
}

// ===== Stock Movements =====
export interface StockMovementItem {
  id: string;
  productId: string;
  storeId: string;
  movementType: string;
  quantityChange: string;
  quantityBefore: string;
  quantityAfter: string;
  referenceNumber: string | null;
  createdAt: string;
  product: { name: string; sku: string };
  store: { name: string; code: string };
}

export interface StockMovementsReportResponse {
  items: StockMovementItem[];
  pagination: PaginationMeta;
}

// ===== Inventory Adjustments =====
export interface AdjustmentReportItem {
  id: string;
  adjustmentNumber: string;
  reason: string;
  status: string;
  notes: string | null;
  createdAt: string;
  store: { name: string };
}

export interface AdjustmentsReportResponse {
  items: AdjustmentReportItem[];
  pagination: PaginationMeta;
}

// ===== Stock Transfers =====
export interface StockTransferReportItem {
  id: string;
  transferNumber: string;
  sourceStore: string;
  destinationStore: string;
  status: string;
  itemCount: number;
  totalQuantity: string;
  totalValue: string;
  shippedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export interface StockTransfersReportResponse {
  items: StockTransferReportItem[];
  pagination: PaginationMeta;
}

// ===== Sales Returns =====
export interface SalesReturnReportItem {
  id: string;
  returnNumber: string;
  originalSaleNumber: string;
  customer: string;
  store: string;
  refundTotal: string;
  returnedQuantity: string;
  refundMethod: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

export interface SalesReturnsReportResponse {
  items: SalesReturnReportItem[];
  pagination: PaginationMeta;
}

export interface SalesReturnsSummary {
  totalReturns: number;
  totalRefundAmount: string;
  byReason: { reason: string; quantityReturned: string; refundValue: string }[];
}

// ===== Customers =====
export interface CustomerReportItem {
  customerId: string;
  customerCode: string;
  customerName: string;
  totalPurchases: number;
  totalSpent: string;
  lastPurchaseDate: string | null;
  currentPoints: string;
  tier: string;
}

export interface CustomersReportResponse {
  items: CustomerReportItem[];
  pagination: PaginationMeta;
}

// ===== Suppliers =====
export interface SupplierReportItem {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  purchaseOrderCount: number;
  pendingPurchaseOrders: number;
  completedPurchaseOrders: number;
  totalPurchaseValue: string;
  lastPurchaseDate: string | null;
}

export interface SuppliersReportResponse {
  items: SupplierReportItem[];
  pagination: PaginationMeta;
}

// ===== VAT =====
export interface VatSummaryItem {
  vatRate: string;
  netSales: string;
  vatCollected: string;
  grossSales: string;
}

export interface VatMtdExport {
  box1_vatDueOnSales: string;
  box2_vatDueOnAcquisitions: string;
  box3_totalVatDue: string;
  box4_vatReclaimedOnPurchases: string;
  box5_netVat: string;
  box6_totalValueSalesExVAT: string;
  box7_totalValuePurchasesExVAT: string;
  box8_totalValueSuppliesExVAT: string;
  box9_totalValueAcquisitionsExVAT: string;
}
