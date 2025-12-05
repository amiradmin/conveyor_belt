// src/components/conveyor/LogPanel.jsx
import React from 'react';
import './LogPanel.css';

export default function LogPanel({ log, onClearLog }) {
  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <div className="log-panel-title">
          <div className="log-panel-icon">📋</div>
          <h4>گزارش رویدادها</h4>
        </div>
        <button
          onClick={onClearLog}
          className="clear-log-btn"
        >
          <span>🗑️</span>
          <span>پاک کردن</span>
        </button>
      </div>
      <div className="log-content">
        {log.map((entry, i) => (
          <div key={i} className={`log-entry ${i === 0 ? 'latest' : ''}`}>
            <span className="log-timestamp">{entry.match(/\[(.*?)\]/)?.[1] || ''}</span>
            <span className="log-message">{entry.replace(/\[.*?\]\s*/, '')}</span>
          </div>
        ))}
        {log.length === 0 && (
          <div className="log-empty">هیچ رویدادی ثبت نشده است</div>
        )}
      </div>
    </div>
  );
}