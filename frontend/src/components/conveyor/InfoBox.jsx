import React from 'react';
import styles from './VideoProcessingSection.module.css';

const InfoBox = () => {
  return (
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
  );
};

export default InfoBox;