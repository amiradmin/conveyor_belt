// src/components/conveyor/VideoProcessingSection.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './VideoProcessingSection.module.css';

export default function VideoProcessingSection({
  cameraUrl,
  videoRef,
  showVideoModal,
  setShowVideoModal,
  availableVideos = [],
  selectedVideoPath,
  setSelectedVideoPath,
  processVideoFile,
  analysisResults,
  processedFrame,
  showProcessedFeed,
  toggleVideoProcessing,
  lastProcessedTime,
  processingFPS = 2,
  frameCount = 0,
  currentFPS = 0,
  processingStatus = null,
  processedVideoUrl = null,
  processingProgress = 0
}) {
  const processedVideoRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFrames, setProcessedFrames] = useState([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showProcessedVideo, setShowProcessedVideo] = useState(false);
  const [streamingMode, setStreamingMode] = useState('frames');

  // Reset when processing starts
  useEffect(() => {
    if (processingStatus?.active_jobs > 0) {
      setIsProcessing(true);
      setProcessedFrames([]);
      setCurrentFrameIndex(0);
      setShowProcessedVideo(false);
      setStreamingMode('frames');
    } else if (processingStatus?.active_jobs === 0 && processingStatus?.completed_jobs > 0) {
      setIsProcessing(false);
      if (processedVideoUrl) {
        setStreamingMode('video');
        setShowProcessedVideo(true);
      }
    }
  }, [processingStatus, processedVideoUrl]);

  // Handle incoming processed frames
  useEffect(() => {
    if (processedFrame && showProcessedFeed) {
      console.log('New processed frame received:', processedFrame.substring(0, 50) + '...');
      setProcessedFrames(prev => {
        const newFrames = [...prev, processedFrame];
        // Keep only last 100 frames
        return newFrames.length > 100 ? newFrames.slice(-100) : newFrames;
      });
    }
  }, [processedFrame, showProcessedFeed]);

  // Auto-play processed video
  useEffect(() => {
    if (processedVideoRef.current && showProcessedVideo) {
      console.log('Loading processed video:', processedVideoUrl);
      processedVideoRef.current.load();
      const playVideo = () => {
        processedVideoRef.current.play().catch(e => {
          console.log('Auto-play prevented, waiting for user interaction');
        });
      };

      // Try to play after a short delay
      const timer = setTimeout(playVideo, 100);
      return () => clearTimeout(timer);
    }
  }, [showProcessedVideo, processedVideoUrl]);

  // Animate through frames
  useEffect(() => {
    if (!showProcessedFeed || streamingMode !== 'frames' || processedFrames.length < 2) {
      return;
    }

    const targetInterval = 1000 / Math.max(1, currentFPS || processingFPS);
    console.log(`Animating frames at ${targetInterval}ms interval, ${processedFrames.length} frames available`);

    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => {
        const nextIndex = (prev + 1) % processedFrames.length;
        return nextIndex;
      });
    }, targetInterval);

    return () => clearInterval(interval);
  }, [showProcessedFeed, streamingMode, processedFrames.length, currentFPS, processingFPS]);

  // Get current frame for display
  const getCurrentFrame = useCallback(() => {
    if (streamingMode === 'video' && showProcessedVideo) {
      return null;
    }
    if (processedFrames.length > 0 && streamingMode === 'frames') {
      return processedFrames[currentFrameIndex] || processedFrame;
    }
    return processedFrame;
  }, [streamingMode, showProcessedVideo, processedFrames, currentFrameIndex, processedFrame]);

  const currentDisplayFrame = getCurrentFrame();

  const takeSnapshot = () => {
    try {
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not found');
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Add timestamp
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 40, 200, 30);
      ctx.fillStyle = '#4CAF50';
      ctx.font = '14px Arial';
      ctx.fillText(`Snapshot: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 20);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `conveyor_snapshot_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.warn('Video snapshot failed, using fallback:', error);
      // Fallback to simple snapshot
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#37474F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.fillText('Conveyor Snapshot', 200, 240);
      ctx.font = '16px Arial';
      ctx.fillText(new Date().toLocaleTimeString(), 250, 280);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `fallback_snapshot_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const takeProcessedSnapshot = () => {
    try {
      if (streamingMode === 'video' && showProcessedVideo && processedVideoRef.current) {
        const canvas = document.createElement('canvas');
        const video = processedVideoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Add overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, canvas.height - 40, 220, 30);
        ctx.fillStyle = '#4CAF50';
        ctx.font = '14px Arial';
        ctx.fillText(`AI Processed: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 20);

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `ai_video_snapshot_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (currentDisplayFrame) {
        // Capture from current frame
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Add overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(10, canvas.height - 40, 220, 30);
          ctx.fillStyle = '#4CAF50';
          ctx.font = '14px Arial';
          ctx.fillText(`AI Frame: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 20);

          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `ai_frame_snapshot_${Date.now()}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        img.onerror = () => {
          alert('Failed to load processed frame for snapshot');
        };
        img.src = currentDisplayFrame;
      } else {
        alert('No processed content available for snapshot');
      }
    } catch (error) {
      console.error('Processed snapshot error:', error);
      alert('Unable to capture processed snapshot');
    }
  };

  const calculateLatency = () => {
    if (processingFPS <= 0) return '-- ms';
    const latency = Math.round(1000 / processingFPS);
    return `~${latency} ms`;
  };

  const formatTimeSinceLastFrame = () => {
    if (!lastProcessedTime) return '--';
    const seconds = Math.floor((Date.now() - lastProcessedTime) / 1000);
    if (seconds < 1) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  const handleProcessedVideoLoaded = () => {
    console.log('Processed video loaded successfully');
  };

  const handleProcessedVideoError = (e) => {
    console.error('Processed video error:', e);
    setShowProcessedVideo(false);
    setStreamingMode('frames');
  };

  const switchToFrameMode = () => {
    setStreamingMode('frames');
    setShowProcessedVideo(false);
  };

  const switchToVideoMode = () => {
    if (processedVideoUrl) {
      setStreamingMode('video');
      setShowProcessedVideo(true);
    }
  };

  // Debug info
  useEffect(() => {
    console.log('VideoProcessingSection state:', {
      isProcessing,
      streamingMode,
      showProcessedVideo,
      processedFramesCount: processedFrames.length,
      currentFrameIndex,
      hasCurrentFrame: !!currentDisplayFrame,
      processingProgress,
      frameCount,
      currentFPS,
      processedVideoUrl
    });
  }, [isProcessing, streamingMode, showProcessedVideo, processedFrames.length, currentFrameIndex, currentDisplayFrame, processingProgress, frameCount, currentFPS, processedVideoUrl]);

  return (
    <div className={styles.videoProcessingSection}>
      <div className={styles.videoCards}>
        {/* Original Camera Feed */}
        <div className={styles.videoCard}>
          <div className={styles.cardHeader}>
            <h4>
              <span className={`${styles.statusIndicator} ${styles.blue}`}></span>
              Original Feed
            </h4>
            <div className={styles.headerActions}>
              <button
                className={styles.toggleAiBtn}
                onClick={toggleVideoProcessing}
                title={showProcessedFeed ? "Stop AI Processing" : "Start AI Processing"}
              >
                {showProcessedFeed ? (
                  <>
                    <span>⏸️</span>
                    Stop AI
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    Start AI
                  </>
                )}
              </button>
              <div className={styles.cameraBadge}>Camera 1</div>
            </div>
          </div>

          <div className={styles.videoContainer}>
            <video
              ref={videoRef}
              src={cameraUrl || 'http://localhost:8000/media/3.mp4'}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              onLoadedData={() => console.log('Original video loaded')}
              onError={(e) => console.error('Original video error:', e)}
            />
            <button
              className={styles.expandBtn}
              onClick={() => setShowVideoModal(true)}
              title="Expand camera view"
            >
              🔍
            </button>
          </div>

          <div className={styles.videoInfo}>
            <div>
              <div>Status: <span className={styles.statusLive}>● Live</span></div>
              <div>Source: {cameraUrl ? 'Camera' : 'Demo'}</div>
            </div>
            <div className={styles.videoSpecs}>
              <div>720×1280</div>
              <div>30 FPS</div>
            </div>
          </div>
        </div>

        {/* AI Processed Feed */}
        {showProcessedFeed && (
          <div className={`${styles.videoCard} ${styles.processedFeed}`}>
            <div className={styles.cardHeader}>
              <h4>
                <span className={`${styles.statusIndicator} ${styles.green}`}></span>
                AI Processed Feed
              </h4>
              <div className={styles.aiBadge}>
                <span className={styles.pulseIcon}>⚡</span>
                {isProcessing ? `PROCESSING ${Math.round(processingProgress)}%` :
                 streamingMode === 'video' ? 'VIDEO' :
                 `REALTIME ${currentFPS || processingFPS}FPS`}
              </div>
            </div>

            <div className={styles.videoContainer}>
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
                        Processing: {Math.round(processingProgress)}%
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Frame mode */}
              {streamingMode === 'frames' && currentDisplayFrame && (
                <img
                  src={currentDisplayFrame}
                  alt="Processed Feed"
                  className={styles.processedImage}
                  crossOrigin="anonymous"
                  onLoad={() => console.log('Processed frame loaded')}
                  onError={(e) => console.error('Processed frame error:', e)}
                />
              )}

              {/* Loading/Placeholder */}
              {(!currentDisplayFrame || (streamingMode === 'video' && !showProcessedVideo)) && (
                <div className={styles.processingPlaceholder}>
                  {isProcessing ? (
                    <>
                      <div className={styles.spinner}></div>
                      <div className={styles.placeholderText}>
                        Processing video: {Math.round(processingProgress)}%
                      </div>
                      <div className={styles.bufferInfo}>
                        Frames received: {processedFrames.length}
                      </div>
                      <div className={styles.helpText}>
                        Frames will appear as they are processed...
                      </div>
                    </>
                  ) : processedFrames.length === 0 ? (
                    <>
                      <div className={styles.spinner}></div>
                      <div className={styles.placeholderText}>
                        Waiting for processed frames...
                      </div>
                      <div className={styles.helpText}>
                        Click "Process Video File" to start
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.spinner}></div>
                      <div className={styles.placeholderText}>
                        Loading processed frames...
                      </div>
                      <div className={styles.bufferInfo}>
                        {processedFrames.length} frames ready
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Analysis Overlays */}
              {analysisResults && currentDisplayFrame && (
                <>
                  <div className={`${styles.analysisOverlay} ${styles.topLeft}`}>
                    <span>🔍</span>
                    Objects: {analysisResults.object_count || analysisResults.objects?.length || 0}
                  </div>
                  <div className={`${styles.analysisOverlay} ${styles.topRight}`}>
                    <div className={styles.confidenceValue}>
                      {analysisResults.confidence ? `${Math.round(analysisResults.confidence * 100)}%` : '--%'}
                    </div>
                    <div className={styles.confidenceLabel}>Confidence</div>
                  </div>
                </>
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
              {currentDisplayFrame && (
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
                  Frames: <span className={styles.frameCount}>{frameCount}</span>
                  {streamingMode === 'frames' && (
                    <span className={styles.fpsCounter}> ({currentFPS || processingFPS} FPS)</span>
                  )}
                </div>
              </div>
              <div className={styles.processingSpecs}>
                <div>Mode: <span className={styles.streamingMode}>{streamingMode}</span></div>
                {streamingMode === 'frames' && (
                  <div>Buffer: <span className={styles.bufferCount}>{processedFrames.length}</span></div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className={styles.analysisStats}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>OBJECTS</div>
                <div className={styles.statValue}>
                  {analysisResults?.object_count || analysisResults?.objects?.length || 0}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>CONFIDENCE</div>
                <div className={styles.statValue}>
                  {analysisResults?.confidence ? `${Math.round(analysisResults.confidence * 100)}%` : '--%'}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>FRAMES</div>
                <div className={styles.statValue}>{frameCount}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>BUFFER</div>
                <div className={styles.statValue}>{processedFrames.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className={styles.cameraControls}>
        <div className={styles.quickActions}>
          <button
            className={`${styles.actionBtn} ${styles.expandBtn}`}
            onClick={() => setShowVideoModal(true)}
          >
            <span>📹</span>
            Expand View
          </button>
          <button
            className={`${styles.actionBtn} ${styles.snapshotBtn}`}
            onClick={takeSnapshot}
            title="Take snapshot from video"
          >
            <span>📸</span>
            Take Snapshot
          </button>
        </div>

        <div className={styles.videoSelection}>
          <label>Select Video to Process:</label>
          <select
            value={selectedVideoPath}
            onChange={(e) => setSelectedVideoPath(e.target.value)}
            disabled={isProcessing}
          >
            <option value="">-- Select a video --</option>
            {Array.isArray(availableVideos) && availableVideos.map((video, index) => (
              <option key={index} value={video.path}>
                {video.path} ({Math.round(video.size / 1024)} KB)
              </option>
            ))}
          </select>
          {!Array.isArray(availableVideos) && availableVideos.length === 0 && (
            <div className={styles.noVideos}>No videos available</div>
          )}
        </div>

        <button
          className={`${styles.actionBtn} ${styles.processBtn}`}
          onClick={processVideoFile}
          disabled={!selectedVideoPath || isProcessing}
        >
          {isProcessing ? (
            <>
              <div className={styles.processingSpinner}></div>
              Processing... {Math.round(processingProgress)}%
            </>
          ) : (
            <>
              <span>🎬</span>
              Process Video File
            </>
          )}
        </button>
      </div>

      {/* Status Panel */}
      {showProcessedFeed && (
        <div className={styles.statusPanel}>
          <div className={styles.statusHeader}>
            <h4>Processing Status</h4>
            <div className={styles.statusBadge}>
              {isProcessing ? 'PROCESSING' : streamingMode === 'video' ? 'VIDEO READY' : 'STREAMING'}
            </div>
          </div>

          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>Mode</div>
              <div className={styles.statusValue}>{streamingMode}</div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>Progress</div>
              <div className={styles.statusValue}>
                {isProcessing ? `${Math.round(processingProgress)}%` : '100%'}
              </div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>Frames</div>
              <div className={styles.statusValue}>{frameCount}</div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>Buffer</div>
              <div className={styles.statusValue}>{processedFrames.length}</div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>FPS</div>
              <div className={styles.statusValue}>{currentFPS || processingFPS}</div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>Last Frame</div>
              <div className={styles.statusValue}>{formatTimeSinceLastFrame()}</div>
            </div>
          </div>

          <div className={styles.statusActions}>
            {isProcessing && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
            )}
            <div className={styles.actionButtons}>
              {processedVideoUrl && (
                <button
                  className={styles.modeSwitchBtn}
                  onClick={streamingMode === 'video' ? switchToFrameMode : switchToVideoMode}
                >
                  {streamingMode === 'video' ? 'Switch to Frames' : 'Switch to Video'}
                </button>
              )}
              <button
                className={styles.restartBtn}
                onClick={toggleVideoProcessing}
              >
                {showProcessedFeed ? 'Stop AI' : 'Start AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className={styles.infoBox}>
        <details>
          <summary>ℹ️ How video processing works</summary>
          <div className={styles.infoContent}>
            <p><strong>Process Video File:</strong></p>
            <ol>
              <li>Select a video from the dropdown</li>
              <li>Click "Process Video File"</li>
              <li>Processing starts immediately</li>
              <li>Processed frames appear in real-time as they're generated</li>
              <li>Once complete, you can switch to full video playback</li>
            </ol>
            <p><strong>Streaming Modes:</strong></p>
            <ul>
              <li><strong>Frame-by-Frame:</strong> Real-time processed frames stream</li>
              <li><strong>Video Playback:</strong> Full processed video (available after processing completes)</li>
            </ul>
            <p><strong>Note:</strong> The WebSocket is already connected and receiving data.</p>
          </div>
        </details>
      </div>
    </div>
  );
}