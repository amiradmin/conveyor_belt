// src/components/layout/RTLayout.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const RTLayout = ({ children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'داشبورد', path: '/', icon: '📊' },
    { name: 'نظارت زنده', path: '/monitoring', icon: '📹' },
    { name: 'هشدارها', path: '/alerts', icon: '⚠️' },
    { name: 'تجزیه و تحلیل', path: '/analytics', icon: '📈' },
    { name: 'نقشه نوارها', path: '/map', icon: '🗺️' },
    { name: 'گزارشات', path: '/reports', icon: '📋' },
    { name: 'تنظیمات', path: '/settings', icon: '⚙️' },
  ];

  return (
    <div dir="rtl" className="font-farsi bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Right side - Logo */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-10 h-10 bg-gradient-to-l from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">ن</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">سیستم نظارت بر نوار نقاله</h1>
              <p className="text-sm text-gray-600">فولاد شهبان شادگان</p>
            </div>
          </div>

          {/* Left side - User menu */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="text-right">
              <p className="font-medium text-gray-900">اپراتور سیستم</p>
              <p className="text-sm text-gray-500">فولاد شهبان</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-medium">ا</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Right side */}
        <aside className="w-64 bg-gray-900 text-white min-h-screen">
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Status Footer */}
          <div className="p-4 border-t border-gray-700 mt-auto">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
              <span className="text-sm text-gray-300">سیستم فعال</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 rtl-dir">
          {children}
        </main>
      </div>
    </div>
  );
};

export default RTLayout;