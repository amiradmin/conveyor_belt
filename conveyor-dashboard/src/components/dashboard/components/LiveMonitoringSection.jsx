// src/components/LiveMonitoringSection.jsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { toPersianNumber } from '../utils/persianUtils';
import { useVideoProcessing } from '../hooks/useVideoProcessing'; // adjust path if needed

/**
 * LiveMonitoringSection
 *
 * Props: none (uses useVideoProcessing hook)
 *
 * Notes:
 * - Make sure processedFrames items may have an `image_url` field for playback.
 * - Thermal / side / alignment feeds are example URLs (replace with your real streams).
 */

export default function LiveMonitoringSection() {
  // use your hook
  const {
    videoData,
    videoLoading,
    videoProgress,
    processedFrames,
    objectCount,
    beltSpeed,
    error,
    wsConnected,
    processVideo,
    testBackendConnection,
    reconnectWebSocket
  } = useVideoProcessing();

  // local state for processed frame playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [playFps, setPlayFps] = useState(10); // frames per second
  const playIntervalRef = useRef(null);

  // video refs for original & other <video> elements (if you want control)
  const originalVideoRef = useRef(null);
  const thermalRef = useRef(null);
  const sideRef = useRef(null);
  const alignRef = useRef(null);
  const processedImgRef = useRef(null);

  // Derived values
  const frameCount = processedFrames?.length || 0;

  // autobind play when frames accumulate
  useEffect(() => {
    if (frameCount >= 3 && !isPlaying) {
      setIsPlaying(true);
    }
  }, [frameCount, isPlaying]);

  // playback interval
  useEffect(() => {
    // clear previous
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    if (isPlaying && frameCount > 0) {
      const intervalMs = Math.max(50, Math.round(1000 / playFps));
      playIntervalRef.current = setInterval(() => {
        setCurrentFrameIndex(prev => (prev + 1) % frameCount);
      }, intervalMs);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, playFps, frameCount]);

  // Simple safety: clamp currentFrameIndex when frames length changes
  useEffect(() => {
    if (currentFrameIndex >= frameCount) {
      setCurrentFrameIndex(Math.max(0, frameCount - 1));
    }
  }, [frameCount, currentFrameIndex]);

  // Helpers for UI classes
  const statusBadge = useMemo(() => {
    if (videoLoading) return { text: 'در حال پردازش', bg: 'bg-yellow-500' };
    if (!wsConnected) return { text: 'قطع اتصال', bg: 'bg-red-600' };
    return { text: 'متصل', bg: 'bg-green-500' };
  }, [videoLoading, wsConnected]);

  // Controls (simulate operator actions)
  const togglePlay = () => setIsPlaying(p => !p);
  const nextFrame = () => setCurrentFrameIndex(i => (i + 1) % Math.max(1, frameCount));
  const prevFrame = () => setCurrentFrameIndex(i => (i - 1 + Math.max(1, frameCount)) % Math.max(1, frameCount));
  const increaseFps = () => setPlayFps(f => Math.min(60, f + 2));
  const decreaseFps = () => setPlayFps(f => Math.max(1, f - 2));
  const stopBeltSimulation = () => {
    // You can call processVideo to re-run or add a separate handler to stop actual belt in backend
    // Here we stop local playback and set a simulated alarm frame
    setIsPlaying(false);
    // Optionally call reconnect / processVideo etc:
    // processVideo(); // starts new processing if you want
  };

  // frame preview safe url (fallback to placeholder)
  const currentFrame = processedFrames && processedFrames[currentFrameIndex];
  const currentFrameUrl = currentFrame?.image_url || null;

  // small visual helpers
  const frameTypeGradient = (type) => {
    switch (type) {
      case 'large': return 'bg-gradient-to-br from-red-400 to-red-600';
      case 'medium': return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
      case 'small': return 'bg-gradient-to-br from-green-400 to-green-600';
      default: return 'bg-gradient-to-br from-blue-400 to-blue-600';
    }
  };

  return (
    <div className="lg:col-span-2 bg-panel-bg rounded-xl shadow-sm border border-panel-border p-6 flex flex-col gap-6">

      {/* Top status row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center px-3 py-1 rounded ${statusBadge.bg} text-black text-sm font-semibold`}>
            {statusBadge.text}
          </div>
          <div className="text-sm text-gray-300">پیشرفت: <span className="text-white font-medium ml-2">{toPersianNumber(videoProgress)}%</span></div>
          <div className="text-sm text-gray-300">اشیاء شناسایی‌شده: <span className="text-white font-medium ml-2">{toPersianNumber(objectCount)}</span></div>
          <div className="text-sm text-gray-300">سرعت نوار: <span className="text-white font-medium ml-2">{toPersianNumber(beltSpeed)} m/s</span></div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={testBackendConnection}
            className="px-3 py-1 bg-gray-800 border border-panel-border rounded text-sm hover:bg-gray-700 transition"
          >
            آزمایش سرور
          </button>

          <button
            onClick={reconnectWebSocket}
            className="px-3 py-1 bg-gray-800 border border-panel-border rounded text-sm hover:bg-gray-700 transition"
          >
            اتصال مجدد
          </button>

          <button
            onClick={processVideo}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
          >
            شروع پردازش
          </button>
        </div>
      </div>

      {/* If videoData missing show placeholder */}
      {!videoData ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border-2 border-dashed border-panel-border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">در حال بارگذاری ویدیو...</p>
        </div>
      ) : (
        <>
          {/* Main grid: Original video left, other 4 on right as 2x2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Original Video (big) */}
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-3">
              <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
                {videoData?.original_video_url ? (
                  <video
                    ref={originalVideoRef}
                    src={videoData.original_video_url}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-96 object-cover bg-black"
                    poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3Crect width='100%25' height='100%25' fill='%23000'/%3E%3Ctext x='50%25' y='50%25' fill='%239aa' font-size='28' text-anchor='middle'%3Eپخش ویدیو اصلی%3C/text%3E%3C/svg%3E"
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-black text-gray-400">
                    ویدیوی اصلی در دسترس نیست
                  </div>
                )}

                <div className="bg-gray-800 px-4 py-2 flex items-center justify-between text-white text-sm">
                  <div>ویدیو اصلی</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => originalVideoRef.current?.play()}
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 transition"
                    >
                      پخش
                    </button>
                    <button
                      onClick={() => originalVideoRef.current?.pause()}
                      className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition"
                    >
                      توقف
                    </button>
                    <div className="text-xs text-gray-300">حالت: {videoLoading ? 'در حال پردازش' : 'آماده'}</div>
                  </div>
                </div>
              </div>

              {/* Controls below original video */}
              <div className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { decreaseFps(); }}
                    className="px-2 py-1 bg-gray-800 rounded border border-panel-border hover:bg-gray-700"
                  >
                    − FPS
                  </button>
                  <div className="px-3 py-1 bg-gray-900 rounded text-sm">FPS: {toPersianNumber(playFps)}</div>
                  <button
                    onClick={() => { increaseFps(); }}
                    className="px-2 py-1 bg-gray-800 rounded border border-panel-border hover:bg-gray-700"
                  >
                    + FPS
                  </button>

                  <div className="ml-4 text-sm text-gray-300">فریم‌ها: {toPersianNumber(frameCount)}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prevFrame}
                    className="px-3 py-1 bg-gray-800 rounded border border-panel-border hover:bg-gray-700"
                  >
                    قبلی
                  </button>
                  <button
                    onClick={togglePlay}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {isPlaying ? 'توقف' : 'پخش'}
                  </button>
                  <button
                    onClick={nextFrame}
                    className="px-3 py-1 bg-gray-800 rounded border border-panel-border hover:bg-gray-700"
                  >
                    بعدی
                  </button>

                  <button
                    onClick={stopBeltSimulation}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 ml-3"
                  >
                    قطع نوار (شبیه‌سازی)
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: 4 video boxes (2x2) */}
            <div className="col-span-1 grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Processed frames playback */}
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
                  <div className="p-2 bg-gray-800 text-white text-sm flex justify-between">
                    <span>ویدیو پردازش شده</span>
                    <span>{toPersianNumber(frameCount)} فریم</span>
                  </div>
                  <div className="h-44 bg-black flex items-center justify-center relative">
                    {frameCount > 0 ? (
                      <img
                        ref={processedImgRef}
                        src={currentFrameUrl || ''}
                        alt={`frame-${currentFrameIndex}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400">در حال دریافت فریم‌های پردازش‌شده...</div>
                    )}

                    {/* small overlay */}
                    <div className="absolute top-2 left-2 text-xs text-gray-200 bg-black/30 px-2 py-1 rounded">
                      فریم: {toPersianNumber(currentFrameIndex + 1)}
                    </div>
                  </div>
                </div>

                {/* Thermal camera */}
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
                  <div className="p-2 bg-gray-800 text-white text-sm">دوربین حرارتی</div>
                  <div className="h-44 bg-black flex items-center justify-center">
                    <video
                      ref={thermalRef}
                      src="http://localhost:8000/media/thermal_test.mp4"
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Side view */}
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
                  <div className="p-2 bg-gray-800 text-white text-sm">دوربین نمای کناری</div>
                  <div className="h-44 bg-black flex items-center justify-center">
                    <video
                      ref={sideRef}
                      src="http://localhost:8000/media/side_view.mp4"
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Alignment view */}
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
                  <div className="p-2 bg-gray-800 text-white text-sm">دوربین انحراف نوار</div>
                  <div className="h-44 bg-black flex items-center justify-center">
                    <video
                      ref={alignRef}
                      src="http://localhost:8000/media/alignment_view.mp4"
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom area: progress bar and logs */}
          <div className="bg-gray-800 p-3 rounded border border-panel-border">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${videoProgress}%` }} />
            </div>

            <div className="flex items-center justify-between mt-2 text-sm text-gray-300">
              <div>پیشرفت: {toPersianNumber(videoProgress)}%</div>
              <div>اشیاء: {toPersianNumber(objectCount)}</div>
              <div>سرعت نوار: {toPersianNumber(beltSpeed)} m/s</div>
            </div>
          </div>

          {/* Alerts & logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-900 p-3 rounded border border-panel-border">
              <h4 className="font-semibold mb-2">هشدارها</h4>
              {error ? (
                <div className="text-red-400">{error}</div>
              ) : (
                <>
                  {/* Map processedFrames to simple alerts for demo */}
                  {processedFrames.slice().reverse().slice(0, 6).map((f) => (
                    <div key={f.id} className="text-sm text-gray-300 mb-1 flex items-center justify-between">
                      <div>
                        فریم {toPersianNumber(f.id)} — اشیاء: {toPersianNumber(f.objects)}
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs ${f.type === 'large' ? 'bg-red-600' : f.type === 'medium' ? 'bg-yellow-500 text-black' : 'bg-green-600'}`}>
                        {f.type}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="bg-gray-900 p-3 rounded border border-panel-border">
              <h4 className="font-semibold mb-2">لاگ عملیات</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div>07:12 — شروع پردازش ویدیو</div>
                <div>07:13 — فریم‌های پردازش‌شده دریافت شد</div>
                <div>07:15 — هشدار: انحراف نوار ۲</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
