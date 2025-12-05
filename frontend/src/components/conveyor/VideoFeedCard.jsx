import React from 'react';
import styles from './VideoProcessingSection.module.css';

const VideoFeedCard = ({
  cameraUrl,
  videoRef,
  setShowVideoModal,
  toggleVideoProcessing,
  showProcessedFeed
}) => {
  return (
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
          onLoadedData={() => console.log('Video loaded and ready')}
          onError={(e) => {
            console.error('Video loading error:', e);
            console.log('Video source:', cameraUrl || 'http://localhost:8000/media/3.mp4');
          }}
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
  );
};

export default VideoFeedCard;