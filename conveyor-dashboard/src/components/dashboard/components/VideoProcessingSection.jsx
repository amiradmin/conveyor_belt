// src/components/VideoProcessingSection.jsx
import React, { useRef, useEffect, useState } from 'react';
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
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTab, setSelectedTab] = useState('analysis');

  // Auto-play the video when it loads
  useEffect(() => {
    if (videoRef.current && videoData?.original_video_url) {
      const playVideo = async () => {
        try {
          videoRef.current.muted = true;
          await videoRef.current.play();
        } catch (error) {
          console.log("Autoplay blocked, waiting for user interaction");
        }
      };

      if (videoRef.current.readyState >= 3) {
        playVideo();
      } else {
        videoRef.current.addEventListener('loadeddata', playVideo);
        return () => {
          videoRef.current?.removeEventListener('loadeddata', playVideo);
        };
      }
    }
  }, [videoData?.original_video_url]);

  // Simulate live video playback of processed frames
  useEffect(() => {
    let frameInterval;

    if (isPlaying && processedFrames.length > 0) {
      frameInterval = setInterval(() => {
        setCurrentFrameIndex(prev => {
          const nextIndex = (prev + 1) % processedFrames.length;
          return nextIndex;
        });
      }, 150); // ~6.5 FPS for smooth playback
    }

    return () => {
      if (frameInterval) clearInterval(frameInterval);
    };
  }, [isPlaying, processedFrames.length]);

  // Start playing automatically when we have enough frames
  useEffect(() => {
    if (processedFrames.length >= 3 && !isPlaying) {
      setIsPlaying(true);
    }
  }, [processedFrames.length, isPlaying]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const getFrameColor = (frameType) => {
    switch (frameType) {
      case 'large': return 'from-red-500 to-red-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      case 'small': return 'from-green-500 to-green-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  const getFrameIntensity = (index) => {
    const distance = Math.abs(index - currentFrameIndex);
    if (distance === 0) return 'opacity-100 scale-105 border-2 border-white shadow-lg';
    if (distance === 1) return 'opacity-80 scale-102';
    if (distance === 2) return 'opacity-60';
    return 'opacity-40';
  };

  const getSeverityBadge = (frameType) => {
    switch (frameType) {
      case 'large':
        return { text: 'بحرانی', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'medium':
        return { text: 'هشدار', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'small':
        return { text: 'عادی', color: 'bg-green-100 text-green-800 border-green-200' };
      default:
        return { text: 'نامشخص', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const currentFrame = processedFrames[currentFrameIndex];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 space-x-reverse mb-4 lg:mb-0">
          <div className="p-2 bg-blue-100 rounded-lg">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">پردازش و تحلیل هوش مصنوعی</h2>
            <p className="text-gray-600 text-sm">تحلیل پیشرفته ویدیو با الگوریتم‌های هوش مصنوعی</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg ${
            wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {wsConnected ? 'اتصال برقرار' : 'اتصال قطع'}
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

          {/* Action Buttons */}
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={onTestConnection}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              تست اتصال
            </button>
            <button
              onClick={onProcessVideo}
              disabled={videoLoading}
              className={`px-6 py-2 rounded-lg text-white font-medium flex items-center space-x-2 space-x-reverse ${
                videoLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors`}
            >
              {videoLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>در حال پردازش...</span>
                </>
              ) : (
                <>
                  <span>🎬</span>
                  <span>شروع پردازش</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar - Only show during loading */}
      {videoLoading && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-center space-x-4 space-x-reverse mb-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div className="flex-1">
              <p className="font-medium text-blue-900">در حال پردازش ویدیو...</p>
              <p className="text-blue-700 text-sm">لطفا چند لحظه صبر کنید</p>
            </div>
            <div className="text-blue-700 font-bold">{toPersianNumber(videoProgress)}%</div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${videoProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-blue-700 mt-2">
            <span>اشیاء شناسایی شده: {toPersianNumber(objectCount)}</span>
            <span>سرعت نوار: {toPersianNumber(beltSpeed)} m/s</span>
            <span>فریم‌های پردازش شده: {toPersianNumber(processedFrames.length)}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        {videoData ? (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 space-x-reverse bg-gray-100 rounded-lg p-1">
              {[
                { id: 'analysis', name: 'تحلیل زنده', icon: '📊' },
                { id: 'results', name: 'نتایج پردازش', icon: '📈' },
                { id: 'details', name: 'جزئیات فنی', icon: '🔧' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-md flex-1 text-center transition-colors ${
                    selectedTab === tab.id
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              ))}
            </div>

            {/* Analysis Tab Content */}
            {selectedTab === 'analysis' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Video Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center space-x-2 space-x-reverse">
                      <span>🎥</span>
                      <span>ویدیو اصلی</span>
                    </h3>
                    <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>پخش خودکار</span>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                    {videoData.original_video_url ? (
                      <>
                        <video
                          ref={videoRef}
                          src={videoData.original_video_url}
                          controls
                          muted
                          playsInline
                          className="w-full aspect-video"
                          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23374151'/%3E%3Cpath d='M160 90l60 45-60 45z' fill='%236B7280'/%3E%3C/svg%3E"
                        />
                        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between text-white text-sm">
                          <span>ویدیو در حال پخش</span>
                          <button
                            onClick={() => videoRef.current?.play()}
                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors flex items-center space-x-2 space-x-reverse"
                          >
                            <span>🔄</span>
                            <span>پخش مجدد</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-gray-800">
                        <div className="text-center text-gray-400">
                          <div className="text-4xl mb-2">📹</div>
                          <p>آدرس ویدیو در دسترس نیست</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real-time Metrics */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-3 text-center flex items-center justify-center space-x-2 space-x-reverse">
                      <span>📡</span>
                      <span>داده‌های تحلیل زنده</span>
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-lg shadow-sm border text-center">
                        <div className="text-blue-700 font-bold text-lg">
                          {toPersianNumber(videoData.total_frames || 0)}
                        </div>
                        <div className="text-blue-600 text-xs">تعداد فریم‌ها</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm border text-center">
                        <div className="text-green-700 font-bold text-lg">
                          {toPersianNumber(objectCount)}
                        </div>
                        <div className="text-green-600 text-xs">اشیاء شناسایی شده</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm border text-center">
                        <div className="text-purple-700 font-bold text-lg">
                          {toPersianNumber(typeof beltSpeed === 'number' ? beltSpeed.toFixed(1) : beltSpeed)}
                        </div>
                        <div className="text-purple-600 text-xs">سرعت (m/s)</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm border text-center">
                        <div className="text-orange-700 font-bold text-lg">
                          {toPersianNumber(processedFrames.length)}
                        </div>
                        <div className="text-orange-600 text-xs">فریم‌های پردازش شده</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Processed Results Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center space-x-2 space-x-reverse">
                      <span>🤖</span>
                      <span>نتایج هوش مصنوعی</span>
                    </h3>
                    {processedFrames.length > 0 && (
                      <button
                        onClick={togglePlayback}
                        className={`px-4 py-2 rounded-lg text-sm flex items-center space-x-2 space-x-reverse ${
                          isPlaying
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        } transition-colors`}
                      >
                        {isPlaying ? (
                          <>
                            <span>⏸️</span>
                            <span>توقف پخش</span>
                          </>
                        ) : (
                          <>
                            <span>▶️</span>
                            <span>پخش نتایج</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {processedFrames.length > 0 ? (
                    <div className="space-y-4">
                      {/* Live Results Display */}
                      <div className="bg-gray-900 rounded-lg overflow-hidden border-2 border-green-400 relative">
                        <div className="aspect-video flex items-center justify-center">
                          {currentFrame ? (
                            <div className={`w-full h-full bg-gradient-to-br ${getFrameColor(currentFrame.type)} flex items-center justify-center transition-all duration-150`}>
                              <div className="text-white text-center p-4">
                                <div className="text-5xl mb-4">🤖</div>
                                <p className="text-xl font-bold">فریم {toPersianNumber(currentFrame.id || currentFrameIndex + 1)}</p>
                                <p className="text-lg mt-2">تحلیل هوش مصنوعی فعال</p>

                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                  <div className="bg-white/20 px-3 py-2 rounded backdrop-blur-sm">
                                    <div className="font-bold">{toPersianNumber(currentFrame.objects || objectCount)}</div>
                                    <div>شیء شناسایی شده</div>
                                  </div>
                                  <div className="bg-white/20 px-3 py-2 rounded backdrop-blur-sm">
                                    <div className="font-bold">{toPersianNumber(currentFrame.speed || beltSpeed)}</div>
                                    <div>متر بر ثانیه</div>
                                  </div>
                                </div>

                                {/* Severity Badge */}
                                {currentFrame.type && (
                                  <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs border ${getSeverityBadge(currentFrame.type).color}`}>
                                    {getSeverityBadge(currentFrame.type).text}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-white text-center">
                              <div className="text-4xl mb-2">⏳</div>
                              <p>در حال بارگذاری فریم‌ها...</p>
                            </div>
                          )}
                        </div>

                        {/* Live Indicator */}
                        <div className="absolute top-3 right-3">
                          <div className="flex items-center space-x-1 space-x-reverse bg-red-600 text-white px-2 py-1 rounded-full text-xs">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span>ANALYSIS LIVE</span>
                          </div>
                        </div>

                        {/* Frame Info */}
                        <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1 rounded text-sm">
                          فریم {toPersianNumber(currentFrameIndex + 1)} از {toPersianNumber(processedFrames.length)}
                        </div>

                        {/* Status */}
                        <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded text-sm">
                          {isPlaying ? '▶️ در حال پخش' : '⏸️ متوقف شده'}
                        </div>
                      </div>

                      {/* Frame Timeline */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">
                          خط زمانی تحلیل ({toPersianNumber(processedFrames.length)} فریم)
                        </h4>
                        <div className="flex space-x-2 space-x-reverse overflow-x-auto pb-2">
                          {processedFrames.slice(-10).map((frame, index) => {
                            const globalIndex = processedFrames.length - 10 + index;
                            return (
                              <div
                                key={frame.id || globalIndex}
                                className={`flex-shrink-0 w-20 h-16 rounded-lg border transition-all duration-200 cursor-pointer ${
                                  globalIndex === currentFrameIndex
                                    ? 'border-green-500 scale-110 shadow-lg'
                                    : 'border-gray-300'
                                } bg-gradient-to-br ${getFrameColor(frame.type)} ${getFrameIntensity(globalIndex)}`}
                                onClick={() => {
                                  setCurrentFrameIndex(globalIndex);
                                  setIsPlaying(false);
                                }}
                              >
                                <div className="w-full h-full flex flex-col items-center justify-center text-white text-xs p-1">
                                  <div className="font-bold">{toPersianNumber(frame.id || globalIndex + 1)}</div>
                                  <div className="text-[10px] mt-1 text-center">
                                    {frame.objects || 1} شیء
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Timeline Controls */}
                        <div className="flex justify-center space-x-3 space-x-reverse mt-3">
                          <button
                            onClick={() => {
                              setCurrentFrameIndex(prev => Math.max(0, prev - 1));
                              setIsPlaying(false);
                            }}
                            disabled={currentFrameIndex === 0}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors flex items-center space-x-2 space-x-reverse"
                          >
                            <span>⏪</span>
                            <span>قبلی</span>
                          </button>
                          <button
                            onClick={() => {
                              setCurrentFrameIndex(prev => Math.min(processedFrames.length - 1, prev + 1));
                              setIsPlaying(false);
                            }}
                            disabled={currentFrameIndex === processedFrames.length - 1}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors flex items-center space-x-2 space-x-reverse"
                          >
                            <span>بعدی</span>
                            <span>⏩</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                      <div className="text-5xl mb-4">🤖</div>
                      <p className="text-gray-600 text-lg">هنوز فریمی پردازش نشده</p>
                      <p className="text-gray-500 text-sm mt-2">
                        برای مشاهده نتایج تحلیل هوش مصنوعی، دکمه "شروع پردازش" را کلیک کنید
                      </p>
                      {videoLoading && (
                        <div className="mt-4">
                          <div className="inline-flex items-center space-x-2 space-x-reverse bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                            <span>در حال تولید نتایج تحلیل...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results Tab Content */}
            {selectedTab === 'results' && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">گزارش کامل نتایج</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <h4 className="font-semibold text-gray-800 mb-3">آمار کلی پردازش</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">کل فریم‌های پردازش شده:</span>
                        <span className="font-bold">{toPersianNumber(processedFrames.length)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">میانگین اشیاء در فریم:</span>
                        <span className="font-bold">{toPersianNumber(objectCount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">سرعت متوسط نوار:</span>
                        <span className="font-bold">{toPersianNumber(beltSpeed)} m/s</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <h4 className="font-semibold text-gray-800 mb-3">وضعیت سیستم</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">اتصال زنده:</span>
                        <span className={`px-2 py-1 rounded text-xs ${wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {wsConnected ? 'برقرار' : 'قطع'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">پیشرفت پردازش:</span>
                        <span className="font-bold">{toPersianNumber(videoProgress)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
              <button
                onClick={() => {
                  if (processedFrames.length > 0) {
                    console.log("Showing full report for", processedFrames.length, "frames");
                    // Implement full report logic
                  }
                }}
                disabled={processedFrames.length === 0}
                className={`flex-1 px-6 py-3 rounded-lg flex items-center justify-center space-x-3 space-x-reverse transition-colors ${
                  processedFrames.length > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className="text-xl">📊</span>
                <span className="font-medium">نمایش گزارش کامل تحلیل</span>
              </button>
              <button
                onClick={() => {
                  if (processedFrames.length > 0) {
                    console.log("Downloading results for", processedFrames.length, "frames");
                    // Implement download logic
                  }
                }}
                disabled={processedFrames.length === 0}
                className={`px-6 py-3 border rounded-lg flex items-center space-x-3 space-x-reverse transition-colors ${
                  processedFrames.length > 0
                    ? 'border-gray-300 hover:bg-gray-50 text-gray-700'
                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="text-xl">📥</span>
                <span className="font-medium">دانلود نتایج</span>
              </button>
            </div>
          </div>
        ) : (
          /* Initial State - No Video Data */
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">آماده برای پردازش ویدیو</h3>
            <p className="text-gray-600 mb-6">برای شروع تحلیل هوش مصنوعی، دکمه شروع پردازش را کلیک کنید</p>
            <button
              onClick={onProcessVideo}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              شروع پردازش ویدیو
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoProcessingSection;