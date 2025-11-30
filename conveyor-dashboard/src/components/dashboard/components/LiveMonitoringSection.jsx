// src/components/LiveMonitoringSection.jsx
import React, { useRef, useEffect } from 'react';

export default function LiveMonitoringSection() {
  // Video refs for all 4 camera feeds
  const mainVideoRef = useRef(null);
  const thermalVideoRef = useRef(null);
  const sideVideoRef = useRef(null);
  const alignmentVideoRef = useRef(null);

  // Camera feed URLs - replace with your actual video URLs
  const cameraFeeds = {
    main: "http://localhost:8000/media/test3.mp4",
    thermal: "http://localhost:8000/media/1.mp4",
    side: "http://localhost:8000/media/2.mp4",
    alignment: "http://localhost:8000/media/3.mp4"
  };

  // Auto-play all videos when component mounts
  useEffect(() => {
    const playAllVideos = () => {
      const videos = [mainVideoRef, thermalVideoRef, sideVideoRef, alignmentVideoRef];

      videos.forEach(ref => {
        if (ref.current) {
          ref.current.play().catch(error => {
            console.log(`Auto-play prevented for ${ref.current.src}, waiting for user interaction`);
          });
        }
      });
    };

    // Small delay to ensure videos are loaded
    const timer = setTimeout(playAllVideos, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Play all videos function for manual trigger
  const playAllVideos = () => {
    const videos = [mainVideoRef, thermalVideoRef, sideVideoRef, alignmentVideoRef];

    videos.forEach(ref => {
      if (ref.current) {
        ref.current.play().catch(error => {
          console.log(`Play failed for ${ref.current.src}:`, error);
        });
      }
    });
  };

  // Pause all videos
  const pauseAllVideos = () => {
    const videos = [mainVideoRef, thermalVideoRef, sideVideoRef, alignmentVideoRef];

    videos.forEach(ref => {
      if (ref.current) {
        ref.current.pause();
      }
    });
  };

  return (
    <div className="lg:col-span-2 bg-panel-bg rounded-xl shadow-sm border border-panel-border p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">سیستم مانیتورینگ زنده</h2>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500 text-black text-sm font-semibold">
            <div className="w-2 h-2 rounded-full bg-green-700 mr-2"></div>
            آنلاین
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={playAllVideos}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2"
          >
            <span>▶️</span>
            پخش همه
          </button>
          <button
            onClick={pauseAllVideos}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition flex items-center gap-2"
          >
            <span>⏸️</span>
            توقف همه
          </button>
        </div>
      </div>

      {/* 4 Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Main Camera Feed */}
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
          <div className="p-3 bg-gray-800 text-white text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span>📹</span>
              دوربین اصلی - نوار انتقال
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => mainVideoRef.current?.play()}
                className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 transition"
              >
                پخش
              </button>
              <button
                onClick={() => mainVideoRef.current?.pause()}
                className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600 transition"
              >
                توقف
              </button>
            </div>
          </div>
          <div className="h-80 bg-black flex items-center justify-center">
            <video
              ref={mainVideoRef}
              src={cameraFeeds.main}
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
            <div className="video-error hidden absolute inset-0 items-center justify-center text-gray-400 text-center p-4">
              <div>
                <div className="text-2xl mb-2">📹</div>
                <div>دوربین اصلی در دسترس نیست</div>
                <div className="text-sm mt-2">آدرس: {cameraFeeds.main}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Thermal Camera Feed */}
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
          <div className="p-3 bg-gray-800 text-white text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span>🔥</span>
              دوربین حرارتی
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => thermalVideoRef.current?.play()}
                className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 transition"
              >
                پخش
              </button>
              <button
                onClick={() => thermalVideoRef.current?.pause()}
                className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600 transition"
              >
                توقف
              </button>
            </div>
          </div>
          <div className="h-80 bg-black flex items-center justify-center">
            <video
              ref={thermalVideoRef}
              src={cameraFeeds.thermal}
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
            <div className="video-error hidden absolute inset-0 items-center justify-center text-gray-400 text-center p-4">
              <div>
                <div className="text-2xl mb-2">🔥</div>
                <div>دوربین حرارتی در دسترس نیست</div>
                <div className="text-sm mt-2">آدرس: {cameraFeeds.thermal}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Side View Camera Feed */}
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
          <div className="p-3 bg-gray-800 text-white text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span>📐</span>
              دوربین نمای کناری
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => sideVideoRef.current?.play()}
                className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 transition"
              >
                پخش
              </button>
              <button
                onClick={() => sideVideoRef.current?.pause()}
                className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600 transition"
              >
                توقف
              </button>
            </div>
          </div>
          <div className="h-80 bg-black flex items-center justify-center">
            <video
              ref={sideVideoRef}
              src={cameraFeeds.side}
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
            <div className="video-error hidden absolute inset-0 items-center justify-center text-gray-400 text-center p-4">
              <div>
                <div className="text-2xl mb-2">📐</div>
                <div>دوربین کناری در دسترس نیست</div>
                <div className="text-sm mt-2">آدرس: {cameraFeeds.side}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alignment View Camera Feed */}
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
          <div className="p-3 bg-gray-800 text-white text-sm flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span>⚡</span>
              دوربین انحراف نوار
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => alignmentVideoRef.current?.play()}
                className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 transition"
              >
                پخش
              </button>
              <button
                onClick={() => alignmentVideoRef.current?.pause()}
                className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600 transition"
              >
                توقف
              </button>
            </div>
          </div>
          <div className="h-80 bg-black flex items-center justify-center">
            <video
              ref={alignmentVideoRef}
              src={cameraFeeds.alignment}
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
            <div className="video-error hidden absolute inset-0 items-center justify-center text-gray-400 text-center p-4">
              <div>
                <div className="text-2xl mb-2">⚡</div>
                <div>دوربین انحراف در دسترس نیست</div>
                <div className="text-sm mt-2">آدرس: {cameraFeeds.alignment}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-center p-4 bg-gray-800 rounded-lg border border-panel-border">
        <div className="text-sm text-gray-300">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            تمام دوربین‌ها در حال پخش زنده - سیستم مانیتورینگ فعال
          </span>
        </div>
      </div>
    </div>
  );
}