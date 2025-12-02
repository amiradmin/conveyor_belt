// src/components/conveyor/StatusPanel.jsx
import React from 'react';

export default function StatusPanel({ plc, currentSpeed, apiBase, beltId, style }) {
  // Helper function to get values from either structure
  const getMotorStatus = () => {
    if (!plc || !plc.outputs) return 'OFF';

    const motorOn = plc.outputs.motor_on ||
                   (plc.outputs.digital_outputs && plc.outputs.digital_outputs.motor_on && plc.outputs.digital_outputs.motor_on.state);

    return motorOn ? 'ON' : 'OFF';
  };

  const getPartsCount = () => {
    if (!plc || !plc.counters) return 0;

    return plc.counters.object_counter ||
           (plc.counters.object_counter && typeof plc.counters.object_counter === 'object' ? plc.counters.object_counter.current : 0);
  };

  const getAlarmStatus = () => {
    if (!plc || !plc.outputs) return 'OK';

    const alarm = plc.outputs.alarm ||
                  (plc.outputs.digital_outputs && plc.outputs.digital_outputs.alarm && plc.outputs.digital_outputs.alarm.state);

    return alarm ? 'ACTIVE' : 'OK';
  };

  const motorStatus = getMotorStatus();
  const partsCount = getPartsCount();
  const alarmStatus = getAlarmStatus();

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
            color: alarmStatus === 'ACTIVE' ? '#FF5722' : '#4CAF50'
          }}>
            {alarmStatus}
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
          <div>Belt Width: {style?.belt_width}px</div>
        </div>
      </div>
    </div>
  );
}