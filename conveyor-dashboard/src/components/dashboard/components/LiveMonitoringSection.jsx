import React from 'react';
import { toPersianNumber } from '../utils/persianUtils';

const LiveMonitoringSection = ({ systemStatus, onRefresh }) => {
  return (
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
            onClick={onRefresh}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            🔄 بروزرسانی
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {systemStatus?.cameras?.map((camera) => (
          <div
            key={camera.id}
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
  );
};

export default LiveMonitoringSection;