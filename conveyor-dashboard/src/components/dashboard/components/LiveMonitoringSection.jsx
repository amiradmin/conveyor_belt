// src/components/LiveMonitoringSection.jsx
import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';

export default function LiveMonitoringSection() {
  // Video refs for all 4 camera feeds
  const videoRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // State for belts data and loading status
  const [beltsData, setBeltsData] = useState([]);
  const [beltStats, setBeltStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamStatus, setStreamStatus] = useState({});

  // Fetch belts data from API
  useEffect(() => {
    const fetchBeltsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('http://localhost:8000/api/camera/belts-cameras/', {
          timeout: 10000
        });

        if (response.data) {
          setBeltsData(response.data.belts || []);
          setBeltStats(response.data.statistics || {});
        }

      } catch (error) {
        console.error('Error fetching belts data:', error);
        setError('خطا در بارگذاری اطلاعات نوارها و دوربین‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchBeltsData();
  }, []);

  // Get the streams to display - only show belts that have video_url
  const getStreamsToDisplay = () => {
    if (!beltsData || beltsData.length === 0) return [];

    // Get all belts that have video_url (both with and without cameras)
    const beltsWithVideo = beltsData.filter(belt => belt.video_url);

    // Sort to show belt with camera first, then others
    const sortedBelts = [...beltsWithVideo].sort((a, b) => {
      if (a.has_camera && !b.has_camera) return -1;
      if (!a.has_camera && b.has_camera) return 1;
      return 0;
    });

    // Take first 4 belts (or all if less than 4)
    return sortedBelts.slice(0, 4);
  };

  const streamsToDisplay = getStreamsToDisplay();

  // Auto-play all videos when component mounts and data is loaded
  useEffect(() => {
    if (!loading && streamsToDisplay.length > 0) {
      const playAllVideos = () => {
        videoRefs.forEach((ref, index) => {
          if (index < streamsToDisplay.length && ref.current && ref.current.src) {
            ref.current.play().catch(error => {
              console.log(`Auto-play prevented for stream ${index}`, error);
            });
          }
        });
      };

      const timer = setTimeout(playAllVideos, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, streamsToDisplay]);

  // Play all videos function for manual trigger
  const playAllVideos = () => {
    videoRefs.forEach((ref, index) => {
      if (index < streamsToDisplay.length && ref.current && ref.current.src) {
        ref.current.play().catch(console.error);
      }
    });
  };

  // Pause all videos
  const pauseAllVideos = () => {
    videoRefs.forEach(ref => {
      if (ref.current) ref.current.pause();
    });
  };

  // Retry loading
  const retryLoading = () => {
    setLoading(true);
    setError(null);
    setStreamStatus({});
  };

  // Get stream type and URL for a belt
  const getStreamInfo = (belt) => {
    if (!belt) return { type: 'none', url: null };

    // If belt has a camera with URL, use that (live stream)
    if (belt.has_camera && belt.camera && belt.camera.url) {
      return { type: 'live', url: belt.camera.url };
    }

    // Otherwise use the video_url (recorded video)
    if (belt.video_url) {
      return { type: 'recorded', url: belt.video_url };
    }

    return { type: 'none', url: null };
  };

  // Get icon based on belt name and type
  const getStreamIcon = (belt, streamType) => {
    if (streamType === 'live') return '📹'; // Camera icon for live streams

    // Icons for recorded videos based on belt names
    const beltName = belt.name.toLowerCase();
    if (beltName.includes('ریفرمر')) return '🔥';
    if (beltName.includes('گندله')) return '⚡';
    if (beltName.includes('خروجی')) return '📤';
    if (beltName.includes('انبار')) return '📦';

    return '🎥'; // Default icon
  };

  // Get title based on belt and stream type
  const getStreamTitle = (belt, streamType) => {
    if (streamType === 'live') {
      return `دوربین زنده - ${belt.name}`;
    }
    return `ویدیوی ${belt.name}`;
  };

  // Render camera feed with belt information
  const renderCameraFeed = (belt, index) => {
    if (!belt) return null;

    const streamInfo = getStreamInfo(belt);
    const icon = getStreamIcon(belt, streamInfo.type);
    const title = getStreamTitle(belt, streamInfo.type);
    const ref = videoRefs[index];
    const status = streamStatus[belt.id];

    return (
      <div key={belt.id} className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
        <div className="p-3 bg-gray-800 text-white text-sm flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span>{icon}</span>
            <span>{title}</span>
            {streamInfo.type === 'live' && (
              <span className="text-xs bg-green-600 px-2 py-1 rounded">
                🔴 زنده
              </span>
            )}
            {streamInfo.type === 'recorded' && (
              <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                📼 ضبط شده
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (ref.current) {
                  ref.current.load();
                  ref.current.play().catch(console.error);
                }
              }}
              className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 transition"
            >
              🔄
            </button>
            <button
              onClick={() => ref.current?.play()}
              className="px-2 py-1 bg-green-600 rounded text-xs hover:bg-green-700 transition"
            >
              ▶️
            </button>
            <button
              onClick={() => ref.current?.pause()}
              className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600 transition"
            >
              ⏸️
            </button>
          </div>
        </div>
        <div className="h-80 bg-black flex items-center justify-center relative">
          {streamInfo.url ? (
            <>
              <video
                ref={ref}
                src={streamInfo.url}
                muted
                autoPlay
                playsInline
                controls={true}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error(`Error loading stream for ${belt.name}: ${streamInfo.url}`, e);
                  setStreamStatus(prev => ({ ...prev, [belt.id]: 'error' }));
                }}
                onCanPlay={() => {
                  console.log(`Stream can play for ${belt.name}`);
                  setStreamStatus(prev => ({ ...prev, [belt.id]: 'connected' }));
                }}
              />

              {/* Stream type indicator */}
              <div className="absolute top-2 right-2">
                <div className={`flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-full text-xs ${
                  streamInfo.type === 'live' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'connected' ? 'bg-white animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <span>{streamInfo.type === 'live' ? 'LIVE' : 'RECORDED'}</span>
                </div>
              </div>

              {/* Loading indicator */}
              {!status && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <div className="text-sm">در حال بارگذاری...</div>
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {status === 'error' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="text-white text-center p-4">
                    <div className="text-2xl mb-2">❌</div>
                    <div className="text-sm">خطا در بارگذاری ویدیو</div>
                    <button
                      onClick={() => {
                        if (ref.current) {
                          ref.current.load();
                          ref.current.play().catch(console.error);
                        }
                      }}
                      className="mt-2 px-3 py-1 bg-red-600 rounded text-xs hover:bg-red-700 transition"
                    >
                      تلاش مجدد
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-400 text-center p-4">
              <div className="text-2xl mb-2">{icon}</div>
              <div>آدرس ویدیو تنظیم نشده</div>
            </div>
          )}

          {/* Belt Info Overlay */}
          {belt && status === 'connected' && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white p-2 rounded text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">{belt.name}</div>
                  <div className="text-gray-300">
                    {streamInfo.type === 'live' ? (
                      <>
                        {belt.camera.name}
                        <div className="text-gray-400 text-[10px] mt-1">
                          IP: {belt.camera.ip_address} • {belt.camera.location}
                        </div>
                      </>
                    ) : (
                      'ویدیوی ضبط شده'
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded ${
                    belt.status === 'operational' ? 'bg-green-600' : 'bg-yellow-600'
                  }`}>
                    {belt.status_display}
                  </div>
                  <div className="text-gray-300 mt-1 text-[10px]">
                    سرعت: {belt.current_speed} m/s
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="lg:col-span-2 bg-panel-bg rounded-xl shadow-sm border border-panel-border p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">سیستم مانیتورینگ زنده</h2>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-500 text-black text-sm font-semibold">
            <div className="w-2 h-2 rounded-full bg-yellow-700 mr-2"></div>
            در حال بارگذاری
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border">
              <div className="p-3 bg-gray-800 text-white text-sm">
                <div className="animate-pulse bg-gray-700 h-4 w-32 rounded"></div>
              </div>
              <div className="h-80 bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">در حال بارگذاری...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 bg-panel-bg rounded-xl shadow-sm border border-panel-border p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">سیستم مانیتورینگ نوار نقاله</h2>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500 text-black text-sm font-semibold">
            <div className="w-2 h-2 rounded-full bg-green-700 mr-2"></div>
            آنلاین
          </div>
          <div className="text-sm text-gray-300">
            {beltStats.total_belts} نوار • {beltStats.belts_with_cameras} دوربین زنده
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {error && (
            <button
              onClick={retryLoading}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-2"
            >
              <span>🔄</span>
              بارگذاری مجدد
            </button>
          )}
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-300">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={retryLoading}
              className="px-3 py-1 bg-red-700 text-white rounded hover:bg-red-800 transition text-sm"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      )}

      {/* Stream Information */}
      <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-200 text-sm">
          <span>📊</span>
          <span>
            نمایش {streamsToDisplay.length} نوار از {beltStats.total_belts} نوار موجود •
            {streamsToDisplay.filter(belt => getStreamInfo(belt).type === 'live').length} دوربین زنده
          </span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {streamsToDisplay.map((belt, index) => renderCameraFeed(belt, index))}

        {/* Empty slots if we have less than 4 streams */}
        {Array.from({ length: 4 - streamsToDisplay.length }).map((_, index) => (
          <div key={`empty-${index}`} className="bg-gray-900 rounded-lg overflow-hidden border border-panel-border border-dashed">
            <div className="p-3 bg-gray-800 text-white text-sm flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span>📹</span>
                <span>دوربین آماده نیست</span>
              </span>
            </div>
            <div className="h-80 bg-gray-800 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="text-4xl mb-2">📹</div>
                <div>دوربین فعالی وجود ندارد</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-800 rounded-lg border border-panel-border gap-4">
        <div className="text-sm text-gray-300">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            سیستم مانیتورینگ فعال - {beltStats.camera_coverage} پوشش دوربین
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {streamsToDisplay.length} ویدیوی در حال نمایش
        </div>
      </div>
    </div>
  );
}