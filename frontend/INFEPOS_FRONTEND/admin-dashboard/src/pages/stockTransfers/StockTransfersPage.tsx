import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Edit2 } from 'lucide-react';
import type { StockTransfer, FindStockTransfersQuery, TransferStatus } from '../../types/stockTransfers';
import type { Store } from '../../types/stores';
import { getStockTransfers } from '../../api/stockTransfers.api';
import { getStores } from '../../api/stores.api';
import { useAuthStore } from '../../stores/authStore';
import StockTransferFormModal from '../../components/stockTransfers/StockTransferFormModal';
import StockTransferDetailsModal from '../../components/stockTransfers/StockTransferDetailsModal';

const StockTransfersPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('stockTransfers.create');
  const canRead = hasPermission('stockTransfers.read');
  const canUpdate = hasPermission('stockTransfers.update');

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<FindStockTransfersQuery>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
    sourceStoreId: undefined,
    destinationStoreId: undefined,
  });
  
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const [selectedTransferForEdit, setSelectedTransferForEdit] = useState<StockTransfer | null>(null);
  const [selectedTransferIdForDetails, setSelectedTransferIdForDetails] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      const data = await getStores({ limit: 1000 });
      setStores(data.items);
    } catch (err) {
      console.error('Failed to load stores for filter');
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const fetchTransfers = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      setError('You do not have permission to view stock transfers.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getStockTransfers(query);
      setTransfers(data.items);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch transfers');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [query, canRead]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTransfers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchTransfers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, status: val ? (val as TransferStatus) : undefined, page: 1 }));
  };

  const handleSourceStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, sourceStoreId: val || undefined, page: 1 }));
  };
  
  const handleDestinationStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, destinationStoreId: val || undefined, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  const openCreateModal = () => {
    setSelectedTransferForEdit(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (transfer: StockTransfer) => {
    setSelectedTransferForEdit(transfer);
    setIsFormModalOpen(true);
  };

  const openDetailsModal = (id: string) => {
    setSelectedTransferIdForDetails(id);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock Transfers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage inventory movement between stores.</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Transfer
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative rounded-md shadow-sm flex-1 min-w-[200px] max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query.search || ''}
              onChange={handleSearchChange}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              placeholder="Search Transfer No., Notes, Tracking..."
            />
          </div>
          <div className="w-full sm:w-40">
            <select
              value={query.sourceStoreId || ''}
              onChange={handleSourceStoreChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">Source Store (All)</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-40">
            <select
              value={query.destinationStoreId || ''}
              onChange={handleDestinationStoreChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">Dest. Store (All)</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-40">
            <select
              value={query.status || ''}
              onChange={handleStatusChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SHIPPED">Shipped</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="p-4 text-red-500 text-center">{error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <p>No stock transfers found.</p>
            {canCreate && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                New Transfer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transfer No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transfers.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {item.transferNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sourceStore?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.destinationStore?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 
                        item.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3">
                      {item.status === 'DRAFT' && canUpdate && (
                        <button onClick={() => openEditModal(item)} className="text-gray-600 hover:text-blue-900">
                          <Edit2 className="h-5 w-5 inline" />
                        </button>
                      )}
                      <button onClick={() => openDetailsModal(item.id)} className="text-blue-600 hover:text-blue-900">
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
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to <span className="font-medium">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of <span className="font-medium">{totalItems}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange((query.page || 1) - 1)}
                        disabled={(query.page || 1) <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange((query.page || 1) + 1)}
                        disabled={(query.page || 1) >= totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <StockTransferFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchTransfers}
        transfer={selectedTransferForEdit}
      />
      
      <StockTransferDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        transferId={selectedTransferIdForDetails}
        onUpdate={fetchTransfers}
      />
    </div>
  );
};

export default StockTransfersPage;
