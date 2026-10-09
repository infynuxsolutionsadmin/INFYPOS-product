import React from 'react';
import { X, Building2, Phone, MapPin, FileText, CreditCard, Box } from 'lucide-react';
import type { Supplier } from '../../types/suppliers';

interface SupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

const SupplierDetailsModal: React.FC<SupplierDetailsModalProps> = ({
  isOpen,
  onClose,
  supplier,
}) => {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full relative z-10">
          <div className="bg-white px-6 pt-6 pb-6 sm:p-8 sm:pb-8">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-50 p-2 rounded-xl">
                  <Building2 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1a1f36]">{supplier.name}</h3>
                  <p className="text-sm text-gray-500">{supplier.supplierCode}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Contact & Location */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" /> Location Details
                  </h4>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                    {supplier.addressLine1 || supplier.addressLine2 || supplier.city || supplier.country ? (
                      <>
                        {supplier.addressLine1 && <p className="text-gray-700">{supplier.addressLine1}</p>}
                        {supplier.addressLine2 && <p className="text-gray-700">{supplier.addressLine2}</p>}
                        <p className="text-gray-700">
                          {[supplier.city, supplier.state, supplier.postalCode].filter(Boolean).join(', ')}
                        </p>
                        {supplier.country && <p className="text-gray-700 font-medium">{supplier.country}</p>}
                      </>
                    ) : (
                      <p className="text-gray-400 italic">No address provided</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" /> Contact Info
                  </h4>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contact Person:</span>
                      <span className="font-medium text-gray-900">{supplier.contactName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium text-gray-900">{supplier.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium text-gray-900">{supplier.phone || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Financial & Products */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-gray-400" /> Financial Details
                  </h4>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax/VAT No:</span>
                      <span className="font-medium text-gray-900">{supplier.taxRegistrationNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment Terms:</span>
                      <span className="font-medium text-gray-900">{supplier.paymentTerms || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Credit Limit:</span>
                      <span className="font-medium text-gray-900">{supplier.creditLimit ? `$${supplier.creditLimit}` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        supplier.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <Box className="h-4 w-4 mr-2 text-gray-400" /> Supplied Products
                  </h4>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    {supplier.suppliedProducts && supplier.suppliedProducts.length > 0 ? (
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {supplier.suppliedProducts.map((prod, idx) => (
                          <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {prod}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No products listed.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {supplier.notes && (
              <div className="mt-6">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-400" /> Notes
                </h4>
                <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {supplier.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailsModal;
