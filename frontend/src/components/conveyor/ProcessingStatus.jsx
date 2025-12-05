// src/components/conveyor/ProcessingStatus.jsx
import React from 'react';

export default function ProcessingStatus({
  isProcessing,
  processingStatus,
  analysisResults,
  onStopProcessing,
  onClearResults
}) {
  // Extract status message from object or use as string
  const getStatusMessage = () => {
    if (typeof processingStatus === 'object' && processingStatus !== null) {
      const activeJobs = processingStatus.active_jobs || 0;
      const completedJobs = processingStatus.completed_jobs || 0;
      if (activeJobs > 0) {
        return `Processing... ${activeJobs} active job(s)`;
      } else if (completedJobs > 0) {
        return `✅ Completed ${completedJobs} job(s)`;
      }
      return 'Processing...';
    }
    return processingStatus || 'Processing...';
  };

  if (isProcessing) {
    return (
      <div className="processing-status processing">
        <div className="status-icon">⏳</div>
        <div className="status-content">
          <div className="status-title">Video Processing</div>
          <div className="status-message">{getStatusMessage()}</div>
        </div>
        <button className="stop-btn" onClick={onStopProcessing}>
          <span>⏹️</span>
          Stop
        </button>
      </div>
    );
  }

  if (analysisResults) {
    return (
      <div className="processing-status completed">
        <div className="status-icon">✅</div>
        <div className="status-content">
          <div className="status-title">Processing Complete</div>
          <div className="results-summary">
            <div className="result-item">
              <span className="result-label">Average Objects: </span>
              <span className="result-value">
                {Math.round(analysisResults.object_count || 0)}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Confidence: </span>
              <span className="result-value confidence">
                {Math.round((analysisResults.confidence || 0) * 100)}%
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">System Health: </span>
              <span className="result-value health">
                {analysisResults.system_health || 0}%
              </span>
            </div>
          </div>
          {analysisResults.details && (
            <div className="results-details">
              <div>Frames: {analysisResults.details.frames_processed}/{analysisResults.details.total_frames}</div>
              <div>Resolution: {analysisResults.details.resolution}</div>
              <div>FPS: {Math.round(analysisResults.details.fps || 0)}</div>
              <div>Max Objects: {analysisResults.details.max_objects || 0}</div>
              <div>Min Objects: {analysisResults.details.min_objects || 0}</div>
            </div>
          )}
        </div>
        <button className="clear-btn" onClick={onClearResults}>
          <span>🗑️</span>
          Clear
        </button>
      </div>
    );
  }

  return null;
}