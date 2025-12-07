// VideoTestPage.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function VideoTestPage() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [response, setResponse] = useState(null);
  const [liveProgress, setLiveProgress] = useState("Ready");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [objectCount, setObjectCount] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [alignmentData, setAlignmentData] = useState(null);
  const [jobId, setJobId] = useState(null);

  // Replay states
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayFrames, setReplayFrames] = useState([]);
  const [replayPosition, setReplayPosition] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1.0);
  const [replayInterval, setReplayInterval] = useState(null);

  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const replayCanvasRef = useRef(null);

  useEffect(() => {
    fetchVideos();
    connectWebSocket();

    return () => {
      disconnectWebSocket();
      stopReplay();
    };
  }, []);

  const fetchVideos = () => {
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
  };

  const connectWebSocket = () => {
    disconnectWebSocket();

    wsRef.current = new WebSocket("ws://localhost:8000/ws/vision/progress/");

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      setLiveProgress("Connected");
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected");
      setLiveProgress("Disconnected");
    };

    wsRef.current.onerror = (e) => {
      console.error("WebSocket error:", e);
      setLiveProgress("Connection error");
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch(data.type) {
          case "progress":
            handleProgressMessage(data);
            break;
          case "error":
            setLiveProgress(`Error: ${data.error}`);
            setIsProcessing(false);
            break;
          case "replay_status":
            console.log("Replay status:", data.status);
            break;
          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleProgressMessage = (data) => {
    setLiveProgress(
      `Frame: ${data.frame} | Objects: ${data.object_count} | Speed: ${data.speed?.toFixed(2) || 0} m/min | Progress: ${data.progress}%`
    );

    setObjectCount(data.object_count);
    setCurrentSpeed(data.speed || 0);
    setAlignmentData(data.alignment);

    if (data.frame_image) {
      setCurrentFrame(data.frame_image);
      drawFrame(data.frame_image, canvasRef.current);
    }

    if (data.is_final) {
      setIsProcessing(false);
      if (data.replay_available) {
        setLiveProgress(prev => prev + " - Replay available!");
      }
    }
  };

  const drawFrame = (base64Image, canvasElement) => {
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvasElement.width = img.width;
      canvasElement.height = img.height;
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.drawImage(img, 0, 0);

      // Draw overlay information
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(10, 10, 250, 100);

      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText(`Objects: ${objectCount}`, 20, 35);
      ctx.fillText(`Speed: ${currentSpeed.toFixed(2)} m/min`, 20, 60);

      if (alignmentData) {
        ctx.fillText(`Alignment: ${alignmentData.horizontal_deviation} px`, 20, 85);
        ctx.fillText(`Rotation: ${alignmentData.rotation_angle?.toFixed(1) || 0}°`, 20, 110);

        // Draw warning if misaligned
        if (Math.abs(alignmentData.horizontal_deviation) > 50) {
          ctx.fillStyle = 'red';
          ctx.font = 'bold 18px Arial';
          ctx.fillText("WARNING: MISALIGNED!", canvasElement.width - 250, 40);
        }
      }
    };

    img.src = `data:image/jpeg;base64,${base64Image}`;
  };

  const handleStartProcessing = () => {
    if (!selectedVideo) {
      alert("Please select a video first");
      return;
    }

    setIsProcessing(true);
    setCurrentFrame(null);
    setObjectCount(0);
    setCurrentSpeed(0);
    setAlignmentData(null);
    stopReplay();

    axios.post("http://localhost:8000/api/vision/start/", {
      video_path: selectedVideo
    })
      .then(res => {
        setResponse(res.data);
        setJobId(res.data.job_id);
        setLiveProgress("Processing started...");
      })
      .catch(err => {
        console.error("Processing error:", err);
        setResponse({ error: err.message });
        setIsProcessing(false);
      });
  };

  const handleStopProcessing = () => {
    setIsProcessing(false);
    setLiveProgress("Processing stopped");
  };

  // Replay Functions
  const startReplay = async () => {
    if (!jobId) {
      alert("No job ID available. Please start processing first.");
      return;
    }

    try {
      // Fetch replay frames from server
      const response = await axios.post("http://localhost:8000/api/vision/replay/", {
        job_id: jobId
      });

      if (response.data.frames && response.data.frames.length > 0) {
        setReplayFrames(response.data.frames);
        setIsReplaying(true);
        setReplayPosition(0);

        // Start replay loop
        const interval = setInterval(() => {
          setReplayPosition(prev => {
            const nextPos = prev + 1;
            if (nextPos >= response.data.frames.length) {
              clearInterval(interval);
              setIsReplaying(false);
              return 0;
            }

            // Display current frame
            drawFrame(response.data.frames[nextPos], replayCanvasRef.current);
            return nextPos;
          });
        }, 1000 / (30 * replaySpeed)); // Adjust interval based on speed

        setReplayInterval(interval);
      } else {
        alert("No replay frames available");
      }
    } catch (error) {
      console.error("Error fetching replay:", error);
      alert("Failed to load replay");
    }
  };

  const stopReplay = () => {
    if (replayInterval) {
      clearInterval(replayInterval);
      setReplayInterval(null);
    }
    setIsReplaying(false);
  };

  const handleReplaySpeedChange = (speed) => {
    setReplaySpeed(speed);
    if (isReplaying) {
      stopReplay();
      startReplay(); // Restart with new speed
    }
  };

  const handleReplaySeek = (position) => {
    const newPosition = Math.max(0, Math.min(position, replayFrames.length - 1));
    setReplayPosition(newPosition);

    if (replayFrames[newPosition]) {
      drawFrame(replayFrames[newPosition], replayCanvasRef.current);
    }
  };

  const getAlignmentStatus = () => {
    if (!alignmentData) return "Unknown";

    const deviation = Math.abs(alignmentData.horizontal_deviation);
    if (deviation < 10) return "Excellent";
    if (deviation < 30) return "Good";
    if (deviation < 50) return "Fair";
    return "Poor";
  };

  const getAlignmentColor = () => {
    const status = getAlignmentStatus();
    switch(status) {
      case "Excellent": return "#4CAF50";
      case "Good": return "#8BC34A";
      case "Fair": return "#FFC107";
      case "Poor": return "#F44336";
      default: return "#757575";
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Conveyor Belt Monitoring System</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        marginBottom: 20
      }}>
        {/* Left Panel - Controls */}
        <div>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: 20,
            borderRadius: 8,
            marginBottom: 20,
             color: 'grey' 
          }}>
            <h2>Controls</h2>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5 , color: 'grey' }}>
                <strong>Select Video:</strong>
              </label>
              <select
                value={selectedVideo}
                onChange={e => setSelectedVideo(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 4,
                  border: '1px solid #ccc'
                }}
                disabled={isProcessing || isReplaying}
              >
                {videos.map(v => (
                  <option key={v.path} value={v.path}>
                    {v.filename || v.path} ({(v.size / (1024*1024)).toFixed(2)} MB)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
              <button
                onClick={handleStartProcessing}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
                disabled={isProcessing || isReplaying}
              >
                {isProcessing ? 'Processing...' : 'Start Processing'}
              </button>

              {isProcessing && (
                <button
                  onClick={handleStopProcessing}
                  style={{
                    padding: '12px 20px',
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

            {/* Replay Controls */}
            <div style={{ marginTop: 20 , color: 'grey' }}>
              <h3>Replay Controls</h3>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  onClick={startReplay}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: isReplaying ? '#ccc' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: isReplaying ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isReplaying || !jobId}
                >
                  {isReplaying ? 'Replaying...' : 'Start Replay'}
                </button>

                <button
                  onClick={stopReplay}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',

                  }}
                  disabled={!isReplaying}
                >
                  Stop Replay
                </button>

                <select
                  value={replaySpeed}
                  onChange={e => handleReplaySpeedChange(parseFloat(e.target.value))}
                  style={{
                    padding: '10px',
                    borderRadius: 4,
                    border: '1px solid #ccc',

                  }}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1.0}>1x</option>
                  <option value={2.0}>2x</option>
                  <option value={5.0}>5x</option>
                </select>
              </div>

              {/* Replay Progress Bar */}
              {replayFrames.length > 0 && (
                <div style={{ marginTop: 15 }}>
                  <input
                    type="range"
                    min="0"
                    max={replayFrames.length - 1}
                    value={replayPosition}
                    onChange={e => handleReplaySeek(parseInt(e.target.value))}
                    style={{ width: '100%' , color: 'grey' }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#666',
                     color: 'grey'
                  }}>
                    <span>Frame: {replayPosition}</span>
                    <span>Total: {replayFrames.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Dashboard */}
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: 20,
            borderRadius: 8,
             color: 'grey'
          }}>
            <h2>Status Dashboard</h2>

            <div style={{
              backgroundColor: '#e8f5e9',
              padding: 15,
              borderRadius: 4,
              marginBottom: 15,
              border: '1px solid #c8e6c9',
               color: 'grey'
            }}>
              <strong>Live Status:</strong> {liveProgress}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10
            }}>
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: 15,
                borderRadius: 4,
                textAlign: 'center',
                 color: 'grey'
              }}>
                <div style={{ fontSize: '12px', color: '#1976d2' }}>Objects</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'grey'  }}>{objectCount}</div>
              </div>

              <div style={{
                backgroundColor: '#fff3e0',
                padding: 15,
                borderRadius: 4,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#f57c00' }}>Speed</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' , color: 'grey' }}>
                  {currentSpeed.toFixed(2)} m/min
                </div>
              </div>

              <div style={{
                backgroundColor: '#f3e5f5',
                padding: 15,
                borderRadius: 4,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#7b1fa2' }}>Alignment</div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'grey'
                }}>
                  {getAlignmentStatus()}
                </div>
              </div>

              <div style={{
                backgroundColor: '#e8f5e9',
                padding: 15,
                borderRadius: 4,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: 'grey' }}>Job ID</div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  wordBreak: 'break-all',
                  color: 'grey'
                }}>
                  {jobId || 'N/A'}
                </div>
              </div>
            </div>

            {/* Alignment Details */}
            {alignmentData && (
              <div style={{ marginTop: 15 }}>
                <h4>Alignment Details:</h4>
                <div style={{
                  backgroundColor: 'white',
                  padding: 10,
                  borderRadius: 4,
                  fontSize: '12px',
                  color:'black'
                }}>
                  <div>Horizontal Deviation: {alignmentData.horizontal_deviation} px</div>
                  <div>Rotation Angle: {alignmentData.rotation_angle?.toFixed(1) || 0}°</div>
                  <div>Belt Width: {alignmentData.belt_width} px</div>
                  <div>Belt Center: {alignmentData.belt_center} px</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Video Displays */}
        <div>
          {/* Live Video Display */}
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: 20,
            borderRadius: 8,
            marginBottom: 20
          }}>
            <h2>Live Processed Video</h2>
            <div style={{
              backgroundColor: '#000',
              borderRadius: 4,
              overflow: 'hidden',
              minHeight: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color:'black'
            }}>
              {currentFrame ? (
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px'
                  }}
                />
              ) : (
                <div style={{ color: '#666', textAlign: 'center' }}>
                  {isProcessing
                    ? 'Processing video...'
                    : isReplaying
                      ? 'In replay mode'
                      : 'No video stream'}
                </div>
              )}
            </div>
          </div>

          {/* Replay Video Display */}
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: 20,
            borderRadius: 8,
            color:'black'
          }}>
            <h2>Replay Video</h2>
            <div style={{
              backgroundColor: '#000',
              borderRadius: 4,
              overflow: 'hidden',
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color:'black'
            }}>
              {isReplaying || replayFrames.length > 0 ? (
                <canvas
                  ref={replayCanvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px'
                  }}
                />
              ) : (
                <div style={{ color: '#666', textAlign: 'center' }}>
                  Start replay to see processed frames
                </div>
              )}
            </div>

            {/* Replay Info */}
            {isReplaying && (
              <div style={{
                marginTop: 10,
                padding: 10,
                backgroundColor: '#e3f2fd',
                borderRadius: 4,
                fontSize: '14px',
                color:'black'
              }}>
                <div>Playing at {replaySpeed}x speed</div>
                <div>Frame: {replayPosition + 1} / {replayFrames.length}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Information */}
      <div style={{
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        color:'black'
      }}>
        <h3>System Information</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          marginTop: 10,
          color:'black'
        }}>
          <div>
            <strong>Conveyor Belt Detection:</strong> Active
          </div>
          <div>
            <strong>Speed Calculation:</strong> Optical Flow
          </div>
          <div>
            <strong>Alignment Monitoring:</strong> {alignmentData ? 'Active' : 'Inactive'}
          </div>
          <div>
            <strong>Object Detection:</strong> Edge Detection
          </div>
          <div>
            <strong>Replay Buffer:</strong> {replayFrames.length} frames
          </div>
          <div>
            <strong>WebSocket Status:</strong> {wsRef.current?.readyState === 1 ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
    </div>
  );
}