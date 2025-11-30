// src/components/reports/ReportsPage.jsx
import React, { useState } from 'react';

const ReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState(null);

  const reports = [
    {
      id: 1,
      title: 'گزارش عملکرد روزانه',
      type: 'روزانه',
      period: '۱۴۰۲/۱۱/۲۰',
      size: '2.4 MB',
      status: 'آماده',
      generatedBy: 'سیستم خودکار'
    },
    {
      id: 2,
      title: 'تحلیل هفتگی هشدارها',
      type: 'هفتگی',
      period: '۱۴۰۲/۱۱/۱۳ - ۱۴۰۲/۱۱/۲۰',
      size: '5.7 MB',
      status: 'آماده',
      generatedBy: 'مدیر سیستم'
    },
    {
      id: 3,
      title: 'گزارش تعمیرات ماهانه',
      type: 'ماهانه',
      period: 'آبان ۱۴۰۲',
      size: '12.3 MB',
      status: 'در حال تولید',
      generatedBy: 'تیم فنی'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">گزارشات و آمار</h1>
            <p className="text-gray-600">مدیریت و دانلود گزارشات عملکرد سیستم</p>
          </div>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            📊 ایجاد گزارش جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-2 space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📋</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                    <div className="flex items-center space-x-4 space-x-reverse mt-1 text-sm text-gray-600">
                      <span>نوع: {report.type}</span>
                      <span>بازه زمانی: {report.period}</span>
                      <span>حجم: {report.size}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 space-x-reverse">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    report.status === 'آماده'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {report.status}
                  </span>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    📥 دانلود
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                تولید شده توسط: {report.generatedBy}
              </div>
            </div>
          ))}
        </div>

        {/* Report Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">پیش نمایش گزارش</h3>

          {selectedReport ? (
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-gray-700 font-medium">{selectedReport.title}</p>
                  <p className="text-sm text-gray-500 mt-1">پیش نمایش گزارش</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">نوع گزارش:</span>
                  <span className="font-medium">{selectedReport.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">بازه زمانی:</span>
                  <span className="font-medium">{selectedReport.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">حجم فایل:</span>
                  <span className="font-medium">{selectedReport.size}</span>
                </div>
              </div>

              <div className="flex space-x-3 space-x-reverse">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  📥 دانلود PDF
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  📊 خروجی Excel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>گزارشی برای پیش نمایش انتخاب نشده</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">۴۷</div>
          <div className="text-gray-600">گزارش تولید شده</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-green-600">۱۲.۵ GB</div>
          <div className="text-gray-600">حجم کل داده ها</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-purple-600">۹۸٪</div>
          <div className="text-gray-600">دقت گزارشات</div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;