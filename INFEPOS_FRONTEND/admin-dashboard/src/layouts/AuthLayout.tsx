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
    <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-3 sm:p-6 font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden">
      {/* Tech Blueprint Grid Lines Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      
      <Outlet />
    </div>
  );
};

export default AuthLayout;
