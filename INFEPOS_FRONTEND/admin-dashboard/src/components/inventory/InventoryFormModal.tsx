import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Inventory, CreateInventoryRequest, UpdateInventoryRequest, InventoryStatus } from '../../types/inventory';
import { createInventory, updateInventory } from '../../api/inventory.api';
import { getStores } from '../../api/stores.api';
import { getProducts } from '../../api/products.api';
import type { Store } from '../../types/stores';
import type { Product } from '../../types/products';

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inventory?: Inventory | null;
}

const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  inventory,
}) => {
  const isEditing = !!inventory;
  
  const [formData, setFormData] = useState<CreateInventoryRequest & { status?: InventoryStatus }>({
    storeId: '',
    productId: '',
    quantityOnHand: 0,
    minimumStock: 0,
    maximumStock: 0,
    reorderLevel: 0,
    status: 'ACTIVE',
  });

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setFetchingData(true);
        const [storesRes, productsRes] = await Promise.all([
          getStores({ limit: 1000 }),
          getProducts({ limit: 1000, status: 'ACTIVE' }),
        ]);
        setStores(storesRes.items);
        setProducts(productsRes.items);
      } catch (err: any) {
        setError('Failed to load stores or products');
      } finally {
        setFetchingData(false);
      }
    };
    if (!isEditing) {
      loadData();
    }
  }, [isOpen, isEditing]);

  useEffect(() => {
    if (inventory) {
      setFormData({
        storeId: inventory.storeId,
        productId: inventory.productId,
        quantityOnHand: Number(inventory.quantityOnHand),
        minimumStock: Number(inventory.minimumStock),
        maximumStock: Number(inventory.maximumStock),
        reorderLevel: Number(inventory.reorderLevel),
        status: inventory.status,
      });
    } else {
      setFormData({
        storeId: '',
        productId: '',
        quantityOnHand: 0,
        minimumStock: 0,
        maximumStock: 0,
        reorderLevel: 0,
        status: 'ACTIVE',
      });
    }
    setError(null);
  }, [inventory, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.maximumStock < formData.minimumStock) {
      setError('Maximum stock cannot be less than minimum stock');
      return;
    }
    if (formData.reorderLevel > formData.maximumStock) {
      setError('Reorder level cannot exceed maximum stock');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && inventory) {
        const payload: UpdateInventoryRequest = {
          quantityOnHand: formData.quantityOnHand,
          minimumStock: formData.minimumStock,
          maximumStock: formData.maximumStock,
          reorderLevel: formData.reorderLevel,
          status: formData.status,
        };
        await updateInventory(inventory.id, payload);
      } else {
        const payload: CreateInventoryRequest = {
          storeId: formData.storeId,
          productId: formData.productId,
          quantityOnHand: formData.quantityOnHand,
          minimumStock: formData.minimumStock,
          maximumStock: formData.maximumStock,
          reorderLevel: formData.reorderLevel,
        };
        await createInventory(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      let errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join(', ');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full relative z-10">
          <div className="bg-white px-6 pt-6 pb-6 sm:p-8 sm:pb-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-[#1a1f36]">
                {isEditing ? 'Edit Inventory' : 'Add Inventory'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {fetchingData ? (
              <div className="p-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                  {!isEditing && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Store *</label>
                        <select name="storeId" required value={formData.storeId} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm">
                          <option value="">Select a store</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Product *</label>
                        <select name="productId" required value={formData.productId} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm">
                          <option value="">Select a product</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Store</label>
                        <input type="text" disabled value={inventory?.store?.name || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Product</label>
                        <input type="text" disabled value={inventory?.product?.name || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Quantity On Hand *</label>
                    <input type="number" step="0.01" min="0" name="quantityOnHand" required value={formData.quantityOnHand} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Minimum Stock *</label>
                    <input type="number" step="0.01" min="0" name="minimumStock" required value={formData.minimumStock} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Maximum Stock *</label>
                    <input type="number" step="0.01" min="0" name="maximumStock" required value={formData.maximumStock} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Reorder Level *</label>
                    <input type="number" step="0.01" min="0" name="reorderLevel" required value={formData.reorderLevel} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                  </div>
                  {isEditing && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm">
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse mt-8 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 rounded-b-[30px] border-t border-gray-100">
                  <button type="submit" disabled={loading} className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-bold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none">
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={onClose} disabled={loading} className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryFormModal;
