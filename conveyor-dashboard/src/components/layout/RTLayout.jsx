// src/components/layout/RTLayout.jsx
import React from 'react';

const RTLayout = ({ children }) => {
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
            {[
              { name: 'داشبورد', icon: '📊', active: true },
              { name: 'نظارت زنده', icon: '📹' },
              { name: 'هشدارها', icon: '⚠️' },
              { name: 'تجزیه و تحلیل', icon: '📈' },
              { name: 'نقشه نوارها', icon: '🗺️' },
              { name: 'گزارشات', icon: '📋' },
              { name: 'تنظیمات', icon: '⚙️' },
            ].map((item) => (
              <a
                key={item.name}
                href={`#${item.name.toLowerCase()}`}
                className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg transition-colors ${
                  item.active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default RTLayout;