import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import type { Inventory, FindInventoryQuery, InventoryStatus } from '../../types/inventory';
import type { Store } from '../../types/stores';
import { getInventoryList, deleteInventory } from '../../api/inventory.api';
import { getStores } from '../../api/stores.api';
import { useAuthStore } from '../../stores/authStore';
import InventoryFormModal from '../../components/inventory/InventoryFormModal';

const InventoryPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('inventory.create');
  const canRead = hasPermission('inventory.read');
  const canUpdate = hasPermission('inventory.update');
  const canDelete = hasPermission('inventory.delete');

  const [inventoryList, setInventoryList] = useState<Inventory[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<FindInventoryQuery>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
    storeId: undefined,
    stockLevel: undefined,
    sortBy: 'quantityOnHand',
    sortOrder: 'asc',
  });
  
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);

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

  const fetchInventory = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      setError('You do not have permission to view inventory.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryList(query);
      setInventoryList(data.items);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch inventory');
      setInventoryList([]);
    } finally {
      setLoading(false);
    }
  }, [query, canRead]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInventory();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchInventory]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, status: val ? (val as InventoryStatus) : undefined, page: 1 }));
  };

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, storeId: val || undefined, page: 1 }));
  };

  const handleStockLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, stockLevel: val || undefined, page: 1 }));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setQuery(prev => ({ ...prev, sortBy: undefined, sortOrder: undefined, page: 1 }));
      return;
    }
    const [sortBy, sortOrder] = val.split('-') as [string, 'asc' | 'desc'];
    setQuery(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  const openCreateModal = () => {
    setSelectedInventory(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (inventory: Inventory) => {
    setSelectedInventory(inventory);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (inventory: Inventory) => {
    if (window.confirm(`Are you sure you want to deactivate inventory for ${inventory.product.name} in ${inventory.store.name}?`)) {
      try {
        await deleteInventory(inventory.id);
        fetchInventory();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete inventory');
      }
    }
  };

  const getStockStatusLabel = (item: Inventory) => {
    const qty = Number(item.quantityOnHand);
    const reorder = Number(item.reorderLevel);
    
    if (qty <= 0) {
      return <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-red-100 text-red-700">Out of Stock</span>;
    }
    if (qty <= reorder) {
      return <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">Low Stock</span>;
    }
    return <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-700">In Stock</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f36]">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">Manage stock levels across all stores.</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Inventory Record
          </button>
        )}
      </div>

      <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.12)] border border-gray-100 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap items-center">
          <div className="relative rounded-2xl shadow-sm flex-1 min-w-[200px] max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query.search || ''}
              onChange={handleSearchChange}
              className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 placeholder-gray-400"
              placeholder="Search Product or SKU..."
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={query.storeId || ''}
              onChange={handleStoreChange}
              className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer font-medium"
            >
              <option value="">All Stores</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <select
              value={query.status || ''}
              onChange={handleStatusChange}
              className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer font-medium"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="w-full sm:w-44">
            <select
              value={query.stockLevel || ''}
              onChange={handleStockLevelChange}
              className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer font-medium"
            >
              <option value="">All Stock Levels</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
          <div className="w-full sm:w-56">
            <select
              value={query.sortBy && query.sortOrder ? `${query.sortBy}-${query.sortOrder}` : 'quantityOnHand-asc'}
              onChange={handleSortChange}
              className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer font-medium"
            >
              <option value="quantityOnHand-asc">Stock: Low to High</option>
              <option value="quantityOnHand-desc">Stock: High to Low</option>
              <option value="createdAt-desc">Newest Added</option>
              <option value="createdAt-asc">Oldest Added</option>
              <option value="productName-asc">Product Name: A to Z</option>
              <option value="productName-desc">Product Name: Z to A</option>
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
        ) : inventoryList.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <p>No inventory records found.</p>
            {canCreate && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:-translate-y-0.5 transition-all"
              >
                Add Inventory Record
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-4">
            <table className="min-w-full border-separate" style={{ borderSpacing: '0 12px' }}>
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Store</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">On Hand</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Reserved</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Available</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Stock Level</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Status</th>
                  <th className="px-6 py-4 relative bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventoryList.map((item) => {
                  const onHand = Number(item.quantityOnHand);
                  const reserved = Number(item.reservedQuantity);
                  const available = onHand - reserved;
                  
                  return (
                    <tr key={item.id} className="group hover:-translate-y-[1px] transition-transform duration-200">
                      <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-bold text-[#1a1f36]">{item.product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                        {item.store.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {onHand.toFixed(2)} {item.product.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                        {reserved.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {available.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                        {getStockStatusLabel(item)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                          item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white border-y border-r border-gray-100 last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="flex items-center justify-end space-x-2 pr-2">
                        {canUpdate && (
                          <button onClick={() => openEditModal(item)} className="p-2 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors mr-4">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(item)} className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-500 bg-gray-50 px-4 py-1.5 rounded-full font-medium inline-block border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                      Showing <span className="font-bold text-[#1a1f36]">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to <span className="font-bold text-[#1a1f36]">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of <span className="font-bold text-[#1a1f36]">{totalItems}</span> results
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange((query.page || 1) - 1)}
                      disabled={(query.page || 1) <= 1}
                      className="px-4 py-2 rounded-full  bg-white text-sm font-bold text-[#1a1f36] hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Previous
                    </button>
                    <div className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(99,102,241,0.39)]">
                      {query.page || 1}
                    </div>
                    <button
                      onClick={() => handlePageChange((query.page || 1) + 1)}
                      disabled={(query.page || 1) >= totalPages}
                      className="px-4 py-2 rounded-full  bg-white text-sm font-bold text-[#1a1f36] hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <InventoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchInventory}
        inventory={selectedInventory}
      />
    </div>
  );
};

export default InventoryPage;

// <!-- fixed -->
