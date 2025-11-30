// src/components/settings/SettingsPage.jsx
import React, { useState } from 'react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'تنظیمات عمومی', icon: '⚙️' },
    { id: 'alerts', name: 'تنظیمات هشدار', icon: '🚨' },
    { id: 'cameras', name: 'مدیریت دوربین ها', icon: '📹' },
    { id: 'users', name: 'مدیریت کاربران', icon: '👥' },
    { id: 'system', name: 'تنظیمات سیستم', icon: '💻' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تنظیمات سیستم</h1>
        <p className="text-gray-600">مدیریت پیکربندی و تنظیمات سیستم نظارتی</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 space-x-reverse p-3 rounded-lg transition-colors text-right ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">تنظیمات عمومی</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نام کارخانه
                    </label>
                    <input
                      type="text"
                      defaultValue="فولاد شادگان"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      زبان سیستم
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option>فارسی</option>
                      <option>English</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    توضیحات کارخانه
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="سیستم نظارت هوشمند نوار نقاله های کارخانه فولاد  شادگان"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    انصراف
                  </button>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    ذخیره تغییرات
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">تنظیمات هشدار</h2>

                <div className="space-y-4">
                  {[
                    { name: 'هشدار انحراف نوار', threshold: '۱۰ سانتی متر', enabled: true },
                    { name: 'هشدار بار بیش از حد', threshold: '۸۵٪ ظرفیت', enabled: true },
                    { name: 'هشدار دمای بالا', threshold: '۶۰ درجه سانتیگراد', enabled: false },
                    { name: 'هشدار سرعت غیرعادی', threshold: '±۲۰٪ از نرمال', enabled: true },
                  ].map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{alert.name}</h3>
                        <p className="text-sm text-gray-600">آستانه: {alert.threshold}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={alert.enabled} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:rtl:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:rtl:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'cameras' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">مدیریت دوربین ها</h2>
                <p className="text-gray-600">تنظیمات و مدیریت دوربین های نظارتی</p>
                {/* Camera management content */}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">مدیریت کاربران</h2>
                <p className="text-gray-600">مدیریت دسترسی کاربران سیستم</p>
                {/* User management content */}
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">تنظیمات سیستم</h2>
                <p className="text-gray-600">تنظیمات پیشرفته سیستم</p>
                {/* System settings content */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;