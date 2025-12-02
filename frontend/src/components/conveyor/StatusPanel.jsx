// src/components/conveyor/StatusPanel.jsx
import React from 'react';

export default function StatusPanel({ plc, currentSpeed, apiBase, beltId, style }) {
  const motorStatus = plc?.outputs?.motor_on ? 'ON' : 'OFF';
  const partsCount = plc?.outputs?.count_signal || plc?.counters?.object_counter || 0;

  return (
    <div style={{
      background: '#263238',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h4 style={{ marginTop: 0 }}>System Status</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#BDBDBD' }}>PARTS COUNT</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
            {partsCount}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#BDBDBD' }}>MOTOR STATUS</div>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: motorStatus === 'ON' ? '#4CAF50' : '#F44336'
          }}>
            {motorStatus}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#BDBDBD' }}>ALARM</div>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: plc?.outputs?.alarm ? '#FF5722' : '#4CAF50'
          }}>
            {plc?.outputs?.alarm ? 'ACTIVE' : 'OK'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#BDBDBD' }}>SPEED</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
            {currentSpeed}x
          </div>
        </div>
      </div>

      {/* Backend Info */}
      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #37474F', fontSize: '12px' }}>
        <div style={{ color: '#BDBDBD', marginBottom: '5px' }}>Backend Connection</div>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div>API: {apiBase}</div>
          <div>Belt ID: {beltId}</div>
          <div>Style loaded: {style?.id ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  );
}