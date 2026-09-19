import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Package, Truck, RotateCcw, Users, UserCheck, TrendingUp, FileText,
  BarChart2, ArrowLeft, ArrowRight, Search
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getStores } from '../../api/stores.api';
import {
  getReportSalesSummary, getReportSales, getReportSalesByProduct,
  getReportSalesByPaymentMethod, getReportSalesByStore,
  getReportPurchasesSummary, getReportPurchases, getReportPurchasesBySupplier,
  getReportInventory, getReportInventoryLowStock, getReportInventoryOutOfStock, getReportInventoryValuation,
  getReportStockMovements, getReportInventoryAdjustments, getReportStockTransfers,
  getReportSalesReturns, getReportSalesReturnsSummary,
  getReportCustomers, getReportSuppliers,
  getReportVatSummary, getReportVatMtd,
} from '../../api/reports.api';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportSummaryCard from '../../components/reports/ReportSummaryCard';
import ReportTable from '../../components/reports/ReportTable';
import type { Store } from '../../types/stores';

// ─── helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—';

type ReportTab =
  | 'sales' | 'sales-by-product' | 'sales-by-payment' | 'sales-by-store'
  | 'purchases' | 'purchases-by-supplier'
  | 'inventory' | 'low-stock' | 'out-of-stock' | 'inventory-valuation'
  | 'stock-movements' | 'adjustments' | 'transfers'
  | 'returns' | 'customers' | 'suppliers' | 'vat';

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'sales', label: 'Sales', icon: <ShoppingCart className="h-4 w-4" /> },
  { id: 'sales-by-product', label: 'By Product', icon: <Package className="h-4 w-4" /> },
  { id: 'sales-by-payment', label: 'By Payment', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'sales-by-store', label: 'By Store', icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'purchases', label: 'Purchases', icon: <Truck className="h-4 w-4" /> },
  { id: 'purchases-by-supplier', label: 'By Supplier', icon: <UserCheck className="h-4 w-4" /> },
  { id: 'inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
  { id: 'low-stock', label: 'Low Stock', icon: <Package className="h-4 w-4" /> },
  { id: 'out-of-stock', label: 'Out of Stock', icon: <Package className="h-4 w-4" /> },
  { id: 'inventory-valuation', label: 'Valuation', icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'stock-movements', label: 'Movements', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'adjustments', label: 'Adjustments', icon: <FileText className="h-4 w-4" /> },
  { id: 'transfers', label: 'Transfers', icon: <Truck className="h-4 w-4" /> },
  { id: 'returns', label: 'Returns', icon: <RotateCcw className="h-4 w-4" /> },
  { id: 'customers', label: 'Customers', icon: <Users className="h-4 w-4" /> },
  { id: 'suppliers', label: 'Suppliers', icon: <UserCheck className="h-4 w-4" /> },
  { id: 'vat', label: 'VAT', icon: <FileText className="h-4 w-4" /> },
];

const TAB_GROUPS = [
  { label: 'Sales', tabs: ['sales', 'sales-by-product', 'sales-by-payment', 'sales-by-store'] },
  { label: 'Purchases', tabs: ['purchases', 'purchases-by-supplier'] },
  { label: 'Inventory', tabs: ['inventory', 'low-stock', 'out-of-stock', 'inventory-valuation'] },
  { label: 'Ledger', tabs: ['stock-movements', 'adjustments', 'transfers'] },
  { label: 'Returns', tabs: ['returns'] },
  { label: 'Entities', tabs: ['customers', 'suppliers'] },
  { label: 'Tax', tabs: ['vat'] },
];

// ─── main component ──────────────────────────────────────────────────────────
const ReportsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission('reports.read');

  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [stores, setStores] = useState<Store[]>([]);

  // Filters
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [storeId, setStoreId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Data
  const [data, setData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Applied filters (only updated on Apply)
  const [appliedFilters, setAppliedFilters] = useState({ fromDate: monthStart(), toDate: today(), storeId: '', search: '' });

  // Load stores once
  useEffect(() => {
    getStores({ limit: 100 }).then(r => setStores(r.items)).catch(() => {});
  }, []);

  const buildQuery = useCallback(() => ({
    fromDate: appliedFilters.fromDate || undefined,
    toDate: appliedFilters.toDate || undefined,
    storeId: appliedFilters.storeId || undefined,
    search: appliedFilters.search || undefined,
    page,
    limit: LIMIT,
  }), [appliedFilters, page]);

  const fetchData = useCallback(async () => {
    if (!canRead) { setError('You do not have permission to view reports.'); return; }
    setLoading(true);
    setError(null);
    const q = buildQuery();
    try {
      switch (activeTab) {
        case 'sales': {
          const [s, d] = await Promise.all([
            getReportSalesSummary(q),
            getReportSales(q),
          ]);
          setSummary(s); setData(d);
          break;
        }
        case 'sales-by-product': {
          const d = await getReportSalesByProduct(q);
          setData(d); setSummary(null);
          break;
        }
        case 'sales-by-payment': {
          const d = await getReportSalesByPaymentMethod(q);
          setData(d); setSummary(null);
          break;
        }
        case 'sales-by-store': {
          const d = await getReportSalesByStore(q);
          setData(d); setSummary(null);
          break;
        }
        case 'purchases': {
          const [s, d] = await Promise.all([
            getReportPurchasesSummary(q),
            getReportPurchases(q),
          ]);
          setSummary(s); setData(d);
          break;
        }
        case 'purchases-by-supplier': {
          const d = await getReportPurchasesBySupplier(q);
          setData(d); setSummary(null);
          break;
        }
        case 'inventory': {
          const d = await getReportInventory(q);
          setData(d); setSummary(null);
          break;
        }
        case 'low-stock': {
          const d = await getReportInventoryLowStock({ storeId: q.storeId });
          setData(d); setSummary(null);
          break;
        }
        case 'out-of-stock': {
          const d = await getReportInventoryOutOfStock({ storeId: q.storeId });
          setData(d); setSummary(null);
          break;
        }
        case 'inventory-valuation': {
          const d = await getReportInventoryValuation({ storeId: q.storeId });
          setData(d); setSummary(null);
          break;
        }
        case 'stock-movements': {
          const d = await getReportStockMovements(q);
          setData(d); setSummary(null);
          break;
        }
        case 'adjustments': {
          const d = await getReportInventoryAdjustments(q);
          setData(d); setSummary(null);
          break;
        }
        case 'transfers': {
          const d = await getReportStockTransfers(q);
          setData(d); setSummary(null);
          break;
        }
        case 'returns': {
          const [s, d] = await Promise.all([
            getReportSalesReturnsSummary(q),
            getReportSalesReturns(q),
          ]);
          setSummary(s); setData(d);
          break;
        }
        case 'customers': {
          const d = await getReportCustomers(q);
          setData(d); setSummary(null);
          break;
        }
        case 'suppliers': {
          const d = await getReportSuppliers({ search: q.search, page: q.page, limit: q.limit });
          setData(d); setSummary(null);
          break;
        }
        case 'vat': {
          const [s, m] = await Promise.all([
            getReportVatSummary(q),
            getReportVatMtd(q),
          ]);
          setData(s); setSummary(m);
          break;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, buildQuery, canRead]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApply = () => {
    setAppliedFilters({ fromDate, toDate, storeId, search });
    setPage(1);
  };

  const handleReset = () => {
    const def = { fromDate: monthStart(), toDate: today(), storeId: '', search: '' };
    setFromDate(def.fromDate); setToDate(def.toDate); setStoreId(''); setSearch('');
    setAppliedFilters(def);
    setPage(1);
  };

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    setPage(1);
    setData(null);
    setSummary(null);
  };

  // Pagination helper
  const pagination = data?.pagination;

  const renderContent = () => {
    if (error) return <div className="py-8 text-center text-red-500">{error}</div>;

    switch (activeTab) {
      // ── SALES ─────────────────────────────────────────────────────────────
      case 'sales':
        return (
          <>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                <ReportSummaryCard label="Total Sales" value={summary.totalSales} color="text-blue-600" />
                <ReportSummaryCard label="Gross Sales" value={`${summary.grossSales}`} color="text-green-600" />
                <ReportSummaryCard label="Returns" value={`${summary.totalReturns}`} color="text-red-500" />
                <ReportSummaryCard label="Net Sales" value={`${summary.netSales}`} color="text-indigo-600" />
                <ReportSummaryCard label="Avg Basket" value={`${summary.averageBasket}`} color="text-purple-600" />
              </div>
            )}
            <ReportTable
              loading={loading}
              keyField="id"
              data={data?.items ?? []}
              columns={[
                { header: 'Sale #', accessor: 'saleNumber' },
                { header: 'Store', accessor: r => r.store?.name ?? '—' },
                { header: 'Staff', accessor: r => `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || '—' },
                { header: 'Payment', accessor: 'paymentMethod' },
                { header: 'Grand Total', accessor: r => String(r.grandTotal) },
                { header: 'Status', accessor: 'status' },
                { header: 'Date', accessor: r => fmtDate(r.createdAt) },
              ]}
            />
          </>
        );

      case 'sales-by-product':
        return (
          <ReportTable
            loading={loading}
            keyField="productId"
            data={Array.isArray(data) ? data : []}
            columns={[
              { header: 'Product', accessor: 'productName' },
              { header: 'SKU', accessor: 'sku' },
              { header: 'Qty Sold', accessor: 'quantitySold' },
              { header: 'Gross Sales', accessor: 'grossSales' },
              { header: 'Avg Price', accessor: 'averageSellingPrice' },
            ]}
          />
        );

      case 'sales-by-payment':
        return (
          <ReportTable
            loading={loading}
            keyField="paymentMethod"
            data={Array.isArray(data) ? data : []}
            columns={[
              { header: 'Payment Method', accessor: 'paymentMethod' },
              { header: 'Transactions', accessor: 'transactionCount' },
              { header: 'Amount', accessor: 'amount' },
            ]}
          />
        );

      case 'sales-by-store':
        return (
          <ReportTable
            loading={loading}
            keyField="storeId"
            data={Array.isArray(data) ? data : []}
            columns={[
              { header: 'Store', accessor: 'storeName' },
              { header: 'Code', accessor: 'storeCode' },
              { header: 'Gross Sales', accessor: 'grossSales' },
              { header: 'Returns', accessor: 'returns' },
              { header: 'Net Sales', accessor: 'netSales' },
              { header: 'Transactions', accessor: 'transactionCount' },
              { header: 'Avg Basket', accessor: 'averageBasket' },
            ]}
          />
        );

      // ── PURCHASES ─────────────────────────────────────────────────────────
      case 'purchases':
        return (
          <>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                <ReportSummaryCard label="Total POs" value={summary.totalPurchaseOrders} color="text-blue-600" />
                <ReportSummaryCard label="Total Value" value={summary.totalPurchaseValue} color="text-green-600" />
                <ReportSummaryCard label="Received" value={summary.receivedOrders} color="text-emerald-600" />
                <ReportSummaryCard label="Pending / Draft" value={summary.draftOrders + summary.approvedOrders + summary.orderedOrders} color="text-amber-600" />
              </div>
            )}
            <ReportTable
              loading={loading}
              keyField="id"
              data={data?.items ?? []}
              columns={[
                { header: 'PO #', accessor: 'purchaseNumber' },
                { header: 'Supplier', accessor: 'supplierName' },
                { header: 'Grand Total', accessor: r => String(r.grandTotal) },
                { header: 'Status', accessor: 'status' },
                { header: 'Date', accessor: r => fmtDate(r.createdAt) },
              ]}
            />
          </>
        );

      case 'purchases-by-supplier':
        return (
          <ReportTable
            loading={loading}
            keyField="supplierId"
            data={Array.isArray(data) ? data : []}
            columns={[
              { header: 'Supplier', accessor: 'supplierName' },
              { header: 'Code', accessor: 'supplierCode' },
              { header: 'PO Count', accessor: 'purchaseOrders' },
              { header: 'Total Value', accessor: 'totalPurchaseValue' },
            ]}
          />
        );

      // ── INVENTORY ─────────────────────────────────────────────────────────
      case 'inventory':
        return (
          <ReportTable
            loading={loading}
            keyField="id"
            data={data?.items ?? []}
            columns={[
              { header: 'Product', accessor: 'productName' },
              { header: 'SKU', accessor: 'productSku' },
              { header: 'On Hand', accessor: r => String(r.quantityOnHand) },
              { header: 'Reserved', accessor: r => String(r.reservedQuantity) },
              { header: 'Available', accessor: r => String(r.availableStock) },
              { header: 'Reorder Level', accessor: r => String(r.reorderLevel ?? '—') },
              { header: 'Status', accessor: 'status' },
            ]}
          />
        );

      case 'low-stock':
        return (
          <ReportTable
            loading={loading}
            keyField="id"
            data={Array.isArray(data) ? data : []}
            columns={[
              { header: 'Product', accessor: 'productName' },
              { header: 'SKU', accessor: 'productSku' },
              { header: 'Available', accessor: r => String(r.availableStock) },
              { header: 'Reorder Level', accessor: r => String(r.reorderLevel) },
              { header: 'On Hand', accessor: r => String(r.quantityOnHand) },
            ]}
            emptyMessage="No low stock items found."
          />
        );

      case 'out-of-stock':
        return (
          <ReportTable
            loading={loading}
            keyField="id"
            data={Array.isArray(data) ? data : []}
            columns={[
              { header: 'Product', accessor: 'productName' },
              { header: 'SKU', accessor: 'productSku' },
              { header: 'On Hand', accessor: r => String(r.quantityOnHand) },
              { header: 'Reserved', accessor: r => String(r.reservedQuantity) },
              { header: 'Available', accessor: r => String(r.availableStock) },
            ]}
            emptyMessage="No out-of-stock items found."
          />
        );

      case 'inventory-valuation':
        return (
          <ReportTable
            loading={loading}
            keyField="storeId"
            data={Array.isArray(data) ? data : []}
            columns={[
              { header: 'Store', accessor: 'storeName' },
              { header: 'Total Qty', accessor: 'totalQuantity' },
              { header: 'Inventory Value (Cost)', accessor: 'inventoryValue' },
            ]}
          />
        );

      // ── LEDGER ────────────────────────────────────────────────────────────
      case 'stock-movements':
        return (
          <ReportTable
            loading={loading}
            keyField="id"
            data={data?.items ?? []}
            columns={[
              { header: 'Product', accessor: r => r.product?.name ?? '—' },
              { header: 'SKU', accessor: r => r.product?.sku ?? '—' },
              { header: 'Store', accessor: r => r.store?.name ?? '—' },
              { header: 'Type', accessor: 'movementType' },
              { header: 'Qty Change', accessor: r => String(r.quantityChange) },
              { header: 'Before', accessor: r => String(r.quantityBefore) },
              { header: 'After', accessor: r => String(r.quantityAfter) },
              { header: 'Date', accessor: r => fmtDate(r.createdAt) },
            ]}
          />
        );

      case 'adjustments':
        return (
          <ReportTable
            loading={loading}
            keyField="id"
            data={data?.items ?? []}
            columns={[
              { header: 'Adjustment #', accessor: 'adjustmentNumber' },
              { header: 'Store', accessor: r => r.store?.name ?? '—' },
              { header: 'Reason', accessor: 'reason' },
              { header: 'Status', accessor: 'status' },
              { header: 'Date', accessor: r => fmtDate(r.createdAt) },
            ]}
          />
        );

      case 'transfers':
        return (
          <ReportTable
            loading={loading}
            keyField="id"
            data={data?.items ?? []}
            columns={[
              { header: 'Transfer #', accessor: 'transferNumber' },
              { header: 'From', accessor: 'sourceStore' },
              { header: 'To', accessor: 'destinationStore' },
              { header: 'Status', accessor: 'status' },
              { header: 'Items', accessor: 'itemCount' },
              { header: 'Total Qty', accessor: 'totalQuantity' },
              { header: 'Total Value', accessor: 'totalValue' },
              { header: 'Date', accessor: r => fmtDate(r.createdAt) },
            ]}
          />
        );

      // ── RETURNS ───────────────────────────────────────────────────────────
      case 'returns':
        return (
          <>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <ReportSummaryCard label="Total Returns" value={summary.totalReturns} color="text-red-600" />
                <ReportSummaryCard label="Total Refund" value={summary.totalRefundAmount} color="text-orange-600" />
              </div>
            )}
            {summary?.byReason && summary.byReason.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Returns by Reason</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {summary.byReason.map((r: any) => (
                    <div key={r.reason} className="bg-gray-50 border rounded p-3">
                      <p className="text-xs text-gray-500">{r.reason}</p>
                      <p className="text-sm font-semibold text-gray-800">Qty: {r.quantityReturned}</p>
                      <p className="text-xs text-gray-600">Value: {r.refundValue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ReportTable
              loading={loading}
              keyField="id"
              data={data?.items ?? []}
              columns={[
                { header: 'Return #', accessor: 'returnNumber' },
                { header: 'Sale #', accessor: 'originalSaleNumber' },
                { header: 'Customer', accessor: 'customer' },
                { header: 'Store', accessor: 'store' },
                { header: 'Qty Returned', accessor: 'returnedQuantity' },
                { header: 'Refund Total', accessor: 'refundTotal' },
                { header: 'Method', accessor: r => r.refundMethod ?? '—' },
                { header: 'Reason', accessor: 'reason' },
                { header: 'Date', accessor: r => fmtDate(r.createdAt) },
              ]}
            />
          </>
        );

      // ── ENTITIES ─────────────────────────────────────────────────────────
      case 'customers':
        return (
          <ReportTable
            loading={loading}
            keyField="customerId"
            data={data?.items ?? []}
            columns={[
              { header: 'Code', accessor: 'customerCode' },
              { header: 'Name', accessor: 'customerName' },
              { header: 'Total Purchases', accessor: 'totalPurchases' },
              { header: 'Total Spent', accessor: 'totalSpent' },
              { header: 'Points', accessor: 'currentPoints' },
              { header: 'Tier', accessor: 'tier' },
              { header: 'Last Purchase', accessor: r => fmtDate(r.lastPurchaseDate) },
            ]}
          />
        );

      case 'suppliers':
        return (
          <ReportTable
            loading={loading}
            keyField="supplierId"
            data={data?.items ?? []}
            columns={[
              { header: 'Code', accessor: 'supplierCode' },
              { header: 'Name', accessor: 'supplierName' },
              { header: 'Total POs', accessor: 'purchaseOrderCount' },
              { header: 'Pending', accessor: 'pendingPurchaseOrders' },
              { header: 'Completed', accessor: 'completedPurchaseOrders' },
              { header: 'Total Value', accessor: 'totalPurchaseValue' },
              { header: 'Last PO', accessor: r => fmtDate(r.lastPurchaseDate) },
            ]}
          />
        );

      // ── VAT ───────────────────────────────────────────────────────────────
      case 'vat':
        return (
          <>
            {summary && (
              <div className="mb-5 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-blue-800 mb-3">MTD Export Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {Object.entries(summary).map(([k, v]) => (
                    <div key={k} className="bg-white border rounded px-3 py-2">
                      <p className="text-xs text-gray-500 font-mono">{k}</p>
                      <p className="font-semibold text-gray-800">{String(v)}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 italic">HMRC MTD Export Summary — Output Tax Only. Consult your accountant for final submission.</p>
              </div>
            )}
            <h4 className="text-sm font-semibold text-gray-700 mb-2">VAT by Rate</h4>
            <ReportTable
              loading={loading}
              keyField="vatRate"
              data={Array.isArray(data) ? data : []}
              columns={[
                { header: 'VAT Rate (%)', accessor: 'vatRate' },
                { header: 'Net Sales', accessor: 'netSales' },
                { header: 'VAT Collected', accessor: 'vatCollected' },
                { header: 'Gross Sales', accessor: 'grossSales' },
              ]}
            />
          </>
        );

      default:
        return null;
    }
  };

  // Pagination — only for reports with paginated data
  const hasPagination = pagination && pagination.pages > 1;

  if (!canRead) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10 text-center text-gray-500">
        You do not have permission to view reports.
      </div>
    );
  }

  // Tabs that need search
  const needsSearch = ['customers', 'suppliers', 'inventory'].includes(activeTab);
  // Tabs that don't use date filters
  const noDateFilter = ['low-stock', 'out-of-stock', 'inventory-valuation', 'inventory-valuation', 'suppliers'].includes(activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">View operational reports and business data from the system.</p>
      </div>

      {/* Group nav */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 overflow-hidden">
        <div className="flex flex-wrap border-b border-gray-200">
          {TAB_GROUPS.map(group => (
            <div key={group.label} className="border-r border-gray-100 last:border-0">
              <p className="px-3 pt-2 text-[10px] uppercase tracking-widest font-bold text-gray-400">{group.label}</p>
              <div className="flex">
                {TABS.filter(t => group.tabs.includes(t.id)).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <ReportFilters
        fromDate={noDateFilter ? '' : fromDate}
        toDate={noDateFilter ? '' : toDate}
        onFromDate={setFromDate}
        onToDate={setToDate}
        storeId={storeId}
        onStoreId={setStoreId}
        stores={stores}
        onApply={handleApply}
        onReset={handleReset}
        loading={loading}
        extra={needsSearch ? (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="border border-gray-300 rounded-md py-1.5 pl-7 pr-3 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        ) : undefined}
      />

      {/* Report content */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            {TABS.find(t => t.id === activeTab)?.label} Report
          </h3>
          {pagination && (
            <span className="text-xs text-gray-400">
              {pagination.total} record{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="p-4">
          {renderContent()}
        </div>

        {hasPagination && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowLeft className="h-3 w-3" /> Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.pages || loading}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Next <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
