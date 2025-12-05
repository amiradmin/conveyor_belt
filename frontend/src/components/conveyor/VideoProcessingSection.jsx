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
            processingProgress = 0,
            isProcessingProp = false
}) {
  const processedVideoRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFrames, setProcessedFrames] = useState([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showProcessedVideo, setShowProcessedVideo] = useState(false);
  const [streamingMode, setStreamingMode] = useState('frames');

  // Track if we've already auto-started after processing completes
  const autoStartedRef = useRef(false);

  // Reset when processing starts
  useEffect(() => {
    // Check if processingStatus is an object with active_jobs property
    const activeJobs = typeof processingStatus === 'object' && processingStatus !== null 
      ? processingStatus.active_jobs 
      : (isProcessingProp ? 1 : 0);
    const completedJobs = typeof processingStatus === 'object' && processingStatus !== null
      ? processingStatus.completed_jobs
      : 0;

    if (activeJobs > 0 || isProcessingProp) {
      setIsProcessing(true);
      setProcessedFrames([]);
      setCurrentFrameIndex(0);
      setShowProcessedVideo(false);
      setStreamingMode('frames');
      autoStartedRef.current = false; // Reset flag when processing starts
    } else if (activeJobs === 0 && completedJobs > 0 && !autoStartedRef.current) {
      setIsProcessing(false);
      autoStartedRef.current = true; // Mark as auto-started
      
      // After processing completes, automatically start capturing frames if video is available
      if (videoRef && videoRef.current && toggleVideoProcessing) {
        // Small delay to ensure video is ready, then start processing
        const timeoutId = setTimeout(() => {
          // Only start if not already processing and video is ready
          if (!showProcessedFeed && videoRef.current && videoRef.current.readyState >= 2) {
            console.log('Auto-starting frame capture after video processing completes');
            toggleVideoProcessing();
          } else if (videoRef.current && videoRef.current.readyState < 2) {
            // Wait for video to be ready
            const checkReady = setInterval(() => {
              if (videoRef.current && videoRef.current.readyState >= 2 && !showProcessedFeed) {
                console.log('Video ready, auto-starting frame capture');
                toggleVideoProcessing();
                clearInterval(checkReady);
              }
            }, 200);
            // Clear interval after 5 seconds if video doesn't become ready
            setTimeout(() => clearInterval(checkReady), 5000);
          }
        }, 1000);
        return () => clearTimeout(timeoutId);
      }
      if (processedVideoUrl) {
        setStreamingMode('video');
        setShowProcessedVideo(true);
      }
    }
  }, [processingStatus, processedVideoUrl, videoRef, showProcessedFeed, toggleVideoProcessing, isProcessingProp]);

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

  // Animate through frames - optimized for smooth video-like streaming
  useEffect(() => {
    if (!showProcessedFeed || streamingMode !== 'frames' || processedFrames.length < 1) {
      return;
    }

    // Use requestAnimationFrame for smoother animation
    let animationFrameId;
    let lastFrameTime = performance.now();
    
    const animate = (currentTime) => {
      const targetFPS = Math.max(1, currentFPS || processingFPS);
      const targetInterval = 1000 / targetFPS;
      const elapsed = currentTime - lastFrameTime;
      
      if (elapsed >= targetInterval && processedFrames.length > 0) {
        setCurrentFrameIndex(prev => {
          // Cycle through frames smoothly
          const nextIndex = (prev + 1) % processedFrames.length;
          return nextIndex;
        });
        lastFrameTime = currentTime - (elapsed % targetInterval);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
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

              {/* Frame mode - optimized for fast streaming with bounding boxes */}
              {streamingMode === 'frames' && currentDisplayFrame && (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img
                    src={currentDisplayFrame}
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
                    onLoad={(e) => {
                      // Draw bounding boxes overlay after image loads
                      // Note: Bounding boxes are already drawn on the canvas in useVideoProcessing
                      // This overlay is a backup if analysisResults is available separately
                      const img = e.target;
                      const container = img.parentElement;
                      
                      // Only draw overlay if analysisResults has objects and image doesn't already have boxes
                      if (container && analysisResults?.objects && analysisResults.objects.length > 0) {
                        // Remove existing overlay canvas if any
                        const existingCanvas = container.querySelector('.bounding-box-overlay');
                        if (existingCanvas) {
                          existingCanvas.remove();
                        }
                        
                        // Create canvas overlay for bounding boxes (as backup/alternative)
                        const canvas = document.createElement('canvas');
                        canvas.className = 'bounding-box-overlay';
                        canvas.style.position = 'absolute';
                        canvas.style.top = '0';
                        canvas.style.left = '0';
                        canvas.style.width = '100%';
                        canvas.style.height = '100%';
                        canvas.style.pointerEvents = 'none';
                        canvas.style.zIndex = '10';
                        
                        // Set canvas size to match image natural size
                        const imgWidth = img.naturalWidth || img.width || 640;
                        const imgHeight = img.naturalHeight || img.height || 480;
                        canvas.width = imgWidth;
                        canvas.height = imgHeight;
                        
                        const ctx = canvas.getContext('2d');
                        
                        // Draw green bounding boxes for each detected object
                        analysisResults.objects.forEach((obj, index) => {
                          if (obj.bbox && Array.isArray(obj.bbox) && obj.bbox.length >= 4) {
                            const [x1, y1, x2, y2] = obj.bbox;
                            const width = x2 - x1;
                            const height = y2 - y1;
                            
                            // Draw green bounding box with thick line (Caterpillar style)
                            ctx.strokeStyle = '#00FF00'; // Bright green
                            ctx.lineWidth = 4;
                            ctx.setLineDash([]);
                            ctx.strokeRect(x1, y1, width, height);
                            
                            // Draw semi-transparent green fill for better visibility
                            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                            ctx.fillRect(x1, y1, width, height);
                            
                            // Draw label with confidence
                            if (obj.confidence !== undefined) {
                              const label = `Iron Ore ${obj.id || index + 1} (${Math.round(obj.confidence * 100)}%)`;
                              const labelWidth = ctx.measureText(label).width + 8;
                              ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                              ctx.fillRect(x1, Math.max(0, y1 - 22), labelWidth, 20);
                              ctx.fillStyle = '#00FF00';
                              ctx.font = 'bold 12px Arial';
                              ctx.fillText(label, x1 + 4, Math.max(12, y1 - 6));
                            }
                          }
                        });
                        
                        container.appendChild(canvas);
                      }
                      
                      // Preload next frame for smoother transition
                      if (processedFrames.length > 1) {
                        const nextIndex = (currentFrameIndex + 1) % processedFrames.length;
                        const nextFrame = processedFrames[nextIndex];
                        if (nextFrame) {
                          const preloadImg = new Image();
                          preloadImg.src = nextFrame;
                        }
                      }
                    }}
                    onError={(e) => console.error('Processed frame error:', e)}
                  />
                </div>
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

              {/* Analysis Overlays - Iron Ore Detection */}
              {analysisResults && currentDisplayFrame && (
                <>
                  <div className={`${styles.analysisOverlay} ${styles.topLeft}`}>
                    <span>⚫</span>
                    Iron Ore: {analysisResults.object_count || analysisResults.objects?.length || 0}
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
              {currentDisplayFrame && (
                <button
                  className={`${styles.expandBtn} ${styles.fullscreenToggleBtn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const container = e.target.closest(`.${styles.videoCard}`)?.querySelector(`.${styles.videoContainer}`);
                    if (container) {
                      if (!document.fullscreenElement) {
                        container.requestFullscreen().catch(err => {
                          console.error('Error attempting to enable fullscreen:', err);
                        });
                      } else {
                        document.exitFullscreen();
                      }
                    }
                  }}
                  title="Toggle Fullscreen"
                >
                  ⛶
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

            {/* Iron Ore Analysis Stats */}
            <div className={styles.analysisStats}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>IRON ORE</div>
                <div className={styles.statValue}>
                  {analysisResults?.object_count || analysisResults?.objects?.length || 0}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>BELT SPEED</div>
                <div className={styles.statValue}>
                  {analysisResults?.belt_speed ? `${analysisResults.belt_speed.toFixed(2)} m/s` : 
                   analysisResults?.current_speed ? `${analysisResults.current_speed.toFixed(2)} m/s` : '--'}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>WEIGHT</div>
                <div className={styles.statValue}>
                  {analysisResults?.total_weight ? `${analysisResults.total_weight.toFixed(1)} kg` :
                   analysisResults?.total_area ? `${(analysisResults.total_area / 1000).toFixed(1)} kg` : '--'}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>OVERWEIGHT</div>
                <div className={styles.statValue} style={{
                  color: analysisResults?.overweight_detected ? '#ff0000' : '#ffcc00'
                }}>
                  {analysisResults?.overweight_detected ? '⚠️ YES' : '✓ NO'}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>DISALIGNMENT</div>
                <div className={styles.statValue} style={{
                  color: analysisResults?.deviation_percentage > 20 ? '#ff0000' : 
                         analysisResults?.deviation_percentage > 10 ? '#ffaa00' : '#ffcc00'
                }}>
                  {analysisResults?.deviation_percentage !== undefined ? 
                   `${analysisResults.deviation_percentage.toFixed(1)}%` : '--'}
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
          onClick={async () => {
            // Process the video file
            await processVideoFile();
            // Automatically start AI processing to show frames immediately
            if (!showProcessedFeed && toggleVideoProcessing) {
              // Small delay to ensure video processing has started
              setTimeout(() => {
                toggleVideoProcessing();
              }, 500);
            }
          }}
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