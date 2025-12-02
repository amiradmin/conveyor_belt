// src/components/conveyor/ControlPanel.jsx
import React from 'react';

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
    <div style={{
      background: '#37474F',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ color: 'white', margin: 0 }}>Control Panel</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={onRefresh}
            style={{
              background: '#9C27B0',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="Refresh from backend"
          >
            🔄 Refresh
          </button>
          <div style={{ fontSize: '11px', color: '#BDBDBD' }}>
            Last: {new Date(lastFetchTime).toLocaleTimeString()}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={onStart}
          disabled={motorStatus === 'ON'}
          style={{
            background: motorStatus === 'ON' ? '#666' : '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: motorStatus === 'ON' ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            flex: 1,
            minWidth: '100px'
          }}
        >
          ▶ START
        </button>
        <button
          onClick={onStop}
          disabled={motorStatus !== 'ON'}
          style={{
            background: motorStatus !== 'ON' ? '#666' : '#F44336',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: motorStatus !== 'ON' ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            flex: 1,
            minWidth: '100px'
          }}
        >
          ⏹ STOP
        </button>
        <button
          onClick={onEmergencyStop}
          style={{
            background: '#D32F2F',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            flex: 1,
            minWidth: '100px'
          }}
        >
          ⛔ E-STOP
        </button>
        <button
          onClick={onReset}
          style={{
            background: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            flex: 1,
            minWidth: '100px'
          }}
        >
          🔄 RESET
        </button>
        <button
          onClick={onSave}
          style={{
            background: '#FF9800',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            flex: 1,
            minWidth: '120px'
          }}
        >
          💾 SAVE
        </button>
      </div>
    </div>
  );
}