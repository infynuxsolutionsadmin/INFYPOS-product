import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { SubscriptionModal } from './SubscriptionModal';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Products', href: '/products' },
  { name: 'Stores', href: '/stores' },
  { name: 'Inventory', href: '/inventory' },
  { name: 'Sales', href: '/sales' },
  { name: 'Suppliers', href: '/suppliers' },
  { name: 'Customers', href: '/customers' },
  { name: 'Shifts', href: '/shifts', permission: 'shifts.read' },
  { name: 'Users', href: '/users' },
  { name: 'Settings', href: '/settings' },
];

const Header: React.FC = () => {
  const { clearAuth, hasPermission } = useAuthStore();
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsSubscriptionOpen(true);
    window.addEventListener('infypos:open-subscription', handleOpen);
    return () => window.removeEventListener('infypos:open-subscription', handleOpen);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#F3F5F9] px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
        {/* Logo Area */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
            <img src="/transparent_logo.png" alt="INFEPOS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">INFEPOS</h1>
            <p className="text-xs text-gray-500 font-medium">Admin Dashboard</p>
          </div>
        </div>

        {/* Navigation Pill */}
        <nav className="flex flex-wrap justify-center items-center gap-1 bg-[#1A1A24] rounded-[2rem] px-2 py-2 max-w-full">
          {navigation.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-[0.85rem] font-medium whitespace-nowrap transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#5B58F2] text-white shadow-md'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Header Actions (Plan & Exit) */}
        <div className="flex items-center gap-3">
          {/* Plan / Subscription Button */}
          <button
            onClick={() => setIsSubscriptionOpen(true)}
            id="btn-app-subscription"
            className="group flex flex-col items-center justify-center p-1 focus:outline-none transition-transform active:scale-95 cursor-pointer"
            title="Manage Subscription & Billing"
          >
            <span className="text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1 group-hover:text-indigo-600 transition-colors">
              Plan
            </span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-[18px] bg-white border border-gray-100/90 shadow-[5px_5px_14px_rgba(163,177,198,0.25),-5px_-5px_14px_rgba(255,255,255,0.95)] group-hover:shadow-[4px_4px_14px_rgba(99,102,241,0.25),-4px_-4px_14px_rgba(255,255,255,0.95)] transition-all duration-300">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-indigo-600 transition-colors" />
            </div>
          </button>

          {/* Exit Button */}
          <button
            onClick={clearAuth}
            id="btn-app-logout"
            className="group flex flex-col items-center justify-center p-1 focus:outline-none transition-transform active:scale-95 cursor-pointer"
            title="Exit Application"
          >
            <span className="text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1 group-hover:text-red-600 transition-colors">
              Exit
            </span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-[18px] bg-white border border-gray-100/90 shadow-[5px_5px_14px_rgba(163,177,198,0.25),-5px_-5px_14px_rgba(255,255,255,0.95)] group-hover:shadow-[4px_4px_14px_rgba(239,68,68,0.2),-4px_-4px_14px_rgba(255,255,255,0.95)] transition-all duration-300">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-red-600 transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Subscription & Billing Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />
    </header>
  );
};

export default Header;
