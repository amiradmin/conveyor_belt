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

  // Live metrics - updated for belt detection
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

  // Historical data for charts
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [frameNumber, setFrameNumber] = useState(0);
  const [progress, setProgress] = useState(0);

  // Replay states
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1.0);

  // WebSocket and canvas refs
  const wsRef = useRef(null);
  const canvasRef = useRef(null);

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

  useEffect(() => {
    fetchVideos();
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, []);

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

    wsRef.current.onopen = () => {
      console.log("WebSocket connected for belt monitoring");
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket disconnected");
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
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

  const handleProgressData = (data) => {
    setFrameNumber(data.frame);
    setProgress(data.progress);

    if (data.belt_metrics) {
      setBeltMetrics(data.belt_metrics);

      // Add to history for charts (keep last 100 points)
      setMetricsHistory(prev => {
        const newHistory = [...prev, {
          frame: data.frame,
          speed: data.belt_metrics.speed || 0,
          avg_speed: data.belt_metrics.avg_speed || 0,
          alignment: Math.abs(data.belt_metrics.alignment_deviation || 0),
          vibration: data.belt_metrics.vibration_amplitude || 0,
          timestamp: new Date().toLocaleTimeString()
        }];

        return newHistory.slice(-100); // Keep only last 100 entries
      });
    }

    if (data.frame_image) {
      setCurrentFrame(data.frame_image);
      drawFrame(data.frame_image, data.belt_metrics);
    }

    if (data.is_final) {
      setIsProcessing(false);
      console.log("Processing completed");
    }
  };

  const drawFrame = (base64Image, metrics) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;

      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw metrics overlay only if belt is detected
      if (metrics && metrics.belt_found) {
        drawMetricsOverlay(ctx, canvas, metrics);
      } else if (metrics) {
        drawNoBeltOverlay(ctx, canvas);
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

    // Avg Speed
    drawMetricText(ctx, 20, yPos, `Avg Speed: ${metrics.avg_speed?.toFixed(2) || 0} m/min`,
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

    // Avg Alignment
    drawMetricText(ctx, 20, yPos,
                   `Avg Alignment: ${metrics.avg_alignment?.toFixed(1) || 0} px`,
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

  const drawNoBeltOverlay = (ctx, canvas) => {
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 320, 100);

    // Draw warning text
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 20px Arial';
    ctx.fillText("⚠️ NO BELT DETECTED", 20, 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.fillText("Adjust camera angle or lighting", 20, 80);
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
      console.log("Processing started with job ID:", response.data.job_id);
    } catch (error) {
      console.error("Error starting processing:", error);
      setIsProcessing(false);
    }
  };

  const stopProcessing = async () => {
    if (!jobId) return;

    try {
      await axios.post("http://localhost:8000/api/vision/stop/", {
        job_id: jobId
      });
      setIsProcessing(false);
      console.log("Processing stopped");
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

  const getAlignmentChartData = () => {
    return metricsHistory.map((point, index) => ({
      name: point.timestamp,
      alignment: point.alignment
    }));
  };

  const getVibrationChartData = () => {
    return metricsHistory.map((point, index) => ({
      name: point.timestamp,
      vibration: point.vibration
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

  const getBeltDetectionData = () => {
    return [
      {
        name: 'Detected',
        value: beltMetrics.belt_found ? 100 : 0,
        color: COLORS.good
      },
      {
        name: 'Not Detected',
        value: beltMetrics.belt_found ? 0 : 100,
        color: COLORS.danger
      }
    ];
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333', marginBottom: '30px' }}>
        🏭 Conveyor Belt Monitoring System
      </h1>

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
                    {video.filename || video.path}
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

            {jobId && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#E8F5E9',
                borderRadius: '5px',
                fontSize: '14px'
              }}>
                <strong>Job ID:</strong> {jobId}
              </div>
            )}
          </div>

          {/* Live Video Feed */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '15px', color: '#333' }}>Live Monitoring</h2>
            <div style={{
              backgroundColor: '#000',
              borderRadius: '5px',
              overflow: 'hidden',
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
                <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  {isProcessing
                    ? '📹 Processing video feed...'
                    : '🎥 Ready to start monitoring'}
                  <div style={{ fontSize: '14px', marginTop: '10px' }}>
                    Frame: {frameNumber} | Progress: {progress}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Metrics Dashboard */}
        <div>
          {/* Key Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '15px',
            marginBottom: '20px'
          }}>
            {/* Speed Card */}
            <MetricCard
              title="Belt Speed"
              value={`${beltMetrics.speed?.toFixed(2) || 0}`}
              unit="m/min"
              color={COLORS.speed}
              icon="⚡"
              subValue={`Avg: ${beltMetrics.avg_speed?.toFixed(2) || 0} m/min`}
            />

            {/* Vibration Card */}
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

            {/* Alignment Card */}
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

            {/* Belt Width Card */}
            <MetricCard
              title="Belt Width"
              value={`${beltMetrics.belt_width?.toFixed(1) || 0}`}
              unit="pixels"
              color={COLORS.info}
              icon="📏"
              subValue={beltMetrics.belt_found ? "Detected" : "Not detected"}
            />

            {/* Belt Detection Card */}
            <MetricCard
              title="Belt Detection"
              value={beltMetrics.belt_found ? "YES" : "NO"}
              unit=""
              color={beltMetrics.belt_found ? COLORS.good : COLORS.danger}
              icon="🔍"
              subValue={`Frame: ${beltMetrics.frame_number || 0}`}
            />

            {/* System Health Card */}
            <MetricCard
              title="System Health"
              value={
                beltMetrics.vibration_severity === 'Low' &&
                Math.abs(beltMetrics.alignment_deviation) <= 20 ?
                "GOOD" : "CHECK"
              }
              unit=""
              color={
                beltMetrics.vibration_severity === 'Low' &&
                Math.abs(beltMetrics.alignment_deviation) <= 20 ?
                COLORS.good : COLORS.warning
              }
              icon="❤️"
              subValue={
                beltMetrics.vibration_severity === 'Low' &&
                Math.abs(beltMetrics.alignment_deviation) <= 20 ?
                "All systems normal" : "Needs attention"
              }
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
              {/* Speed Chart */}
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
                      name="Current Speed"
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_speed"
                      stroke={COLORS.info}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Average Speed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Vibration Chart */}
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
                      name="Vibration Amplitude"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Belt Health Pie Chart */}
              <div>
                <h4 style={{ marginBottom: '10px' }}>Belt Health Status</h4>
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

              {/* Belt Detection Pie Chart */}
              <div>
                <h4 style={{ marginBottom: '10px' }}>Belt Detection Status</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={getBeltDetectionData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getBeltDetectionData().map((entry, index) => (
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

          {/* System Status */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '15px', color: '#333' }}>System Status</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <StatusItem
                label="Processing"
                value={isProcessing ? 'Active' : 'Idle'}
                status={isProcessing ? 'active' : 'idle'}
              />
              <StatusItem
                label="WebSocket"
                value={wsRef.current?.readyState === 1 ? 'Connected' : 'Disconnected'}
                status={wsRef.current?.readyState === 1 ? 'active' : 'inactive'}
              />
              <StatusItem
                label="Frame Rate"
                value={metricsHistory.length > 1 ? '~30 FPS' : 'N/A'}
                status="info"
              />
              <StatusItem
                label="Total Frames"
                value={frameNumber}
                status="info"
              />
              <StatusItem
                label="Progress"
                value={`${progress}%`}
                status={progress === 100 ? 'complete' : 'processing'}
              />
              <StatusItem
                label="Data Points"
                value={`${metricsHistory.length}`}
                status="info"
              />
              <StatusItem
                label="Belt Detected"
                value={beltMetrics.belt_found ? 'Yes' : 'No'}
                status={beltMetrics.belt_found ? 'active' : 'inactive'}
              />
              <StatusItem
                label="Video"
                value={selectedVideo ? 'Loaded' : 'Not Loaded'}
                status={selectedVideo ? 'active' : 'inactive'}
              />
            </div>

            {/* Warnings Section */}
            {(beltMetrics.vibration_severity === 'High' || Math.abs(beltMetrics.alignment_deviation) > 50 || !beltMetrics.belt_found) && (
              <div style={{
                marginTop: '15px',
                padding: '15px',
                backgroundColor: '#FFF3CD',
                border: '1px solid #FFEAA7',
                borderRadius: '5px'
              }}>
                <h4 style={{ color: '#856404', marginBottom: '10px' }}>⚠️ Alerts</h4>
                <ul style={{ color: '#856404', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                  {!beltMetrics.belt_found && (
                    <li>• Belt not detected in current frame</li>
                  )}
                  {beltMetrics.vibration_severity === 'High' && (
                    <li>• High vibration detected - Check belt tension and rollers</li>
                  )}
                  {beltMetrics.vibration_severity === 'Medium' && (
                    <li>• Moderate vibration detected - Monitor closely</li>
                  )}
                  {Math.abs(beltMetrics.alignment_deviation) > 50 && (
                    <li>• Belt misalignment detected - Adjust tracking system</li>
                  )}
                  {Math.abs(beltMetrics.alignment_deviation) > 20 && Math.abs(beltMetrics.alignment_deviation) <= 50 && (
                    <li>• Minor alignment deviation - Monitor trend</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components - Updated with subValue support
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

const StatusItem = ({ label, value, status }) => {
  const statusColors = {
    active: '#4CAF50',
    inactive: '#F44336',
    idle: '#FF9800',
    processing: '#2196F3',
    complete: '#4CAF50',
    info: '#607D8B'
  };

  return (
    <div style={{
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '5px'
    }}>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        color: statusColors[status] || '#333'
      }}>
        {value}
      </div>
    </div>
  );
};