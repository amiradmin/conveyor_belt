// src/components/map/BeltMap.jsx
import React from 'react';

const BeltMap = () => {
  const plantSections = [
    {
      name: 'منطقه بارگیری',
      belts: [
        { id: 'BLT-001', name: 'نوار اصلی', status: 'active', efficiency: 96 },
        { id: 'BLT-002', name: 'نوار انتقال A', status: 'active', efficiency: 92 },
        { id: 'BLT-003', name: 'نوار انتقال B', status: 'warning', efficiency: 78 },
      ]
    },
    {
      name: 'منطقه ذوب',
      belts: [
        { id: 'BLT-011', name: 'نوار تغذیه کوره A', status: 'active', efficiency: 94 },
        { id: 'BLT-012', name: 'نوار تغذیه کوره B', status: 'critical', efficiency: 65 },
      ]
    },
    {
      name: 'منطقه ریخته گری',
      belts: [
        { id: 'BLT-021', name: 'نوار انتقال مذاب', status: 'active', efficiency: 88 },
        { id: 'BLT-022', name: 'نوار خنک کننده', status: 'maintenance', efficiency: 0 },
      ]
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">نقشه نوارهای نقاله</h1>
        <p className="text-gray-600">نمای کلی از موقعیت و وضعیت نوارهای نقاله در کارخانه</p>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">فعال (۹۰-۱۰۰٪)</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-700">هشدار (۷۰-۸۹٪)</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-700">بحرانی (زیر ۷۰٪)</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-700">تعمیرات</span>
          </div>
        </div>
      </div>

      {/* Plant Map */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plantSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border-2 border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                {section.name}
              </h3>

              <div className="space-y-3">
                {section.belts.map((belt, beltIndex) => (
                  <div
                    key={belt.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(belt.status)}`}></div>
                      <div>
                        <div className="font-medium text-gray-900">{belt.name}</div>
                        <div className="text-sm text-gray-500">{belt.id}</div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className={`text-sm font-medium ${
                        belt.efficiency >= 90 ? 'text-green-600' :
                        belt.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {belt.efficiency}%
                      </div>
                      <div className="text-xs text-gray-500">بازدهی</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Overall Statistics */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">۱۸</div>
            <div className="text-green-600 text-sm">نوار فعال</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">۳</div>
            <div className="text-yellow-600 text-sm">نیاز به توجه</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-700">۱</div>
            <div className="text-red-600 text-sm">بحرانی</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">۲</div>
            <div className="text-blue-600 text-sm">در حال تعمیر</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeltMap;