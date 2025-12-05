// src/components/conveyor/ControlPanel.jsx
import React from 'react';
import './ControlPanel.css';

export default function ControlPanel({
  motorStatus,
  onStart,
  onStop,
  onEmergencyStop,
  onReset,
  onSave,
  onRefresh,
  lastFetchTime
}) {
  return (
    <div className="control-panel">
      <div className="control-panel-header">
        <div className="control-panel-title">
          <div className="control-panel-icon">⚙️</div>
          <h4>پنل کنترل عملیات</h4>
        </div>
        <div className="control-panel-actions">
          <button
            onClick={onRefresh}
            className="control-btn refresh-btn"
            title="Refresh from backend"
          >
            <span>🔄</span>
            <span>بروزرسانی</span>
          </button>
          <div className="last-update">
            <span className="update-label">آخرین بروزرسانی:</span>
            <span className="update-time">{new Date(lastFetchTime).toLocaleTimeString('fa-IR')}</span>
          </div>
        </div>
      </div>
      <div className="control-buttons-grid">
        <button
          onClick={onStart}
          disabled={motorStatus === 'ON'}
          className={`control-btn primary-btn start-btn ${motorStatus === 'ON' ? 'disabled' : ''}`}
        >
          <span className="btn-icon">▶</span>
          <span className="btn-text">شروع</span>
        </button>
        <button
          onClick={onStop}
          disabled={motorStatus !== 'ON'}
          className={`control-btn primary-btn stop-btn ${motorStatus !== 'ON' ? 'disabled' : ''}`}
        >
          <span className="btn-icon">⏹</span>
          <span className="btn-text">توقف</span>
        </button>
        <button
          onClick={onEmergencyStop}
          className="control-btn emergency-btn"
        >
          <span className="btn-icon">⛔</span>
          <span className="btn-text">توقف اضطراری</span>
        </button>
        <button
          onClick={onReset}
          className="control-btn secondary-btn reset-btn"
        >
          <span className="btn-icon">🔄</span>
          <span className="btn-text">بازنشانی</span>
        </button>
        <button
          onClick={onSave}
          className="control-btn secondary-btn save-btn"
        >
          <span className="btn-icon">💾</span>
          <span className="btn-text">ذخیره تنظیمات</span>
        </button>
      </div>
    </div>
  );
}