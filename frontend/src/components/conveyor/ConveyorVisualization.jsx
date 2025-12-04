// src/components/conveyor/ConveyorVisualization.jsx
import React from 'react';
import { DraggableCore } from 'react-draggable';

export default function ConveyorVisualization({
  style,
  plc,
  objects,
  offset,
  onSensorDrag,
  onCameraClick
}) {

  const motorStatus = plc?.outputs?.motor_on ? 'ON' : 'OFF';
  // Use the running/stopped color based on motor status
  const beltColor = motorStatus === 'ON'
    ? (style?.style.belt_running_color || '#4CAF50')
    : (style?.style.belt_stopped_color || style?.style.belt_color || "#5a5a5a");

  return (
    <div style={{
      background: '#37474F',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        Style ID: {style?.style.id || 'local'}
      </div>

      <svg width={(style?.style.belt_length || 800) + 100} height={220} style={{ display: 'block', margin: '0 auto' }}>
        {/* Belt Surface */}
        <defs>
          <pattern id="beltPattern" width="80" height={style?.style.belt_width || 30} patternUnits="userSpaceOnUse">
            <rect width="80" height={style?.style.belt_width || 30} fill={beltColor} />
            <line x1="0" y1={(style?.style.belt_width || 30)/2} x2="80" y2={(style?.style.belt_width || 30)/2} stroke="#444" strokeWidth="1" />
          </pattern>
        </defs>

        <g transform={`translate(${offset}, 0)`}>
          <rect x={50} y={100} width={style?.style.belt_length || 800} height={style?.style.belt_width || 30}
            fill="url(#beltPattern)" rx={6} stroke="#555" strokeWidth="2" />
        </g>

        {/* Rollers */}
        {Array.from({ length: style?.style.roller_count || 8 }).map((_, i) => (
          <circle key={i}
            cx={50 + i * ((style?.style.belt_length || 800) / ((style?.roller_count || 8) - 1))}
            cy={115 + (style?.style.belt_width || 30) / 2}
            r={10}
            fill={style?.style.roller_color || "#444"}
          />
        ))}

        {/* Objects */}
        {objects.map(o => (
          <rect key={o.id} x={o.x} y={105} width={20} height={20} rx={3} fill={style?.style.object_color || "#8b4513"} />
        ))}

        {/* Sensors */}
        <DraggableCore axis="x" onDrag={d => onSensorDrag('s1', d)} bounds={{ left: 50, right: 50 + (style?.style.belt_length || 800) }}>
          <g style={{ cursor: 'grab' }}>
            <rect x={(style?.sensor_x || 300) - 5} y={90} width={10} height={50}
              fill={style?.sensor_color || "yellow"} stroke="#333" />
            <circle cx={style?.sensor_x || 300} cy={95} r="3"
              fill={plc?.inputs?.sensor_1 ? (style?.sensor_led_color || "red") : "#666"} />
            <text x={style?.sensor_x || 300} y={145} textAnchor="middle" fontSize="10" fill="white">
              S1
            </text>
          </g>
        </DraggableCore>

        <DraggableCore axis="x" onDrag={d => onSensorDrag('s2', d)} bounds={{ left: 50, right: 50 + (style?.belt_length || 800) }}>
          <g style={{ cursor: 'grab' }}>
            <rect x={(style?.sensor_2_x || 600) - 5} y={90} width={10} height={50}
              fill={style?.sensor_2_color || "orange"} stroke="#333" />
            <circle cx={style?.sensor_2_x || 600} cy={95} r="3"
              fill={plc?.inputs?.sensor_2 ? (style?.sensor_led_color || "red") : "#666"} />
            <text x={style?.sensor_2_x || 600} y={145} textAnchor="middle" fontSize="10" fill="white">
              S2
            </text>
          </g>
        </DraggableCore>

        {/* Motor */}
        <rect x={(style?.style.belt_length || 800) - 30} y={80} width={30} height={40}
          fill={style?.style.motor_color || "#222"} stroke="#666" strokeWidth="1" />
        <circle cx={(style?.style.belt_length || 800) - 15} cy={100} r="8"
          fill="#666"
          style={{ animation: motorStatus === 'ON' ? 'rotate 2s linear infinite' : 'none' }} />
        <text x={(style?.style.belt_length || 800) - 15} y={75} textAnchor="middle" fontSize="10" fill="white">
          Motor
        </text>

        {/* Camera - positioned according to style */}
        <g onClick={onCameraClick} style={{ cursor: 'pointer' }}>
          <rect x={style?.style.camera_x || 50} y={style?.style.camera_y || 10} width={30} height={20}
            fill={style?.style.camera_color || "#0080ff"} rx={4} />
          <circle cx={(style?.style.camera_x || 50) + 22} cy={(style?.style.camera_y || 10) + 10} r="4" fill="#000" />
          <circle cx={(style?.style.camera_x || 50) + 22} cy={(style?.style.camera_y || 10) + 10} r="2"
            fill={style?.style.camera_led_color || "#0080FF"} />
          <text x={style?.style.camera_x || 50} y={(style?.style.camera_y || 10) - 5} fontSize="10" fill={style?.style.camera_color || "#0080ff"}>
            Cam
          </text>
        </g>
      </svg>

      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Style Info */}
      <div style={{ marginTop: '10px', fontSize: '11px', color: '#BDBDBD', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div>Belt: {style?.style.belt_length || 800}px × {style?.style.belt_width || 30}px</div>
        <div>Color: <span style={{ color: style?.style.belt_color || "#5a5a5a" }}>■ {style?.belt_color}</span></div>
        <div>Rollers: {style?.style.roller_count || 8}</div>
        <div>Motor: <span style={{ color: style?.style.motor_color || "#222" }}>■</span></div>
        <div>Camera: {style?.style.camera_x}, {style?.style.camera_y}</div>
      </div>
    </div>
  );
}