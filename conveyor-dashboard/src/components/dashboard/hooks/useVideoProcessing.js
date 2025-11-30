// src/hooks/useVideoProcessing.js
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 15000,
});

export const useVideoProcessing = () => {
  const [videoData, setVideoData] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [processedFrames, setProcessedFrames] = useState([]);
  const [objectCount, setObjectCount] = useState(0);
  const [beltSpeed, setBeltSpeed] = useState(0);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const frameIntervalRef = useRef(null);

  // Set default video data immediately
  useEffect(() => {
    const defaultVideoData = {
      original_video_url: "http://localhost:8000/media/test3.mp4",
      total_frames: 150,
      processed_frames_count: 0,
      frames: []
    };
    setVideoData(defaultVideoData);
  }, []);

  const stopFrameProcessing = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  // Define startContinuousFrameProcessing before it's used
  const startContinuousFrameProcessing = useCallback(() => {
    stopFrameProcessing();

    let frameId = 1;
    const maxFrames = 50;

    frameIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current || !videoLoading || frameId > maxFrames) {
        stopFrameProcessing();
        return;
      }

      const newFrame = {
        id: frameId,
        timestamp: Date.now(),
        objects: Math.floor(Math.random() * 10) + 1,
        speed: (Math.random() * 3 + 1).toFixed(2),
        type: frameId % 3 === 0 ? 'large' : frameId % 2 === 0 ? 'medium' : 'small',
        image_url: `http://localhost:8000/media/frame_${frameId}.jpg`
      };

      setProcessedFrames(prev => {
        const updatedFrames = [...prev, newFrame];
        return updatedFrames.slice(-12);
      });

      setObjectCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
      setBeltSpeed(prev => Math.max(0.5, parseFloat(prev) + (Math.random() * 0.4 - 0.2)).toFixed(2));

      frameId++;
      const progress = Math.min(100, Math.floor((frameId / maxFrames) * 100));
      setVideoProgress(progress);

    }, 800);
  }, [videoLoading, stopFrameProcessing]);

  const fetchFinalResults = useCallback(async () => {
    try {
      const finalData = {
        original_video_url: videoData?.original_video_url || "http://localhost:8000/media/test3.mp4",
        total_frames: 150,
        processed_frames_count: processedFrames.length,
        frames: processedFrames,
      };
      setVideoData(finalData);
    } catch (error) {
      console.error("Error fetching final results:", error);
    }
  }, [videoData, processedFrames]);

  // Enhanced WebSocket connection for multiple channels
  useEffect(() => {
    isMountedRef.current = true;

    const connectWebSocket = () => {
      if (!isMountedRef.current) return;

      try {
        if (wsRef.current) {
          wsRef.current.close();
        }

        console.log("🔗 Connecting to WebSocket...");
        const ws = new WebSocket("ws://localhost:8000/ws/progress/");
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) {
            ws.close();
            return;
          }
          console.log("✅ WebSocket connected");
          setWsConnected(true);
          setError(null);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;

          try {
            const data = JSON.parse(event.data);
            console.log("📨 WebSocket message received:", data);

            if (data.type === 'progress') {
              setVideoProgress(data.progress || 0);
              setObjectCount(data.object_count || 0);
              setBeltSpeed(data.belt_speed || 0);

              if (data.is_final) {
                setVideoLoading(false);
                stopFrameProcessing();
                fetchFinalResults();
              }
            } else if (data.type === 'realtime_update') {
              const analysis = data.data;
              if (analysis.object_count !== undefined) {
                setObjectCount(analysis.object_count);
              }
              if (analysis.belt_speed !== undefined) {
                setBeltSpeed(analysis.belt_speed);
              }

              if (analysis.object_count > 0) {
                const newFrame = {
                  id: Date.now(),
                  timestamp: analysis.timestamp,
                  objects: analysis.object_count,
                  speed: analysis.belt_speed || beltSpeed,
                  type: analysis.object_count > 5 ? 'large' : analysis.object_count > 2 ? 'medium' : 'small',
                  image_url: analysis.frame_url || null
                };

                setProcessedFrames(prev => {
                  const updated = [...prev, newFrame];
                  return updated.slice(-20);
                });
              }
            } else if (data.type === 'processing_complete') {
              console.log("🎉 Video processing completed:", data.data);
              setVideoLoading(false);
              stopFrameProcessing();
              fetchFinalResults();
            } else if (data.type === 'alert') {
              setAlerts(prev => [data.data, ...prev.slice(0, 9)]);
            }
          } catch (error) {
            console.error("❌ Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          if (!isMountedRef.current) return;
          console.log("🔌 WebSocket disconnected:", event.code, event.reason);
          setWsConnected(false);

          if (event.code !== 1000 && isMountedRef.current) {
            console.log("🔄 Attempting to reconnect in 3 seconds...");
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) connectWebSocket();
            }, 3000);
          }
        };

        ws.onerror = (error) => {
          if (!isMountedRef.current) return;
          console.error("❌ WebSocket error:", error);
          setWsConnected(false);
        };

      } catch (error) {
        console.error("❌ WebSocket connection error:", error);
        setWsConnected(false);
        setError("خطا در اتصال به سرور WebSocket");
      }
    };

    if (videoData?.original_video_url) {
      connectWebSocket();
    }

    return () => {
      isMountedRef.current = false;
      stopFrameProcessing();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, [videoData?.original_video_url, beltSpeed, stopFrameProcessing, fetchFinalResults]);

  // FIXED: Enhanced processVideo function with proper error handling
  const processVideo = useCallback(async (videoPath = "/app/media/test3.mp4") => {
    try {
      setVideoLoading(true);
      setVideoProgress(0);
      setError(null);
      setObjectCount(0);
      setBeltSpeed(0);
      setProcessedFrames([]);

      console.log("🎬 Starting video processing...");

      // Call your Django ProcessVideoFile API
      const response = await apiClient.post("/camera/process-video/", {
        video_path: videoPath
      });

      console.log("✅ Video processing started:", response.data);

      // Start local frame simulation while waiting for WebSocket updates
      startContinuousFrameProcessing();

      return response.data;

    } catch (error) {
      console.error("❌ Error starting video processing:", error);

      // FIXED: Proper error handling without circular references
      let errorMessage = "خطا در شروع پردازش ویدیو";

      if (axios.isAxiosError(error)) {
        // Handle Axios errors
        if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
          errorMessage = "سرور در دسترس نیست. لطفا مطمئن شوید سرور Django اجرا است";
        } else if (error.response) {
          // Server responded with error status
          errorMessage = `خطای سرور: ${error.response.status} - ${error.response.data?.error || 'خطای ناشناخته'}`;
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = "پاسخی از سرور دریافت نشد. لطفا اتصال شبکه را بررسی کنید";
        } else if (error.message?.includes('timeout')) {
          errorMessage = "زمان درخواست به پایان رسید";
        } else {
          errorMessage = `خطای شبکه: ${error.message}`;
        }
      } else if (error instanceof Error) {
        // Handle generic JavaScript errors
        errorMessage = `خطا: ${error.message}`;
      } else {
        // Handle unknown error types
        errorMessage = "خطای ناشناخته در پردازش ویدیو";
      }

      setError(errorMessage);
      setVideoLoading(false);
      stopFrameProcessing();
    }
  }, [startContinuousFrameProcessing, stopFrameProcessing]);

  // Enhanced backend connection test with proper endpoint checking
  const testBackendConnection = useCallback(async () => {
    try {
      setError("در حال آزمایش اتصال به سرور...");

      // Test available endpoints
      const endpointsToTest = [
        '/camera/status/',
        '/camera/process-video/'
      ];

      const testResults = await Promise.allSettled(
        endpointsToTest.map(endpoint =>
          apiClient.get(endpoint).catch(error => ({ error: true, message: error.message }))
        )
      );

      const successfulTests = testResults.filter(result =>
        result.status === 'fulfilled' && !result.value.error
      );

      if (successfulTests.length > 0) {
        // Try to get system status if available
        try {
          const statusResponse = await apiClient.get("/camera/status/");
          setSystemStatus(statusResponse.data);
        } catch (e) {
          // If status endpoint fails, create a basic status
          setSystemStatus({
            overall_health: 'good',
            active_cameras: 1,
            total_alerts: 0,
            critical_alerts: 0
          });
        }

        setError("✅ اتصال به سرور برقرار است - سیستم آماده");
        setTimeout(() => setError(null), 3000);
        return true;
      } else {
        throw new Error('All endpoints failed');
      }

    } catch (error) {
      const errorMsg = "❌ سرور در دسترس نیست. لطفا مطمئن شوید سرور Django در حال اجرا است";
      setError(errorMsg);
      return false;
    }
  }, []);

  // Fetch system statistics - handle missing endpoints gracefully
  const fetchSystemStats = useCallback(async () => {
    try {
      const response = await apiClient.get("/camera/status/");
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching system stats:", error);
      // Return fallback data
      return {
        overall_health: 'good',
        active_cameras: 1,
        total_alerts: 0,
        critical_alerts: 0,
        total_throughput: 2450,
        average_efficiency: 94.7
      };
    }
  }, []);

  // Fetch alerts with fallback for missing endpoint
  const fetchUnresolvedAlerts = useCallback(async () => {
    try {
      // Try the unresolved alerts endpoint first
      const response = await apiClient.get("/camera/alerts/unresolved/");
      setAlerts(response.data.results || response.data || []);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("⚠️ Alerts endpoint not found, using fallback data");
        // Use fallback mock alerts
        const mockAlerts = [
          {
            id: 1,
            title: "سیستم راه‌اندازی شد",
            message: "سیستم مانیتورینگ با موفقیت راه‌اندازی شد",
            severity: "info",
            timestamp: new Date().toISOString()
          }
        ];
        setAlerts(mockAlerts);
      } else {
        console.error("❌ Error fetching alerts:", error);
        setAlerts([]);
      }
    }
  }, []);

  const reconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setError("در حال اتصال مجدد...");

    if (wsRef.current) {
      wsRef.current.close();
    }
    // The useEffect will automatically attempt to reconnect
  }, []);

  // Initialize system data on mount
  useEffect(() => {
    testBackendConnection();
    fetchUnresolvedAlerts();
  }, [testBackendConnection, fetchUnresolvedAlerts]);

  return {
    // State
    videoData,
    videoLoading,
    videoProgress,
    processedFrames,
    objectCount,
    beltSpeed,
    error,
    wsConnected,
    systemStatus,
    alerts,

    // Actions
    processVideo,
    testBackendConnection,
    reconnectWebSocket,
    fetchSystemStats,
    fetchUnresolvedAlerts,
    stopFrameProcessing
  };
};