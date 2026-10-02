import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary } from '../../api/dashboard.api';
import { useAuthStore } from '../../stores/authStore';
import type { DashboardSummary } from '../../types/dashboard';
import { ShoppingCart, PoundSterling, Coins, ShoppingBag, BarChart3, CornerDownLeft, Users, FileText, Package, PackageOpen, Monitor, Refrigerator, WashingMachine, Smartphone, Tv } from 'lucide-react';

const ProductIcon = ({ category, name }: { category?: string; name: string }) => {
  const str = (category + ' ' + name).toLowerCase();
  if (str.includes('refrigerator') || str.includes('fridge')) return <Refrigerator className="h-6 w-6 text-blue-500" />;
  if (str.includes('washing machine') || str.includes('washer')) return <WashingMachine className="h-6 w-6 text-teal-500" />;
  if (str.includes('monitor') || str.includes('display')) return <Monitor className="h-6 w-6 text-indigo-500" />;
  if (str.includes('tv') || str.includes('television')) return <Tv className="h-6 w-6 text-purple-500" />;
  if (str.includes('phone') || str.includes('mobile')) return <Smartphone className="h-6 w-6 text-slate-500" />;
  return <Package className="h-6 w-6 text-gray-400" />;
};

const DashboardPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canReadDashboard = hasPermission('dashboard.read');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fmt = (n: any) => `£${Number(n || 0).toFixed(2)}`;

  const fetchDashboard = useCallback(async (isPolling = false) => {
    if (!canReadDashboard) {
      setLoading(false);
      setError('You do not have permission to view dashboard.');
      return;
    }
    try {
      if (!isPolling) {
        setLoading(true);
        setError(null);
      }
      const data = await getDashboardSummary({});
      setSummary(data);
    } catch (err: any) {
      if (!isPolling) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard');
      } else {
        console.error('Polling error:', err);
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [canReadDashboard]);

  useEffect(() => {
    fetchDashboard();
    
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (!canReadDashboard) {
    return <div className="p-4 text-red-500 text-center font-medium">{error || 'You do not have permission to view dashboard.'}</div>;
  }

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B58F2]"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center font-medium">{error}</div>;
  }

  return (
    <div className="min-h-full">
      <h1 className="text-3xl font-bold text-[#1a1f36] mb-8">Dashboard</h1>
      
      {summary ? (
        <>
          {/* Main Financials */}
          <h2 className="text-lg font-bold text-[#1a1f36] mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-purple-50 rounded-full flex-shrink-0">
                    <ShoppingCart className="h-6 w-6 text-purple-500" />
                  </div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Total Sales</dt>
                </div>
                <dd className="text-3xl font-bold text-[#1a1f36] tracking-tight">{summary.sales.totalSales}</dd>
              </div>
            </div>
            
            <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-full flex-shrink-0">
                    <PoundSterling className="h-6 w-6 text-blue-500" />
                  </div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Net Revenue</dt>
                </div>
                <dd className="text-3xl font-bold text-[#1a1f36] tracking-tight">{fmt(summary.sales.netRevenue)}</dd>
              </div>
            </div>
            
            <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-indigo-50 rounded-full flex-shrink-0">
                    <Coins className="h-6 w-6 text-indigo-500" />
                  </div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Gross Revenue</dt>
                </div>
                <dd className="text-3xl font-bold text-[#1a1f36] tracking-tight">{fmt(summary.sales.grossRevenue)}</dd>
              </div>
            </div>
            
            <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-full flex-shrink-0">
                    <ShoppingBag className="h-6 w-6 text-green-500" />
                  </div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Average Basket</dt>
                </div>
                <dd className="text-3xl font-bold text-[#1a1f36] tracking-tight">{fmt(summary.sales.averageBasket)}</dd>
              </div>
            </div>
          </div>

          {/* Today Metrics */}
          <h2 className="text-lg font-bold text-[#1a1f36] mb-4">Today's Activity</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-purple-50 rounded-full flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-purple-500" />
                  </div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Today's Sales</dt>
                </div>
                <dd className="text-3xl font-bold text-[#1a1f36] tracking-tight">{summary.today.todaySales}</dd>
              </div>
            </div>
            
            <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-red-50 rounded-full flex-shrink-0">
                    <CornerDownLeft className="h-6 w-6 text-red-500" />
                  </div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Today's Returns</dt>
                </div>
                <dd className="text-3xl font-bold text-[#1a1f36] tracking-tight">{summary.today.todayReturns}</dd>
              </div>
            </div>
            
            <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-teal-50 rounded-full flex-shrink-0">
                    <Users className="h-6 w-6 text-teal-500" />
                  </div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Today's Customers</dt>
                </div>
                <dd className="text-3xl font-bold text-[#1a1f36] tracking-tight">{summary.today.todayCustomers}</dd>
              </div>
            </div>
            
            <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-full flex-shrink-0">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Today's POs</dt>
                </div>
                <dd className="text-3xl font-bold text-[#1a1f36] tracking-tight">{summary.today.todayPurchaseOrders}</dd>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inventory & Network */}
            <div>
              <h2 className="text-lg font-bold text-[#1a1f36] mb-4">Inventory & Network</h2>
              <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden mb-4">
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 rounded-full flex-shrink-0">
                      <Package className="h-6 w-6 text-purple-500" />
                    </div>
                    <dt className="text-sm font-semibold text-[#1a1f36] truncate">Low Stock Products</dt>
                  </div>
                  <dd className="text-lg font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">{summary.inventory.lowStockProducts}</dd>
                </div>
              </div>
              
              <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden mb-4">
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gray-50 rounded-full flex-shrink-0">
                      <PackageOpen className="h-6 w-6 text-gray-500" />
                    </div>
                    <dt className="text-sm font-semibold text-[#1a1f36] truncate">Out of Stock Products</dt>
                  </div>
                  <dd className="text-lg font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">{summary.inventory.outOfStockProducts}</dd>
                </div>
              </div>
              
              <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden mb-4">
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-teal-50 rounded-full flex-shrink-0">
                      <Users className="h-6 w-6 text-teal-500" />
                    </div>
                    <dt className="text-sm font-semibold text-[#1a1f36] truncate">Active Customers</dt>
                  </div>
                  <dd className="text-lg font-bold text-[#1a1f36]">{summary.customers.activeCustomers}</dd>
                </div>
              </div>
              
              <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-full flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                    <dt className="text-sm font-semibold text-[#1a1f36] truncate">Active Suppliers</dt>
                  </div>
                  <dd className="text-lg font-bold text-[#1a1f36]">{summary.suppliers.activeSuppliers}</dd>
                </div>
              </div>
            </div>

            {/* Top Selling Products */}
            <div>
              <h2 className="text-lg font-bold text-[#1a1f36] mb-4">Top Selling Products</h2>
              <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {summary.topSellingProducts.length > 0 ? (
                    summary.topSellingProducts.map((product) => (
                      <li key={product.productId} className="px-6 py-5 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="h-16 w-16 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.productName} 
                                className="h-full w-full object-contain p-2"
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  (e.target as HTMLElement).style.display = 'none';
                                  if (e.target && (e.target as any).nextElementSibling) {
                                    ((e.target as any).nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div 
                              className="h-full w-full flex items-center justify-center"
                              style={{ display: product.imageUrl ? 'none' : 'flex' }}
                            >
                              <ProductIcon category={product.category} name={product.productName} />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1a1f36]">{product.productName}</p>
                            <p className="text-xs font-medium text-gray-500 mt-1">Sold: {product.quantitySold}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-50 text-green-700">
                            {fmt(product.revenue)}
                          </span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                      No sales data available.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 mt-10 font-medium">No dashboard data available.</div>
      )}
    </div>
  );
};

export default DashboardPage;
