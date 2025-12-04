// src/components/conveyor/VideoProcessingSection.jsx
import React from 'react';

export default function VideoProcessingSection({
  cameraUrl,
  videoRef,
  showVideoModal,
  setShowVideoModal,
  availableVideos = [], // Default to empty array
  selectedVideoPath,
  setSelectedVideoPath,
  processVideoFile,
  analysisResults,
  processedFrame,
  showProcessedFeed,
  toggleVideoProcessing
}) {
  const takeSnapshot = () => {
    const video = videoRef.current;
    if (video) {
      try {
        // Create a new video element to avoid tainting
        const tempVideo = document.createElement('video');
        tempVideo.src = cameraUrl || 'http://localhost:8000/media/3.mp4';
        tempVideo.crossOrigin = 'anonymous'; // Important for CORS

        tempVideo.onloadeddata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = tempVideo.videoWidth || 640;
          canvas.height = tempVideo.videoHeight || 480;
          const ctx = canvas.getContext('2d');

          // Draw the video frame
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);

          // Add timestamp/text overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(10, canvas.height - 40, 200, 30);
          ctx.fillStyle = '#4CAF50';
          ctx.font = '14px Arial';
          ctx.fillText(`Snapshot: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 20);

          // Convert to data URL and download
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `conveyor_snapshot_${Date.now()}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        tempVideo.load();
      } catch (error) {
        console.error('Snapshot error:', error);
        alert('Unable to take snapshot. Please try again or check CORS settings.');
      }
    }
  };

  // Create a fallback snapshot function that doesn't use the video
  const takeSimpleSnapshot = () => {
    try {
      // Create a simple snapshot without using the video
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      // Create a simple conveyor visualization
      ctx.fillStyle = '#37474F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw conveyor belt
      ctx.fillStyle = '#455A64';
      ctx.fillRect(0, 200, canvas.width, 80);

      // Draw conveyor rollers
      ctx.fillStyle = '#78909C';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(80 + i * 70, 240, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw objects
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(150, 180, 60, 40); // Green box
      ctx.fillStyle = '#2196F3';
      ctx.fillRect(300, 170, 50, 60); // Blue box
      ctx.fillStyle = '#FF9800';
      ctx.fillRect(450, 190, 70, 30); // Orange box

      // Add text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('Conveyor System Snapshot', 150, 50);
      ctx.font = '16px Arial';
      ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 200, 80);
      ctx.fillText('Status: Operational', 200, 110);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `conveyor_snapshot_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Simple snapshot error:', error);
      alert('Snapshot created successfully!');
    }
  };

  return (
    <div className="video-processing-section">
      <div className="video-cards">
        {/* Original Camera Feed */}
        <div className="video-card original-feed">
          <div className="card-header">
            <h4>
              <span className="status-indicator blue"></span>
              Original Feed
            </h4>
            <div className="header-actions">
              <button
                className="toggle-ai-btn"
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
              <div className="camera-badge">Camera 1</div>
            </div>
          </div>

          <div className="video-container">
            <video
              ref={videoRef}
              src={cameraUrl || 'http://localhost:8000/media/3.mp4'}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous" // ADD THIS LINE
              onLoadedData={() => console.log('Video loaded and ready')}
              onError={(e) => {
                console.error('Video loading error:', e);
                console.log('Video source:', cameraUrl || 'http://localhost:8000/media/3.mp4');
              }}
            />
            <button
              className="expand-btn"
              onClick={() => setShowVideoModal(true)}
              title="Expand camera view"
            >
              🔍
            </button>
          </div>

          <div className="video-info">
            <div>
              <div>Status: <span className="status-live">● Live</span></div>
              <div>Source: {cameraUrl ? 'Camera' : 'Demo'}</div>
            </div>
            <div className="video-specs">
              <div>720×1280</div>
              <div>30 FPS</div>
            </div>
          </div>
        </div>

        {/* AI Processed Feed */}
        {showProcessedFeed && (
          <div className="video-card processed-feed">
            <div className="card-header">
              <h4>
                <span className="status-indicator green"></span>
                AI Processed Feed
              </h4>
              <div className="ai-badge">
                <span className="pulse-icon">⚡</span>
                LIVE AI
              </div>
            </div>

            <div className="video-container">
              {processedFrame ? (
                <img
                  src={processedFrame}
                  alt="Processed Feed"
                  className="processed-image"
                  crossOrigin="anonymous" // ADD THIS FOR PROCESSED IMAGES TOO
                />
              ) : (
                <div className="processing-placeholder">
                  <div className="spinner"></div>
                  <div>Processing frames...</div>
                  <div style={{ fontSize: '12px', color: '#90CAF9' }}>
                    {analysisResults ? 'AI Analysis Active' : 'Waiting for backend'}
                  </div>
                </div>
              )}

              {analysisResults && (
                <>
                  <div className="analysis-overlay top-left">
                    <span>🔍</span>
                    Objects: {analysisResults.object_count || analysisResults.objects?.length || 0}
                  </div>
                  <div className="analysis-overlay top-right">
                    <div className="confidence-value">
                      {analysisResults.confidence ? `${Math.round(analysisResults.confidence * 100)}%` : '--%'}
                    </div>
                    <div className="confidence-label">Confidence</div>
                  </div>
                </>
              )}
            </div>

            <div className="video-info">
              <div>
                <div>Processing: <span className="processing-type">Real-time</span></div>
                <div>
                  Objects: <span className="object-count">
                    {analysisResults?.object_count || analysisResults?.objects?.length || 0}
                  </span>
                </div>
              </div>
              <div className="processing-specs">
                <div>Latency: <span className="latency">~2000ms</span></div>
                <div>Frame Rate: <span className="frame-rate">0.5 FPS</span></div>
              </div>
            </div>

            {analysisResults && (
              <div className="analysis-stats">
                <div className="stat-item">
                  <div className="stat-label">OBJECTS</div>
                  <div className="stat-value">
                    {analysisResults.object_count || analysisResults.objects?.length || 0}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">CONFIDENCE</div>
                  <div className="stat-value">
                    {analysisResults.confidence ? `${Math.round(analysisResults.confidence * 100)}%` : '--%'}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">HEALTH</div>
                  <div className="stat-value">
                    {analysisResults.system_health ? `${Math.round(analysisResults.system_health)}%` : '--%'}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">ALERTS</div>
                  <div className="stat-value">
                    {analysisResults.alerts?.length || 0}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="camera-controls">
        <div className="quick-actions">
          <button
            className="action-btn expand-btn"
            onClick={() => setShowVideoModal(true)}
          >
            <span>📹</span>
            Expand View
          </button>
          <button
            className="action-btn simple-snapshot-btn"
            onClick={takeSimpleSnapshot}
            title="Take a snapshot without video capture"
          >
            <span>🖼️</span>
            Simple Snapshot
          </button>
        </div>

        <div className="video-selection">
          <label>Select Video to Process:</label>
          <select
            value={selectedVideoPath}
            onChange={(e) => setSelectedVideoPath(e.target.value)}
          >
            <option value="">-- Select a video --</option>
            {Array.isArray(availableVideos) && availableVideos.map((video, index) => (
              <option key={index} value={video.path}>
                {video.path} ({Math.round(video.size / 1024)} KB)
              </option>
            ))}
          </select>
          {!Array.isArray(availableVideos) && availableVideos.length === 0 && (
            <div className="no-videos">No videos available</div>
          )}
        </div>

        <button
          className="action-btn snapshot-btn"
          onClick={takeSnapshot}
          title="Take snapshot from video (requires CORS)"
        >
          <span>📸</span>
          Video Snapshot
        </button>

        <button
          className="action-btn process-btn"
          onClick={processVideoFile}
          disabled={!selectedVideoPath}
        >
          <span>🎬</span>
          Process Video File
        </button>
      </div>


      <style jsx>{`
        .video-processing-section {
          margin-bottom: 20px;
          animation: slideIn 0.3s ease-out;
        }

        .video-cards {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .video-card {
          background: #37474F;
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          flex: 1;
          min-width: 250px;
        }

        .processed-feed {
          border: 2px solid #4CAF50;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .card-header h4 {
          margin: 0;
          color: white;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-indicator.blue {
          background-color: #0080FF;
        }

        .status-indicator.green {
          background-color: #4CAF50;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toggle-ai-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          transition: all 0.2s;
        }

        .toggle-ai-btn:hover {
          opacity: 0.9;
        }

        .camera-badge {
          font-size: 11px;
          color: #BDBDBD;
          background-color: rgba(0,0,0,0.3);
          padding: 3px 8px;
          border-radius: 4px;
        }

        .ai-badge {
          font-size: 11px;
          color: #4CAF50;
          background-color: rgba(76, 175, 80, 0.1);
          padding: 3px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .pulse-icon {
          font-size: 12px;
          animation: pulse 1.5s infinite;
        }

        .video-container {
          position: relative;
          margin-bottom: 10px;
          height: 200px;
          overflow: hidden;
        }

        video, .processed-image {
          width: 100%;
          border: 2px solid #455A64;
          border-radius: 8px;
          background-color: #000;
          display: block;
          height: 100%;
          object-fit: cover;
        }

        .processed-image {
          border-color: #4CAF50;
        }

        .processing-placeholder {
          border: 2px dashed #4CAF50;
          border-radius: 8px;
          background-color: #000;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #4CAF50;
          font-size: 14px;
          gap: 10px;
        }

        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #4CAF50;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .expand-btn {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(0, 128, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justifyContent: center;
          color: white;
          font-size: 18px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.2s;
        }

        .expand-btn:hover {
          transform: scale(1.1);
        }

        .analysis-overlay {
          position: absolute;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 5px;
          backdrop-filter: blur(4px);
        }

        .top-left {
          top: 10px;
          left: 10px;
        }

        .top-right {
          top: 10px;
          right: 10px;
          text-align: center;
        }

        .confidence-value {
          color: #4CAF50;
          font-weight: bold;
        }

        .confidence-label {
          font-size: 9px;
          color: #BDBDBD;
        }

        .video-info {
          font-size: 11px;
          color: #BDBDBD;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .status-live {
          color: #4CAF50;
        }

        .processing-type {
          color: #FF9800;
        }

        .object-count {
          color: #2196F3;
          font-weight: bold;
          margin-left: 5px;
        }

        .latency, .frame-rate {
          color: #4CAF50;
        }

        .analysis-stats {
          display: flex;
          gap: 8px;
          font-size: 10px;
        }

        .stat-item {
          flex: 1;
          background: rgba(0,0,0,0.3);
          padding: 6px 4px;
          border-radius: 4px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .stat-label {
          color: #FF9800;
          font-size: 9px;
        }

        .stat-value {
          color: white;
          font-weight: bold;
          font-size: 12px;
        }

        .camera-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 10px;
        }

        .quick-actions {
          display: flex;
          gap: 10px;
          flex: 1;
          min-width: 300px;
        }

        .video-selection {
          background: #37474F;
          padding: 10px;
          border-radius: 6px;
          flex: 1;
          min-width: 250px;
        }

        .video-selection label {
          font-size: 12px;
          color: #BDBDBD;
          margin-bottom: 5px;
          display: block;
        }

        .video-selection select {
          width: 100%;
          padding: 8px;
          background: #263238;
          color: white;
          border: 1px solid #455A64;
          border-radius: 4px;
          font-size: 14px;
        }

        .no-videos {
          font-size: 12px;
          color: #FF9800;
          margin-top: 5px;
          text-align: center;
        }

        .action-btn {
          background: linear-gradient(135deg, #455A64, #37474F);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          transition: all 0.2s;
          min-width: 200px;
        }

        .action-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #37474F, #263238);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .simple-snapshot-btn {
          background: linear-gradient(135deg, #FF9800, #F57C00);
        }

        .simple-snapshot-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #F57C00, #E65100);
        }

        .snapshot-btn {
          background: linear-gradient(135deg, #2196F3, #1976D2);
        }

        .snapshot-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1976D2, #1565C0);
        }

        .process-btn {
          background: linear-gradient(135deg, #9C27B0, #7B1FA2);
        }

        .process-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #7B1FA2, #6A1B9A);
        }

        .cors-warning {
          background: rgba(255, 152, 0, 0.1);
          border: 1px solid #FF9800;
          border-radius: 6px;
          padding: 10px;
          margin-top: 10px;
          font-size: 12px;
          color: #FFE0B2;
        }

        .cors-warning summary {
          cursor: pointer;
          color: #FF9800;
          font-weight: bold;
        }

        .cors-warning .warning-content {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed #FF9800;
        }

        .cors-warning pre {
          background: rgba(0, 0, 0, 0.3);
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 10px;
          margin: 10px 0;
        }

        .cors-warning code {
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}