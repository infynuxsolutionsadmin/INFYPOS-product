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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f36]">Sales Returns</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and review returned sales transactions.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Create Return
          </button>
        )}
      </div>

      <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.12)] border border-gray-100 overflow-hidden mb-6">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap items-end">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={query.search || ''}
              onChange={handleSearchChange}
              placeholder="Search by return number or notes..."
              className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 placeholder-gray-400"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={query.status || ''}
              onChange={handleStatusChange}
              className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer"
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
              className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="FULL_RETURN">Full Return</option>
              <option value="PARTIAL_RETURN">Partial Return</option>
            </select>
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
        ) : returns.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <RotateCcw className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p>No sales returns found.</p>
            {canCreate && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="mt-4 inline-flex items-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:-translate-y-0.5 transition-all"
              >
                Create Return
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-4">
            <table className="min-w-full border-separate" style={{ borderSpacing: '0 12px' }}>
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Return #</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Original Sale</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Refund Method</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 relative bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm font-semibold text-orange-600">{r.returnNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm text-[#5B58F2]">{r.originalSale?.saleNumber || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm text-gray-900">{new Date(r.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm text-gray-900">
                        {r.customer
                          ? `${r.customer.firstName} ${r.customer.lastName || ''}`.trim()
                          : 'Walk-in'}
                      </div>
                      {r.customer?.customerCode && (
                        <div className="text-xs text-gray-400">{r.customer.customerCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        r.returnType === 'FULL_RETURN' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.returnType === 'FULL_RETURN' ? 'Full' : 'Partial'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <button
                        onClick={() => { setSelectedReturnId(r.id); setIsDetailsOpen(true); }}
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

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-700 hidden sm:block">
                  Showing <span className="font-bold text-[#1a1f36]">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to{' '}
                  <span className="font-bold text-[#1a1f36]">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of{' '}
                  <span className="font-bold text-[#1a1f36]">{totalItems}</span> results
                </p>
                <nav className="relative z-0 inline-flex rounded-2xl shadow-sm -space-x-px">
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

// <!-- fixed -->
