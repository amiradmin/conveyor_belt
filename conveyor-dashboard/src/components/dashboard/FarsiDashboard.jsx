// src/components/dashboard/FarsiDashboard.jsx
import React, { useState, useEffect } from 'react';
import ConveyorAPI from '../../../services/api';

// Utility function to convert numbers to Persian digits
const toPersianNumber = (number) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return number.toString().replace(/\d/g, x => persianDigits[x]);
};

const FarsiDashboard = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchSystemStatus();

    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    // Refresh data every 30 seconds
    const dataInterval = setInterval(fetchSystemStatus, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const status = await ConveyorAPI.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return toPersianNumber(date.toLocaleTimeString('fa-IR'));
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری اطلاعات...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'نوارهای فعال',
      value: toPersianNumber(systemStatus?.active_cameras?.toString() || '0'),
      change: '+۲',
      changeType: 'positive',
      icon: '✅',
      description: 'از هفته گذشته',
      color: 'green'
    },
    {
      title: 'هشدارهای بحرانی',
      value: toPersianNumber(systemStatus?.critical_alerts?.toString() || '0'),
      change: '-۱',
      changeType: 'negative',
      icon: '🚨',
      description: 'کاهش نسبت به دیروز',
      color: 'red'
    },
    {
      title: 'زمان فعالیت',
      value: `${toPersianNumber(systemStatus?.uptime_percentage?.toString() || '0')}٪`,
      change: '+۰.۳٪',
      changeType: 'positive',
      icon: '⏱️',
      description: 'بهبود عملکرد',
      color: 'blue'
    },
    {
      title: 'میانگین بازدهی',
      value: `${toPersianNumber(systemStatus?.average_efficiency?.toString() || '0')}٪`,
      change: '+۱.۲٪',
      changeType: 'positive',
      icon: '📊',
      description: 'افزایش کارایی',
      color: 'purple'
    }
  ];

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthText = (health) => {
    switch (health) {
      case 'excellent': return 'عالی';
      case 'good': return 'خوب';
      case 'fair': return 'متوسط';
      case 'poor': return 'نیاز به توجه';
      default: return 'نامشخص';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header with Real-time Info */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 rounded-2xl p-8 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">داشبورد نظارت هوشمند نوار نقاله</h1>
              <p className="text-blue-100 text-lg">
                سیستم هوش مصنوعی برای نظارت بر نوارهای نقاله فولاد شادگان
              </p>
            </div>
            <div className="text-left bg-white/10 rounded-lg p-4 min-w-48">
              <div className="text-blue-200 text-sm">زمان جاری</div>
              <div className="text-white font-bold text-lg">{formatTime(currentTime)}</div>
              <div className="text-blue-200 text-sm">{formatDate(currentTime)}</div>
            </div>
          </div>

          {/* System Health Indicator */}
          <div className="mt-4 flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus?.overall_health === 'excellent' ? 'bg-green-500' :
                systemStatus?.overall_health === 'good' ? 'bg-blue-500' :
                systemStatus?.overall_health === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-blue-100">وضعیت کلی سیستم:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                getHealthColor(systemStatus?.overall_health)
              }`}>
                {getHealthText(systemStatus?.overall_health)}
              </span>
            </div>
            <div className="text-blue-200 text-sm">
              آخرین بروزرسانی: {formatTime(currentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300"
          >
            <div className="flex items-center justify-between space-x-reverse">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change} {stat.description}
                </p>
              </div>
              <div className={`text-3xl p-3 rounded-full ${
                stat.color === 'green' ? 'bg-green-100' :
                stat.color === 'red' ? 'bg-red-100' :
                stat.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                <span className={
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'red' ? 'text-red-600' :
                  stat.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                }>{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Monitoring */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">نظارت زنده دوربین ها</h2>
              <p className="text-gray-600 text-sm mt-1">
                {toPersianNumber(systemStatus?.cameras?.filter(c => c.status === 'active').length || 0)} دوربین فعال از {toPersianNumber(systemStatus?.cameras?.length || 0)} دوربین
              </p>
            </div>
            <div className="flex space-x-2 space-x-reverse">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                نمایش همه
              </button>
              <button
                onClick={fetchSystemStatus}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                🔄 بروزرسانی
              </button>
            </div>
          </div>

          {/* Camera Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemStatus?.cameras?.map((camera, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300"
              >
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative">
                  {/* Status Badge */}
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${
                    camera.status === 'active'
                      ? 'bg-green-500 text-white'
                      : camera.status === 'warning'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}>
                    {camera.status === 'active' ? 'فعال' : 'هشدار'}
                  </div>

                  {/* Camera Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <h3 className="text-white font-medium text-sm">{camera.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-gray-300 text-xs">{camera.location}</p>
                      <div className="text-right">
                        <div className={`text-xs font-medium ${
                          parseFloat(camera.efficiency) > 90 ? 'text-green-400' :
                          parseFloat(camera.efficiency) > 70 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {toPersianNumber(camera.efficiency)}% بازدهی
                        </div>
                        <div className="text-gray-400 text-xs">
                          {toPersianNumber(camera.belt_speed)} m/s
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Indicator */}
                  <div className="absolute top-3 right-3 flex items-center space-x-1 space-x-reverse">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-white text-xs">LIVE</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Summary */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-700">
                {toPersianNumber(systemStatus?.cameras?.filter(c => c.status === 'active').length || 0)}
              </div>
              <div className="text-green-600 text-sm">فعال</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-700">
                {toPersianNumber(systemStatus?.cameras?.filter(c => c.status === 'warning').length || 0)}
              </div>
              <div className="text-yellow-600 text-sm">نیاز به توجه</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-700">
                {toPersianNumber((systemStatus?.total_throughput || 0).toString())}
              </div>
              <div className="text-blue-600 text-sm">تعداد امروز</div>
            </div>
          </div>
        </div>

        {/* Alerts Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">هشدارهای اخیر</h2>
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {toPersianNumber(systemStatus?.total_alerts || 0)} جدید
            </span>
          </div>

          <div className="space-y-4">
            {systemStatus?.total_alerts > 0 ? (
              systemStatus.cameras
                ?.filter(camera => camera.status === 'warning')
                .map((camera, index) => (
                  <div
                    key={index}
                    className="border-r-4 p-4 rounded-lg border-yellow-500 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start space-x-3 space-x-reverse">
                      <span className="text-yellow-600 text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          هشدار در {camera.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          بازدهی: {toPersianNumber(camera.efficiency)}% • سرعت: {toPersianNumber(camera.belt_speed)} m/s
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {toPersianNumber(camera.object_count)} شیء شناسایی شده
                        </p>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-gray-600 font-medium">هیچ هشداری وجود ندارد</p>
                <p className="text-gray-500 text-sm mt-1">همه سیستم ها به خوبی کار می کنند</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">عملیات سریع</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                گزارش روزانه
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                تنظیمات سیستم
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarsiDashboard;