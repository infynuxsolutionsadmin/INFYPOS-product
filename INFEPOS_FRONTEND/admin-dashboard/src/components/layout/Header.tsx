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
  { name: 'Returns', href: '/sales-returns' },
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
                  `px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
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
        <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-full shadow-[0_4px_15px_rgb(0,0,0,0.02)]">
          <span className="text-sm font-medium text-gray-700">{user?.email || 'Admin User'}</span>
          <button
            onClick={clearAuth}
            className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors focus:outline-none"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
