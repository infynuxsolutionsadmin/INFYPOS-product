import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const Header: React.FC = () => {
  const { user, clearAuth } = useAuthStore();

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="flex items-center">
        <button type="button" className="text-gray-500 hover:text-gray-700 focus:outline-none md:hidden">
          <Menu className="h-6 w-6" />
        </button>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">{user?.email || 'Admin User'}</span>
        <button
          onClick={clearAuth}
          className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
