import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Search, Printer } from 'lucide-react';
import type { Sale, FindSalesQuery, SaleStatus } from '../../types/sales';
import { getSales } from '../../api/sales.api';
import { useAuthStore } from '../../stores/authStore';
import SaleDetailsModal from '../../components/sales/SaleDetailsModal';
import SaleStatusBadge from '../../components/sales/SaleStatusBadge';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

const SalesPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission('sales.read');

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<FindSalesQuery>({
    page: 1,
    limit: 10,
    status: undefined,
    startDate: undefined,
    endDate: undefined,
    search: '',
  });

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      setError('You do not have permission to view sales.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      // Build clean params (omit empty strings)
      const params: FindSalesQuery = {};
      if (query.page) params.page = query.page;
      if (query.limit) params.limit = query.limit;
      if (query.status) params.status = query.status;
      if (query.startDate) params.startDate = query.startDate;
      if (query.endDate) params.endDate = query.endDate;
      if (query.sortBy) params.sortBy = query.sortBy;
      if (query.sortOrder) params.sortOrder = query.sortOrder;
      if (query.search) params.search = query.search;

      const data = await getSales(params);
      setSales(data.items);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch sales');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [query, canRead]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSales();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchSales]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, status: val ? (val as SaleStatus) : undefined, page: 1 }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setQuery(prev => ({ ...prev, [field]: value || undefined, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  const openDetails = (id: string) => {
    setSelectedSaleId(id);
    setIsDetailsOpen(true);
  };

  const handlePrint = () => {
    const printArea = document.getElementById('sales-table-print-area');
    if (!printArea) return;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Sales Page</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #000; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f9f9f9; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .sr-only { display: none; }
              .header { font-size: 1.5em; font-weight: bold; margin-bottom: 20px; text-align: center; }
              button { display: none; } /* Hide action buttons in print */
            </style>
          </head>
          <body>
            <div class="header">Sales Report</div>
            ${printArea.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and review sales transactions.</p>
        </div>
        <button
          onClick={handlePrint}
          disabled={sales.length === 0}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Printer className="-ml-1 mr-2 h-5 w-5 text-gray-500" aria-hidden="true" />
          Print Page
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Filters */}
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap items-end">
          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={query.status || ''}
              onChange={handleStatusChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RETURNED">Returned</option>
              <option value="PARTIALLY_RETURNED">Partially Returned</option>
            </select>
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={query.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={query.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="relative rounded-md shadow-sm flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query.search || ''}
              onChange={handleSearchChange}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              placeholder="Search by sale #, customer, or product..."
            />
          </div>
        </div>

        {error ? (
          <div className="p-4 text-red-500 text-center">{error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p>No sales found.</p>
            <p className="text-sm mt-1 text-gray-400">Sales are created through the POS Terminal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto" id="sales-table-print-area">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Grand Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-600">{sale.saleNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(sale.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{new Date(sale.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sale.customerName || 'Walk-in'}</div>
                      {sale.customerCode && <div className="text-xs text-gray-400">{sale.customerCode}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-gray-900">{Number(sale.grandTotal).toFixed(2)}</div>
                      {Number(sale.discountAmount) > 0 && (
                        <div className="text-xs text-green-600">-{Number(sale.discountAmount).toFixed(2)} disc</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <SaleStatusBadge status={sale.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openDetails(sale.id)}
                        className="text-gray-500 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                  </p>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange((query.page || 1) - 1)}
                      disabled={(query.page || 1) <= 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange((query.page || 1) + 1)}
                      disabled={(query.page || 1) >= totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <SaleDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        saleId={selectedSaleId}
      />
    </div>
  );
};

export default SalesPage;
