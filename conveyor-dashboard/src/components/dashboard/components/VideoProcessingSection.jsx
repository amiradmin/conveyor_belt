import React, { useRef, useEffect } from 'react';
import { toPersianNumber } from '../utils/persianUtils';

const VideoProcessingSection = ({
  videoData,
  videoLoading,
  videoProgress,
  processedFrames,
  objectCount,
  beltSpeed,
  error,
  wsConnected,
  onProcessVideo,
  onTestConnection,
  onReconnect
}) => {
  const videoRef = useRef(null);

  // Auto-play the video when it loads
  useEffect(() => {
    if (videoRef.current && videoData?.original_video_url) {
      const playVideo = async () => {
        try {
          // Set video to muted to allow autoplay (browser restrictions)
          videoRef.current.muted = true;
          await videoRef.current.play();

          // If autoplay with sound is allowed, unmute and try to play with sound
          videoRef.current.muted = false;
          await videoRef.current.play();
        } catch (error) {
          // If autoplay with sound fails, keep it muted and try again
          console.log("Autoplay with sound blocked, trying muted:", error);
          try {
            videoRef.current.muted = true;
            await videoRef.current.play();
          } catch (mutedError) {
            console.log("Muted autoplay also blocked:", mutedError);
          }
        }
      };

      // Wait for video to be ready
      if (videoRef.current.readyState >= 3) { // HAVE_FUTURE_DATA
        playVideo();
      } else {
        videoRef.current.addEventListener('loadeddata', playVideo);
        return () => {
          videoRef.current?.removeEventListener('loadeddata', playVideo);
        };
      }
    }
  }, [videoData?.original_video_url]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4 space-x-reverse">
          <div>
            <h2 className="text-xl font-bold text-gray-900">پردازش ویدیو و تحلیل نوار نقاله</h2>
            <p className="text-gray-600 text-sm mt-1">
              تحلیل هوش مصنوعی بر روی ویدیوهای ضبط شده از نوار نقاله
            </p>
          </div>

          {/* Connection Status Indicator with Reconnect Button */}
          <div className={`flex items-center space-x-2 space-x-reverse px-3 py-1 rounded-full text-sm ${
            wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>
              {wsConnected ? 'اتصال زنده' : 'قطع ارتباط'}
            </span>
            {!wsConnected && (
              <button
                onClick={onReconnect}
                className="text-xs bg-white px-2 py-1 rounded hover:bg-gray-50 transition-colors"
              >
                تلاش مجدد
              </button>
            )}
          </div>
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

      {/* Show video and interface immediately when videoData exists */}
      {videoData ? (
        <div className="space-y-6">
          {/* Progress bar only shown during loading */}
          {videoLoading && (
            <div className="bg-blue-50 rounded-lg p-6">
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

          {/* Video and Results Grid - Always visible when videoData exists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Video Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">ویدیو اصلی</h3>
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>پخش خودکار</span>
                </div>
              </div>
              {videoData.original_video_url ? (
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoData.original_video_url}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full"
                    poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23374151'/%3E%3Cpath d='M160 90l60 45-60 45z' fill='%236B7280'/%3E%3C/svg%3E"
                  />
                  <div className="bg-gray-800 px-4 py-2 flex items-center justify-between text-white text-sm">
                    <span>ویدیو در حال پخش</span>
                    <button
                      onClick={() => videoRef.current?.play()}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
                    >
                      🔄 پخش مجدد
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-2">📹</div>
                  <p className="text-gray-600">آدرس ویدیو در دسترس نیست</p>
                </div>
              )}

              {/* Real-time Data Display - Always visible when video data exists */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-800 mb-3 text-center">داده‌های تحلیل زنده</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg shadow-sm border">
                    <div className="text-blue-700 font-bold text-lg">
                      {toPersianNumber(videoData.total_frames || 0)}
                    </div>
                    <div className="text-blue-600 text-sm">تعداد فریم ها</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border">
                    <div className="text-green-700 font-bold text-lg">
                      {toPersianNumber(objectCount)}
                    </div>
                    <div className="text-green-600 text-sm">اشیاء شناسایی شده</div>
                    {videoLoading && (
                      <div className="text-xs text-green-500 mt-1">🔄 به روز رسانی</div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border">
                    <div className="text-purple-700 font-bold text-lg">
                      {toPersianNumber(typeof beltSpeed === 'number' ? beltSpeed.toFixed(2) : beltSpeed)}
                    </div>
                    <div className="text-purple-600 text-sm">سرعت (m/s)</div>
                    {videoLoading && (
                      <div className="text-xs text-purple-500 mt-1">🔄 به روز رسانی</div>
                    )}
                  </div>
                </div>

                {/* Additional real-time metrics */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center bg-yellow-50 p-2 rounded border">
                    <div className="text-yellow-700 font-medium">
                      {toPersianNumber(Math.floor(videoProgress))}%
                    </div>
                    <div className="text-yellow-600">پیشرفت پردازش</div>
                  </div>
                  <div className="text-center bg-red-50 p-2 rounded border">
                    <div className="text-red-700 font-medium">
                      {toPersianNumber(processedFrames.length)}
                    </div>
                    <div className="text-red-600">فریم‌های پردازش شده</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Processed Results Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">نتایج پردازش شده</h3>

              {processedFrames.length > 0 ? (
                <div className="space-y-4">
                  {/* Main processed frame display */}
                  <div className="bg-gray-100 rounded-lg p-4 border-2 border-green-200">
                    <div className="aspect-video bg-gradient-to-br from-blue-500 to-green-500 rounded-lg overflow-hidden flex items-center justify-center relative">
                      <div className="text-white text-center">
                        <div className="text-4xl mb-2">🎯</div>
                        <p className="text-lg font-semibold">فریم پردازش شده نمونه</p>
                        <p className="text-sm text-gray-200 mt-1">
                          شناسایی اشیاء و تحلیل سرعت
                        </p>
                        <div className="mt-3 flex justify-center space-x-4 space-x-reverse text-xs">
                          <div className="bg-white/20 px-2 py-1 rounded">
                            🟢 {toPersianNumber(objectCount)} شیء
                          </div>
                          <div className="bg-white/20 px-2 py-1 rounded">
                            ⚡ {toPersianNumber(beltSpeed)} m/s
                          </div>
                        </div>
                      </div>
                      {/* Live processing indicator */}
                      {videoLoading && (
                        <div className="absolute top-3 right-3">
                          <div className="flex items-center space-x-1 space-x-reverse bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span>در حال پردازش</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional frames grid */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      فریم‌های پردازش شده ({toPersianNumber(processedFrames.length)})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {processedFrames.map((frame, index) => (
                        <div
                          key={index}
                          className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 rounded-lg border-2 border-blue-300 flex flex-col items-center justify-center relative p-2"
                        >
                          <div className="text-blue-700 text-lg font-bold mb-1">
                            {toPersianNumber(index + 1)}
                          </div>
                          <div className="text-blue-600 text-xs text-center">
                            فریم {toPersianNumber(index + 1)}
                          </div>
                          {/* Processing indicator for frames during loading */}
                          {videoLoading && index === processedFrames.length - 1 && (
                            <div className="absolute top-1 right-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                          {/* Checkmark for completed frames */}
                          {!videoLoading && (
                            <div className="absolute top-1 right-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {videoLoading && (
                      <div className="mt-2 text-center">
                        <div className="inline-flex items-center space-x-1 space-x-reverse bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          <span>در حال پردازش فریم‌های بیشتر...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-gray-600">هنوز پردازشی انجام نشده</p>
                  <p className="text-gray-500 text-sm mt-1">
                    برای مشاهده نتایج پردازش، دکمه "شروع پردازش ویدیو" را کلیک کنید
                  </p>
                  {videoLoading && (
                    <div className="mt-4">
                      <div className="inline-flex items-center space-x-1 space-x-reverse bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span>در حال آماده‌سازی پردازش...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 space-x-reverse">
                <button
                  onClick={() => {
                    if (processedFrames.length > 0) {
                      // Show full report logic here
                      console.log("Showing full report for", processedFrames.length, "frames");
                    }
                  }}
                  disabled={processedFrames.length === 0}
                  className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 space-x-reverse transition-colors ${
                    processedFrames.length > 0
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <span>📊</span>
                  <span>نمایش گزارش کامل</span>
                </button>
                <button
                  onClick={() => {
                    if (processedFrames.length > 0) {
                      // Download results logic here
                      console.log("Downloading results for", processedFrames.length, "frames");
                    }
                  }}
                  disabled={processedFrames.length === 0}
                  className={`px-4 py-2 border rounded-lg flex items-center space-x-2 space-x-reverse transition-colors ${
                    processedFrames.length > 0
                      ? 'border-gray-300 hover:bg-gray-50'
                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>📥</span>
                  <span>دانلود نتایج</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Loading state while video data is being fetched */
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری ویدیو...</p>
        </div>
      )}
    </div>
  );
};

export default VideoProcessingSection;