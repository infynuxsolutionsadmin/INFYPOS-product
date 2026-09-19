import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, AlertTriangle } from 'lucide-react';
import type { Customer, CustomerStatistics } from '../../types/customers';
import { getCustomerById, getCustomerStatistics } from '../../api/customers.api';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customerId,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomer();
    } else {
      setCustomer(null);
      setStats(null);
    }
  }, [isOpen, customerId]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      const [customerData, statsData] = await Promise.all([
        getCustomerById(customerId!),
        getCustomerStatistics(customerId!).catch(() => null)
      ]);
      setCustomer(customerData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
                Customer Profile
                {customer && (
                  <span className={`ml-3 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.status}
                  </span>
                )}
                {customer && (
                  <span className="ml-2 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {customer.customerType}
                  </span>
                )}
                {customer && (
                  <span className="ml-2 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                    {customer.tier}
                  </span>
                )}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {loading ? (
              <div className="py-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 text-red-500 rounded flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
                {error}
              </div>
            ) : customer ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Basic Info */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">Basic Information</h4>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Customer Code</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{customer.customerCode}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.firstName} {customer.lastName}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.phone}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.email || 'N/A'}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">DOB</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.dob ? new Date(customer.dob).toLocaleDateString() : 'N/A'}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Gender</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.gender || 'N/A'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-gray-500">Address</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {[customer.addressLine1, customer.addressLine2, customer.city, customer.state, customer.postalCode, customer.country].filter(Boolean).join(', ') || 'N/A'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Financial & Loyalty Info */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">Financial & Loyalty</h4>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Outstanding Balance</dt>
                        <dd className="mt-1 text-sm font-semibold text-red-600">{Number(customer.outstandingBalance).toFixed(2)}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Credit Limit</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.creditLimit ? Number(customer.creditLimit).toFixed(2) : 'No limit'}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Current Points</dt>
                        <dd className="mt-1 text-sm text-blue-600 font-semibold">{customer.currentPoints}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Lifetime Points</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.lifetimePoints}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">GST Number</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.gstNumber || 'N/A'}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-xs font-medium text-gray-500">Marketing Opt-in</dt>
                        <dd className="mt-1 text-sm text-gray-900">{customer.marketingOptIn ? 'Yes' : 'No'}</dd>
                      </div>
                    </dl>
                  </div>

                </div>

                {/* Sales Statistics (if available) */}
                {stats && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">Sales Statistics</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="bg-blue-50 p-3 rounded">
                        <span className="block text-xs font-medium text-blue-800">Total Purchases</span>
                        <span className="block text-xl font-bold text-blue-900 mt-1">{stats.totalPurchases}</span>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <span className="block text-xs font-medium text-green-800">Total Spent</span>
                        <span className="block text-xl font-bold text-green-900 mt-1">{Number(stats.totalSpending).toFixed(2)}</span>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded">
                        <span className="block text-xs font-medium text-yellow-800">Avg Basket</span>
                        <span className="block text-xl font-bold text-yellow-900 mt-1">{Number(stats.averageBasket).toFixed(2)}</span>
                      </div>
                      <div className="bg-purple-50 p-3 rounded">
                        <span className="block text-xs font-medium text-purple-800">Frequency</span>
                        <span className="block text-xl font-bold text-purple-900 mt-1">{stats.purchaseFrequency}</span>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Last Visit: </span>
                        <span className="font-medium text-gray-900">{stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : 'Never'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Top Product: </span>
                        <span className="font-medium text-gray-900">{stats.mostPurchasedProduct || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Favorite Store: </span>
                        <span className="font-medium text-gray-900">{stats.favoriteStore || 'None'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {customer.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{customer.notes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
