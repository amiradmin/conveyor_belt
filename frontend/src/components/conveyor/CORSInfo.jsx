import React from 'react';
import styles from './VideoProcessingSection.module.css';

const CORSInfo = ({ processingFPS }) => {
  return (
    <div className={styles.corsWarning}>
      <details>
        <summary>ℹ️ Streaming Information</summary>
        <div className={styles.warningContent}>
          <p><strong>Real-time AI Processing:</strong> Frames are automatically captured and analyzed at {processingFPS} FPS</p>
          <ul>
            <li>Click "Start AI" to begin real-time processing</li>
            <li>Frames will stream automatically without manual clicking</li>
            <li>Adjust FPS in the header control panel</li>
            <li>Processed frames update in real-time like a video stream</li>
          </ul>
        </div>
      </details>
    </div>
  );
};

export default CORSInfo;