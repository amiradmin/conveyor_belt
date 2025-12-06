import React, { useCallback } from 'react';
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
  handleProcessedVideoError = () => {}
}) => {
  const handleImageLoad = useCallback((e) => {
    // Draw bounding boxes overlay after image loads
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

      // Draw green contours and bounding boxes for each detected Iron Ore object
      analysisResults.objects.forEach((obj, index) => {
        if (obj.bbox && Array.isArray(obj.bbox) && obj.bbox.length >= 4) {
          const [x1, y1, x2, y2] = obj.bbox;

          // Draw actual contour shape if available (more accurate representation)
          if (obj.contour && Array.isArray(obj.contour) && obj.contour.length > 0) {
            ctx.beginPath();
            ctx.moveTo(obj.contour[0][0], obj.contour[0][1]);
            for (let i = 1; i < obj.contour.length; i++) {
              ctx.lineTo(obj.contour[i][0], obj.contour[i][1]);
            }
            ctx.closePath();

            // Draw filled contour with semi-transparent green
            ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.fill();

            // Draw contour outline with bright green and thick line
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.stroke();
          } else {
            // Fallback to bounding box if contour not available
            const width = x2 - x1;
            const height = y2 - y1;

            // Draw green bounding box with thick line
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.strokeRect(x1, y1, width, height);

            // Draw semi-transparent green fill for better visibility
            ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.fillRect(x1, y1, width, height);
          }

          // Draw label with confidence
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

    // Preload next frame for smoother transition
    if (Array.isArray(processedFrames) && processedFrames.length > 1) {
      const nextIndex = (currentFrameIndex + 1) % processedFrames.length;
      const nextFrame = processedFrames[nextIndex];
      if (nextFrame) {
        const preloadImg = new Image();
        preloadImg.src = nextFrame;
      }
    }
  }, [analysisResults, processedFrames, currentFrameIndex]);

  return (
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
              onLoad={handleImageLoad}
              onError={(e) => console.error('Processed frame error:', e)}
            />
          </div>
        )}

        {/* Loading/Placeholder */}
        {(!currentDisplayFrame || (streamingMode === 'video' && !processedVideoUrl)) && (
          <div className={styles.processingPlaceholder}>
            {isProcessing ? (
              <>
                <div className={styles.spinner}></div>
                <div className={styles.placeholderText}>
                  Processing video: {Math.round(processingProgress)}%
                </div>
                <div className={styles.bufferInfo}>
                  Frames received: {Array.isArray(processedFrames) ? processedFrames.length : 0}
                </div>
                <div className={styles.helpText}>
                  Frames will appear as they are processed...
                </div>
              </>
            ) : (!Array.isArray(processedFrames) || processedFrames.length === 0) ? (
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
                  {Array.isArray(processedFrames) ? processedFrames.length : 0} frames ready
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
            <div>Buffer: <span className={styles.bufferCount}>
              {Array.isArray(processedFrames) ? processedFrames.length : 0}
            </span></div>
          )}
        </div>
      </div>

      {/* Iron Ore Analysis Stats */}
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
  );
};

export default AIProcessedFeedCard;