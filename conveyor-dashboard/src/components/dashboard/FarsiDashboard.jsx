// src/components/dashboard/FarsiDashboard.jsx
import React from 'react';

const FarsiDashboard = () => {
  const stats = [
    {
      title: 'نوارهای فعال',
      value: '۲۴',
      change: '+۲',
      changeType: 'positive',
      icon: '✅',
      description: 'از هفته گذشته'
    },
    {
      title: 'هشدارهای بحرانی',
      value: '۳',
      change: '-۱',
      changeType: 'negative',
      icon: '🚨',
      description: 'کاهش نسبت به دیروز'
    },
    {
      title: 'زمان فعالیت',
      value: '۹۸.۷٪',
      change: '+۰.۳٪',
      changeType: 'positive',
      icon: '⏱️',
      description: 'بهبود عملکرد'
    },
    {
      title: 'صرفه جویی هزینه',
      value: '۱۵۶ میلیون',
      change: '+۱۲٪',
      changeType: 'positive',
      icon: '💰',
      description: 'پیش بینی سالانه'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">داشبورد نظارت هوشمند نوار نقاله</h1>
        <p className="text-blue-100 text-lg">
          سیستم هوش مصنوعی برای نظارت بر نوارهای نقاله فولاد شهبان شادگان
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between space-x-reverse">
              <div>
                <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className={`text-sm ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change} {stat.description}
                </p>
              </div>
              <div className="text-3xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Monitoring */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">نظارت زنده دوربین ها</h2>
            <div className="flex space-x-2 space-x-reverse">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                نمایش همه
              </button>
            </div>
          </div>

          {/* Camera Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'نوار اصلی - بخش A', status: 'فعال', location: 'منطقه بارگیری' },
              { name: 'نوار انتقال - بخش B', status: 'فعال', location: 'منطقه پردازش' },
              { name: 'نوار خروجی - بخش C', status: 'غیرفعال', location: 'منطقه ذخیره' },
              { name: 'نوار کوره - بخش D', status: 'فعال', location: 'منطقه ذوب' },
            ].map((camera, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="aspect-video bg-gray-800 relative">
                  {/* Status Badge */}
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs ${
                    camera.status === 'فعال' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    {camera.status}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900">{camera.name}</h3>
                  <p className="text-sm text-gray-600">{camera.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">هشدارهای اخیر</h2>
          <div className="space-y-4">
            {[
              { type: 'بحرانی', message: 'نوار شماره ۱۲ - انحراف شدید تشخیص داده شد', time: '۲ دقیقه قبل' },
              { type: 'هشدار', message: 'نوار شماره ۸ - بار بیش از حد مجاز', time: '۱۵ دقیقه قبل' },
              { type: 'اطلاع', message: 'نوار شماره ۱۵ - نیاز به تعمیرات دوره ای', time: '۱ ساعت قبل' },
            ].map((alert, index) => (
              <div key={index} className={`border-r-4 p-4 rounded-lg ${
                alert.type === 'بحرانی' ? 'border-red-500 bg-red-50' :
                alert.type === 'هشدار' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <span className={`text-lg ${
                    alert.type === 'بحرانی' ? 'text-red-600' :
                    alert.type === 'هشدار' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {alert.type === 'بحرانی' ? '🚨' : alert.type === 'هشدار' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-500 mt-1">{alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarsiDashboard;