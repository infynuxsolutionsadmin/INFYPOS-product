import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { Shift, FindShiftsQuery, ShiftStatus } from '../../types/shifts';
import { getShifts } from '../../api/shifts.api';
import { useAuthStore } from '../../stores/authStore';

const ShiftsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission('shifts.read');

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<FindShiftsQuery>({
    page: 1,
    limit: 10,
    status: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchShifts = useCallback(async (isPolling = false) => {
    if (!canRead) {
      setLoading(false);
      setError('You do not have permission to view shifts.');
      return;
    }
    try {
      if (!isPolling) {
        setLoading(true);
        setError(null);
      }
      
      const params: FindShiftsQuery = {};
      if (query.page) params.page = query.page;
      if (query.limit) params.limit = query.limit;
      if (query.status) params.status = query.status;
      if (query.startDate) params.startDate = query.startDate;
      if (query.endDate) params.endDate = query.endDate;
      if (query.sortBy) params.sortBy = query.sortBy;
      if (query.sortOrder) params.sortOrder = query.sortOrder;

      const data = await getShifts(params);
      setShifts(data.items);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      if (!isPolling) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch shifts');
        setShifts([]);
      } else {
        console.error('Polling error:', err);
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [query, canRead]);

  useEffect(() => {
    fetchShifts();
    
    const interval = setInterval(() => {
      fetchShifts(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchShifts]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, status: val ? (val as ShiftStatus) : undefined, page: 1 }));
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setQuery(prev => ({ ...prev, [field]: value || undefined, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f36]">Shifts</h1>
          <p className="mt-1 text-sm text-gray-500">View shift history and performance across stores.</p>
        </div>
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
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
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
        </div>
      </div>

      <div className="bg-white rounded-[30px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 p-6 overflow-hidden">
        {error ? (
          <div className="p-4 text-red-500 text-center">{error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B58F2]"></div>
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p>No shifts found.</p>
            <p className="text-sm mt-1 text-gray-400">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-4">
            <table className="min-w-full border-separate" style={{ borderSpacing: '0 12px' }}>
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Shift ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Store</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Cashier</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Opened At</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Closed At</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Opening Float</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Closing Cash</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc]">Variance</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] last:rounded-r-[16px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} className="group hover:-translate-y-[1px] transition-transform duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#5B58F2] bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {shift.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {shift.store.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {shift.openedBy.firstName} {shift.openedBy.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div>{new Date(shift.openedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{new Date(shift.openedAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {shift.closedAt ? (
                        <>
                          <div>{new Date(shift.closedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">{new Date(shift.closedAt).toLocaleTimeString()}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {Number(shift.startingFloat).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-500 bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {shift.declaredCash !== null ? Number(shift.declaredCash).toFixed(2) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                        {shift.variance !== null ? (
                        <span className={Number(shift.variance) < 0 ? 'text-red-600' : Number(shift.variance) > 0 ? 'text-green-600' : 'text-gray-900'}>
                          {Number(shift.variance) > 0 ? '+' : ''}{Number(shift.variance).toFixed(2)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${shift.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {shift.status}
                      </span>
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
    </div>
  );
};

export default ShiftsPage;

// <!-- fixed -->
