// src/components/analytics/AnalyticsPage.jsx
import React from 'react';

const AnalyticsPage = () => {
  const analyticsData = {
    daily: {
      uptime: 98.7,
      efficiency: 94.2,
      alerts: 12,
      maintenance: 3
    },
    weekly: {
      uptime: 97.8,
      efficiency: 92.1,
      alerts: 45,
      maintenance: 15
    },
    monthly: {
      uptime: 96.5,
      efficiency: 90.8,
      alerts: 187,
      maintenance: 42
    }
  };

  const trends = [
    { metric: 'زمان فعالیت', current: 98.7, previous: 97.2, change: 1.5 },
    { metric: 'بازدهی انرژی', current: 87.3, previous: 84.1, change: 3.2 },
    { metric: 'هزینه تعمیرات', current: 42, previous: 58, change: -16 },
    { metric: 'تعداد هشدارها', current: 12, previous: 18, change: -6 }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تجزیه و تحلیل عملکرد</h1>
        <p className="text-gray-600">بررسی جامع عملکرد سیستم و شاخص های کلیدی</p>
      </div>

      {/* Time Period Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex space-x-3 space-x-reverse">
          {['روزانه', 'هفتگی', 'ماهانه'].map((period) => (
            <button
              key={period}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(analyticsData.daily).map(([key, value]) => (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {typeof value === 'number' ? `${value}${key === 'uptime' || key === 'efficiency' ? '%' : ''}` : value}
            </div>
            <div className="text-gray-600 capitalize">
              {key === 'uptime' && 'زمان فعالیت'}
              {key === 'efficiency' && 'بازدهی'}
              {key === 'alerts' && 'هشدارها'}
              {key === 'maintenance' && 'تعمیرات'}
            </div>
          </div>
        ))}
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">روند عملکرد</h3>
          <div className="space-y-4">
            {trends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{trend.metric}</span>
                <div className="flex items-center space-x-4 space-x-reverse">
                  <span className="text-lg font-bold text-gray-900">
                    {trend.current}{trend.metric === 'هزینه تعمیرات' ? 'M' : '%'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    trend.change > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {trend.change > 0 ? '↑' : '↓'} {Math.abs(trend.change)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Chart Placeholder */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">بازدهی نوارهای نقاله</h3>
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-gray-600">نمودار بازدهی</p>
              <p className="text-sm text-gray-500">(قابل integration با کتابخانه نمودار)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Schedule */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">برنامه تعمیرات پیشگیرانه</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-sm font-medium text-gray-700">نوار نقاله</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">نوع تعمیرات</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">تاریخ برنامه ریزی</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">وضعیت</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { belt: 'BLT-001', type: 'تعویض غلطک', date: '۱۴۰۲/۱۱/۲۵', status: 'برنامه ریزی شده' },
                { belt: 'BLT-012', type: 'تنظیم موتور', date: '۱۴۰۲/۱۱/۲۲', status: 'در حال انجام' },
                { belt: 'BLT-024', type: 'بازرسی دوره ای', date: '۱۴۰۲/۱۱/۲۰', status: 'تکمیل شده' },
              ].map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.belt}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'برنامه ریزی شده' ? 'bg-yellow-100 text-yellow-800' :
                      item.status === 'در حال انجام' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      مشاهده جزئیات
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;