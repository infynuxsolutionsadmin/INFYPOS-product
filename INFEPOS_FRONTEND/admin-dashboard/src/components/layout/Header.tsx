import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

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
  { name: 'Roles & Perms', href: '/roles-permissions' },
  { name: 'Settings', href: '/settings' },
];

const Header: React.FC = () => {
  const { user, clearAuth, hasPermission } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-[#F3F5F9] px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
        {/* Logo Area */}
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#5B58F2] rounded-xl flex items-center justify-center text-white font-bold text-xl">
            I
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">INFYPOS</h1>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
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

        {/* Profile Area */}
        <div className="flex items-center">
          <button
            onClick={clearAuth}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all focus:outline-none shadow-sm text-sm font-bold"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
