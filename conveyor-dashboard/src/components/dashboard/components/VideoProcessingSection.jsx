import React from 'react';
import { toPersianNumber } from '../utils/persianUtils';

const VideoProcessingSection = ({
  videoData,
  videoLoading,
  videoProgress,
  processedFrames,
  objectCount,
  beltSpeed,
  error,
  onProcessVideo,
  onTestConnection
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">پردازش ویدیو و تحلیل نوار نقاله</h2>
          <p className="text-gray-600 text-sm mt-1">
            تحلیل هوش مصنوعی بر روی ویدیوهای ضبط شده از نوار نقاله
          </p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <button
            onClick={onTestConnection}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            تست اتصال
          </button>
          <button
            onClick={onProcessVideo}
            disabled={videoLoading}
            className={`px-6 py-2 rounded-lg text-white font-medium ${
              videoLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {videoLoading ? 'در حال پردازش...' : 'شروع پردازش ویدیو'}
          </button>
        </div>
      </div>

      {videoLoading && (
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-4 space-x-reverse mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>
              <p className="font-medium text-blue-900">در حال پردازش ویدیو...</p>
              <p className="text-blue-700 text-sm">لطفا چند لحظه صبر کنید</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${videoProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-blue-700 mt-2">
            <span>پیشرفت: {toPersianNumber(videoProgress)}%</span>
            <span>اشیاء شناسایی شده: {toPersianNumber(objectCount)}</span>
            <span>سرعت نوار: {toPersianNumber(beltSpeed)} m/s</span>
          </div>
        </div>
      )}

      {videoData && !videoLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Video */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900">ویدیو اصلی</h3>
            {videoData.original_video_url ? (
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <video
                  src={videoData.original_video_url}
                  controls
                  className="w-full"
                  poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23374151'/%3E%3Cpath d='M160 90l60 45-60 45z' fill='%236B7280'/%3E%3C/svg%3E"
                />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <div className="text-4xl mb-2">📹</div>
                <p className="text-gray-600">آدرس ویدیو در دسترس نیست</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-blue-700 font-bold text-lg">
                  {toPersianNumber(videoData.total_frames || 0)}
                </div>
                <div className="text-blue-600 text-sm">تعداد فریم ها</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-green-700 font-bold text-lg">
                  {toPersianNumber(objectCount)}
                </div>
                <div className="text-green-600 text-sm">اشیاء شناسایی شده</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-purple-700 font-bold text-lg">
                  {toPersianNumber(beltSpeed)}
                </div>
                <div className="text-purple-600 text-sm">سرعت (m/s)</div>
              </div>
            </div>
          </div>

          {/* Processed Results */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900">نتایج پردازش شده</h3>
            {processedFrames.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-4xl mb-2">🎯</div>
                      <p>فریم پردازش شده</p>
                      <p className="text-sm text-gray-300 mt-1">
                        {toPersianNumber(processedFrames.length)} فریم آماده
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {processedFrames.slice(0, 3).map((frame, index) => (
                    <div key={index} className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-600 text-sm">فریم {toPersianNumber(index + 1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600">در حال پردازش فریم ها...</p>
                <p className="text-gray-500 text-sm mt-1">نتایج به زودی نمایش داده می شود</p>
              </div>
            )}

            <div className="flex space-x-3 space-x-reverse">
              <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                📊 نمایش گزارش کامل
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                📥 دانلود نتایج
              </button>
            </div>
          </div>
        </div>
      )}

      {!videoData && !videoLoading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🎥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">هنوز ویدیویی پردازش نشده</h3>
          <p className="text-gray-600 mb-6">برای شروع تحلیل ویدیو بر روی دکمه "شروع پردازش ویدیو" کلیک کنید</p>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-sm text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-1">🔍</div>
              <p>شناسایی اشیاء</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <p>تحلیل سرعت</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">⚡</div>
              <p>پردازش واقعی</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoProcessingSection;