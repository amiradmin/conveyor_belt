import React, { useRef, useEffect } from 'react';
import { toPersianNumber } from '../utils/persianUtils';

const LiveMonitoringSection = ({ systemStatus, onRefresh }) => {
  // Refs for video elements
  const videoRefs = useRef([]);

  // Define your camera videos with metadata
  const cameraVideos = [
    {
      id: 1,
      name: 'دوربین اصلی نوار نقاله',
      location: 'خط تولید A',
      status: 'active',
      efficiency: '95',
      belt_speed: '1.2',
      videoUrl: 'http://localhost:8000/media/test.mp4'
    },
    {
      id: 2,
      name: 'دوربین کنترل کیفیت',
      location: 'بخش بازرسی',
      status: 'active',
      efficiency: '88',
      belt_speed: '1.1',
      videoUrl: 'http://localhost:8000/media/1.mp4'
    },
    {
      id: 3,
      name: 'دوربین بسته بندی',
      location: 'خط بسته بندی',
      status: 'warning',
      efficiency: '75',
      belt_speed: '0.9',
      videoUrl: 'http://localhost:8000/media/2.mp4'
    },
    {
      id: 4,
      name: 'دوربین انبار',
      location: 'انبار محصولات',
      status: 'active',
      efficiency: '92',
      belt_speed: '1.0',
      videoUrl: 'http://localhost:8000/media/3.mp4'
    }
  ];

  // Auto-play all videos when component loads
  useEffect(() => {
    const playAllVideos = async () => {
      for (let i = 0; i < videoRefs.current.length; i++) {
        const video = videoRefs.current[i];
        if (video) {
          try {
            video.muted = true; // Mute for autoplay
            video.loop = true; // Enable looping
            await video.play();
            console.log(`Video ${i + 1} started playing`);
          } catch (error) {
            console.warn(`Could not autoplay video ${i + 1}:`, error);
            // Retry with user interaction
            video.addEventListener('click', () => {
              video.play().catch(e => console.warn('Play failed:', e));
            }, { once: true });
          }
        }
      }
    };

    // Wait a bit for videos to load then play
    const timer = setTimeout(() => {
      playAllVideos();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Handle video loaded event
  const handleVideoLoad = (index) => {
    const video = videoRefs.current[index];
    if (video) {
      video.muted = true;
      video.loop = true;
      video.play().catch(error => {
        console.warn(`Auto-play prevented for video ${index + 1}:`, error);
      });
    }
  };

  // Use provided systemStatus or fall back to our cameraVideos
  const cameras = systemStatus?.cameras || cameraVideos;

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">نظارت زنده دوربین ها</h2>
          <p className="text-gray-600 text-sm mt-1">
            {toPersianNumber(cameras.filter(c => c.status === 'active').length)} دوربین فعال از {toPersianNumber(cameras.length)} دوربین
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

      {/* Camera Grid - Always show 4 videos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map((camera, index) => (
          <div
            key={camera.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300"
          >
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative">
              {/* Video Player */}
              <video
                ref={el => videoRefs.current[index] = el}
                className="w-full h-full object-cover"
                muted
                autoPlay
                loop
                playsInline
                onLoadedData={() => handleVideoLoad(index)}
                onError={(e) => console.error(`Error loading video ${index + 1}:`, e)}
                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23374151'/%3E%3Cpath d='M160 90l60 45-60 45z' fill='%236B7280'/%3E%3C/svg%3E"
              >
                <source src={camera.videoUrl} type="video/mp4" />
                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
              </video>

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

              {/* Auto-play Indicator */}
              <div className="absolute top-3 right-16 flex items-center space-x-1 space-x-reverse">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-white text-xs">AUTO</span>
              </div>

              {/* Video Controls Overlay */}
              <div className="absolute bottom-12 right-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="flex space-x-1 space-x-reverse">
                  <button
                    className="bg-black/70 text-white p-2 rounded text-xs hover:bg-black/90 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const video = videoRefs.current[index];
                      if (video) {
                        video.muted = !video.muted;
                      }
                    }}
                    title={videoRefs.current[index]?.muted ? "صدا دار" : "بی صدا"}
                  >
                    {videoRefs.current[index]?.muted ? "🔇" : "🔊"}
                  </button>
                  <button
                    className="bg-black/70 text-white p-2 rounded text-xs hover:bg-black/90 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const video = videoRefs.current[index];
                      if (video) {
                        if (video.paused) {
                          video.play();
                        } else {
                          video.pause();
                        }
                      }
                    }}
                    title={videoRefs.current[index]?.paused ? "پخش" : "توقف"}
                  >
                    {videoRefs.current[index]?.paused ? "▶️" : "⏸️"}
                  </button>
                </div>
              </div>

              {/* Loading Indicator */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="text-white text-center">
                  <div className="text-sm mb-1">کلیک برای کنترل</div>
                  <div className="text-xs text-gray-300">پخش خودکار فعال</div>
                </div>
              </div>
            </div>

            {/* Additional Camera Stats */}
            <div className="p-3 bg-gray-50">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>وضعیت: {camera.status === 'active' ? '✅ عادی' : '⚠️ نیاز به بررسی'}</span>
                <span>پخش: <span className="text-green-600">● خودکار</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Auto-play Status */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-blue-700 text-sm">همه دوربین‌ها به صورت خودکار در حال پخش هستند</span>
          </div>
          <button
            onClick={() => {
              videoRefs.current.forEach(video => {
                if (video) {
                  video.muted = !video.muted;
                }
              });
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {videoRefs.current[0]?.muted ? "فعال کردن صدا" : "قطع صدا"}
          </button>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-xl font-bold text-green-700">
            {toPersianNumber(cameras.filter(c => c.status === 'active').length)}
          </div>
          <div className="text-green-600 text-sm">فعال</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-xl font-bold text-yellow-700">
            {toPersianNumber(cameras.filter(c => c.status === 'warning').length)}
          </div>
          <div className="text-yellow-600 text-sm">نیاز به توجه</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-xl font-bold text-blue-700">
            {toPersianNumber((systemStatus?.total_throughput || cameras.length * 150).toString())}
          </div>
          <div className="text-blue-600 text-sm">تعداد امروز</div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">سیستم در حال اجرا - پخش خودکار فعال</span>
          </div>
          <div className="text-gray-500">
            آخرین بروزرسانی: {toPersianNumber(new Date().toLocaleTimeString('fa-IR'))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoringSection;