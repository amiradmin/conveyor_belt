import React from 'react';
import styles from './VideoProcessingSection.module.css';

const CameraControls = ({
  setShowVideoModal = () => {},
  takeSnapshot = () => {},
  availableVideos = [],
  selectedVideoPath = '',
  setSelectedVideoPath = () => {},
  processVideoFile = () => {},
  isProcessing = false,
  processingProgress = 0,
  showProcessedFeed = false,
  toggleVideoProcessing = () => {}
}) => {
  return (
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
  );
};

export default CameraControls;