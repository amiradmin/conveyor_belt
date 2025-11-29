import React from 'react';
import { toPersianNumber } from '../utils/persianUtils';

const AlertsSidebar = ({ systemStatus }) => {
  return (
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
            .map((camera) => (
              <div
                key={camera.id}
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
  );
};

export default AlertsSidebar;