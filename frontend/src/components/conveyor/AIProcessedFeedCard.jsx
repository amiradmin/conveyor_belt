import React, { useCallback, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './VideoProcessingSection.module.css';

const AIProcessedFeedCard = ({
  isProcessing = false,
  streamingMode = 'frames',
  processedVideoUrl = null,
  processedVideoRef = null,
  currentDisplayFrame = null,
  processedFrames = [],
  currentFrameIndex = 0,
  processedFrame = null,
  analysisResults = null,
  frameCount = 0,
  currentFPS = 0,
  processingFPS = 2,
  processingProgress = 0,
  switchToFrameMode = () => {},
  switchToVideoMode = () => {},
  takeProcessedSnapshot = () => {},
  handleProcessedVideoLoaded = () => {},
  handleProcessedVideoError = () => {},
  // New props for video handling
  processVideoFile = () => {},
  toggleVideoProcessing = () => {},
  setIsProcessing = () => {},  // Add this prop to update parent state
  setProcessedFrames = () => {},  // Add this prop to update parent state
  setCurrentFPS = () => {},  // Add this prop to update parent state
  setProcessingProgress = () => {},  // Add this prop to update parent state
  setCurrentDisplayFrame = () => {}  // Add this prop to update parent state
}) => {
  // State from ConveyorBeltMonitoring
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShow, setIsShow] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [localProcessedFrames, setLocalProcessedFrames] = useState([]);
  const [localCurrentFPS, setLocalCurrentFPS] = useState(0);
  const [localProcessingProgress, setLocalProcessingProgress] = useState(0);
  const [localCurrentDisplayFrame, setLocalCurrentDisplayFrame] = useState(null);
  const [localFrameIndex, setLocalFrameIndex] = useState(0);
  const [localFrameCount, setLocalFrameCount] = useState(0);

  // Refs
  const wsRef = useRef(null);
  const videoContainerRef = useRef(null);
  const frameTimesRef = useRef([]);

  // Fetch videos on component mount
  const fetchVideos = async () => {
    setIsLoadingVideos(true);
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
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Connect WebSocket on component mount
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

    return () => {
      disconnectWebSocket();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // WebSocket functions from ConveyorBeltMonitoring
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
        if (isProcessing) {
          console.log("🔄 Attempting to reconnect WebSocket...");
          connectWebSocket();
        }
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
      const newFPS = Math.round(calculatedFPS);
      setLocalCurrentFPS(newFPS);
      setCurrentFPS(newFPS);
    }

    // Update progress
    if (data.progress !== undefined) {
      const newProgress = Math.min(100, Math.max(0, data.progress));
      setLocalProcessingProgress(newProgress);
      setProcessingProgress(newProgress);
    }

    // Update metrics
    if (data.belt_metrics) {
      setBeltMetrics(data.belt_metrics);
    }

    // Handle frame image if available
    if (data.frame_image) {
      // Create base64 image URL
      const frameUrl = `data:image/jpeg;base64,${data.frame_image}`;

      // Update processed frames array
      const newFrames = [...localProcessedFrames, frameUrl];
      // Keep only last 100 frames to avoid memory issues
      const trimmedFrames = newFrames.slice(-100);
      setLocalProcessedFrames(trimmedFrames);
      setProcessedFrames(trimmedFrames);

      // Update current display frame (show the latest frame)
      setLocalCurrentDisplayFrame(frameUrl);
      setCurrentDisplayFrame(frameUrl);

      // Update frame index and count
      const newFrameIndex = localFrameIndex + 1;
      const newFrameCount = localFrameCount + 1;
      setLocalFrameIndex(newFrameIndex);
      setLocalFrameCount(newFrameCount);
    }

    if (data.is_final) {
      setIsProcessing(false);
      console.log("✅ Processing completed");

      // Show completion message
      if (data.processed_video_url) {
        console.log("Processed video available at:", data.processed_video_url);
        // You might want to update processedVideoUrl here
      }
    }
  };

  // Start processing function
  const startProcessing = async () => {
    if (!selectedVideo) {
      alert("Please select a video first");
      return;
    }

    // Reset states
    setIsProcessing(true);
    setLocalProcessedFrames([]);
    setProcessedFrames([]);
    setLocalCurrentFPS(0);
    setCurrentFPS(0);
    setLocalProcessingProgress(0);
    setProcessingProgress(0);
    setLocalCurrentDisplayFrame(null);
    setCurrentDisplayFrame(null);
    setLocalFrameIndex(0);
    setLocalFrameCount(0);
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

      // Optionally call parent's processVideoFile function if needed
      if (processVideoFile) {
        await processVideoFile(selectedVideo);
      }

      // Automatically start AI processing to show frames immediately
      if (toggleVideoProcessing) {
        // Small delay to ensure video processing has started
        setTimeout(() => {
          toggleVideoProcessing();
        }, 500);
      }

    } catch (error) {
      console.error("❌ Error starting processing:", error);
      setIsProcessing(false);
      alert(`Failed to start processing: ${error.message}`);
    }
  };

  // Stop processing function
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

  // Fullscreen toggle
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

  // Toggle show/hide controls
  const toggleControls = () => {
    setIsShow(!isShow);
  };

  // Refresh videos list
  const handleRefreshVideos = async () => {
    await fetchVideos();
  };

  // Get connection status color
  const getConnectionStatusColor = () => {
    switch(connectionStatus) {
      case "connected": return '#4CAF50';
      case "connecting": return '#FF9800';
      case "error": return '#F44336';
      default: return "#666";
    }
  };

  const handleImageLoad = useCallback((e) => {
    // Your existing handleImageLoad function...
    const img = e.target;
    const container = img.parentElement;

    if (container && analysisResults?.objects && analysisResults.objects.length > 0) {
      const existingCanvas = container.querySelector('.bounding-box-overlay');
      if (existingCanvas) {
        existingCanvas.remove();
      }

      const canvas = document.createElement('canvas');
      canvas.className = 'bounding-box-overlay';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '10';

      const imgWidth = img.naturalWidth || img.width || 640;
      const imgHeight = img.naturalHeight || img.height || 480;
      canvas.width = imgWidth;
      canvas.height = imgHeight;

      const ctx = canvas.getContext('2d');

      analysisResults.objects.forEach((obj, index) => {
        if (obj.bbox && Array.isArray(obj.bbox) && obj.bbox.length >= 4) {
          const [x1, y1, x2, y2] = obj.bbox;

          if (obj.contour && Array.isArray(obj.contour) && obj.contour.length > 0) {
            ctx.beginPath();
            ctx.moveTo(obj.contour[0][0], obj.contour[0][1]);
            for (let i = 1; i < obj.contour.length; i++) {
              ctx.lineTo(obj.contour[i][0], obj.contour[i][1]);
            }
            ctx.closePath();

            ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.fill();

            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.stroke();
          } else {
            const width = x2 - x1;
            const height = y2 - y1;

            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.strokeRect(x1, y1, width, height);

            ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.fillRect(x1, y1, width, height);
          }

          if (obj.confidence !== undefined) {
            const label = `Rock ${obj.id || index + 1} (${Math.round(obj.confidence * 100)}%)`;

            ctx.font = 'bold 18px Arial';
            const labelMetrics = ctx.measureText(label);
            const labelWidth = labelMetrics.width + 20;
            const labelHeight = 26;
            const labelX = Math.max(0, Math.min(x1, imgWidth - labelWidth));
            const labelY = Math.max(labelHeight + 5, y1 - 5);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(labelX, labelY - labelHeight, labelWidth, labelHeight);

            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.strokeRect(labelX, labelY - labelHeight, labelWidth, labelHeight);

            ctx.fillStyle = '#00FF00';
            ctx.fillText(label, labelX + 10, labelY - 6);
          }
        }
      });

      container.appendChild(canvas);
    }

    if (Array.isArray(processedFrames) && processedFrames.length > 1) {
      const nextIndex = (currentFrameIndex + 1) % processedFrames.length;
      const nextFrame = processedFrames[nextIndex];
      if (nextFrame) {
        const preloadImg = new Image();
        preloadImg.src = nextFrame;
      }
    }
  }, [analysisResults, processedFrames, currentFrameIndex]);

  // Use local state for display if parent state is not provided
  const displayFrame = currentDisplayFrame || localCurrentDisplayFrame;
  const displayFrames = processedFrames.length > 0 ? processedFrames : localProcessedFrames;
  const displayFPS = currentFPS || localCurrentFPS;
  const displayProgress = processingProgress || localProcessingProgress;
  const displayFrameCount = frameCount || localFrameCount;

  return (
    <div className={`${styles.videoCard} ${styles.processedFeed}`}>
      <div className={styles.cardHeader}>
        <h4>
          <span className={`${styles.statusIndicator} ${styles.green}`}></span>
          AI Processed Feed
        </h4>
        <div className={styles.aiBadge}>
          <span className={styles.pulseIcon}>⚡</span>
          {isProcessing ? `PROCESSING ${Math.round(displayProgress)}%` :
           streamingMode === 'video' ? 'VIDEO' :
           `REALTIME ${displayFPS || processingFPS}FPS`}
        </div>

        {/* Toggle button for controls */}
        <button
          onClick={toggleControls}
          style={{
            position: 'absolute',
            top: '15px',
            right: '205px',
            padding: '6px 12px',
            backgroundColor: 'black',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          {isShow ? 'H' : 'S'}
        </button>
      </div>

      {isShow && (
        <div className={styles.cameraControls} style={{ marginBottom: '10px' }}>
          <div className={styles.videoSelection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Select Video to Process:</label>
              <button
                onClick={handleRefreshVideos}
                disabled={isLoadingVideos}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                title="Refresh video list"
              >
                {isLoadingVideos ? '↻' : '↻'}
              </button>
            </div>
            <select
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              disabled={isProcessing || isLoadingVideos}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: isProcessing ? '#f5f5f5' : 'white'
              }}
            >
              <option value="">-- Select a video --</option>
              {videos.map(video => (
                <option key={video.path} value={video.path}>
                  {video.filename || video.path} ({Math.round(video.size_mb || video.size / 1024)} {video.size_mb ? 'MB' : 'KB'})
                </option>
              ))}
            </select>
            {isLoadingVideos && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Loading videos...
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              className={`${styles.actionBtn} ${styles.processBtn}`}
              onClick={startProcessing}
              disabled={!selectedVideo || isProcessing || isLoadingVideos}
              style={{ flex: 1 }}
            >
              {isProcessing ? (
                <>
                  <div className={styles.processingSpinner}></div>
                  Processing... {Math.round(displayProgress)}%
                </>
              ) : (
                <>
                  <span>🎬</span>
                  Start Monitoring
                </>
              )}
            </button>

            {isProcessing && (
              <button
                onClick={stopProcessing}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#F44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                ⏹️ Stop
              </button>
            )}
          </div>

          {/* Connection Status */}
          <div style={{
            marginTop: '10px',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>Connection:</span>
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                backgroundColor: getConnectionStatusColor(),
                color: 'white',
                borderRadius: '3px',
                fontSize: '11px'
              }}>
                {connectionStatus.toUpperCase()}
              </span>
            </div>

            {jobId && (
              <div>
                <span style={{ fontWeight: 'bold' }}>Job:</span>
                <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                  {jobId.substring(0, 8)}...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.videoContainer} ref={videoContainerRef}>
        {/* Video mode */}
        {streamingMode === 'video' && processedVideoUrl && (
          <div className={styles.videoWrapper}>
            <video
              ref={processedVideoRef}
              src={processedVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              onLoadedData={handleProcessedVideoLoaded}
              onError={handleProcessedVideoError}
              className={styles.processedVideo}
            />
            {isProcessing && (
              <div className={styles.processingOverlay}>
                <div className={styles.processingText}>
                  Processing: {Math.round(displayProgress)}%
                </div>
              </div>
            )}
          </div>
        )}

        {/* Frame mode - optimized for fast streaming with bounding boxes */}
        {streamingMode === 'frames' && displayFrame && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img
              src={displayFrame}
              alt="Processed Feed"
              className={styles.processedImage}
              crossOrigin="anonymous"
              style={{
                imageRendering: 'auto',
                willChange: 'contents',
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onLoad={handleImageLoad}
              onError={(e) => console.error('Processed frame error:', e)}
            />
          </div>
        )}

        {/* Loading/Placeholder */}
        {(!displayFrame || (streamingMode === 'video' && !processedVideoUrl)) && (
          <div className={styles.processingPlaceholder}>
            {isProcessing ? (
              <>
                <div className={styles.spinner}></div>
                <div className={styles.placeholderText}>
                  Processing video: {Math.round(displayProgress)}%
                </div>
                <div className={styles.bufferInfo}>
                  Frames received: {displayFrames.length}
                </div>
                <div className={styles.helpText}>
                  Frames will appear as they are processed...
                </div>
              </>
            ) : (displayFrames.length === 0) ? (
              <>
                <div className={styles.spinner}></div>
                <div className={styles.placeholderText}>
                  {videos.length === 0 ? 'No videos available' : 'Waiting for processed frames...'}
                </div>
                <div className={styles.helpText}>
                  {videos.length === 0 ? 'Add videos to the server directory' : 'Select a video and click "Start Monitoring"'}
                </div>
              </>
            ) : (
              <>
                <div className={styles.spinner}></div>
                <div className={styles.placeholderText}>
                  Loading processed frames...
                </div>
                <div className={styles.bufferInfo}>
                  {displayFrames.length} frames ready
                </div>
              </>
            )}
          </div>
        )}

        {/* Analysis Overlays - Iron Ore Detection */}
        {analysisResults && displayFrame && (
          <>
            <div className={`${styles.analysisOverlay} ${styles.topLeft}`}>
              <span>⚫</span>
              Iron Ore: {analysisResults.object_count || (Array.isArray(analysisResults.objects) ? analysisResults.objects.length : 0) || 0}
            </div>
            <div className={`${styles.analysisOverlay} ${styles.topRight}`}>
              <div className={styles.confidenceValue}>
                {analysisResults.confidence ? `${Math.round(analysisResults.confidence * 100)}%` : '--%'}
              </div>
              <div className={styles.confidenceLabel}>Confidence</div>
            </div>
          </>
        )}

        {/* Fullscreen Toggle Button */}
        {displayFrame && (
          <button
            className={`${styles.expandBtn} ${styles.fullscreenToggleBtn}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        )}

        {/* Mode toggle button */}
        {processedVideoUrl && (
          <div className={`${styles.analysisOverlay} ${styles.bottomRight}`}>
            <button
              className={styles.modeToggleBtn}
              onClick={streamingMode === 'video' ? switchToFrameMode : switchToVideoMode}
              title={streamingMode === 'video' ? 'Switch to frame streaming' : 'Switch to video playback'}
            >
              {streamingMode === 'video' ? '🎞️' : '🎬'}
            </button>
          </div>
        )}

        {/* Snapshot button */}
        {displayFrame && (
          <button
            className={`${styles.expandBtn} ${styles.snapshotBtn}`}
            onClick={takeProcessedSnapshot}
            title="Take snapshot of processed feed"
          >
            📸
          </button>
        )}
      </div>

      <div className={styles.videoInfo}>
        <div>
          <div>Status: <span className={styles.processingType}>
            {isProcessing ? 'Processing' : streamingMode === 'video' ? 'Video' : 'Streaming'}
          </span></div>
          <div>
            Frames: <span className={styles.frameCount}>{displayFrameCount}</span>
            {streamingMode === 'frames' && (
              <span className={styles.fpsCounter}> ({displayFPS || processingFPS} FPS)</span>
            )}
          </div>
        </div>
        <div className={styles.processingSpecs}>
          <div>Mode: <span className={styles.streamingMode}>{streamingMode}</span></div>
          {streamingMode === 'frames' && (
            <div>Buffer: <span className={styles.bufferCount}>
              {displayFrames.length}
            </span></div>
          )}
        </div>
      </div>

      {/* Enhanced Analysis Stats with belt metrics */}
      <div className={styles.analysisStats}>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>IRON ORE</div>
          <div className={styles.statValue}>
            {analysisResults?.object_count || (Array.isArray(analysisResults?.objects) ? analysisResults.objects.length : 0) || 0}
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>BELT SPEED</div>
          <div className={styles.statValue}>
            {beltMetrics.speed ? `${beltMetrics.speed.toFixed(2)} m/min` :
             analysisResults?.belt_speed ? `${analysisResults.belt_speed.toFixed(2)} m/s` :
             analysisResults?.current_speed ? `${analysisResults.current_speed.toFixed(2)} m/s` : '--'}
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>VIBRATION</div>
          <div className={styles.statValue} style={{
            color: beltMetrics.vibration_severity === 'High' ? '#ff0000' :
                   beltMetrics.vibration_severity === 'Medium' ? '#ffaa00' : '#ffcc00'
          }}>
            {beltMetrics.vibration_severity || 'Low'}
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>ALIGNMENT</div>
          <div className={styles.statValue} style={{
            color: Math.abs(beltMetrics.alignment_deviation || 0) > 50 ? '#ff0000' :
                   Math.abs(beltMetrics.alignment_deviation || 0) > 20 ? '#ffaa00' : '#ffcc00'
          }}>
            {beltMetrics.alignment_deviation !== undefined ?
             `${Math.abs(beltMetrics.alignment_deviation).toFixed(1)} px` :
             analysisResults?.deviation_percentage !== undefined ?
             `${analysisResults.deviation_percentage.toFixed(1)}%` : '--'}
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>BELT WIDTH</div>
          <div className={styles.statValue}>
            {beltMetrics.belt_width ? `${beltMetrics.belt_width.toFixed(1)} px` : '--'}
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>CONFIDENCE</div>
          <div className={styles.statValue}>
            {analysisResults?.confidence ? `${Math.round(analysisResults.confidence * 100)}%` : '--%'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIProcessedFeedCard;