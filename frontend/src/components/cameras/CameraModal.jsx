// src/components/cameras/CameraModal.jsx
import React, { useState, useEffect } from 'react';

const CameraModal = ({ camera, onClose, onSave, title }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    ip_address: '',
    status: 'active',
    description: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (camera) {
      setFormData({
        name: camera.name || '',
        location: camera.location || '',
        ip_address: camera.ip_address || '',
        status: camera.status || 'active',
        description: camera.description || ''
      });
    }
  }, [camera]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'نام دوربین الزامی است';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'موقعیت دوربین الزامی است';
    }

    if (!formData.ip_address.trim()) {
      newErrors.ip_address = 'آدرس IP الزامی است';
    } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.ip_address)) {
      newErrors.ip_address = 'آدرس IP معتبر نیست';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Camera Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نام دوربین *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="مثال: دوربین نوار اصلی انتقال"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              موقعیت نصب *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="مثال: منطقه بارگیری - بخش A"
            />
            {errors.location && (
              <p className="text-red-500 text-sm mt-1">{errors.location}</p>
            )}
          </div>

          {/* IP Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              آدرس IP *
            </label>
            <input
              type="text"
              value={formData.ip_address}
              onChange={(e) => handleChange('ip_address', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.ip_address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="مثال: 192.168.1.100"
            />
            {errors.ip_address && (
              <p className="text-red-500 text-sm mt-1">{errors.ip_address}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وضعیت
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="maintenance">در حال تعمیر</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              توضیحات
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="توضیحات اضافی درباره دوربین..."
            />
          </div>

          {/* Advanced Settings (Collapsible) */}
          <div className="border border-gray-200 rounded-lg">
            <details className="group">
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                <span className="font-medium text-gray-900">تنظیمات پیشرفته</span>
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-4 border-t border-gray-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رزولوشن
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option>1080p</option>
                      <option>720p</option>
                      <option>480p</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نرخ فریم
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option>30 FPS</option>
                      <option>25 FPS</option>
                      <option>15 FPS</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2 space-x-reverse">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700">فعال‌سازی تشخیص حرکت</span>
                  </label>
                </div>
              </div>
            </details>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 space-x-reverse pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {camera ? 'ذخیره تغییرات' : 'افزودن دوربین'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CameraModal;