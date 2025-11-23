import React, { useRef, useState, useEffect, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ImageProcessingPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState("grayscale");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const startWebcam = useCallback(async () => {
    console.log("=== STARTING WEBCAM ===");
    setIsLoading(true);
    setError(null);

    // Clean up any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      console.log("1. Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      console.log("2. Stream obtained:", stream.id, "Active:", stream.active);

      if (videoRef.current) {
        const video = videoRef.current;
        console.log("3. Setting video srcObject...");
        video.srcObject = stream;

        // Use a simpler approach - just wait a bit and check
        await new Promise((resolve) => {
          const checkVideo = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log("4. Video has dimensions:", video.videoWidth, "x", video.videoHeight);
              resolve();
            } else {
              console.log("4. Waiting for video dimensions...");
              setTimeout(checkVideo, 100);
            }
          };
          checkVideo();
        });

        // Try to play the video
        console.log("5. Attempting to play video...");
        await video.play().catch(err => {
          console.warn("Video play warning:", err);
        });

        console.log("6. Video should be playing now");
        setStreamActive(true);
        setError(null);

      }
    } catch (err) {
      console.error("Webcam error:", err);
      setError(`Failed to access webcam: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    console.log("=== STOPPING WEBCAM ===");
    setStreamActive(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return stopWebcam;
  }, [stopWebcam]);

  // Frame processing
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply processing if enabled
    if (processing) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      if (mode === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
      } else if (mode === 'edge') {
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg > 128 ? 255 : 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [processing, mode]);

  // Start processing when stream is active
  useEffect(() => {
    if (streamActive) {
      console.log("Starting frame processing loop");
      rafRef.current = requestAnimationFrame(processFrame);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [streamActive, processFrame]);

  // Send frames to server
  useEffect(() => {
    if (!streamActive) return;

    const interval = setInterval(() => {
      if (canvasRef.current) {
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const formData = new FormData();
            formData.append('frame', blob, 'frame.jpg');
            fetch(`${API_BASE_URL}/api/camera/stream/`, {
              method: 'POST',
              body: formData,
            }).catch(err => console.error('Upload error:', err));
          }
        }, 'image/jpeg', 0.8);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [streamActive]);

  const handleRetry = () => {
    stopWebcam();
    setTimeout(startWebcam, 500);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Webcam Test</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 items-center mb-6 p-4 bg-gray-50 rounded">
        {!streamActive ? (
          <button
            onClick={startWebcam}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? "Starting..." : "Start Webcam"}
          </button>
        ) : (
          <div className="flex gap-4 items-center">
            <button
              onClick={stopWebcam}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop Webcam
            </button>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={processing}
                onChange={(e) => setProcessing(e.target.checked)}
                className="w-4 h-4"
              />
              Process
            </label>

            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="border px-3 py-2 rounded"
            >
              <option value="grayscale">Grayscale</option>
              <option value="edge">Edge Detect</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Camera Feed</h3>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-auto max-h-96"
              style={{ display: 'block' }}
            />
          </div>
          {!streamActive && (
            <p className="text-sm text-gray-600 mt-2">
              Click "Start Webcam" and allow camera permissions
            </p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Processed Output</h3>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
            <canvas
              ref={canvasRef}
              className="w-full h-auto max-h-96"
            />
          </div>
        </div>
      </div>

      {/* Debug info */}
      <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
        <div><strong>Status:</strong> {streamActive ? "Webcam Active" : "Webcam Inactive"}</div>
        <div><strong>Loading:</strong> {isLoading ? "Yes" : "No"}</div>
        <div><strong>Processing:</strong> {processing ? `${mode} active` : "Off"}</div>
        {videoRef.current && (
          <div>
            <strong>Video Size:</strong> {videoRef.current.videoWidth} x {videoRef.current.videoHeight}
          </div>
        )}
      </div>

      {/* Emergency reset */}
      {streamActive && (
        <div className="mt-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
          >
            Reload Page (Reset Everything)
          </button>
        </div>
      )}
    </div>
  );
}