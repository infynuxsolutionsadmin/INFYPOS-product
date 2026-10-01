import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const MasterAdminLayout: React.FC = () => {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();

  if (!_hasHydrated) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Ensure only super admin can access this layout
  if (user?.roleCode !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* We can build a specific Sidebar for Master Admin later */}
      <div className="hidden md:flex md:flex-shrink-0 bg-gray-800 w-64">
        <div className="flex flex-col w-full px-2 py-4">
          <div className="flex items-center justify-center h-16 bg-gray-900 text-white font-bold text-xl rounded mb-6">
            MASTER ADMIN
          </div>
          <div className="flex flex-col gap-2">
             <div className="bg-gray-900 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                Tenants Dashboard
             </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <header className="bg-white shadow relative z-10 h-16 flex items-center justify-between px-4">
           <div className="font-semibold text-lg">System Dashboard</div>
           <div className="text-gray-600">{user?.email}</div>
        </header>
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MasterAdminLayout;
