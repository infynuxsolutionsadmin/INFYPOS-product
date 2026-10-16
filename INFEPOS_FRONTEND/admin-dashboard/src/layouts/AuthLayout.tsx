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
    <div className="min-h-screen bg-[#EBF2FA] flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Soft ambient wave light effects matching the visual reference */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 -translate-y-1/2 w-[700px] h-[700px] bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
      
      {/* Gentle curved ambient background accents */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 1440 900" fill="none">
        <path d="M-100,200 C300,100 500,450 900,350 C1300,250 1400,500 1600,400" stroke="#93C5FD" strokeWidth="120" strokeLinecap="round" opacity="0.15" filter="blur(40px)" />
        <path d="M-100,700 C400,600 700,850 1100,750 C1400,680 1500,800 1600,780" stroke="#BFDBFE" strokeWidth="100" strokeLinecap="round" opacity="0.2" filter="blur(50px)" />
      </svg>

      <Outlet />
    </div>
  );
};

export default AuthLayout;
