import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Search } from 'lucide-react';
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
    fetchSales();
  }, [fetchSales]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, status: val ? (val as SaleStatus) : undefined, page: 1 }));
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f36]">Sales</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and review sales transactions.</p>
        </div>
        {/* Create Sale is not available in the Admin Dashboard — sales are created through the POS Terminal with an open shift */}
      </div>

      <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.12)] border border-gray-100 overflow-hidden mb-6">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap items-end">
          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={query.status || ''}
              onChange={handleStatusChange}
              className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer"
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
              className="block w-full border border-gray-300 rounded-2xl shadow-sm py-2 px-3 focus:ring-[#5B58F2] focus:border-[#5B58F2] sm:text-sm"
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={query.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="block w-full border border-gray-300 rounded-2xl shadow-sm py-2 px-3 focus:ring-[#5B58F2] focus:border-[#5B58F2] sm:text-sm"
            />
          </div>
          <div className="sm:ml-auto text-xs text-gray-400 italic self-end pb-2">
            Note: Search by sale number or customer is not supported by the backend query API.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[30px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 p-6 overflow-hidden">
        {error ? (
          <div className="p-4 text-red-500 text-center">{error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B58F2]"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p>No sales found.</p>
            <p className="text-sm mt-1 text-gray-400">Sales are created through the POS Terminal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-4">
            <table className="min-w-full border-separate" style={{ borderSpacing: '0 12px' }}>
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Sale #</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Grand Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 relative bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm font-semibold text-[#5B58F2]">{sale.saleNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm text-gray-900">{new Date(sale.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{new Date(sale.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm text-gray-900">{sale.customerName || 'Walk-in'}</div>
                      {sale.customerCode && <div className="text-xs text-gray-400">{sale.customerCode}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <button
                        onClick={() => openDetails(sale.id)}
                        className="text-gray-500 hover:text-[#5B58F2] transition-colors"
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
              <div className="mt-4 flex items-center justify-between">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500 bg-gray-50 px-4 py-1.5 rounded-full font-medium inline-block border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    Showing <span className="font-bold text-[#1a1f36]">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to{' '}
                    <span className="font-bold text-[#1a1f36]">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of{' '}
                    <span className="font-bold text-[#1a1f36]">{totalItems}</span> results
                  </p>
                  <nav className="relative z-0 inline-flex rounded-2xl shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange((query.page || 1) - 1)}
                      disabled={(query.page || 1) <= 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-md  bg-white text-sm font-medium text-gray-500 hover:bg-slate-50/50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange((query.page || 1) + 1)}
                      disabled={(query.page || 1) >= totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-md  bg-white text-sm font-medium text-gray-500 hover:bg-slate-50/50 disabled:opacity-50"
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

// <!-- fixed -->
