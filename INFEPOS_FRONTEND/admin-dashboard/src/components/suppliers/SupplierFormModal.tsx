import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Supplier, CreateSupplierRequest, UpdateSupplierRequest, SupplierStatus } from '../../types/suppliers';
import { createSupplier, updateSupplier } from '../../api/suppliers.api';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}) => {
  const isEditing = !!supplier;

  const [formData, setFormData] = useState<Partial<Supplier>>({
    supplierCode: '',
    name: '',
    contactName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    taxRegistrationNumber: '',
    paymentTerms: '',
    creditLimit: '',
    notes: '',
    status: 'ACTIVE',
    suppliedProducts: [],
  });

  const [productsStr, setProductsStr] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setFormData({ ...supplier });
      setProductsStr(supplier.suppliedProducts ? supplier.suppliedProducts.join(', ') : '');
    } else {
      setFormData({
        supplierCode: '',
        name: '',
        contactName: '',
        email: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        taxRegistrationNumber: '',
        paymentTerms: '',
        creditLimit: '',
        notes: '',
        status: 'ACTIVE',
        suppliedProducts: [],
      });
      setProductsStr('');
    }
    setError(null);
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isEditing && supplier) {
        const payload: UpdateSupplierRequest = {
          supplierCode: formData.supplierCode || undefined,
          name: formData.name || undefined,
          contactName: formData.contactName || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          addressLine1: formData.addressLine1 || undefined,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country || undefined,
          taxRegistrationNumber: formData.taxRegistrationNumber || undefined,
          paymentTerms: formData.paymentTerms || undefined,
          creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
          notes: formData.notes || undefined,
          status: formData.status as SupplierStatus,
          suppliedProducts: productsStr ? productsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
        };
        await updateSupplier(supplier.id, payload);
      } else {
        const payload: CreateSupplierRequest = {
          supplierCode: formData.supplierCode!,
          name: formData.name!,
          contactName: formData.contactName || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          addressLine1: formData.addressLine1 || undefined,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country || undefined,
          taxRegistrationNumber: formData.taxRegistrationNumber || undefined,
          paymentTerms: formData.paymentTerms || undefined,
          creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
          notes: formData.notes || undefined,
          suppliedProducts: productsStr ? productsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
        };
        await createSupplier(payload);
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

        <div className="inline-block align-bottom bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full relative z-10">
          <div className="bg-white px-6 pt-6 pb-6 sm:p-8 sm:pb-8">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-xl font-bold text-[#1a1f36]">
                {isEditing ? 'Edit Supplier' : 'Add Supplier'}
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Supplier Code *</label>
                  <input type="text" name="supplierCode" required value={formData.supplierCode || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Supplier Name *</label>
                  <input type="text" name="name" required value={formData.name || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Contact Name</label>
                  <input type="text" name="contactName" value={formData.contactName || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                  <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address Line 1</label>
                  <input type="text" name="addressLine1" value={formData.addressLine1 || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address Line 2</label>
                  <input type="text" name="addressLine2" value={formData.addressLine2 || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
                  <input type="text" name="city" value={formData.city || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">State</label>
                  <input type="text" name="state" value={formData.state || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Postal Code</label>
                  <input type="text" name="postalCode" value={formData.postalCode || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Country</label>
                  <input type="text" name="country" value={formData.country || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tax/VAT Number</label>
                  <input type="text" name="taxRegistrationNumber" value={formData.taxRegistrationNumber || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Payment Terms</label>
                  <input type="text" name="paymentTerms" value={formData.paymentTerms || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Credit Limit</label>
                  <input type="number" step="0.01" min="0" name="creditLimit" value={formData.creditLimit || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Supplied Products (comma separated)</label>
                <input type="text" placeholder="e.g. Milk, Bread, Cheese" value={productsStr} onChange={(e) => setProductsStr(e.target.value)} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea name="notes" rows={2} value={formData.notes || ''} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm" />
              </div>

              {isEditing && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select name="status" value={formData.status || 'ACTIVE'} onChange={handleChange} className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              <div className="bg-slate-50/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse mt-8 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 rounded-b-[30px] border-t border-gray-100 border-t">
                <button type="submit" disabled={loading} className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-bold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none">
                  {loading ? 'Saving...' : 'Save Supplier'}
                </button>
                <button type="button" onClick={onClose} disabled={loading} className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none">
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

export default SupplierFormModal;
