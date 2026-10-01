import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const AuthLayout: React.FC = () => {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();

  if (!_hasHydrated) return null;

  if (isAuthenticated) {
    if (user?.roleCode === 'SUPER_ADMIN') {
      return <Navigate to="/master-admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
