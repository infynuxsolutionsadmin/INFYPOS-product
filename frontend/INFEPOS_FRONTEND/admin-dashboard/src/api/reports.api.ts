import client from './client';
import type {
  ReportDateQuery,
  SalesSummary,
  SalesReportResponse,
  SalesByProductItem,
  SalesByPaymentMethodItem,
  SalesByStoreItem,
  PurchasesReportResponse,
  PurchasesSummary,
  PurchasesBySupplierItem,
  InventoryReportResponse,
  InventoryReportItem,
  InventoryValuationItem,
  StockMovementsReportResponse,
  AdjustmentsReportResponse,
  StockTransfersReportResponse,
  SalesReturnsReportResponse,
  SalesReturnsSummary,
  CustomersReportResponse,
  SuppliersReportResponse,
  VatSummaryItem,
  VatMtdExport,
} from '../types/reports';
import type { BackendResponse } from '../types/inventory';

// ===== SALES =====
export const getReportSalesSummary = async (q: ReportDateQuery): Promise<SalesSummary> => {
  const r = await client.get<BackendResponse<SalesSummary>>('/reports/sales/summary', { params: q });
  return r.data.data;
};

export const getReportSales = async (q: ReportDateQuery & { paymentMethod?: string; userId?: string }): Promise<SalesReportResponse> => {
  const r = await client.get<BackendResponse<SalesReportResponse>>('/reports/sales', { params: q });
  return r.data.data;
};

export const getReportSalesByProduct = async (q: ReportDateQuery): Promise<SalesByProductItem[]> => {
  const r = await client.get<BackendResponse<SalesByProductItem[]>>('/reports/sales/by-product', { params: q });
  return r.data.data;
};

export const getReportSalesByPaymentMethod = async (q: ReportDateQuery): Promise<SalesByPaymentMethodItem[]> => {
  const r = await client.get<BackendResponse<SalesByPaymentMethodItem[]>>('/reports/sales/by-payment-method', { params: q });
  return r.data.data;
};

export const getReportSalesByStore = async (q: ReportDateQuery): Promise<SalesByStoreItem[]> => {
  const r = await client.get<BackendResponse<SalesByStoreItem[]>>('/reports/sales/by-store', { params: q });
  return r.data.data;
};

// ===== PURCHASES =====
export const getReportPurchasesSummary = async (q: ReportDateQuery): Promise<PurchasesSummary> => {
  const r = await client.get<BackendResponse<PurchasesSummary>>('/reports/purchases/summary', { params: q });
  return r.data.data;
};

export const getReportPurchases = async (q: ReportDateQuery & { supplierId?: string; status?: string }): Promise<PurchasesReportResponse> => {
  const r = await client.get<BackendResponse<PurchasesReportResponse>>('/reports/purchases', { params: q });
  return r.data.data;
};

export const getReportPurchasesBySupplier = async (q: ReportDateQuery): Promise<PurchasesBySupplierItem[]> => {
  const r = await client.get<BackendResponse<PurchasesBySupplierItem[]>>('/reports/purchases/by-supplier', { params: q });
  return r.data.data;
};

// ===== INVENTORY =====
export const getReportInventory = async (q: ReportDateQuery & { status?: string; search?: string }): Promise<InventoryReportResponse> => {
  const r = await client.get<BackendResponse<InventoryReportResponse>>('/reports/inventory', { params: q });
  return r.data.data;
};

export const getReportInventoryLowStock = async (q: Pick<ReportDateQuery, 'storeId'>): Promise<InventoryReportItem[]> => {
  const r = await client.get<BackendResponse<InventoryReportItem[]>>('/reports/inventory/low-stock', { params: q });
  return r.data.data;
};

export const getReportInventoryOutOfStock = async (q: Pick<ReportDateQuery, 'storeId'>): Promise<InventoryReportItem[]> => {
  const r = await client.get<BackendResponse<InventoryReportItem[]>>('/reports/inventory/out-of-stock', { params: q });
  return r.data.data;
};

export const getReportInventoryValuation = async (q: Pick<ReportDateQuery, 'storeId'>): Promise<InventoryValuationItem[]> => {
  const r = await client.get<BackendResponse<InventoryValuationItem[]>>('/reports/inventory/valuation', { params: q });
  return r.data.data;
};

// ===== LEDGER =====
export const getReportStockMovements = async (q: ReportDateQuery & { productId?: string; movementType?: string; referenceType?: string }): Promise<StockMovementsReportResponse> => {
  const r = await client.get<BackendResponse<StockMovementsReportResponse>>('/reports/stock-movements', { params: q });
  return r.data.data;
};

export const getReportInventoryAdjustments = async (q: ReportDateQuery & { reason?: string; status?: string }): Promise<AdjustmentsReportResponse> => {
  const r = await client.get<BackendResponse<AdjustmentsReportResponse>>('/reports/inventory-adjustments', { params: q });
  return r.data.data;
};

export const getReportStockTransfers = async (q: ReportDateQuery & { sourceStoreId?: string; destinationStoreId?: string; status?: string }): Promise<StockTransfersReportResponse> => {
  const r = await client.get<BackendResponse<StockTransfersReportResponse>>('/reports/stock-transfers', { params: q });
  return r.data.data;
};

// ===== RETURNS =====
export const getReportSalesReturns = async (q: ReportDateQuery & { customerId?: string; reason?: string }): Promise<SalesReturnsReportResponse> => {
  const r = await client.get<BackendResponse<SalesReturnsReportResponse>>('/reports/sales-returns', { params: q });
  return r.data.data;
};

export const getReportSalesReturnsSummary = async (q: ReportDateQuery): Promise<SalesReturnsSummary> => {
  const r = await client.get<BackendResponse<SalesReturnsSummary>>('/reports/sales-returns/summary', { params: q });
  return r.data.data;
};

// ===== ENTITY =====
export const getReportCustomers = async (q: ReportDateQuery & { search?: string }): Promise<CustomersReportResponse> => {
  const r = await client.get<BackendResponse<CustomersReportResponse>>('/reports/customers', { params: q });
  return r.data.data;
};

export const getReportSuppliers = async (q: { search?: string; page?: number; limit?: number }): Promise<SuppliersReportResponse> => {
  const r = await client.get<BackendResponse<SuppliersReportResponse>>('/reports/suppliers', { params: q });
  return r.data.data;
};

// ===== VAT =====
export const getReportVatSummary = async (q: ReportDateQuery): Promise<VatSummaryItem[]> => {
  // VAT endpoints return a custom wrapper, not the standard BackendResponse wrapper.
  // They return { success, statusCode, data: [...], meta: {...} }
  const r = await client.get<{ data: VatSummaryItem[] }>('/reports/vat-summary', { params: q });
  return r.data.data;
};

export const getReportVatMtd = async (q: ReportDateQuery): Promise<VatMtdExport> => {
  const r = await client.get<{ data: VatMtdExport }>('/reports/vat-mtd-export', { params: q });
  return r.data.data;
};
