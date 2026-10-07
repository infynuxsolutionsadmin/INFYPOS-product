import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Product, CreateProductRequest, UpdateProductRequest, ProductStatus } from '../../types/products';
import { createProduct, updateProduct } from '../../api/products.api';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}) => {
  const isEditing = !!product;
  
  const [formData, setFormData] = useState<CreateProductRequest>({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    brand: '',
    unit: 'pcs',
    costPrice: 0,
    sellingPrice: 0,
    vatRate: 0,
    imageUrl: '',
    trackInventory: true,
    status: 'ACTIVE' as ProductStatus,
    initialStock: 100,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        barcode: product.barcode || '',
        name: product.name,
        description: product.description || '',
        category: product.category || '',
        brand: product.brand || '',
        unit: product.unit,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        vatRate: product.vatRate,
        imageUrl: product.imageUrl || '',
        trackInventory: product.trackInventory,
        status: product.status,
      });
    } else {
      setFormData({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        category: '',
        brand: '',
        unit: 'pcs',
        costPrice: 0,
        sellingPrice: 0,
        vatRate: 0,
        imageUrl: '',
        trackInventory: true,
        status: 'ACTIVE' as ProductStatus,
        initialStock: 100,
      });
    }
    setError(null);
    setLoading(false);
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (formData.sellingPrice < formData.costPrice) {
      setError('Selling price cannot be less than cost price');
      return;
    }

    setLoading(true);

    try {
      const payload: CreateProductRequest | UpdateProductRequest = {
        ...formData,
        // Backend handles these correctly but we need to pass numeric correctly.
        // Also if vatRate is selected we pass it, otherwise if they used vatBand, pass that.
        // Here we just use vatRate directly.
      };
      
      // Clean up empty optional string fields if backend prefers undefined/omitted
      if (!payload.barcode) delete payload.barcode;
      if (!payload.description) delete payload.description;
      if (!payload.category) delete payload.category;
      if (!payload.brand) delete payload.brand;
      if (!payload.imageUrl) delete payload.imageUrl;

      if (isEditing && product) {
        await updateProduct(product.id, payload as UpdateProductRequest);
      } else {
        await createProduct(payload as CreateProductRequest);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
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
                {isEditing ? 'Edit Product' : 'Add Product'}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset disabled={loading}>
              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">SKU *</label>
                  <input type="text" name="sku" required value={formData.sku} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Barcode</label>
                  <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Brand</label>
                  <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Unit *</label>
                  <input type="text" name="unit" required value={formData.unit} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cost Price *</label>
                  <input type="number" step="0.01" min="0" name="costPrice" required value={formData.costPrice} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Selling Price *</label>
                  <input type="number" step="0.01" min="0" name="sellingPrice" required value={formData.sellingPrice} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">VAT Rate (%)</label>
                  <select name="vatRate" value={formData.vatRate} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm">
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={20}>20%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
                {!isEditing && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stock in Hand</label>
                    <input type="number" min="0" name="initialStock" value={formData.initialStock ?? 100} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" placeholder="100" />
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
              </div>

              <div className="flex items-center mt-4">
                <input id="trackInventory" name="trackInventory" type="checkbox" checked={formData.trackInventory} onChange={handleChange} className="h-4 w-4 text-[#5B58F2] focus:ring-[#5B58F2] border-gray-300 rounded-md" />
                <label htmlFor="trackInventory" className="ml-2 block text-sm text-gray-900">
                  Track Inventory
                </label>
              </div>

              <div className="bg-slate-50/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse mt-8 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 rounded-b-[30px] border-t border-gray-100">
                <button type="submit" disabled={loading} className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-bold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none">
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none">
                  Cancel
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal;
