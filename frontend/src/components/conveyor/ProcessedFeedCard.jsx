import React, { useEffect, useRef, useState } from 'react';
import styles from './VideoProcessingSection.module.css';

const ProcessedFeedCard = ({
  processedFrame,
  analysisResults,
  currentFPS,
  processingFPS,
  frameCount,
  lastProcessedTime,
  calculateLatency,
  formatTimeSinceLastFrame,
  // Add new props for video streaming
  processedVideoUrl,
  isProcessing = false,
  processingProgress = 0
}) => {
  const videoRef = useRef(null);
  const [showVideo, setShowVideo] = useState(false);

  // Auto-play video when it becomes available
  useEffect(() => {
    if (processedVideoUrl && videoRef.current) {
      videoRef.current.load();
      setShowVideo(true);
    }
  }, [processedVideoUrl]);

  // Handle video errors
  const handleVideoError = (e) => {
    console.error('Processed video error:', e);
    setShowVideo(false);
  };

  // Handle video loaded data
  const handleVideoLoaded = () => {
    console.log('Processed video loaded and ready');
    if (videoRef.current) {
      videoRef.current.play().catch(e => {
        console.warn('Auto-play prevented:', e);
      });
    }
  };

  return (
    <div className={`${styles.videoCard} ${styles.processedFeed}`}>
      <div className={styles.cardHeader}>
        <h4>
          <span className={`${styles.statusIndicator} ${styles.green} ${currentFPS > 0 ? styles.streamingActive : ''}`}></span>
          AI Processed Feed
          {currentFPS > 0 && (
            <span className={styles.streamingBadge}>
              🔴 LIVE
            </span>
          )}
        </h4>
        <div className={styles.aiBadge}>
          <span className={styles.pulseIcon}>⚡</span>
          {isProcessing ? 'PROCESSING' : (currentFPS > 0 ? `${currentFPS} FPS` : 'LIVE AI')}
        </div>
      </div>

      <div className={styles.videoContainer}>
        {/* Show video if available */}
        {processedVideoUrl && showVideo ? (
          <>
            <video
              ref={videoRef}
              src={processedVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              onLoadedData={handleVideoLoaded}
              onError={handleVideoError}
              className={styles.processedVideo}
            />
            {/* Progress overlay for video processing */}
            {isProcessing && (
              <div className={styles.processingOverlay}>
                <div className={styles.processingProgress}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <div className={styles.processingText}>
                  Processing: {Math.round(processingProgress)}%
                </div>
              </div>
            )}
          </>
        ) : (
          // Show processed frames as images if video is not available
          processedFrame ? (
            <img
              src={processedFrame}
              alt="Processed Feed"
              className={styles.processedImage}
              crossOrigin="anonymous"
            />
          ) : (
            <div className={styles.processingPlaceholder}>
              {isProcessing ? (
                <>
                  <div className={styles.spinner}></div>
                  <div>Processing video...</div>
                  <div className={styles.progressPercentage}>
                    {Math.round(processingProgress)}%
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.spinner}></div>
                  <div>Starting real-time processing...</div>
                  <div style={{ fontSize: '12px', color: '#90CAF9' }}>
                    Target: {processingFPS} FPS
                  </div>
                </>
              )}
            </div>
          )
        )}

        {analysisResults && (
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
            {lastProcessedTime && (
              <div className={`${styles.analysisOverlay} ${styles.bottomLeft}`}>
                <span>🕒</span>
                {formatTimeSinceLastFrame()}
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.videoInfo}>
        <div>
          <div>Status: <span className={styles.processingType}>
            {isProcessing ? 'Processing' : 'Real-time'}
          </span></div>
          <div>
            Frames: <span className={styles.frameCount}>{frameCount}</span>
            {currentFPS > 0 && (
              <span className={styles.fpsCounter}> ({currentFPS} FPS)</span>
            )}
          </div>
        </div>
        <div className={styles.processingSpecs}>
          <div>Target: <span className={styles.fpsTarget}>{processingFPS} FPS</span></div>
          <div>Latency: <span className={styles.latency}>{calculateLatency()}</span></div>
        </div>
      </div>

      {analysisResults && (
        <div className={styles.analysisStats}>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>OBJECTS</div>
            <div className={styles.statValue}>
              {analysisResults.object_count || analysisResults.objects?.length || 0}
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>CONFIDENCE</div>
            <div className={styles.statValue}>
              {analysisResults.confidence ? `${Math.round(analysisResults.confidence * 100)}%` : '--%'}
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>HEALTH</div>
            <div className={styles.statValue}>
              {analysisResults.system_health ? `${Math.round(analysisResults.system_health)}%` : '--%'}
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>FRAMES</div>
            <div className={styles.statValue}>
              {frameCount}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessedFeedCard;