import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { StockTransfer, CreateStockTransferRequest, UpdateStockTransferRequest, TransferType } from '../../types/stockTransfers';
import { createStockTransfer, updateStockTransfer } from '../../api/stockTransfers.api';
import { getStores } from '../../api/stores.api';
import { getProducts } from '../../api/products.api';
import type { Store } from '../../types/stores';
import type { Product } from '../../types/products';

interface StockTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transfer?: StockTransfer | null;
}

const TRANSFER_TYPES: TransferType[] = [
  'STORE_TO_STORE',
  'STORE_TO_WAREHOUSE',
  'WAREHOUSE_TO_STORE'
];

const StockTransferFormModal: React.FC<StockTransferFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transfer,
}) => {
  const isEditing = !!transfer;

  const [formData, setFormData] = useState<CreateStockTransferRequest>({
    transferType: 'STORE_TO_STORE',
    sourceStoreId: '',
    destinationStoreId: '',
    notes: '',
    carrier: '',
    vehicleNumber: '',
    trackingNumber: '',
    items: [{ productId: '', quantity: 0 }],
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
    if (transfer) {
      setFormData({
        transferType: transfer.transferType,
        sourceStoreId: transfer.sourceStoreId,
        destinationStoreId: transfer.destinationStoreId,
        notes: transfer.notes || '',
        carrier: transfer.carrier || '',
        vehicleNumber: transfer.vehicleNumber || '',
        trackingNumber: transfer.trackingNumber || '',
        items: transfer.items && transfer.items.length > 0 
          ? transfer.items.map(i => ({ productId: i.productId, quantity: Number(i.quantity) })) 
          : [{ productId: '', quantity: 0 }],
      });
    } else {
      setFormData({
        transferType: 'STORE_TO_STORE',
        sourceStoreId: '',
        destinationStoreId: '',
        notes: '',
        carrier: '',
        vehicleNumber: '',
        trackingNumber: '',
        items: [{ productId: '', quantity: 0 }],
      });
    }
    setError(null);
  }, [transfer, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      if (field === 'quantity') {
        newItems[index][field] = parseFloat(value as string) || 0;
      } else {
        newItems[index][field] = value as string;
      }
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.sourceStoreId === formData.destinationStoreId) {
      setError('Source and destination store cannot be the same');
      return;
    }

    if (formData.items.length === 0) {
      setError('At least one item is required');
      return;
    }
    
    if (formData.items.some(i => !i.productId || i.quantity <= 0)) {
      setError('Please select a product and ensure quantity is greater than zero for all items');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && transfer) {
        const payload: UpdateStockTransferRequest = {
          notes: formData.notes,
          carrier: formData.carrier,
          vehicleNumber: formData.vehicleNumber,
          trackingNumber: formData.trackingNumber,
          items: formData.items,
        };
        await updateStockTransfer(transfer.id, payload);
      } else {
        await createStockTransfer(formData);
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
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isEditing ? 'Edit Stock Transfer' : 'New Stock Transfer'}
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-3">
                  {!isEditing && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Transfer Type *</label>
                        <select name="transferType" required value={formData.transferType} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                          {TRANSFER_TYPES.map(t => (
                            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Source Store *</label>
                        <select name="sourceStoreId" required value={formData.sourceStoreId} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                          <option value="">Select source</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Destination Store *</label>
                        <select name="destinationStoreId" required value={formData.destinationStoreId} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                          <option value="">Select destination</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {isEditing && transfer && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Transfer Type</label>
                        <input type="text" disabled value={transfer.transferType.replace(/_/g, ' ')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Source Store</label>
                        <input type="text" disabled value={transfer.sourceStore?.name || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Destination Store</label>
                        <input type="text" disabled value={transfer.destinationStore?.name || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm" />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Carrier</label>
                    <input type="text" name="carrier" value={formData.carrier || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                    <input type="text" name="vehicleNumber" value={formData.vehicleNumber || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tracking Number</label>
                    <input type="text" name="trackingNumber" value={formData.trackingNumber || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea name="notes" rows={2} value={formData.notes || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Transfer Items</label>
                    <button type="button" onClick={addItem} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500">
                      <Plus className="h-4 w-4 mr-1" /> Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-4 items-center">
                        <div className="flex-1">
                          <select 
                            required 
                            value={item.productId} 
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="">Select a product</option>
                            {(!isEditing ? products : transfer?.items?.map(i => ({id: i.productId, name: i.productName, sku: i.sku})) || products).map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <input 
                            type="number" 
                            required
                            min="0.01"
                            step="0.01"
                            placeholder="Qty"
                            value={item.quantity || ''} 
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div className="w-8">
                          <button 
                            type="button" 
                            onClick={() => removeItem(index)} 
                            disabled={formData.items.length <= 1}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-5 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-lg">
                  <button type="submit" disabled={loading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Transfer'}
                  </button>
                  <button type="button" onClick={onClose} disabled={loading} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
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

export default StockTransferFormModal;
