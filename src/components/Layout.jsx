import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, User, LogOut } from 'lucide-react';

function Layout({ children }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/letraht.png" 
                alt="Hourly Logo" 
                className="h-6 w-6 sm:h-8 sm:w-8 mr-1 sm:mr-2" 
              />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Hourly</h1>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.name}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}

export default Layout;
