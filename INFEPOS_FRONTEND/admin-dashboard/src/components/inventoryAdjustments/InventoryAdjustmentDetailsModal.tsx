import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { InventoryAdjustment } from '../../types/inventoryAdjustments';
import { getInventoryAdjustmentById } from '../../api/inventoryAdjustments.api';

interface InventoryAdjustmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustmentId: string | null;
}

const InventoryAdjustmentDetailsModal: React.FC<InventoryAdjustmentDetailsModalProps> = ({
  isOpen,
  onClose,
  adjustmentId,
}) => {
  const [adjustment, setAdjustment] = useState<InventoryAdjustment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !adjustmentId) {
      setAdjustment(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInventoryAdjustmentById(adjustmentId);
        setAdjustment(data);
      } catch (err: any) {
        setError('Failed to load adjustment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, adjustmentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Adjustment Details
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {error ? (
              <div className="text-red-500 p-4 text-center">{error}</div>
            ) : loading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : adjustment ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Adjustment Number</p>
                    <p className="font-medium">{adjustment.adjustmentNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        adjustment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                        adjustment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {adjustment.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Store</p>
                    <p className="font-medium">{adjustment.store?.name} ({adjustment.store?.code})</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Reason</p>
                    <p className="font-medium">{adjustment.reason.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created By</p>
                    <p className="font-medium">{adjustment.createdByUser?.firstName} {adjustment.createdByUser?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">{new Date(adjustment.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Notes</p>
                    <p className="font-medium">{adjustment.notes || '-'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Adjusted Items</h4>
                  <table className="min-w-full divide-y divide-gray-200 border rounded-md overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty Change</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {adjustment.items?.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.sku}</td>
                          <td className={`px-4 py-2 text-sm text-right font-medium ${item.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.quantityChange > 0 ? '+' : ''}{item.quantityChange}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 text-right">${Number(item.unitCost).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 text-right">${Number(item.totalValue).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryAdjustmentDetailsModal;
