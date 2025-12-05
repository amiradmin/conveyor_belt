import React from 'react';
import styles from './VideoProcessingSection.module.css';

const StreamingStatus = ({
  currentFPS,
  processingFPS,
  frameCount,
  lastProcessedTime,
  formatTimeSinceLastFrame,
  toggleVideoProcessing,
  videoRef,
  isProcessing = false,
  processingProgress = 0
}) => {
  return (
    <div className={styles.streamingStatus}>
      <div className={styles.streamingInfo}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Status:</span>
          <span className={`${styles.infoValue} ${isProcessing ? styles.processing : styles.streaming}`}>
            {isProcessing ? (
              <>
                <span className={styles.processingSpinnerSmall}></span>
                Processing: {Math.round(processingProgress)}%
              </>
            ) : (
              <>
                🔴 Streaming {currentFPS > 0 ? `at ${currentFPS} FPS` : ''}
              </>
            )}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Frames Processed:</span>
          <span className={styles.infoValue}>{frameCount}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Last Frame:</span>
          <span className={styles.infoValue}>{formatTimeSinceLastFrame()}</span>
        </div>
        {currentFPS > 0 && !isProcessing && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Performance:</span>
            <span className={`${styles.infoValue} ${currentFPS >= processingFPS * 0.8 ? styles.good : styles.warning}`}>
              {Math.round((currentFPS / processingFPS) * 100)}% of target
            </span>
          </div>
        )}
      </div>
      <div className={styles.streamingActions}>
        <button
          className={`${styles.streamingBtn} ${styles.restartBtn}`}
          onClick={toggleVideoProcessing}
          title="Restart streaming"
          disabled={isProcessing}
        >
          {isProcessing ? '⏳' : '🔄'} Restart
        </button>
        <button
          className={`${styles.streamingBtn} ${styles.testBtn}`}
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              console.log('Video reset to beginning');
            }
          }}
          title="Reset video to beginning"
          disabled={isProcessing}
        >
          ⏮️ Reset Video
        </button>
        {isProcessing && (
          <div className={styles.processingStatus}>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <span className={styles.progressText}>{Math.round(processingProgress)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingStatus;