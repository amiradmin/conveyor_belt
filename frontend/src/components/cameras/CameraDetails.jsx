// src/components/cameras/CameraDetails.jsx
import React from 'react';

const CameraDetails = ({ camera, onClose }) => {
  if (!camera) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">جزئیات دوربین</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="text-2xl">×</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-4">اطلاعات اصلی</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">نام دوربین</dt>
                  <dd className="text-gray-900">{camera.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">موقعیت</dt>
                  <dd className="text-gray-900">{camera.location}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">آدرس IP</dt>
                  <dd className="font-mono text-gray-900">{camera.ip_address}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-4">وضعیت سیستم</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">وضعیت</dt>
                  <dd>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      camera.status === 'active' ? 'bg-green-100 text-green-800' :
                      camera.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {camera.status === 'active' ? 'فعال' :
                       camera.status === 'inactive' ? 'غیرفعال' : 'در حال تعمیر'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">بازدهی</dt>
                  <dd className="text-gray-900">{camera.efficiency}%</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">آخرین فعالیت</dt>
                  <dd className="text-gray-900">
                    {new Date(camera.last_active).toLocaleString('fa-IR')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 space-x-reverse justify-end pt-6 border-t border-gray-200">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              تست اتصال
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              مشاهده پخش زنده
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraDetails;