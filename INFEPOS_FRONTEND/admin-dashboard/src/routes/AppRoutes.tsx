import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../pages/auth/LoginPage';
import LandingPage from '../pages/LandingPage';
import StaticPage from '../pages/StaticPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProductsPage from '../pages/products/ProductsPage';
import StoresPage from '../pages/stores/StoresPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import InventoryAdjustmentsPage from '../pages/inventoryAdjustments/InventoryAdjustmentsPage';
import StockTransfersPage from '../pages/stockTransfers/StockTransfersPage';
import SuppliersPage from '../pages/suppliers/SuppliersPage';
import PurchasesPage from '../pages/purchases/PurchasesPage';
import GoodsReceiptsPage from '../pages/goodsReceipts/GoodsReceiptsPage';
import CustomersPage from '../pages/customers/CustomersPage';
import SalesPage from '../pages/sales/SalesPage';
import SalesReturnsPage from '../pages/salesReturns/SalesReturnsPage';
import ShiftsPage from '../pages/shifts/ShiftsPage';

import UsersPage from '../pages/users/UsersPage';
import RolesPermissionsPage from '../pages/roles/RolesPermissionsPage';
import ReportsPage from '../pages/reports/ReportsPage';
import SettingsPage from '../pages/settings/SettingsPage';

import MasterAdminLayout from '../layouts/MasterAdminLayout';
import MasterAdminDashboard from '../pages/masterAdmin/MasterAdminDashboard';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      
      {/* Master Admin Routes */}
      <Route element={<MasterAdminLayout />}>
        <Route path="/master-admin" element={<MasterAdminDashboard />} />
      </Route>

      {/* Tenant/Store Admin Routes */}
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products/*" element={<ProductsPage />} />
        <Route path="/stores/*" element={<StoresPage />} />
        <Route path="/inventory/*" element={<InventoryPage />} />
        <Route path="/inventory-adjustments/*" element={<InventoryAdjustmentsPage />} />
        <Route path="/stock-transfers/*" element={<StockTransfersPage />} />
        <Route path="/suppliers/*" element={<SuppliersPage />} />
        <Route path="/purchases/*" element={<PurchasesPage />} />
        <Route path="/goods-receipts/*" element={<GoodsReceiptsPage />} />
        <Route path="/customers/*" element={<CustomersPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales-returns" element={<SalesReturnsPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />

        <Route path="/users" element={<UsersPage />} />
        <Route path="/roles-permissions" element={<RolesPermissionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Static Footer Pages */}
      <Route path="/about" element={<StaticPage title="About Infynux" />} />
      <Route path="/info/products" element={<StaticPage title="Products" />} />
      <Route path="/privacy" element={<StaticPage title="Privacy Policy" />} />
      <Route path="/terms" element={<StaticPage title="Terms of Service" />} />
      <Route path="/blog" element={<StaticPage title="Blog" />} />
      <Route path="/pricing-details" element={<StaticPage title="Pricing Details" />} />
      <Route path="/use-cases-details" element={<StaticPage title="Use Cases" />} />
      <Route path="/docs" element={<StaticPage title="Documentation" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
