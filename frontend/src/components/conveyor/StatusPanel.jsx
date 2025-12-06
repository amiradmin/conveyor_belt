import React from 'react';
import styles from './VideoProcessingSection.module.css';

const StatusPanel = (props) => {
  // Check if props is undefined or null
  if (!props) {
    console.warn('StatusPanel: props is undefined or null');
    return <div className={styles.statusPanel}>Loading status panel...</div>;
  }

  try {
    // Destructure with safe defaults
    const {
      isProcessing = false,
      streamingMode = 'frames',
      processingProgress = 0,
      frameCount = 0,
      processedFrames,
      currentFPS = 0,
      processingFPS = 2,
      lastProcessedTime = null,
      processedVideoUrl = null,
      switchToFrameMode = () => {},
      switchToVideoMode = () => {},
      toggleVideoProcessing = () => {},
      showProcessedFeed = false
    } = props;

    const formatTimeSinceLastFrame = () => {
      if (!lastProcessedTime) return '--';
      try {
        const seconds = Math.floor((Date.now() - lastProcessedTime) / 1000);
        if (seconds < 1) return 'Just now';
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ago`;
      } catch (e) {
        return '--';
      }
    };

    // Safely get processed frames length
    const bufferCount = (() => {
      try {
        return Array.isArray(processedFrames) ? processedFrames.length : 0;
      } catch (e) {
        console.error('Error getting processedFrames length:', e);
        return 0;
      }
    })();

    return (
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
            <div className={styles.statusValue}>{bufferCount}</div>
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
                style={{ width: `${Math.min(100, Math.max(0, processingProgress))}%` }}
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
    );
  } catch (error) {
    console.error('Error rendering StatusPanel:', error);
    return (
      <div className={styles.statusPanel}>
        <div className={styles.statusHeader}>
          <h4>Processing Status</h4>
          <div className={styles.statusBadge}>ERROR</div>
        </div>
        <div className={styles.errorMessage}>
          Error loading status panel. Please refresh the page.
        </div>
      </div>
    );
  }
};

export default StatusPanel;