// Updated LiveMonitoringSection.jsx
import React, { useRef, useEffect } from 'react';

export default function LiveMonitoringSection() {
  const videoRefs = useRef([]);

  const cameraFeeds = [
    {
      id: 'main',
      name: 'دوربین اصلی - نوار انتقال',
      icon: '📹',
      url: "http://localhost:8000/media/test3.mp4",
      color: 'border-blue-400'
    },
    {
      id: 'thermal',
      name: 'دوربین حرارتی',
      icon: '🔥',
      url: "http://localhost:8000/media/1.mp4",
      color: 'border-red-400'
    },
    {
      id: 'side',
      name: 'دوربین نمای کناری',
      icon: '📐',
      url: "http://localhost:8000/media/2.mp4",
      color: 'border-green-400'
    },
    {
      id: 'alignment',
      name: 'دوربین انحراف نوار',
      icon: '⚡',
      url: "http://localhost:8000/media/3.mp4",
      color: 'border-yellow-400'
    }
  ];

  useEffect(() => {
    const playAllVideos = () => {
      videoRefs.current.forEach(ref => {
        if (ref) {
          ref.play().catch(console.error);
        }
      });
    };

    const timer = setTimeout(playAllVideos, 1500);
    return () => clearTimeout(timer);
  }, []);

  const playAllVideos = () => {
    videoRefs.current.forEach(ref => {
      if (ref) ref.play().catch(console.error);
    });
  };

  const pauseAllVideos = () => {
    videoRefs.current.forEach(ref => {
      if (ref) ref.pause();
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 space-x-reverse mb-4 sm:mb-0">
          <div className="p-2 bg-green-100 rounded-lg">
            <span className="text-2xl">📺</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">مانیتورینگ زنده دوربین‌ها</h2>
            <p className="text-gray-600 text-sm">نمایش زنده تمام دوربین‌های سیستم</p>
          </div>
        </div>

        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={playAllVideos}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 space-x-reverse"
          >
            <span>▶️</span>
            <span>پخش همه</span>
          </button>
          <button
            onClick={pauseAllVideos}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 space-x-reverse"
          >
            <span>⏸️</span>
            <span>توقف همه</span>
          </button>
        </div>
      </div>

      {/* 4 Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {cameraFeeds.map((camera, index) => (
          <div key={camera.id} className={`bg-gray-900 rounded-lg overflow-hidden border-2 ${camera.color}`}>
            <div className="flex justify-between items-center p-3 bg-gray-800 text-white">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-lg">{camera.icon}</span>
                <span className="font-medium">{camera.name}</span>
              </div>
              <div className="flex space-x-1 space-x-reverse">
                <button
                  onClick={() => videoRefs.current[index]?.play()}
                  className="p-1 bg-green-600 rounded hover:bg-green-700 transition-colors"
                  title="پخش"
                >
                  ▶️
                </button>
                <button
                  onClick={() => videoRefs.current[index]?.pause()}
                  className="p-1 bg-red-600 rounded hover:bg-red-700 transition-colors"
                  title="توقف"
                >
                  ⏸️
                </button>
              </div>
            </div>

            <div className="aspect-video bg-black relative">
              <video
                ref={el => videoRefs.current[index] = el}
                src={camera.url}
                muted
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const errorDiv = e.target.parentElement.querySelector('.video-error');
                  if (errorDiv) errorDiv.style.display = 'flex';
                }}
              />
              <div className="video-error hidden absolute inset-0 flex-col items-center justify-center text-gray-400 bg-black">
                <div className="text-4xl mb-2">❌</div>
                <div className="text-center">
                  <div>{camera.name} در دسترس نیست</div>
                  <div className="text-sm mt-1">خطا در بارگذاری ویدیو</div>
                </div>
              </div>

              {/* Live Badge */}
              <div className="absolute top-2 left-2 flex items-center space-x-1 space-x-reverse bg-red-600 text-white px-2 py-1 rounded-full text-xs">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-2 space-x-reverse text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>تمام دوربین‌ها در حال پخش زنده - سیستم مانیتورینگ فعال</span>
        </div>
      </div>
    </div>
  );
}