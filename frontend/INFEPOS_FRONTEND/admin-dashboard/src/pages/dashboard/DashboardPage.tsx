import React, { useState, useEffect } from 'react';
import { getDashboardSummary } from '../../api/dashboard.api';
import { useAuthStore } from '../../stores/authStore';
import type { DashboardSummary } from '../../types/dashboard';

const DashboardPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canReadDashboard = hasPermission('dashboard.read');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!canReadDashboard) {
        setLoading(false);
        setError('You do not have permission to view dashboard.');
        return;
      }
      try {
        setLoading(true);
        const data = await getDashboardSummary({});
        setSummary(data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [canReadDashboard]);

  if (!canReadDashboard) {
    return <div className="p-4 text-red-500 text-center">{error || 'You do not have permission to view dashboard.'}</div>;
  }

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      
      {summary ? (
        <>
          {/* Main Financials */}
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{summary.sales.totalSales}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Net Revenue</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900"></dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Gross Revenue</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900"></dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Average Basket</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900"></dd>
              </div>
            </div>
          </div>

          {/* Today Metrics */}
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Today's Activity</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Today's Sales</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{summary.today.todaySales}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Today's Returns</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{summary.today.todayReturns}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Today's Customers</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{summary.today.todayCustomers}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Today's POs</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{summary.today.todayPurchaseOrders}</dd>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inventory & Network */}
            <div>
              <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Inventory & Network</h2>
              <div className="bg-white overflow-hidden shadow rounded-lg mb-4">
                <div className="p-5 flex justify-between items-center">
                  <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Products</dt>
                  <dd className="text-2xl font-semibold text-orange-600">{summary.inventory.lowStockProducts}</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg mb-4">
                <div className="p-5 flex justify-between items-center">
                  <dt className="text-sm font-medium text-gray-500 truncate">Out of Stock Products</dt>
                  <dd className="text-2xl font-semibold text-red-600">{summary.inventory.outOfStockProducts}</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg mb-4">
                <div className="p-5 flex justify-between items-center">
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Customers</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{summary.customers.activeCustomers}</dd>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5 flex justify-between items-center">
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Suppliers</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{summary.suppliers.activeSuppliers}</dd>
                </div>
              </div>
            </div>

            {/* Top Selling Products */}
            <div>
              <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Selling Products</h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {summary.topSellingProducts.length > 0 ? (
                    summary.topSellingProducts.map((product) => (
                      <li key={product.productId} className="px-4 py-4 sm:px-6 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.productName}</p>
                          <p className="text-sm text-gray-500">Sold: {product.quantitySold}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600"></p>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-4 sm:px-6 text-center text-sm text-gray-500">
                      No sales data available.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 mt-10">No dashboard data available.</div>
      )}
    </div>
  );
};

export default DashboardPage;

