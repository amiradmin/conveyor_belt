// src/components/alerts/AlertsPage.jsx
import React, { useState } from 'react';

const AlertsPage = () => {
  const [filter, setFilter] = useState('all');

  const alerts = [
    {
      id: 1,
      type: 'critical',
      title: 'انحراف شدید نوار نقاله',
      belt: 'نوار اصلی انتقال - BLT-001',
      location: 'بخش بارگیری',
      timestamp: '۱۴۰۲/۱۱/۲۰ - ۱۴:۳۲',
      description: 'انحراف ۱۵ سانتی متری در بخش میانی نوار تشخیص داده شد',
      actionRequired: true,
      assignedTo: 'تیم تعمیرات A'
    },
    {
      id: 2,
      type: 'warning',
      title: 'بار بیش از حد مجاز',
      belt: 'نوار تغذیه کوره - BLT-012',
      location: 'منطقه ذوب',
      timestamp: '۱۴۰۲/۱۱/۲۰ - ۱۳:۱۵',
      description: 'بارگذاری ۱۲٪ بیش از حد مجاز تشخیص داده شد',
      actionRequired: false,
      assignedTo: 'اپراتور شیفت'
    },
    {
      id: 3,
      type: 'info',
      title: 'تعمیرات دوره ای پیش رو',
      belt: 'نوار خروجی - BLT-024',
      location: 'منطقه ذخیره سازی',
      timestamp: '۱۴۰۲/۱۱/۱۹ - ۰۹:۴۵',
      description: 'زمان تعمیرات دوره ای در ۴۸ ساعت آینده',
      actionRequired: true,
      assignedTo: 'تیم تعمیرات B'
    }
  ];

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'critical': return 'border-red-300 bg-red-50';
      case 'warning': return 'border-yellow-300 bg-yellow-50';
      case 'info': return 'border-blue-300 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter(alert => alert.type === filter);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">مدیریت هشدارها</h1>
            <p className="text-gray-600">پیگیری و مدیریت تمامی هشدارهای سیستم</p>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
              {alerts.filter(a => a.actionRequired).length} نیاز به اقدام
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex space-x-3 space-x-reverse">
          {[
            { key: 'all', label: 'همه هشدارها', count: alerts.length },
            { key: 'critical', label: 'بحرانی', count: alerts.filter(a => a.type === 'critical').length },
            { key: 'warning', label: 'هشدار', count: alerts.filter(a => a.type === 'warning').length },
            { key: 'info', label: 'اطلاعیه', count: alerts.filter(a => a.type === 'info').length },
          ].map((filterItem) => (
            <button
              key={filterItem.key}
              onClick={() => setFilter(filterItem.key)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === filterItem.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterItem.label} ({filterItem.count})
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className={`border-2 rounded-xl p-6 ${getAlertColor(alert.type)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 space-x-reverse">
                <div className="text-2xl mt-1">{getAlertIcon(alert.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                    {alert.actionRequired && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                        نیاز به اقدام فوری
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-3">{alert.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">نوار نقاله:</span> {alert.belt}
                    </div>
                    <div>
                      <span className="font-medium">موقعیت:</span> {alert.location}
                    </div>
                    <div>
                      <span className="font-medium">زمان:</span> {alert.timestamp}
                    </div>
                  </div>

                  {alert.assignedTo && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700">مسئول پیگیری:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 text-sm">
                        {alert.assignedTo}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-2 space-x-reverse">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                  ✅ حل شده
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  📋 جزئیات
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">هیچ هشداری یافت نشد</h3>
          <p className="text-gray-600">همه هشدارها مدیریت شده اند یا فیلترهای اعمال شده نتیجه ای ندارند</p>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
