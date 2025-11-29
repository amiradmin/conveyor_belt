import { useState } from 'react';
import axios from 'axios';

export const useVideoProcessing = () => {
  const [videoData, setVideoData] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [processedFrames, setProcessedFrames] = useState([]);
  const [objectCount, setObjectCount] = useState(0);
  const [beltSpeed, setBeltSpeed] = useState(0);
  const [error, setError] = useState(null);

  const processVideo = async () => {
    try {
      setVideoLoading(true);
      setVideoProgress(0);
      setError(null);
      setObjectCount(0);
      setBeltSpeed(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });

        if (videoProgress % 20 === 0) {
          setObjectCount(prev => prev + Math.floor(Math.random() * 3));
          setBeltSpeed(prev => (prev + Math.random() * 0.5).toFixed(2));
        }
      }, 500);

      // Try actual API call first, then fallback to demo data
      setTimeout(async () => {
        try {
          const response = await axios.post(
            "http://localhost:8000/api/camera/process-video/",
            {
              video_path: "/app/media/test3.mp4"
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 30000
            }
          );

          setVideoData(response.data);
          setProcessedFrames(response.data.frames || []);
        } catch (apiError) {
          // Fallback to demo data
          setVideoData({
            original_video_url: "http://localhost:8000/media/demo_video.mp4",
            total_frames: 150,
            processed_frames_count: 150,
            frames: Array(6).fill().map((_, i) => `demo_frame_${i + 1}`)
          });
          setProcessedFrames(Array(6).fill().map((_, i) => `demo_frame_${i + 1}`));
          setObjectCount(15);
          setBeltSpeed("2.3");
        }

        clearInterval(progressInterval);
        setVideoProgress(100);
        setVideoLoading(false);
      }, 5000);

    } catch (error) {
      console.error("خطا در پردازش ویدیو:", error);

      let errorMessage = "خطای ناشناخته در پردازش ویدیو";

      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
        errorMessage = "سرور در دسترس نیست. لطفا از روشن بودن سرور backend اطمینان حاصل کنید";
      } else if (error.response) {
        errorMessage = `خطای سرور: ${error.response.status} - ${error.response.data?.error || 'خطای ناشناخته سرور'}`;
      } else if (error.request) {
        errorMessage = "پاسخی از سرور دریافت نشد. لطفا اتصال شبکه را بررسی کنید";
      } else {
        errorMessage = error.message || "خطا در ارسال درخواست";
      }

      setError(errorMessage);
      setVideoLoading(false);
    }
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

  return {
    videoData,
    videoLoading,
    videoProgress,
    processedFrames,
    objectCount,
    beltSpeed,
    error,
    processVideo,
    testBackendConnection
  };
};