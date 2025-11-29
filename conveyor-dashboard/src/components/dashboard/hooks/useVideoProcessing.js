import { useState, useEffect, useRef } from 'react';
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

  // WebSocket connection with better error handling
  useEffect(() => {
    isMountedRef.current = true;

    const connectWebSocket = () => {
      if (!isMountedRef.current) return;

      try {
        // Close existing connection if any
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }

        const ws = new WebSocket("ws://localhost:8000/ws/progress/");
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) {
            ws.close();
            return;
          }
          console.log("Video progress WebSocket connected");
          setWsConnected(true);
          setError(null);
          // Clear any reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;

          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket data received:", data);

            if (data.type === 'progress') {
              setVideoProgress(data.progress || 0);
              setObjectCount(data.object_count || 0);
              setBeltSpeed(data.belt_speed || 0);

              // If we receive frame data, add it to processed frames
              if (data.frame_data) {
                setProcessedFrames(prev => [...prev, data.frame_data]);
              }

              if (data.is_final) {
                setVideoLoading(false);
                fetchFinalResults();
              }
            } else if (data.type === 'error') {
              setError(data.error);
              setVideoLoading(false);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          if (!isMountedRef.current) return;

          console.log("Video progress WebSocket disconnected", event.code, event.reason);
          setWsConnected(false);

          // Only attempt to reconnect if it wasn't a normal closure and component is still mounted
          if (event.code !== 1000 && isMountedRef.current) {
            console.log("Attempting to reconnect WebSocket in 2 seconds...");
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                connectWebSocket();
              }
            }, 2000);
          }
        };

        ws.onerror = (err) => {
          if (!isMountedRef.current) return;

          console.error("Video progress WebSocket error:", err);
          setWsConnected(false);
        };

      } catch (error) {
        console.error("Error creating WebSocket:", error);
        if (isMountedRef.current) {
          setWsConnected(false);
        }
      }
    };

    // Initial connection
    connectWebSocket();

    return () => {
      isMountedRef.current = false;

      // Cleanup timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Cleanup WebSocket
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, []);

  const fetchFinalResults = async () => {
    try {
      // In a real implementation, you would fetch the actual results from your API
      // For now, let's create some demo processed frames
      const demoFrames = Array.from({ length: 6 }, (_, i) =>
        `demo_frame_${i + 1}_placeholder`
      );

      const finalData = {
        original_video_url: videoData?.original_video_url || "http://localhost:8000/media/test3.mp4",
        total_frames: 150,
        processed_frames_count: processedFrames.length || demoFrames.length,
        frames: processedFrames.length > 0 ? processedFrames : demoFrames,
      };

      setVideoData(finalData);
      if (processedFrames.length === 0) {
        setProcessedFrames(demoFrames);
      }
    } catch (error) {
      console.error("Error fetching final results:", error);
    }
  };

  const processVideo = async () => {
    try {
      setVideoLoading(true);
      setVideoProgress(0);
      setError(null);
      setObjectCount(0);
      setBeltSpeed(0);
      setProcessedFrames([]); // Clear previous frames

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

      console.log("Video processing started:", response.data);

      // Start simulating frame processing for demo purposes
      simulateFrameProcessing();

    } catch (error) {
      console.error("Error starting video processing:", error);

      let errorMessage = "خطا در شروع پردازش ویدیو";
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
        errorMessage = "سرور در دسترس نیست";
      } else if (error.response) {
        errorMessage = `خطای سرور: ${error.response.status}`;
      } else if (error.message?.includes('timeout')) {
        errorMessage = "زمان درخواست به پایان رسید";
      }

      setError(errorMessage);
      setVideoLoading(false);
    }
  };

  // Simulate frame processing for demo purposes
  const simulateFrameProcessing = () => {
    let frameCount = 0;
    const totalFrames = 6;

    const processNextFrame = () => {
      if (frameCount < totalFrames && videoLoading) {
        setTimeout(() => {
          const newFrame = `processed_frame_${frameCount + 1}_${Date.now()}`;
          setProcessedFrames(prev => [...prev, newFrame]);
          frameCount++;
          processNextFrame();
        }, 1000); // Process one frame per second
      }
    };

    processNextFrame();
  };

  const testBackendConnection = async () => {
    try {
      setError("در حال آزمایش اتصال به سرور...");
      const response = await axios.get("http://localhost:8000/api/camera/", {
        timeout: 5000
      });
      setError("اتصال به سرور برقرار است ✓");
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      setError("سرور در دسترس نیست. لطفا مطمئن شوید سرور Django در حال اجرا است");
    }
  };

  const getProcessingStatus = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/camera/process-video/");
      return response.data;
    } catch (error) {
      console.error("Error getting processing status:", error);
      return null;
    }
  };

  const reconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setError("در حال اتصال مجدد...");

    if (wsRef.current) {
      wsRef.current.close();
    }
  };

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
    getProcessingStatus,
    reconnectWebSocket
  };
};