import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Search, RotateCcw } from 'lucide-react';
import type { SaleReturn, FindSaleReturnsQuery, ReturnStatus, ReturnType } from '../../types/salesReturns';
import { getSaleReturns } from '../../api/salesReturns.api';
import { useAuthStore } from '../../stores/authStore';
import SaleReturnDetailsModal from '../../components/salesReturns/SaleReturnDetailsModal';
import SaleReturnFormModal from '../../components/salesReturns/SaleReturnFormModal';
import SaleReturnStatusBadge from '../../components/salesReturns/SaleReturnStatusBadge';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer', OTHER: 'Other',
};

const SalesReturnsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission('salesReturns.read');
  const canCreate = hasPermission('salesReturns.create');

  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<FindSaleReturnsQuery>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
    returnType: undefined,
  });

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  const fetchReturns = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      setError('You do not have permission to view sales returns.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const params: FindSaleReturnsQuery = {};
      if (query.page) params.page = query.page;
      if (query.limit) params.limit = query.limit;
      if (query.search) params.search = query.search;
      if (query.status) params.status = query.status;
      if (query.returnType) params.returnType = query.returnType;
      if (query.sortBy) params.sortBy = query.sortBy;
      if (query.sortOrder) params.sortOrder = query.sortOrder;

      const data = await getSaleReturns(params);
      setReturns(data.items);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch returns');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [query, canRead]);

  useEffect(() => {
    const timer = setTimeout(fetchReturns, 300);
    return () => clearTimeout(timer);
  }, [fetchReturns]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, status: val ? (val as ReturnStatus) : undefined, page: 1 }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, returnType: val ? (val as ReturnType) : undefined, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Returns</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and review returned sales transactions.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Create Return
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Filters */}
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap items-end">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={query.search || ''}
              onChange={handleSearchChange}
              placeholder="Search by return number or notes..."
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={query.status || ''}
              onChange={handleStatusChange}
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">Return Type</label>
            <select
              value={query.returnType || ''}
              onChange={handleTypeChange}
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
            >
              <option value="">All Types</option>
              <option value="FULL_RETURN">Full Return</option>
              <option value="PARTIAL_RETURN">Partial Return</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="p-4 text-red-500 text-center">{error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <RotateCcw className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p>No sales returns found.</p>
            {canCreate && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Return
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Sale</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Method</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-orange-600">{r.returnNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-600">{r.originalSale?.saleNumber || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(r.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {r.customer
                          ? `${r.customer.firstName} ${r.customer.lastName || ''}`.trim()
                          : 'Walk-in'}
                      </div>
                      {r.customer?.customerCode && (
                        <div className="text-xs text-gray-400">{r.customer.customerCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        r.returnType === 'FULL_RETURN' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.returnType === 'FULL_RETURN' ? 'Full' : 'Partial'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {PAYMENT_LABELS[r.refundMethod] || r.refundMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-700">{Number(r.refundTotal).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <SaleReturnStatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => { setSelectedReturnId(r.id); setIsDetailsOpen(true); }}
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

            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <p className="text-sm text-gray-700 hidden sm:block">
                  Showing <span className="font-medium">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> results
                </p>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
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
            )}
          </div>
        )}
      </div>

      <SaleReturnDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        returnId={selectedReturnId}
      />
      <SaleReturnFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchReturns}
      />
    </div>
  );
};

export default SalesReturnsPage;
