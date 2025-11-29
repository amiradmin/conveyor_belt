import React, { useState, useEffect } from 'react';
import { toPersianNumber, getHealthColor, getHealthText } from '../utils/persianUtils';
import { formatTime, formatDate } from '../utils/dateUtils';

const HeaderSection = ({ systemStatus, wsConnected, error, onTestConnection }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-red-500 text-xl">⚠️</div>
              <div>
                <p className="text-red-800 font-medium">{error}</p>
                <p className="text-red-600 text-sm mt-1">
                  آدرس سرور: http://localhost:8000
                </p>
              </div>
            </div>
            <button
              onClick={onTestConnection}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              آزمایش اتصال
            </button>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 rounded-2xl p-8 text-white relative overflow-hidden">
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
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-blue-100 text-sm">
                اتصال زنده: {wsConnected ? 'برقرار' : 'قطع'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderSection;