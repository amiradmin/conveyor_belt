// src/components/conveyor/StatusPanel.jsx
import React from 'react';
import './StatusPanel.css';

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
    <div className="status-panel">
      <div className="status-panel-header">
        <div className="status-panel-title">
          <div className="status-panel-icon">📊</div>
          <h4>وضعیت سیستم</h4>
        </div>
      </div>
      
      <div className="status-metrics-grid">
        <div className={`status-metric-card ${motorStatus === 'ON' ? 'active' : ''}`}>
          <div className="metric-icon motor-icon">⚙️</div>
          <div className="metric-content">
            <div className="metric-label">وضعیت موتور</div>
            <div className={`metric-value ${motorStatus === 'ON' ? 'status-on' : 'status-off'}`}>
              {motorStatus === 'ON' ? 'فعال' : 'غیرفعال'}
            </div>
          </div>
          <div className={`status-indicator ${motorStatus === 'ON' ? 'indicator-on' : 'indicator-off'}`}></div>
        </div>

        <div className="status-metric-card">
          <div className="metric-icon parts-icon">📦</div>
          <div className="metric-content">
            <div className="metric-label">تعداد قطعات</div>
            <div className="metric-value parts-value">{partsCount.toLocaleString('fa-IR')}</div>
          </div>
        </div>

        <div className={`status-metric-card ${alarmStatus === 'ACTIVE' ? 'alarm-active' : ''}`}>
          <div className="metric-icon alarm-icon">🚨</div>
          <div className="metric-content">
            <div className="metric-label">وضعیت هشدار</div>
            <div className={`metric-value ${alarmStatus === 'ACTIVE' ? 'alarm-value' : 'ok-value'}`}>
              {alarmStatus === 'ACTIVE' ? 'فعال' : 'عادی'}
            </div>
          </div>
          {alarmStatus === 'ACTIVE' && <div className="alarm-pulse"></div>}
        </div>

        <div className="status-metric-card">
          <div className="metric-icon speed-icon">⚡</div>
          <div className="metric-content">
            <div className="metric-label">سرعت</div>
            <div className="metric-value speed-value">{currentSpeed}x</div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="system-info">
        <div className="system-info-header">
          <span className="info-icon">🔗</span>
          <span className="info-title">اطلاعات اتصال</span>
        </div>
        <div className="system-info-grid">
          <div className="info-item">
            <span className="info-label">API:</span>
            <span className="info-value">{apiBase}</span>
          </div>
          <div className="info-item">
            <span className="info-label">شناسه نوار:</span>
            <span className="info-value">{beltId}</span>
          </div>
          <div className="info-item">
            <span className="info-label">عرض نوار:</span>
            <span className="info-value">{style?.belt_width || style?.style?.belt_width || '--'}px</span>
          </div>
        </div>
      </div>
    </div>
  );
}