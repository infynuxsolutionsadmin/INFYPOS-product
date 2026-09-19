export interface DashboardQuery {
  storeId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface DashboardSummary {
  sales: {
    totalSales: number;
    grossRevenue: string;
    returns: string;
    netRevenue: string;
    averageBasket: string;
  };
  inventory: {
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  purchases: {
    purchaseOrders: number;
    purchaseValue: string;
  };
  customers: {
    activeCustomers: number;
  };
  suppliers: {
    activeSuppliers: number;
  };
  today: {
    todaySales: number;
    todayCustomers: number;
    todayReturns: number;
    todayPurchaseOrders: number;
  };
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: string;
    revenue: string;
  }>;
}
