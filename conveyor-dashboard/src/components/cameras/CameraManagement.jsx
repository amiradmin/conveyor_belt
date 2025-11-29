// src/components/cameras/CameraManagement.jsx
import React, { useState, useEffect } from 'react';

const CameraManagement = () => {
  const [cameras, setCameras] = useState([]);
  const [editingCamera, setEditingCamera] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sample initial data
  const sampleCameras = [
    {
      id: 1,
      name: 'دوربین نوار اصلی',
      location: 'منطقه بارگیری - بخش A',
      ip_address: '192.168.1.100',
      status: 'active',
      efficiency: 96.5,
      last_active: '2024-01-20T10:30:00Z'
    },
    {
      id: 2,
      name: 'دوربین نوار انتقال',
      location: 'منطقه پردازش - بخش B',
      ip_address: '192.168.1.101',
      status: 'active',
      efficiency: 88.2,
      last_active: '2024-01-20T10:28:00Z'
    },
    {
      id: 3,
      name: 'دوربین نوار خروجی',
      location: 'منطقه ذخیره سازی - بخش C',
      ip_address: '192.168.1.102',
      status: 'inactive',
      efficiency: 0,
      last_active: '2024-01-19T15:45:00Z'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCameras(sampleCameras);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAddCamera = (cameraData) => {
    const newCamera = {
      id: Math.max(...cameras.map(c => c.id)) + 1,
      ...cameraData,
      last_active: new Date().toISOString(),
      efficiency: 0
    };
    setCameras([...cameras, newCamera]);
    setShowAddModal(false);
  };

  const handleEditCamera = (cameraData) => {
    setCameras(cameras.map(camera =>
      camera.id === editingCamera.id ? { ...camera, ...cameraData } : camera
    ));
    setEditingCamera(null);
  };

  const handleDeleteCamera = (cameraId) => {
    if (window.confirm('آیا از حذف این دوربین اطمینان دارید؟')) {
      setCameras(cameras.filter(camera => camera.id !== cameraId));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'فعال';
      case 'inactive': return 'غیرفعال';
      case 'maintenance': return 'در حال تعمیر';
      default: return 'نامشخص';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری اطلاعات دوربین‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">مدیریت دوربین‌ها</h1>
            <p className="text-gray-600">مدیریت و پیکربندی دوربین‌های نظارتی سیستم</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + افزودن دوربین جدید
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">{cameras.length}</div>
          <div className="text-gray-600">تعداد دوربین‌ها</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">
            {cameras.filter(c => c.status === 'active').length}
          </div>
          <div className="text-gray-600">دوربین‌های فعال</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-red-600 mb-2">
            {cameras.filter(c => c.status === 'inactive').length}
          </div>
          <div className="text-gray-600">دوربین‌های غیرفعال</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-yellow-600 mb-2">
            {cameras.filter(c => c.status === 'maintenance').length}
          </div>
          <div className="text-gray-600">در حال تعمیر</div>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">نام دوربین</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">موقعیت</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">آدرس IP</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">وضعیت</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">بازدهی</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cameras.map((camera) => (
                <tr key={camera.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-lg">📷</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{camera.name}</div>
                        <div className="text-sm text-gray-500">ID: {camera.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{camera.location}</td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{camera.ip_address}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(camera.status)}`}>
                      {getStatusText(camera.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            camera.efficiency > 80 ? 'bg-green-500' :
                            camera.efficiency > 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${camera.efficiency}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{camera.efficiency}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => setEditingCamera(camera)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        ویرایش
                      </button>
                      <button
                        onClick={() => handleDeleteCamera(camera.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        حذف
                      </button>
                      <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                        جزئیات
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {cameras.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📷</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">هیچ دوربینی ثبت نشده است</h3>
            <p className="text-gray-600">برای شروع، اولین دوربین را اضافه کنید</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modals */}
      {showAddModal && (
        <CameraModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddCamera}
          title="افزودن دوربین جدید"
        />
      )}

      {editingCamera && (
        <CameraModal
          camera={editingCamera}
          onClose={() => setEditingCamera(null)}
          onSave={handleEditCamera}
          title="ویرایش دوربین"
        />
      )}
    </div>
  );
};

export default CameraManagement;