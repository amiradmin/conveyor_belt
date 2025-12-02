// src/components/conveyor/LogPanel.jsx
import React from 'react';

export default function LogPanel({ log, onClearLog }) {
  return (
    <div style={{
      background: '#f5f5f5',
      padding: '15px',
      borderRadius: '8px',
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0,color:'black' }}>Event Log</h4>
        <button
          onClick={onClearLog}
          style={{
            background: '#666',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Clear Log
        </button>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
        {log.map((entry, i) => (
          <div key={i} style={{
            padding: '4px 0',
            borderBottom: i < log.length - 1 ? '1px solid #ddd' : 'none', color:'black'
          }}>
            {entry}
          </div>
        ))}
        {log.length === 0 && (
          <div style={{ color: '#999', fontStyle: 'italic' }}>No events yet</div>
        )}
      </div>
    </div>
  );
}