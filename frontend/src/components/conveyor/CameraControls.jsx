import React from 'react';
import styles from './VideoProcessingSection.module.css';

const CameraControls = ({
  setShowVideoModal,
  takeSimpleSnapshot,
  takeSnapshot,
  availableVideos,
  selectedVideoPath,
  setSelectedVideoPath,
  processVideoFile,
  isProcessing = false
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
          className={`${styles.actionBtn} ${styles.simpleSnapshotBtn}`}
          onClick={takeSimpleSnapshot}
          title="Take a snapshot without video capture"
        >
          <span>🖼️</span>
          Simple Snapshot
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
        className={`${styles.actionBtn} ${styles.snapshotBtn}`}
        onClick={takeSnapshot}
        title="Take snapshot from video (requires CORS)"
        disabled={isProcessing}
      >
        <span>📸</span>
        Video Snapshot
      </button>

      <button
        className={`${styles.actionBtn} ${styles.processBtn}`}
        onClick={processVideoFile}
        disabled={!selectedVideoPath || isProcessing}
      >
        {isProcessing ? (
          <>
            <span className={styles.processingSpinner}></span>
            Processing...
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