import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { CreatePurchasePayload, CreatePurchaseItemPayload } from '../../types/purchases';
import { createPurchase } from '../../api/purchases.api';
import { getStores } from '../../api/stores.api';
import { getSuppliers } from '../../api/suppliers.api';
import { getProducts } from '../../api/products.api';
import type { Store } from '../../types/stores';
import type { Supplier } from '../../types/suppliers';
import type { Product } from '../../types/products';

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [formData, setFormData] = useState<{
    storeId: string;
    supplierId: string;
    notes: string;
    orderDate: string;
    expectedDate: string;
    discountAmount: number;
    items: (CreatePurchaseItemPayload & { uiId: string; name?: string; unit?: string; maxTax?: number })[];
  }>({
    storeId: '',
    supplierId: '',
    notes: '',
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: '',
    discountAmount: 0,
    items: [],
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        storeId: '',
        supplierId: '',
        notes: '',
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDate: '',
        discountAmount: 0,
        items: [],
      });
      setError(null);
      fetchDependencies();
    }
  }, [isOpen]);

  const fetchDependencies = async () => {
    try {
      const [storesRes, suppliersRes, productsRes] = await Promise.all([
        getStores({ limit: 100 }),
        getSuppliers({ limit: 100, status: 'ACTIVE' }),
        getProducts({ limit: 500, status: 'ACTIVE' })
      ]);
      setStores(storesRes.items);
      setSuppliers(suppliersRes.items);
      setProducts(productsRes.items);
      
      if (storesRes.items.length > 0) {
        setFormData(prev => ({ ...prev, storeId: storesRes.items[0].id }));
      }
    } catch (err) {
      console.error('Failed to load dependencies', err);
    }
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { uiId: Math.random().toString(), productId: '', orderedQuantity: 1, unitCost: 0 }
      ]
    }));
  };

  const handleRemoveItem = (uiId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.uiId !== uiId)
    }));
  };

  const handleItemChange = (uiId: string, field: keyof CreatePurchaseItemPayload | 'productId', value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const index = newItems.findIndex(i => i.uiId === uiId);
      if (index === -1) return prev;

      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        newItems[index] = {
          ...newItems[index],
          productId: value,
          unitCost: product ? Number(product.costPrice) : 0,
          taxRate: product ? Number(product.vatRate) : 0,
          name: product?.name,
          unit: product?.unit,
        };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.items.length === 0) {
      setError('At least one item is required.');
      return;
    }

    if (formData.items.some(i => !i.productId || i.orderedQuantity <= 0 || i.unitCost < 0)) {
      setError('Please ensure all items have a valid product, quantity > 0, and cost >= 0.');
      return;
    }

    setLoading(true);

    try {
      const payload: CreatePurchasePayload = {
        storeId: formData.storeId,
        supplierId: formData.supplierId,
        notes: formData.notes || undefined,
        orderDate: formData.orderDate ? new Date(formData.orderDate).toISOString() : undefined,
        expectedDate: formData.expectedDate ? new Date(formData.expectedDate).toISOString() : undefined,
        discountAmount: Number(formData.discountAmount) || 0,
        items: formData.items.map(i => ({
          productId: i.productId,
          orderedQuantity: Number(i.orderedQuantity),
          unitCost: Number(i.unitCost),
          taxRate: i.taxRate !== undefined ? Number(i.taxRate) : undefined,
        }))
      };

      await createPurchase(payload);
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

  const calculateTotals = () => {
    let subtotal = 0;
    let tax = 0;
    formData.items.forEach(item => {
      const lineSub = Number(item.orderedQuantity) * Number(item.unitCost);
      const lineTax = lineSub * (Number(item.taxRate || 0) / 100);
      subtotal += lineSub;
      tax += lineTax;
    });
    const discount = Number(formData.discountAmount || 0);
    const total = subtotal + tax - discount;
    return { subtotal, tax, discount, total };
  };

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create Purchase Order
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Store *</label>
                  <select name="storeId" required value={formData.storeId} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>Select a store</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier *</label>
                  <select name="supplierId" required value={formData.supplierId} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>Select a supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.supplierCode})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <input type="date" name="orderDate" value={formData.orderDate} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Date</label>
                  <input type="date" name="expectedDate" value={formData.expectedDate} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Purchase Items *</label>
                  <button type="button" onClick={handleAddItem} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200">
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </button>
                </div>
                
                {formData.items.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Unit Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Tax %</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Total</th>
                          <th className="px-4 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.items.map((item) => (
                          <tr key={item.uiId}>
                            <td className="px-4 py-2">
                              <select 
                                required
                                value={item.productId} 
                                onChange={(e) => handleItemChange(item.uiId, 'productId', e.target.value)}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              >
                                <option value="" disabled>Select Product</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                min="0.01" 
                                step="0.01" 
                                required
                                value={item.orderedQuantity} 
                                onChange={(e) => handleItemChange(item.uiId, 'orderedQuantity', parseFloat(e.target.value))}
                                className="block w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                required
                                value={item.unitCost} 
                                onChange={(e) => handleItemChange(item.uiId, 'unitCost', parseFloat(e.target.value))}
                                className="block w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={item.taxRate ?? 0} 
                                onChange={(e) => handleItemChange(item.uiId, 'taxRate', parseFloat(e.target.value))}
                                className="block w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-gray-900 bg-gray-50">
                              {((Number(item.orderedQuantity) * Number(item.unitCost)) * (1 + Number(item.taxRate || 0)/100)).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button type="button" onClick={() => handleRemoveItem(item.uiId)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 p-4 border rounded-md bg-gray-50 text-center">
                    No items added. Click "Add Item" to begin.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea name="notes" rows={4} value={formData.notes} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div className="bg-gray-50 p-4 rounded-md border space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="font-medium">{totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Discount</span>
                    <input 
                      type="number" 
                      name="discountAmount" 
                      min="0" 
                      step="0.01" 
                      value={formData.discountAmount} 
                      onChange={handleChange}
                      className="block w-24 text-right border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="pt-3 border-t flex justify-between text-base font-bold">
                    <span>Grand Total</span>
                    <span>{totals.total.toFixed(2)}</span>
                  </div>
                  {totals.total < 0 && <p className="text-red-500 text-xs text-right">Total cannot be negative</p>}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-5 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-lg border-t">
                <button type="submit" disabled={loading || formData.items.length === 0 || totals.total < 0} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Purchase'}
                </button>
                <button type="button" onClick={onClose} disabled={loading} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseFormModal;
