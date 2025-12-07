// ConveyorBeltMonitoring.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function ConveyorBeltMonitoring() {
  // State variables
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);

  // Live metrics
  const [currentFrame, setCurrentFrame] = useState(null);
  const [beltMetrics, setBeltMetrics] = useState({
    speed: 0,
    avg_speed: 0,
    alignment_deviation: 0,
    avg_alignment: 0,
    vibration_amplitude: 0,
    vibration_frequency: 0,
    vibration_severity: 'Low',
    belt_width: 0,
    belt_found: false,
    frame_number: 0
  });

  // Performance tracking
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [frameNumber, setFrameNumber] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentFPS, setCurrentFPS] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const videoContainerRef = useRef(null);
  const frameTimesRef = useRef([]);
  const frameBufferRef = useRef([]);
  const lastFrameTimeRef = useRef(0);

  // Color constants
  const COLORS = {
    good: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    info: '#2196F3',
    speed: '#FF5722',
    vibration: '#9C27B0',
    alignment: '#3F51B5',
    weight: '#795548',
    load: '#607D8B'
  };

  // Initialize
  useEffect(() => {
    fetchVideos();
    connectWebSocket();

    // Fullscreen event listeners
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Cleanup
    return () => {
      disconnectWebSocket();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  };

  const fetchVideos = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/vision/videos/");
      if (response.data.available_videos) {
        setVideos(response.data.available_videos);
        if (response.data.available_videos.length > 0) {
          setSelectedVideo(response.data.available_videos[0].path);
        }
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  const connectWebSocket = () => {
    disconnectWebSocket();

    wsRef.current = new WebSocket("ws://localhost:8000/ws/vision/progress/");
    setConnectionStatus("connecting");

    wsRef.current.onopen = () => {
      console.log("✅ WebSocket connected for belt monitoring");
      setConnectionStatus("connected");

      // Send ping to test connection
      wsRef.current.send(JSON.stringify({
        command: 'ping',
        timestamp: Date.now()
      }));
    };

    wsRef.current.onclose = () => {
      console.log("❌ WebSocket disconnected");
      setConnectionStatus("disconnected");

      // Try to reconnect after 3 seconds
      setTimeout(() => {
        if (!isProcessing) return;
        console.log("🔄 Attempting to reconnect WebSocket...");
        connectWebSocket();
      }, 3000);
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("error");
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch(data.type) {
          case "progress":
            handleProgressData(data);
            break;
          case "error":
            console.error("Processing error:", data.error);
            setIsProcessing(false);
            setConnectionStatus("error");
            break;
          case "pong":
            // Connection test successful
            console.log("✅ WebSocket connection verified");
            break;
          case "status":
            console.log("WebSocket status:", data);
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
    setConnectionStatus("disconnected");
  };

  const handleProgressData = (data) => {
    // Update FPS calculation
    const now = Date.now();
    frameTimesRef.current.push(now);

    // Keep last 60 frame times (2 seconds at 30fps)
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Calculate FPS
    if (frameTimesRef.current.length >= 2) {
      const timeDiff = frameTimesRef.current[frameTimesRef.current.length - 1] -
                      frameTimesRef.current[0];
      const calculatedFPS = (frameTimesRef.current.length - 1) / (timeDiff / 1000);
      setCurrentFPS(Math.round(calculatedFPS));
    }

    // Update metrics
    setFrameNumber(data.frame);
    setProgress(data.progress);

    if (data.belt_metrics) {
      setBeltMetrics(data.belt_metrics);

      // Add to history for charts
      setMetricsHistory(prev => {
        const newHistory = [...prev, {
          frame: data.frame,
          speed: data.belt_metrics.speed || 0,
          avg_speed: data.belt_metrics.avg_speed || 0,
          alignment: Math.abs(data.belt_metrics.alignment_deviation || 0),
          vibration: data.belt_metrics.vibration_amplitude || 0,
          timestamp: new Date().toLocaleTimeString(),
          fps: data.fps || 0
        }];

        return newHistory.slice(-100);
      });
    }

    // Draw frame immediately
    if (data.frame_image) {
      setCurrentFrame(data.frame_image);
      drawFrame(data.frame_image, data.belt_metrics);
    }

    if (data.is_final) {
      setIsProcessing(false);
      console.log("✅ Processing completed");
    }
  };

  const drawFrame = (base64Image, metrics) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Create image and draw immediately
    const img = new Image();
    img.onload = () => {
      // Update canvas size if needed
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Clear and draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw metrics overlay if belt is detected
      if (metrics && metrics.belt_found) {
        drawMetricsOverlay(ctx, canvas, metrics);
      }
    };

    img.src = `data:image/jpeg;base64,${base64Image}`;
  };

  const drawMetricsOverlay = (ctx, canvas, metrics) => {
    const deviation = metrics.alignment_deviation || 0;
    const vibration = metrics.vibration_severity || 'Low';

    // Draw semi-transparent overlay for text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 320, 200);

    // Draw metrics text
    let yPos = 35;
    const lineHeight = 25;

    // Speed
    drawMetricText(ctx, 20, yPos, `Speed: ${metrics.speed?.toFixed(2) || 0} m/min`,
                   COLORS.speed, 'bold 16px Arial');
    yPos += lineHeight;

    // Vibration
    const vibrationColor = vibration === 'High' ? COLORS.danger :
                          vibration === 'Medium' ? COLORS.warning :
                          COLORS.good;
    drawMetricText(ctx, 20, yPos,
                   `Vibration: ${vibration} (${metrics.vibration_amplitude?.toFixed(3) || 0})`,
                   vibrationColor, 'bold 16px Arial');
    yPos += lineHeight;

    // Alignment
    const alignmentColor = Math.abs(deviation) <= 20 ? COLORS.good :
                          Math.abs(deviation) <= 50 ? COLORS.warning :
                          COLORS.danger;
    drawMetricText(ctx, 20, yPos,
                   `Alignment: ${deviation} px`,
                   alignmentColor, 'bold 16px Arial');
    yPos += lineHeight;

    // Belt Width
    drawMetricText(ctx, 20, yPos,
                   `Belt Width: ${metrics.belt_width?.toFixed(1) || 0} px`,
                   COLORS.info, 'bold 16px Arial');
    yPos += lineHeight;

    // Frame Number
    drawMetricText(ctx, 20, yPos,
                   `Frame: ${metrics.frame_number || 0}`,
                   '#FFFFFF', 'bold 16px Arial');

    // Draw warnings if needed
    if (Math.abs(deviation) > 50) {
      drawWarning(ctx, canvas, "⚠️ BELT MISALIGNED!", COLORS.danger);
    }

    if (vibration === 'High') {
      drawWarning(ctx, canvas, "⚠️ HIGH VIBRATION DETECTED!", COLORS.danger, 80);
    }
  };

  const drawMetricText = (ctx, x, y, text, color, font) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };

  const drawWarning = (ctx, canvas, text, color, yOffset = 40) => {
    ctx.font = 'bold 20px Arial';
    const textWidth = ctx.measureText(text).width;
    const x = canvas.width - textWidth - 20;

    // Draw warning background
    ctx.fillStyle = color;
    ctx.fillRect(x - 10, yOffset - 25, textWidth + 20, 30);

    // Draw warning text
    ctx.fillStyle = 'white';
    ctx.fillText(text, x, yOffset);
  };

  const startProcessing = async () => {
    if (!selectedVideo) {
      alert("Please select a video first");
      return;
    }

    setIsProcessing(true);
    setMetricsHistory([]);
    setCurrentFrame(null);
    setCurrentFPS(0);
    frameTimesRef.current = [];

    // Reset metrics
    setBeltMetrics({
      speed: 0,
      avg_speed: 0,
      alignment_deviation: 0,
      avg_alignment: 0,
      vibration_amplitude: 0,
      vibration_frequency: 0,
      vibration_severity: 'Low',
      belt_width: 0,
      belt_found: false,
      frame_number: 0
    });

    try {
      const response = await axios.post("http://localhost:8000/api/vision/start/", {
        video_path: selectedVideo
      });

      setJobId(response.data.job_id);
      console.log("✅ Processing started with job ID:", response.data.job_id);

      // Ensure WebSocket is connected
      if (connectionStatus !== "connected") {
        connectWebSocket();
      }

    } catch (error) {
      console.error("❌ Error starting processing:", error);
      setIsProcessing(false);
      alert(`Failed to start processing: ${error.message}`);
    }
  };

  const stopProcessing = async () => {
    if (!jobId) return;

    try {
      await axios.post("http://localhost:8000/api/vision/stop/", {
        job_id: jobId
      });
      setIsProcessing(false);
      console.log("⏹️ Processing stopped");
    } catch (error) {
      console.error("Error stopping processing:", error);
    }
  };

  // Chart data preparation
  const getSpeedChartData = () => {
    return metricsHistory.map((point, index) => ({
      name: point.timestamp,
      speed: point.speed,
      avg_speed: point.avg_speed
    }));
  };

  const getVibrationChartData = () => {
    return metricsHistory.map((point, index) => ({
      name: point.timestamp,
      vibration: point.vibration
    }));
  };

  const getFPSChartData = () => {
    return metricsHistory.map((point, index) => ({
      name: point.timestamp,
      fps: point.fps || currentFPS
    }));
  };

  const getBeltStatusData = () => {
    const isHealthy =
      beltMetrics.vibration_severity === 'Low' &&
      Math.abs(beltMetrics.alignment_deviation) <= 20;

    return [
      {
        name: 'Healthy',
        value: isHealthy ? 100 : 0,
        color: COLORS.good
      },
      {
        name: 'Needs Attention',
        value: isHealthy ? 0 : 100,
        color: beltMetrics.vibration_severity === 'High' ||
               Math.abs(beltMetrics.alignment_deviation) > 50 ?
               COLORS.danger : COLORS.warning
      }
    ];
  };

  const getConnectionStatusColor = () => {
    switch(connectionStatus) {
      case "connected": return COLORS.good;
      case "connecting": return COLORS.warning;
      case "error": return COLORS.danger;
      default: return "#666";
    }
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333', marginBottom: '10px' }}>
        🏭 Conveyor Belt Monitoring System
      </h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Real-time belt speed, vibration, and alignment monitoring
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Left Column - Controls and Video */}
        <div>
          {/* Video Selection and Controls */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ marginBottom: '15px', color: '#333' }}>Video Controls</h2>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Select Video:
              </label>
              <select
                value={selectedVideo}
                onChange={e => setSelectedVideo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  backgroundColor: isProcessing ? '#f5f5f5' : 'white'
                }}
                disabled={isProcessing}
              >
                {videos.map(video => (
                  <option key={video.path} value={video.path}>
                    {video.filename} ({video.size_mb})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={startProcessing}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: isProcessing ? '#ccc' : COLORS.info,
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
                disabled={isProcessing}
              >
                {isProcessing ? '🔄 Processing...' : '▶️ Start Monitoring'}
              </button>

              {isProcessing && (
                <button
                  onClick={stopProcessing}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: COLORS.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ⏹️ Stop
                </button>
              )}
            </div>

            {/* Connection Status */}
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>WebSocket:</span>
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  backgroundColor: getConnectionStatusColor(),
                  color: 'white',
                  borderRadius: '3px',
                  fontSize: '12px'
                }}>
                  {connectionStatus.toUpperCase()}
                </span>
              </div>

              {jobId && (
                <div>
                  <span style={{ fontWeight: 'bold' }}>Job ID:</span>
                  <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                    {jobId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Live Video Feed */}
          <div
            ref={videoContainerRef}
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              ...(isFullscreen && {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999,
                backgroundColor: '#000',
                padding: '20px'
              })
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div>
                <h2 style={{ color: '#333', margin: 0 }}>
                  {isFullscreen ? '🔍 FULL SCREEN - Live Monitoring' : 'Live Monitoring'}
                </h2>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Stream: <span style={{
                    fontWeight: 'bold',
                    color: currentFPS >= 25 ? '#4CAF50' :
                           currentFPS >= 15 ? '#FF9800' : '#F44336'
                  }}>
                    {currentFPS} FPS
                  </span> | Frame: {frameNumber} | Progress: {progress}%
                </div>
              </div>

              <button
                onClick={toggleFullscreen}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isFullscreen ? COLORS.danger : COLORS.info,
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
              >
                {isFullscreen ? (
                  <>
                    <span>✕</span>
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <span>⛶</span>
                    Fullscreen
                  </>
                )}
              </button>
            </div>

            <div style={{
              backgroundColor: '#000',
              borderRadius: '5px',
              overflow: 'hidden',
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {currentFrame ? (
                <>
                  <canvas
                    ref={canvasRef}
                    style={{
                      maxWidth: '100%',
                      maxHeight: isFullscreen ? '85vh' : '400px',
                      display: 'block'
                    }}
                  />

                  {isFullscreen && (
                    <div style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      padding: '10px 20px',
                      borderRadius: '5px'
                    }}>
                      <div style={{ color: 'white', fontSize: '14px' }}>
                        Frame: {frameNumber} | FPS: {currentFPS} | Progress: {progress}%
                      </div>
                      <button
                        onClick={toggleFullscreen}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: COLORS.danger,
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Exit (ESC)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  {isProcessing ? (
                    <>
                      <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
                      <div>Processing video stream...</div>
                      <div style={{ fontSize: '14px', marginTop: '10px' }}>
                        Frame: {frameNumber} | FPS: {currentFPS} | Progress: {progress}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎥</div>
                      <div>Ready to start monitoring</div>
                      <div style={{ fontSize: '14px', marginTop: '10px' }}>
                        Select a video and click "Start Monitoring"
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Metrics Dashboard */}
        <div style={{ display: isFullscreen ? 'none' : 'block' }}>
          {/* Performance Metrics */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ marginBottom: '15px', color: '#333' }}>Stream Performance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <MetricCard
                title="Current FPS"
                value={currentFPS}
                unit=""
                color={currentFPS >= 25 ? COLORS.good :
                       currentFPS >= 15 ? COLORS.warning : COLORS.danger}
                icon="⚡"
                subValue={currentFPS >= 25 ? "Excellent" :
                         currentFPS >= 15 ? "Good" : "Poor"}
              />

              <MetricCard
                title="Connection"
                value={connectionStatus}
                unit=""
                color={getConnectionStatusColor()}
                icon="📡"
                subValue={connectionStatus === "connected" ? "Stable" : "Unstable"}
              />

              <MetricCard
                title="Frames Processed"
                value={frameNumber}
                unit=""
                color={COLORS.info}
                icon="🎞️"
                subValue={`Progress: ${progress}%`}
              />

              <MetricCard
                title="Data Points"
                value={metricsHistory.length}
                unit=""
                color="#795548"
                icon="📊"
                subValue="Last 100 frames"
              />
            </div>
          </div>

          {/* Belt Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <MetricCard
              title="Belt Speed"
              value={`${beltMetrics.speed?.toFixed(2) || 0}`}
              unit="m/min"
              color={COLORS.speed}
              icon="⚡"
              subValue={`Avg: ${beltMetrics.avg_speed?.toFixed(2) || 0} m/min`}
            />

            <MetricCard
              title="Vibration"
              value={beltMetrics.vibration_severity || 'Low'}
              unit={`(${beltMetrics.vibration_amplitude?.toFixed(3) || 0})`}
              color={beltMetrics.vibration_severity === 'High' ? COLORS.danger :
                     beltMetrics.vibration_severity === 'Medium' ? COLORS.warning :
                     COLORS.good}
              icon="📳"
              subValue={`Freq: ${beltMetrics.vibration_frequency?.toFixed(2) || 0} Hz`}
            />

            <MetricCard
              title="Alignment"
              value={`${beltMetrics.alignment_deviation || 0}`}
              unit="px deviation"
              color={Math.abs(beltMetrics.alignment_deviation || 0) <= 20 ? COLORS.good :
                     Math.abs(beltMetrics.alignment_deviation || 0) <= 50 ? COLORS.warning :
                     COLORS.danger}
              icon="↔️"
              subValue={`Avg: ${beltMetrics.avg_alignment?.toFixed(1) || 0} px`}
            />

            <MetricCard
              title="Belt Detection"
              value={beltMetrics.belt_found ? "DETECTED" : "NOT FOUND"}
              unit=""
              color={beltMetrics.belt_found ? COLORS.good : COLORS.danger}
              icon="🔍"
              subValue={`Width: ${beltMetrics.belt_width?.toFixed(1) || 0} px`}
            />
          </div>

          {/* Charts */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Performance Trends</h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              <div>
                <h4 style={{ marginBottom: '10px' }}>Speed Over Time</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={getSpeedChartData().slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="speed"
                      stroke={COLORS.speed}
                      strokeWidth={2}
                      dot={false}
                      name="Speed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 style={{ marginBottom: '10px' }}>FPS Over Time</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={getFPSChartData().slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="fps"
                      stroke={COLORS.info}
                      strokeWidth={2}
                      dot={false}
                      name="FPS"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 style={{ marginBottom: '10px' }}>Vibration Levels</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={getVibrationChartData().slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="vibration"
                      fill={COLORS.vibration}
                      name="Vibration"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 style={{ marginBottom: '10px' }}>Belt Health</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={getBeltStatusData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getBeltStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: '20px',
        textAlign: 'center',
        color: '#666',
        fontSize: '14px',
        padding: '10px',
        borderTop: '1px solid #ddd'
      }}>
        <p>Conveyor Belt Monitoring System • Real-time Processing • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

// Helper Components
const MetricCard = ({ title, value, unit, color, icon, subValue }) => (
  <div style={{
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '10px'
    }}>
      <div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
          {title}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: color }}>
          {value} <span style={{ fontSize: '14px', color: '#666' }}>{unit}</span>
        </div>
        {subValue && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {subValue}
          </div>
        )}
      </div>
      <div style={{ fontSize: '24px' }}>
        {icon}
      </div>
    </div>
  </div>
);