// src/components/conveyor/ConveyorVisualization.jsx
import React from 'react';
import { DraggableCore } from 'react-draggable';
import './ConveyorVisualization.css';

export default function ConveyorVisualization({
  style,
  plc,
  objects,
  offset,
  onSensorDrag,
  onCameraClick
}) {
  const motorStatus = plc?.outputs?.motor_on ? 'ON' : 'OFF';
  const beltLength = style?.style.belt_length || 800;
  const beltWidth = style?.style.belt_width || 30;
  const rollerCount = style?.style.roller_count || 8;
  
  // Use the running/stopped color based on motor status
  const beltColor = motorStatus === 'ON'
    ? (style?.style.belt_running_color || '#4CAF50')
    : (style?.style.belt_stopped_color || style?.style.belt_color || "#333333");
  
  const motorColor = style?.style.motor_color || "#263238";
  const rollerColor = style?.style.roller_color || "#5D4037";
  const objectColor = style?.style.object_color || "#8B4513";
  // Object size - configurable via style JSON, defaults to larger size
  const objectWidth = style?.style.object_width || 30; // Increased from 20 to 30
  const objectHeight = style?.style.object_height || 18; // Increased from 12 to 18
  const sensorColor = style?.sensor_color || style?.style.sensor_color || "#ffcc00";
  const sensor2Color = style?.sensor_2_color || style?.style.sensor_2_color || "#ffaa00";
  const cameraColor = style?.style.camera_color || "#ffcc00";
  const cameraLedColor = style?.style.camera_led_color || "#0080FF";
  const sensorLedColor = style?.style.sensor_led_color || "#FF9800";
  
  const sensor1X = style?.sensor_x || style?.style.sensor_x || 300;
  const sensor2X = style?.sensor_2_x || style?.style.sensor_2_x || 600;
  const cameraX = style?.style.camera_x || 50;
  const cameraY = style?.style.camera_y || 20;
  
  const svgHeight = 420; // Increased from 280 to 420 (50% larger)
  const beltY = 200; // Adjusted proportionally (was 140)
  const rollerY = beltY + beltWidth + 20; // More spacing
  const frameY = rollerY + 30; // More spacing

  return (
    <div className="conveyor-visualization-container">
      <div className="visualization-badge">
        <span className="badge-label">شناسه استایل:</span>
        <span className="badge-value">{style?.style.id || 'local'}</span>
      </div>

      <svg 
        width={beltLength + 200} 
        height={svgHeight} 
        style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
        viewBox={`0 0 ${beltLength + 200} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Belt pattern with texture */}
          <pattern id="beltPattern" width="80" height={beltWidth} patternUnits="userSpaceOnUse">
            <rect width="80" height={beltWidth} fill={beltColor} />
            <line x1="0" y1={beltWidth/2} x2="80" y2={beltWidth/2} 
              stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
            <line x1="0" y1={beltWidth/4} x2="80" y2={beltWidth/4} 
              stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
            <line x1="0" y1={beltWidth*3/4} x2="80" y2={beltWidth*3/4} 
              stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
          </pattern>
          
          {/* Gradient for belt depth */}
          <linearGradient id="beltGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={beltColor} stopOpacity="1" />
            <stop offset="50%" stopColor={beltColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" stopOpacity="0.8" />
          </linearGradient>
          
          {/* Roller gradient for 3D effect */}
          <radialGradient id="rollerGradient" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#888" stopOpacity="1" />
            <stop offset="50%" stopColor={rollerColor} stopOpacity="1" />
            <stop offset="100%" stopColor="#222" stopOpacity="1" />
          </radialGradient>
          
          {/* Motor gradient */}
          <linearGradient id="motorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#555" stopOpacity="1" />
            <stop offset="50%" stopColor={motorColor} stopOpacity="1" />
            <stop offset="100%" stopColor="#111" stopOpacity="1" />
          </linearGradient>
          
          {/* Object shadow */}
          <filter id="objectShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Sensor glow */}
          <filter id="sensorGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Camera glow */}
          <filter id="cameraGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Support Frame Structure */}
        <g className="support-frame">
          {/* Main frame rails */}
          <rect x={60} y={frameY} width={beltLength + 40} height={10} 
            fill="#1a1a1a" rx={4} stroke="#333" strokeWidth="1" />
          <rect x={60} y={frameY + 10} width={beltLength + 40} height={5} 
            fill="#0a0a0a" rx={2} />
          
          {/* Vertical supports */}
          {[0, beltLength + 40].map((offset, i) => (
            <rect key={i} x={60 + offset} y={beltY - 30} width={8} height={frameY - beltY + 40} 
              fill="#1a1a1a" rx={2} stroke="#333" strokeWidth="0.5" />
          ))}
        </g>

        {/* Rollers - More realistic cylindrical appearance */}
        {Array.from({ length: rollerCount }).map((_, i) => {
          const rollerX = 60 + i * (beltLength / (rollerCount - 1));
          return (
            <g key={i} className="roller-group">
              {/* Roller shadow */}
              <ellipse cx={rollerX} cy={rollerY + 2} rx={12} ry={4} 
                fill="rgba(0,0,0,0.4)" opacity="0.5" />
              
              {/* Roller body - cylindrical */}
              <ellipse cx={rollerX} cy={rollerY - 8} rx={12} ry={4} 
                fill={rollerColor} opacity="0.6" />
              <rect x={rollerX - 12} y={rollerY - 8} width={24} height={16} 
                fill="url(#rollerGradient)" rx={12} />
              <ellipse cx={rollerX} cy={rollerY + 8} rx={12} ry={4} 
                fill="#222" opacity="0.8" />
              
              {/* Roller center shaft */}
              <circle cx={rollerX} cy={rollerY} r="3" fill="#111" />
              <circle cx={rollerX} cy={rollerY} r="1.5" fill="#666" />
            </g>
          );
        })}

        {/* Belt Surface - More realistic with depth */}
        <g className="belt-group" transform={`translate(${offset}, 0)`}>
          {/* Belt shadow */}
          <rect x={60} y={beltY + beltWidth + 3} width={beltLength} height={beltWidth} 
            fill="rgba(0,0,0,0.3)" rx={6} opacity="0.5" />
          
          {/* Belt top surface */}
          <rect x={60} y={beltY} width={beltLength} height={beltWidth}
            fill="url(#beltPattern)" rx={6} 
            stroke="#222" strokeWidth="2" />
          
          {/* Belt side depth effect */}
          <rect x={60} y={beltY + beltWidth} width={beltLength} height={5}
            fill="url(#beltGradient)" rx={2} />
        </g>

        {/* Iron Ore Objects - More realistic with shadows */}
        {objects.map(o => {
          const objCenterX = o.x + objectWidth / 2;
          const objCenterY = beltY + beltWidth / 2;
          const shadowRx = objectWidth / 2.5;
          const shadowRy = objectHeight / 4;
          const ellipseRx = objectWidth / 2;
          const ellipseRy = objectHeight / 3;
          
          return (
            <g key={o.id} filter="url(#objectShadow)" className="iron-ore-object">
              {/* Object shadow */}
              <ellipse cx={objCenterX} cy={beltY + beltWidth + 3} rx={shadowRx} ry={shadowRy} 
                fill="rgba(0,0,0,0.4)" opacity="0.6" />
              
              {/* Object body - more realistic shape */}
              <ellipse cx={objCenterX} cy={objCenterY - objectHeight/6} rx={ellipseRx} ry={ellipseRy} 
                fill={objectColor} opacity="0.7" />
              <rect x={o.x} y={objCenterY - objectHeight/2} width={objectWidth} height={objectHeight} 
                fill={objectColor} rx={objectWidth/5} />
              <ellipse cx={objCenterX} cy={objCenterY + objectHeight/6} rx={ellipseRx} ry={ellipseRy} 
                fill="#5a2a0a" opacity="0.8" />
              
              {/* Object highlight */}
              <ellipse cx={objCenterX - objectWidth/10} cy={objCenterY - objectHeight/3} 
                rx={objectWidth/5} ry={objectHeight/9} 
                fill="rgba(255,255,255,0.2)" />
            </g>
          );
        })}

        {/* Sensor 1 - More industrial look */}
        <DraggableCore 
          axis="x" 
          onDrag={d => onSensorDrag('s1', d)} 
          bounds={{ left: 60, right: 60 + beltLength }}
        >
          <g className="sensor-group" style={{ cursor: 'grab' }} filter="url(#sensorGlow)">
            {/* Sensor mounting bracket */}
            <rect x={sensor1X - 8} y={beltY - 35} width={16} height={8} 
              fill="#2a2a2a" rx={2} stroke="#444" strokeWidth="1" />
            
            {/* Sensor body */}
            <rect x={sensor1X - 6} y={beltY - 27} width={12} height={20} 
              fill={sensorColor} rx={2} stroke="#333" strokeWidth="1.5" />
            
            {/* Sensor LED indicator */}
            <circle cx={sensor1X} cy={beltY - 20} r="4"
              fill={plc?.inputs?.sensor_1 ? sensorLedColor : "#333"}
              opacity={plc?.inputs?.sensor_1 ? 1 : 0.3}
              style={{ 
                filter: plc?.inputs?.sensor_1 ? 'drop-shadow(0 0 4px ' + sensorLedColor + ')' : 'none',
                transition: 'all 0.2s'
              }} />
            
            {/* Sensor detection beam */}
            {plc?.inputs?.sensor_1 && (
              <line x1={sensor1X} y1={beltY - 7} x2={sensor1X} y2={beltY + beltWidth + 5}
              stroke={sensorLedColor} strokeWidth="2" opacity="0.6" strokeDasharray="4,2" />
            )}
            
            {/* Sensor label */}
            <text x={sensor1X} y={beltY + beltWidth + 25} textAnchor="middle" 
              fontSize="11" fill="#ffcc00" fontWeight="600" fontFamily="Vazirmatn, sans-serif">
              S1
            </text>
          </g>
        </DraggableCore>

        {/* Sensor 2 - More industrial look */}
        <DraggableCore 
          axis="x" 
          onDrag={d => onSensorDrag('s2', d)} 
          bounds={{ left: 60, right: 60 + beltLength }}
        >
          <g className="sensor-group" style={{ cursor: 'grab' }} filter="url(#sensorGlow)">
            {/* Sensor mounting bracket */}
            <rect x={sensor2X - 8} y={beltY - 35} width={16} height={8} 
              fill="#2a2a2a" rx={2} stroke="#444" strokeWidth="1" />
            
            {/* Sensor body */}
            <rect x={sensor2X - 6} y={beltY - 27} width={12} height={20} 
              fill={sensor2Color} rx={2} stroke="#333" strokeWidth="1.5" />
            
            {/* Sensor LED indicator */}
            <circle cx={sensor2X} cy={beltY - 20} r="4"
              fill={plc?.inputs?.sensor_2 ? sensorLedColor : "#333"}
              opacity={plc?.inputs?.sensor_2 ? 1 : 0.3}
              style={{ 
                filter: plc?.inputs?.sensor_2 ? 'drop-shadow(0 0 4px ' + sensorLedColor + ')' : 'none',
                transition: 'all 0.2s'
              }} />
            
            {/* Sensor detection beam */}
            {plc?.inputs?.sensor_2 && (
              <line x1={sensor2X} y1={beltY - 7} x2={sensor2X} y2={beltY + beltWidth + 5}
              stroke={sensorLedColor} strokeWidth="2" opacity="0.6" strokeDasharray="4,2" />
            )}
            
            {/* Sensor label */}
            <text x={sensor2X} y={beltY + beltWidth + 25} textAnchor="middle" 
              fontSize="11" fill="#ffcc00" fontWeight="600" fontFamily="Vazirmatn, sans-serif">
              S2
            </text>
          </g>
        </DraggableCore>

        {/* Motor - More realistic industrial motor */}
        <g className="motor-group">
          {/* Motor shadow */}
          <ellipse cx={50 + beltLength - 15} cy={beltY - 10 + 5} rx={20} ry={8} 
            fill="rgba(0,0,0,0.4)" opacity="0.5" />
          
          {/* Motor body - 3D effect */}
          <rect x={60 + beltLength - 50} y={beltY - 40} width={50} height={40} 
            fill="url(#motorGradient)" rx={5} stroke="#111" strokeWidth="2" />
          
          {/* Motor top */}
          <ellipse cx={60 + beltLength - 25} cy={beltY - 40} rx={25} ry={10} 
            fill="#333" opacity="0.8" />
          
          {/* Motor shaft/pulley */}
          <circle cx={60 + beltLength - 25} cy={beltY - 15} r="15"
            fill="#1a1a1a" stroke="#333" strokeWidth="2" />
          
          {/* Rotating pulley when motor is ON */}
          <g transform={`translate(${60 + beltLength - 25}, ${beltY - 15})`}>
            <circle r="12" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
            <circle r="7" fill="#1a1a1a" />
            {motorStatus === 'ON' && (
              <g className="rotating-pulley" style={{ animation: 'rotate 1s linear infinite' }}>
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#666" strokeWidth="2" />
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#666" strokeWidth="2" />
              </g>
            )}
          </g>
          
          {/* Motor status indicator */}
          <circle cx={60 + beltLength - 12} cy={beltY - 32} r="4"
            fill={motorStatus === 'ON' ? '#4CAF50' : '#666'}
            style={{ 
              filter: motorStatus === 'ON' ? 'drop-shadow(0 0 4px #4CAF50)' : 'none',
              transition: 'all 0.2s'
            }} />
          
          {/* Motor label */}
          <text x={60 + beltLength - 25} y={beltY - 55} textAnchor="middle" 
            fontSize="12" fill="#ffcc00" fontWeight="600" fontFamily="Vazirmatn, sans-serif">
            Motor
          </text>
          <text x={60 + beltLength - 25} y={beltY - 42} textAnchor="middle" 
            fontSize="11" fill={motorStatus === 'ON' ? '#4CAF50' : '#999'} 
            fontWeight="500" fontFamily="Vazirmatn, sans-serif">
            {motorStatus}
          </text>
        </g>

        {/* Camera - More realistic industrial camera */}
        <g className="camera-group" onClick={onCameraClick} style={{ cursor: 'pointer' }} filter="url(#cameraGlow)">
          {/* Camera mounting bracket */}
          <rect x={cameraX - 2} y={cameraY + 18} width={34} height={6} 
            fill="#2a2a2a" rx={2} stroke="#444" strokeWidth="1" />
          
          {/* Camera body */}
          <rect x={cameraX} y={cameraY} width={30} height={20} 
            fill={cameraColor} rx={3} stroke="#333" strokeWidth="1.5" />
          
          {/* Camera lens housing */}
          <circle cx={cameraX + 22} cy={cameraY + 10} r="8" 
            fill="#1a1a1a" stroke="#000" strokeWidth="2" />
          
          {/* Camera lens */}
          <circle cx={cameraX + 22} cy={cameraY + 10} r="5" 
            fill="#000" />
          <circle cx={cameraX + 22} cy={cameraY + 10} r="3" 
            fill="rgba(100,150,255,0.3)" />
          
          {/* Camera LED indicator */}
          <circle cx={cameraX + 8} cy={cameraY + 6} r="2"
            fill={cameraLedColor}
            style={{ 
              filter: 'drop-shadow(0 0 3px ' + cameraLedColor + ')',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
          
          {/* Camera label */}
          <text x={cameraX + 15} y={cameraY - 5} textAnchor="middle" 
            fontSize="9" fill={cameraColor} fontWeight="600" fontFamily="Vazirmatn, sans-serif">
            CAM
          </text>
          
          {/* Camera view angle indicator */}
          <path d={`M ${cameraX + 22} ${cameraY + 10} L ${60} ${beltY} L ${60 + beltLength} ${beltY} Z`}
            fill="rgba(255,204,0,0.1)" stroke={cameraColor} strokeWidth="1" 
            strokeDasharray="3,3" opacity="0.3" />
        </g>
      </svg>

      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .rotating-pulley {
          transform-origin: center;
        }
        .sensor-group:hover {
          opacity: 0.8;
        }
        .camera-group:hover {
          opacity: 0.9;
        }
        .iron-ore-object {
          transition: transform 0.1s ease-out;
        }
      `}</style>

      {/* Style Info */}
      <div className="visualization-info">
        <div className="info-row">
          <span className="info-label">ابعاد نوار:</span>
          <span className="info-text">{beltLength}px × {beltWidth}px</span>
        </div>
        <div className="info-row">
          <span className="info-label">رنگ:</span>
          <span className="info-color" style={{ color: style?.style.belt_color || "#333333" }}>
            ■ {style?.style.belt_color || '#333333'}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">تعداد غلطک:</span>
          <span className="info-text">{rollerCount}</span>
        </div>
        <div className="info-row">
          <span className="info-label">موتور:</span>
          <span className="info-text" style={{ color: motorStatus === 'ON' ? '#4CAF50' : '#999' }}>
            {motorStatus}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">دوربین:</span>
          <span className="info-text">{cameraX}, {cameraY}</span>
        </div>
        <div className="info-row">
          <span className="info-label">سنسورها:</span>
          <span className="info-text">S1: {sensor1X}px, S2: {sensor2X}px</span>
        </div>
      </div>
    </div>
  );
}
