import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

export const useVideoProcessing = () => {
  const [videoData, setVideoData] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [processedFrames, setProcessedFrames] = useState([]);
  const [objectCount, setObjectCount] = useState(0);
  const [beltSpeed, setBeltSpeed] = useState(0);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

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
        type: frameId % 3 === 0 ? 'large' : frameId % 2 === 0 ? 'medium' : 'small'
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

  // Improved WebSocket connection
  useEffect(() => {
    isMountedRef.current = true;

    const connectWebSocket = () => {
      if (!isMountedRef.current) return;

      try {
        // Close existing connection
        if (wsRef.current) {
          wsRef.current.close();
        }

        console.log("Attempting to connect WebSocket...");
        const ws = new WebSocket("ws://localhost:8000/ws/progress/");
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) {
            ws.close();
            return;
          }
          console.log("✅ Video progress WebSocket connected");
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
            } else if (data.type === 'error') {
              setError(data.error);
              setVideoLoading(false);
              stopFrameProcessing();
            }
          } catch (error) {
            console.error("❌ Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          if (!isMountedRef.current) return;

          console.log("🔌 WebSocket disconnected:", event.code, event.reason);
          setWsConnected(false);

          // Only reconnect for abnormal closures
          if (event.code !== 1000 && isMountedRef.current) {
            console.log("🔄 Attempting to reconnect in 3 seconds...");
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                connectWebSocket();
              }
            }, 3000);
          }
        };

        ws.onerror = (error) => {
          if (!isMountedRef.current) return;
          console.error("❌ WebSocket error:", error);
          setWsConnected(false);
        };

      } catch (error) {
        console.error("❌ Error creating WebSocket:", error);
        if (isMountedRef.current) {
          setWsConnected(false);
          setError("خطا در اتصال به سرور WebSocket");
        }
      }
    };

    // Only connect if we have a video to process
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
  }, [videoData?.original_video_url, stopFrameProcessing, fetchFinalResults]);

  const processVideo = useCallback(async () => {
    try {
      setVideoLoading(true);
      setVideoProgress(0);
      setError(null);
      setObjectCount(0);
      setBeltSpeed(0);
      setProcessedFrames([]);

      const response = await axios.post(
        "http://localhost:8000/api/camera/process-video/",
        {
          video_path: "/app/media/test3.mp4"
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );

      console.log("🎬 Video processing started:", response.data);
      startContinuousFrameProcessing();

    } catch (error) {
      console.error("❌ Error starting video processing:", error);
      let errorMessage = "خطا در شروع پردازش ویدیو";

      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
        errorMessage = "سرور در دسترس نیست. لطفا مطمئن شوید سرور Django اجرا است";
      } else if (error.response) {
        errorMessage = `خطای سرور: ${error.response.status}`;
      } else if (error.message?.includes('timeout')) {
        errorMessage = "زمان درخواست به پایان رسید";
      }

      setError(errorMessage);
      setVideoLoading(false);
      stopFrameProcessing();
    }
  }, [startContinuousFrameProcessing, stopFrameProcessing]);

  const testBackendConnection = useCallback(async () => {
    try {
      setError("در حال آزمایش اتصال به سرور...");
      const response = await axios.get("http://localhost:8000/api/camera/", {
        timeout: 5000
      });
      setError("✅ اتصال به سرور برقرار است");
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      setError("❌ سرور در دسترس نیست. لطفا مطمئن شوید سرور Django در حال اجرا است");
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

  return {
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
  };
};