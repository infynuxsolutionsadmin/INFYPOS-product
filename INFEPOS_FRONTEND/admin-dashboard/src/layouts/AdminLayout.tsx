import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Header from '../components/layout/Header';

const AdminLayout: React.FC = () => {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();

  if (!_hasHydrated) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.roleCode === 'SUPER_ADMIN') {
    return <Navigate to="/master-admin" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F3F5F9] font-sans flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto focus:outline-none">
        <div className="py-8 px-4 sm:px-6 md:px-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
