// src/components/monitoring/LiveMonitoring.jsx
import React, { useState } from 'react';

const LiveMonitoring = () => {
  const [selectedCamera, setSelectedCamera] = useState(null);

  const cameras = [
    {
      id: 1,
      name: 'نوار اصلی انتقال مواد خام',
      location: 'بخش بارگیری - منطقه A',
      status: 'فعال',
      efficiency: '96%',
      issues: 0,
      lastMaintenance: '۱۴۰۲/۱۰/۱۵'
    },
    {
      id: 2,
      name: 'نوار تغذیه کوره',
      location: 'منطقه ذوب - بخش B',
      status: 'هشدار',
      efficiency: '78%',
      issues: 2,
      lastMaintenance: '۱۴۰۲/۱۰/۱۰'
    },
    {
      id: 3,
      name: 'نوار انتقال فولاد مذاب',
      location: 'منطقه ریخته گری - بخش C',
      status: 'فعال',
      efficiency: '94%',
      issues: 0,
      lastMaintenance: '۱۴۰۲/۱۰/۱۲'
    },
    {
      id: 4,
      name: 'نوار خروجی محصول',
      location: 'منطقه ذخیره سازی - بخش D',
      status: 'بحرانی',
      efficiency: '65%',
      issues: 3,
      lastMaintenance: '۱۴۰۲/۰۹/۲۸'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'فعال': return 'text-green-600 bg-green-100 border-green-200';
      case 'هشدار': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'بحرانی': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">نظارت زنده بر نوارهای نقاله</h1>
        <p className="text-gray-600">مدیریت و نظارت لحظه ای بر تمامی نوارهای نقاله کارخانه</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cameras List */}
        <div className="lg:col-span-1 space-y-4">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedCamera?.id === camera.id ? 'border-blue-500' : 'border-gray-200'
              }`}
              onClick={() => setSelectedCamera(camera)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{camera.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(camera.status)}`}>
                  {camera.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>موقعیت:</span>
                  <span className="text-gray-900">{camera.location}</span>
                </div>
                <div className="flex justify-between">
                  <span>بازدهی:</span>
                  <span className={`font-medium ${
                    parseFloat(camera.efficiency) > 90 ? 'text-green-600' :
                    parseFloat(camera.efficiency) > 75 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {camera.efficiency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>مشکلات:</span>
                  <span className={`font-medium ${
                    camera.issues === 0 ? 'text-green-600' :
                    camera.issues === 1 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {camera.issues} مشکل
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Camera View */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            {selectedCamera ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">{selectedCamera.name}</h2>
                  <div className="flex space-x-3 space-x-reverse">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      📊 گزارش تحلیل
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      ⚙️ تنظیمات دوربین
                    </button>
                  </div>
                </div>

                {/* Video Feed */}
                <div className="aspect-video bg-gray-900 rounded-xl relative overflow-hidden">
                  {/* Simulated video with analysis overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-gray-900/20 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-6xl mb-4">📹</div>
                      <p className="text-xl">پخش زنده دوربین</p>
                      <p className="text-gray-300 mt-2">{selectedCamera.location}</p>
                    </div>
                  </div>

                  {/* Analysis Overlays */}
                  <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>تشخیص فعال</span>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-lg">
                    <span>🚨 {selectedCamera.issues} مشکل شناسایی شده</span>
                  </div>
                </div>

                {/* Analysis Results */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">۹۸.۲٪</div>
                    <div className="text-green-600 text-sm">دقت تشخیص</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">۴۲</div>
                    <div className="text-blue-600 text-sm">فریم بر ثانیه</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-700">۱۲ms</div>
                    <div className="text-purple-600 text-sm">تأخیر پردازش</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">دوربینی انتخاب نشده</h3>
                <p className="text-gray-600">لطفاً یکی از دوربین های سمت چپ را برای مشاهده پخش زنده انتخاب کنید</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
