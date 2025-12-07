// VideoTestPage.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import './VideoTestPage.css';
export default function VideoTestPage() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [response, setResponse] = useState(null);
  const [liveProgress, setLiveProgress] = useState("No progress yet...");
  const [allProgress, setAllProgress] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [objectCount, setObjectCount] = useState(0);

  const wsRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Fetch available videos from API
    axios.get("http://localhost:8000/api/vision/videos/")
      .then(res => {
        if (res.data.available_videos) {
          setVideos(res.data.available_videos);
          if (res.data.available_videos.length > 0) {
            setSelectedVideo(res.data.available_videos[0].path);
          }
        }
      })
      .catch(err => console.error("Error fetching videos:", err));

    // Setup WebSocket connection
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Connect to WebSocket
    wsRef.current = new WebSocket("ws://localhost:8000/ws/vision/progress/");

    wsRef.current.onopen = () => {
      console.log("WebSocket connected for vision processing");
      setLiveProgress("WebSocket connected");
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected");
      setLiveProgress(prev => prev + " - WebSocket disconnected");
    };

    wsRef.current.onerror = (e) => {
      console.log("WebSocket error:", e);
      setLiveProgress(`WebSocket error: ${e}`);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "progress") {
          // Update progress text
          setLiveProgress(
            `Frame: ${data.frame} | Objects: ${data.object_count} | Progress: ${data.progress}% ${data.is_final ? "| Finished!" : ""}`
          );

          // Update object count
          setObjectCount(data.object_count);

          // If we have a frame image, display it
          if (data.frame_image) {
            setCurrentFrame(data.frame_image);
            drawFrame(data.frame_image);
          }

          // Add to progress history
          setAllProgress(prev => [...prev.slice(-19), data]); // Keep last 20 updates

          // If this is final frame, stop processing
          if (data.is_final) {
            setIsProcessing(false);
          }
        } else if (data.type === "error") {
          setLiveProgress(`Error: ${data.error}`);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  };

  const drawFrame = (base64Image) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Clear canvas and draw new image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw object count on top
      ctx.fillStyle = 'red';
      ctx.font = '20px Arial';
      ctx.fillText(`Objects detected: ${objectCount}`, 10, 30);
    };

    img.src = `data:image/jpeg;base64,${base64Image}`;
  };

  const handleStartProcessing = () => {
    if (!selectedVideo) return;

    setIsProcessing(true);
    setCurrentFrame(null);
    setAllProgress([]);
    setObjectCount(0);

    // Reconnect WebSocket to ensure fresh connection
    connectWebSocket();

    axios.post("http://localhost:8000/api/vision/start/", {
      video_path: selectedVideo
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        setResponse(res.data);
        setLiveProgress("Processing started...");
      })
      .catch(err => {
        console.error("Processing error:", err);
        setResponse({ error: err.message });
        setIsProcessing(false);
      });
  };

  const handleStopProcessing = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsProcessing(false);
    setLiveProgress("Processing stopped");
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h2>Conveyor Belt Video Processing</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        marginBottom: 20
      }}>
        {/* Left Column: Controls */}
        <div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 5 }}>
              <strong>Select Video:</strong>
            </label>
            <select
              value={selectedVideo}
              onChange={e => setSelectedVideo(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 4,
                border: '1px solid #ccc'
              }}
              disabled={isProcessing}
            >
              {videos.map(v => (
                <option key={v.path} value={v.path}>
                  {v.path} ({(v.size / (1024*1024)).toFixed(2)} MB)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleStartProcessing}
              style={{
                padding: '10px 20px',
                backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Start Processing'}
            </button>

            {isProcessing && (
              <button
                onClick={handleStopProcessing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Stop
              </button>
            )}
          </div>

          {/* Response Display */}
          <div style={{ marginTop: 20 }}>
            <h3>Response:</h3>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: 10,
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 150
            }}>
              {response ? JSON.stringify(response, null, 2) : 'No response yet'}
            </pre>
          </div>

          {/* Live Progress */}
          <div style={{ marginTop: 20 }}>
            <h3>Live Status:</h3>
            <div style={{
              backgroundColor: '#e8f5e9',
              padding: 10,
              borderRadius: 4,
              border: '1px solid #c8e6c9'
            }}>
              {liveProgress}
            </div>
          </div>

          {/* Object Count Display */}
          <div style={{ marginTop: 20 }}>
            <h3>Current Objects:</h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: objectCount > 0 ? '#2196F3' : '#757575',
              textAlign: 'center'
            }}>
              {objectCount} objects detected
            </div>
          </div>
        </div>

        {/* Right Column: Video Display */}
        <div>
          <h3>Live Processed Video:</h3>
          <div style={{
            backgroundColor: '#000',
            borderRadius: 8,
            overflow: 'hidden',
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {currentFrame ? (
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              />
            ) : (
              <div style={{ color: '#666', textAlign: 'center' }}>
                {isProcessing ? 'Waiting for first frame...' : 'No video stream'}
              </div>
            )}
          </div>

          {/* Progress History */}
          <div style={{ marginTop: 20 }}>
            <h3>Recent Updates:</h3>
            <div style={{
              maxHeight: 200,
              overflowY: 'auto',
              backgroundColor: '#fafafa',
              border: '1px solid #eee',
              borderRadius: 4,
              padding: 10
            }}>
              {allProgress.length > 0 ? (
                allProgress.map((progress, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '5px 0',
                      borderBottom: '1px solid #eee',
                      fontSize: '12px'
                    }}
                  >
                    Frame {progress.frame}: {progress.object_count} objects - {progress.progress}%
                  </div>
                ))
              ) : (
                <div style={{ color: '#999' }}>No updates yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: 30,
        padding: 15,
        backgroundColor: '#e3f2fd',
        borderRadius: 4,
        fontSize: '14px'
      }}>
        <strong>Instructions:</strong>
        <ol style={{ margin: '10px 0 0 20px' }}>
          <li>Select a video from the dropdown</li>
          <li>Click "Start Processing" to begin real-time analysis</li>
          <li>Watch the live video stream with detected objects highlighted in green boxes</li>
          <li>Monitor object count and progress in real-time</li>
        </ol>
      </div>
    </div>
  );
}