// src/components/conveyor/ConveyorSimulator.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import VideoModal from './VideoModal';
import ConveyorVisualization from './ConveyorVisualization';
import ControlPanel from './ControlPanel';
import StatusPanel from './StatusPanel';
import LogPanel from './LogPanel';
import { deepClone, evalExpr, applyActions, defaultPLC, defaultStyle, normalizeStyle } from './PLCUtils';

export default function ConveyorSimulator({ beltId = 1, apiBase = 'http://localhost:8000/api/camera/' }) {
  const [belt, setBelt] = useState(null);
  const [style, setStyle] = useState(null);
  const [plc, setPlc] = useState(null);
  const [objects, setObjects] = useState([]);
  const [offset, setOffset] = useState(0);
  const [log, setLog] = useState([]);
  const [cameraUrl, setCameraUrl] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(Date.now());
  const lastFetchRef = useRef(0);

  // Initialize PLC with proper structure to avoid undefined errors
  const initializePLC = (backendPLC) => {
    if (!backendPLC) return defaultPLC;

    // Ensure all properties exist
    return {
      ...defaultPLC,
      ...backendPLC,
      inputs: {
        ...defaultPLC.inputs,
        ...(backendPLC.inputs || {})
      },
      outputs: {
        ...defaultPLC.outputs,
        ...(backendPLC.outputs || {})
      },
      counters: {
        ...defaultPLC.counters,
        ...(backendPLC.counters || {})
      },
      flags: {
        ...defaultPLC.flags,
        ...(backendPLC.flags || {})
      },
      rungs: backendPLC.rungs || defaultPLC.rungs
    };
  };

  // Function to fetch data from backend
  const fetchBeltData = async () => {
    try {
      console.log('Fetching belt data from backend...');
      const res = await axios.get(`${apiBase}conveyor-belts/${beltId}/`);
      const data = res.data;
      console.log('Backend response:', data);

      setBelt(data);

      // Always use backend style data with normalization
      if (data.style) {
        console.log('Setting style from backend (normalized):', data.style);
        const normalizedStyle = normalizeStyle(data.style);
        console.log('Normalized style:', normalizedStyle);
        setStyle(normalizedStyle);
      } else {
        // Only use defaults if backend has no style
        setStyle(defaultStyle);
      }

      // Always use backend PLC data with proper initialization
      const initializedPLC = initializePLC(data.plc_logic);
      console.log('Setting PLC (initialized):', initializedPLC);
      setPlc(initializedPLC);

      // Reset objects to starting positions
      setObjects([
        { id: 1, x: 100, triggered_s1: false, triggered_s2: false },
        { id: 2, x: 250, triggered_s1: false, triggered_s2: false },
        { id: 3, x: 400, triggered_s1: false, triggered_s2: false }
      ]);

      if (data.video_url) setCameraUrl(data.video_url);
      if (data.current_speed) setCurrentSpeed(data.current_speed);

      lastFetchRef.current = Date.now();
      setLog(l => [`Data fetched from backend @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));

    } catch (e) {
      console.error('Error fetching belt data:', e);
      setLog(l => [`Error fetching data: ${e.message}`, ...l].slice(0, 50));
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchBeltData();

    // Set up auto-refresh every 5 seconds
    const intervalId = setInterval(() => {
      fetchBeltData();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [beltId, apiBase, refreshTrigger]);

  // Manually trigger refresh
  const refreshFromBackend = () => {
    setRefreshTrigger(prev => prev + 1);
    setLog(l => [`Manual refresh triggered @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
  };

  // Tick: animation + PLC evaluation
  useEffect(() => {
    if (!plc || !style) return;
    let runningFlag = true;

    function tick() {
      if (!runningFlag) return;
      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const motorOn = true;
      const pxPerSec = currentSpeed * 40;

      // Move objects if motor is on
      if (motorOn) {
        setOffset(o => (o + pxPerSec * dt / 1000) % 80);
        setObjects(prev => prev.map(o => ({
          ...o,
          x: o.x + pxPerSec * dt / 1000
        })));
      }

      // Sensor detection
      let s1Triggered = false, s2Triggered = false;
      setObjects(prev => prev.map(o => {
        const sensorX = style.sensor_x || 300;
        const sensor2X = style.sensor_2_x || 600;

        if (!o.triggered_s1 && o.x >= sensorX - 5 && o.x <= sensorX + 5) {
          s1Triggered = true;
          o.triggered_s1 = true;
          console.log(`Object ${o.id} triggered sensor 1 at x=${o.x.toFixed(1)}`);
        }
        if (!o.triggered_s2 && o.x >= sensor2X - 5 && o.x <= sensor2X + 5) {
          s2Triggered = true;
          o.triggered_s2 = true;
          console.log(`Object ${o.id} triggered sensor 2 at x=${o.x.toFixed(1)}`);
        }
        return o;
      }));

      // Update PLC inputs with sensor states
      const newPlc = deepClone(plc);

      // Ensure inputs object exists
      if (!newPlc.inputs) newPlc.inputs = {};
      newPlc.inputs.sensor_1 = s1Triggered;
      newPlc.inputs.sensor_2 = s2Triggered;

      // Evaluate all rungs
      console.log('Evaluating PLC rungs...');
      for (const rung of newPlc.rungs || []) {
        const hold = evalExpr(rung.expr, newPlc);
        console.log(`Rung ${rung.id} (${rung.description}): ${hold ? 'TRUE' : 'FALSE'}`);
        if (hold) {
          applyActions(rung.actions || [], newPlc);
          console.log(`Applied actions for rung ${rung.id}`);
        }
      }

      // Clear start seal if motor is off
      if (!newPlc.outputs?.motor_on && newPlc.flags?.start_sealed) {
        newPlc.flags.start_sealed = false;
      }

      // Debug: Check motor state
      console.log('Motor state:', newPlc.outputs?.motor_on ? 'ON' : 'OFF');

      // Update PLC state
      setPlc(newPlc);

      // Remove objects that have moved off the belt
      const beltLength = style.belt_length || 800;
      setObjects(prev => prev.filter(o => o.x < beltLength + 50));

      rafRef.current = requestAnimationFrame(tick);
    }

    lastTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      runningFlag = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [plc, style, currentSpeed]);

  // Control functions
  const toggleStart = () => {
    console.log('Start button clicked');
    const newPlc = deepClone(plc);
    if (!newPlc.inputs) newPlc.inputs = {};
    newPlc.inputs.start = true;
    newPlc.inputs.stop = true;
    console.log('Updated PLC inputs:', newPlc.inputs);
    setPlc(newPlc);
    setLog(l => [`Start pressed @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
  };

  const toggleStop = () => {
    console.log('Stop button clicked');
    const newPlc = deepClone(plc);
    if (!newPlc.inputs) newPlc.inputs = {};
    newPlc.inputs.stop = false;
    newPlc.inputs.start = false;
    setPlc(newPlc);
    setLog(l => [`Stop pressed @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
  };

  const emergencyStop = () => {
    const newPlc = deepClone(plc);
    if (!newPlc.inputs) newPlc.inputs = {};
    newPlc.inputs.emergency_stop = false;
    setPlc(newPlc);
    setLog(l => [`EMERGENCY STOP @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
  };

  const resetObjects = () => {
    setObjects([
      { id: 1, x: 100, triggered_s1: false, triggered_s2: false },
      { id: 2, x: 250, triggered_s1: false, triggered_s2: false },
      { id: 3, x: 400, triggered_s1: false, triggered_s2: false }
    ]);
    const newPlc = deepClone(plc);
    if (newPlc.outputs) newPlc.outputs.count_signal = 0;
    if (newPlc.counters) {
      newPlc.counters.object_counter = 0;
      newPlc.counters.today_parts = 0;
    }
    if (newPlc.flags) {
      newPlc.flags.fault_active = false;
    }
    if (newPlc.outputs) newPlc.outputs.alarm = false;
    setPlc(newPlc);
    setLog(l => [`Objects and counters reset @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
  };

  const saveConfig = async () => {
    try {
      // Create clean save object
      const saveData = {};

      // Only save style if it has values
      if (style) {
        // Save all style properties including new ones
        saveData.style = style;
      }

      // Only save PLC if it has values
      if (plc) {
        saveData.plc_logic = plc;
      }

      console.log('Saving to backend:', saveData);
      await axios.patch(`${apiBase}conveyor-belts/${beltId}/`, saveData);
      setLog(l => [`Config saved to backend @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));

      // Refresh from backend after save to ensure consistency
      setTimeout(() => {
        fetchBeltData();
      }, 500);

    } catch (e) {
      console.error('Save error:', e);
      setLog(l => [`Save error: ${e.message}`, ...l].slice(0, 50));
    }
  };

  const onSensorDrag = (sensor, data) => {
    const newX = Math.max(50, Math.min((style?.belt_length || 800) - 10,
      (sensor === 's1' ? (style?.sensor_x || 300) : (style?.sensor_2_x || 600)) + data.deltaX));

    const updatedStyle = { ...style };
    if (sensor === 's1') {
      updatedStyle.sensor_x = newX;
    } else {
      updatedStyle.sensor_2_x = newX;
    }
    setStyle(updatedStyle);
  };

  const onClearLog = () => {
    setLog([]);
  };

  const motorStatus = plc?.outputs?.motor_on ? 'ON' : 'OFF';

  if (!belt || !plc || !style) return <div>Loading conveyor simulator...</div>;

  return (
    <div style={{ display: 'flex', gap: 20, padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        videoUrl={cameraUrl || 'http://localhost:8000/media/3.mp4'}
      />

      <div style={{ flex: 1 }}>
        {/* Header */}
        <div style={{
          background: '#263238',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🏭 {belt.name || `Conveyor Belt ${beltId}`}</span>
            <span style={{
              fontSize: '12px',
              background: motorStatus === 'ON' ? '#4CAF50' : '#F44336',
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              {motorStatus}
            </span>
          </h3>
          <div style={{ fontSize: '11px', color: '#BDBDBD' }}>
            Style: {style.id ? 'Backend' : 'Local'}
          </div>
        </div>

        {/* Camera Preview */}
        <div style={{
          marginBottom: '20px',
          position: 'relative',
          display: 'inline-block'
        }}>
          <div style={{ position: 'relative' }}>
            <video
              src={cameraUrl || 'http://localhost:8000/media/3.mp4'}
              autoPlay
              loop
              muted
              width={250}
              style={{
                border: '2px solid #455A64',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
              }}
            />
            <button
              onClick={() => setShowVideoModal(true)}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 128, 255, 0.8)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              title="Expand camera view"
            >
              🔍
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Camera: {style.camera_x}, {style.camera_y}
          </div>
        </div>

        {/* Components */}
        <ConveyorVisualization
          style={style}
          plc={plc}
          objects={objects}
          offset={offset}
          onSensorDrag={onSensorDrag}
          onCameraClick={() => setShowVideoModal(true)}
        />

        <ControlPanel
          motorStatus={motorStatus}
          onStart={toggleStart}
          onStop={toggleStop}
          onEmergencyStop={emergencyStop}
          onReset={resetObjects}
          onSave={saveConfig}
          onRefresh={refreshFromBackend}
          lastFetchTime={lastFetchRef.current}
        />

        <StatusPanel
          plc={plc}
          currentSpeed={currentSpeed}
          apiBase={apiBase}
          beltId={beltId}
          style={style}
        />

        <LogPanel
          log={log}
          onClearLog={onClearLog}
        />

        {/* Debug Info */}
        <div style={{
          marginTop: '20px',
          background: '#f0f0f0',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div><strong>Debug Info:</strong></div>
          <div>Motor On: {plc.outputs?.motor_on?.toString()}</div>
          <div>Start Button: {plc.inputs?.start?.toString()}</div>
          <div>Stop Button: {plc.inputs?.stop?.toString()}</div>
          <div>Fault Active: {plc.flags?.fault_active?.toString()}</div>
          <div>Start Sealed: {plc.flags?.start_sealed?.toString()}</div>
          <div>Emergency Stop: {plc.inputs?.emergency_stop?.toString()}</div>
          <div>Safety Gate: {plc.inputs?.safety_gate?.toString()}</div>
          <div>Belt Width: {style.belt_width}px</div>
          <div>Belt Color: <span style={{ color: style.belt_color }}>■ {style.belt_color}</span></div>
        </div>
      </div>
    </div>
  );
}