import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle, Ban } from 'lucide-react';
import type { StockTransfer } from '../../types/stockTransfers';
import { getStockTransferById, shipStockTransfer, receiveStockTransfer, deleteStockTransfer } from '../../api/stockTransfers.api';
import { useAuthStore } from '../../stores/authStore';

interface StockTransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferId: string | null;
  onUpdate: () => void;
}

const StockTransferDetailsModal: React.FC<StockTransferDetailsModalProps> = ({
  isOpen,
  onClose,
  transferId,
  onUpdate
}) => {
  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission('stockTransfers.update');
  const canDelete = hasPermission('stockTransfers.delete');

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receivedNotes, setReceivedNotes] = useState('');

  const fetchDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStockTransferById(id);
      setTransfer(data);
      setReceivedNotes(data.receivedNotes || '');
    } catch (err: any) {
      setError('Failed to load transfer details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && transferId) {
      fetchDetails(transferId);
    } else {
      setTransfer(null);
    }
  }, [isOpen, transferId]);

  if (!isOpen) return null;

  const handleAction = async (action: 'ship' | 'receive' | 'delete') => {
    if (!transfer) return;
    
    const confirmMessage = action === 'delete' 
      ? 'Are you sure you want to cancel this transfer?'
      : `Are you sure you want to ${action} this transfer? This action will affect inventory.`;
      
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    setError(null);

    try {
      if (action === 'ship') {
        await shipStockTransfer(transfer.id);
      } else if (action === 'receive') {
        await receiveStockTransfer(transfer.id, { receivedNotes: receivedNotes || undefined });
      } else if (action === 'delete') {
        await deleteStockTransfer(transfer.id);
      }
      onUpdate();
      fetchDetails(transfer.id);
      if(action === 'delete') {
        onClose();
      }
    } catch (err: any) {
      let errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      if (Array.isArray(errorMessage)) errorMessage = errorMessage.join(', ');
      setError(errorMessage);
    } finally {
      setActionLoading(false);
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
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-3">
                Transfer Details
                {transfer && (
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    transfer.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 
                    transfer.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                    transfer.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {transfer.status}
                  </span>
                )}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : transfer ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <p className="text-gray-500">Transfer Number</p>
                    <p className="font-medium text-lg">{transfer.transferNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Source Store</p>
                    <p className="font-medium">{transfer.sourceStore?.name} ({transfer.sourceStore?.code})</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Destination Store</p>
                    <p className="font-medium">{transfer.destinationStore?.name} ({transfer.destinationStore?.code})</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Carrier</p>
                    <p className="font-medium">{transfer.carrier || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Vehicle Number</p>
                    <p className="font-medium">{transfer.vehicleNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tracking Number</p>
                    <p className="font-medium">{transfer.trackingNumber || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500">Created By</p>
                    <p className="font-medium">
                      {transfer.createdByUser ? `${transfer.createdByUser.firstName} ${transfer.createdByUser.lastName}` : 'System'}
                      <br />
                      <span className="text-xs text-gray-400">{new Date(transfer.createdAt).toLocaleString()}</span>
                    </p>
                  </div>
                  {transfer.status !== 'DRAFT' && transfer.status !== 'CANCELLED' && (
                    <div>
                      <p className="text-gray-500">Shipped By</p>
                      <p className="font-medium">
                        {transfer.shippedByUser ? `${transfer.shippedByUser.firstName} ${transfer.shippedByUser.lastName}` : '-'}
                        <br />
                        <span className="text-xs text-gray-400">{transfer.shippedAt ? new Date(transfer.shippedAt).toLocaleString() : ''}</span>
                      </p>
                    </div>
                  )}
                  {transfer.status === 'RECEIVED' && (
                    <div>
                      <p className="text-gray-500">Received By</p>
                      <p className="font-medium">
                        {transfer.receivedByUser ? `${transfer.receivedByUser.firstName} ${transfer.receivedByUser.lastName}` : '-'}
                        <br />
                        <span className="text-xs text-gray-400">{transfer.receivedAt ? new Date(transfer.receivedAt).toLocaleString() : ''}</span>
                      </p>
                    </div>
                  )}
                </div>

                {transfer.notes && (
                  <div>
                    <p className="text-gray-500 text-sm">Notes</p>
                    <p className="text-sm font-medium bg-gray-50 p-2 rounded">{transfer.notes}</p>
                  </div>
                )}
                
                {transfer.receivedNotes && transfer.status === 'RECEIVED' && (
                  <div>
                    <p className="text-gray-500 text-sm">Received Notes</p>
                    <p className="text-sm font-medium bg-gray-50 p-2 rounded">{transfer.receivedNotes}</p>
                  </div>
                )}
                
                {transfer.status === 'SHIPPED' && canUpdate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Received Notes (Optional)</label>
                    <textarea 
                      rows={2} 
                      value={receivedNotes} 
                      onChange={(e) => setReceivedNotes(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Add any notes upon receiving..."
                    />
                  </div>
                )}

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Transfer Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border rounded-md">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU / Barcode</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transfer.items?.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.productName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.sku} {item.barcode ? ` / ${item.barcode}` : ''}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                              {Number(item.quantity).toFixed(2)} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 text-right">${Number(item.unitCost).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 text-right">${Number(item.totalValue).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="border-t pt-4 flex flex-wrap gap-3 justify-end">
                  {transfer.status === 'DRAFT' && canUpdate && (
                    <button
                      onClick={() => handleAction('ship')}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Ship Transfer
                    </button>
                  )}
                  {transfer.status === 'SHIPPED' && canUpdate && (
                    <button
                      onClick={() => handleAction('receive')}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Receive Transfer
                    </button>
                  )}
                  {transfer.status === 'DRAFT' && canDelete && (
                    <button
                      onClick={() => handleAction('delete')}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Transfer
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTransferDetailsModal;
