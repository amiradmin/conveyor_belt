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

  // Add these states to your ConveyorSimulator component
  const [showProcessedFeed, setShowProcessedFeed] = useState(false);
  const [showVideoSection, setShowVideoSection] = useState(false); // New state to control video section visibility

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
        setStyle(data.style);
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

      const motorOn = !!plc.outputs?.motor_on;
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
      for (const rung of newPlc.rungs || []) {
        const hold = evalExpr(rung.expr, newPlc);
        if (hold) {
          applyActions(rung.actions || [], newPlc);
        }
      }

      // Clear start seal if motor is off
      if (!newPlc.outputs?.motor_on && newPlc.flags?.start_sealed) {
        newPlc.flags.start_sealed = false;
      }

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
    setPlc(newPlc);
    setLog(l => [`Start pressed @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
  };

  const toggleStop = () => {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '11px', color: '#BDBDBD' }}>
              Style: {style.id ? 'Backend' : 'Local'}
            </div>

            {/* Camera Toggle Button */}
            <button
              onClick={() => setShowVideoSection(!showVideoSection)}
              style={{
                background: showVideoSection ? '#455A64' : '#37474F',
                color: 'white',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              onMouseOver={(e) => e.target.style.background = showVideoSection ? '#37474F' : '#455A64'}
              onMouseOut={(e) => e.target.style.background = showVideoSection ? '#455A64' : '#37474F'}
              title={showVideoSection ? "Hide Camera Feeds" : "Show Camera Feeds"}
            >
              {showVideoSection ? (
                <>
                  <span style={{ fontSize: '16px' }}>👁️</span>
                  Hide Camera
                </>
              ) : (
                <>
                  <span style={{ fontSize: '16px' }}>📹</span>
                  Show Camera
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video Cards Section - Hidden by default */}
        {showVideoSection && (
          <div style={{
            marginBottom: '20px',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {/* Video Cards Container */}
            <div style={{
              marginBottom: '20px',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              {/* Original Camera Feed Card */}
              <div style={{
                position: 'relative',
                display: 'inline-block',
                flex: showProcessedFeed ? '1' : '1',
                minWidth: showProcessedFeed ? '250px' : '300px'
              }}>
                <div style={{
                  background: '#37474F',
                  padding: '15px',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  height: '100%'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#0080FF',
                        borderRadius: '50%',
                        display: 'inline-block'
                      }}></span>
                      Original Feed
                    </h4>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      {/* Toggle Processed Feed Button */}
                      <button
                        onClick={() => setShowProcessedFeed(!showProcessedFeed)}
                        style={{
                          background: showProcessedFeed ? '#4CAF50' : '#666',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.opacity = '0.9'}
                        onMouseOut={(e) => e.target.style.opacity = '1'}
                        title={showProcessedFeed ? "Hide AI Processing" : "Show AI Processing"}
                      >
                        {showProcessedFeed ? (
                          <>
                            <span>🔬</span>
                            Hide AI
                          </>
                        ) : (
                          <>
                            <span>⚡</span>
                            Show AI
                          </>
                        )}
                      </button>

                      <div style={{
                        fontSize: '11px',
                        color: '#BDBDBD',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}>
                        Camera 1
                      </div>
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <video
                      src={cameraUrl || 'http://localhost:8000/media/3.mp4'}
                      autoPlay
                      loop
                      muted
                      width="100%"
                      style={{
                        border: '2px solid #455A64',
                        borderRadius: '8px',
                        backgroundColor: '#000',
                        display: 'block',
                        height: showProcessedFeed ? '180px' : '220px',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      onClick={() => setShowVideoModal(true)}
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: 'rgba(0, 128, 255, 0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '18px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                      title="Expand camera view"
                    >
                      🔍
                    </button>
                  </div>

                  <div style={{
                    marginTop: '10px',
                    fontSize: '11px',
                    color: '#BDBDBD',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div>Position: {style.camera_x}, {style.camera_y}</div>
                      <div>Status: <span style={{ color: '#4CAF50' }}>● Live</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>1920×1080</div>
                      <div>30 FPS</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processed Feed Card - Hidden by default */}
              {showProcessedFeed && (
                <div style={{
                  position: 'relative',
                  display: 'inline-block',
                  flex: '1',
                  minWidth: '250px',
                  animation: 'slideIn 0.3s ease-out'
                }}>
                  <div style={{
                    background: '#37474F',
                    padding: '15px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    border: '1px solid #4CAF50',
                    height: '100%'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <h4 style={{ margin: 0, color: 'white', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#4CAF50',
                          borderRadius: '50%',
                          display: 'inline-block'
                        }}></span>
                        AI Processed Feed
                      </h4>
                      <div style={{
                        fontSize: '11px',
                        color: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span style={{ fontSize: '12px', animation: 'pulse 1.5s infinite' }}>⚡</span>
                        LIVE AI
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      {/* You can replace this with your processed video */}
                      <video
                        src={cameraUrl || 'http://localhost:8000/media/3.mp4'} // Use processed video URL here
                        autoPlay
                        loop
                        muted
                        width="100%"
                        style={{
                          border: '2px solid #4CAF50',
                          borderRadius: '8px',
                          backgroundColor: '#000',
                          display: 'block',
                          height: '180px',
                          objectFit: 'cover',
                          filter: 'grayscale(50%) contrast(120%)' // Example processing effect
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backdropFilter: 'blur(4px)'
                      }}>
                        <span style={{ color: '#FF9800' }}>⚡</span>
                        Edge Detection
                      </div>

                      {/* Confidence Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        backdropFilter: 'blur(4px)',
                        textAlign: 'center'
                      }}>
                        <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>92%</div>
                        <div style={{ fontSize: '9px', color: '#BDBDBD' }}>Confidence</div>
                      </div>

                      <button
                        onClick={() => setShowVideoModal(true)}
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '10px',
                          background: 'rgba(76, 175, 80, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '18px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        title="View processing details"
                      >
                        ⚙️
                      </button>
                    </div>

                    <div style={{
                      marginTop: '10px',
                      fontSize: '11px',
                      color: '#BDBDBD',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div>Processing: <span style={{ color: '#FF9800' }}>Edge Detection</span></div>
                        <div>Objects: <span style={{ color: '#2196F3', fontWeight: 'bold' }}>3</span> detected</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>Latency: <span style={{ color: '#4CAF50' }}>45ms</span></div>
                        <div>Accuracy: <span style={{ color: '#4CAF50' }}>94%</span></div>
                      </div>
                    </div>

                    {/* Processing Stats */}
                    <div style={{
                      marginTop: '10px',
                      display: 'flex',
                      gap: '8px',
                      fontSize: '10px'
                    }}>
                      <div style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.3)',
                        padding: '6px 4px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <div style={{ color: '#FF9800', fontSize: '9px' }}>PROCESSING</div>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>30 FPS</div>
                      </div>
                      <div style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.3)',
                        padding: '6px 4px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <div style={{ color: '#2196F3', fontSize: '9px' }}>LATENCY</div>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>45ms</div>
                      </div>
                      <div style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.3)',
                        padding: '6px 4px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <div style={{ color: '#4CAF50', fontSize: '9px' }}>ACCURACY</div>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>94%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div style={{
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* Quick Actions */}
              <div style={{
                display: 'flex',
                gap: '10px',
                flex: 1,
                minWidth: '300px'
              }}>
                <button
                  onClick={() => setShowVideoModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #455A64, #37474F)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    flex: 1
                  }}
                  onMouseOver={(e) => e.target.style.background = 'linear-gradient(135deg, #37474F, #263238)'}
                  onMouseOut={(e) => e.target.style.background = 'linear-gradient(135deg, #455A64, #37474F)'}
                >
                  <span style={{ fontSize: '18px' }}>📹</span>
                  Expand View
                </button>

                <button
                  onClick={() => setShowProcessedFeed(!showProcessedFeed)}
                  style={{
                    background: showProcessedFeed
                      ? 'linear-gradient(135deg, #F44336, #D32F2F)'
                      : 'linear-gradient(135deg, #4CAF50, #388E3C)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    flex: 1
                  }}
                  onMouseOver={(e) => e.target.style.opacity = '0.9'}
                  onMouseOut={(e) => e.target.style.opacity = '1'}
                >
                  {showProcessedFeed ? (
                    <>
                      <span style={{ fontSize: '18px' }}>👁️</span>
                      Hide AI Feed
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '18px' }}>🔬</span>
                      Show AI Feed
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => {
                  // Add camera snapshot functionality
                  const video = document.querySelector('video');
                  if (video) {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    const link = document.createElement('a');
                    link.download = `conveyor_snapshot_${Date.now()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  minWidth: '200px'
                }}
                onMouseOver={(e) => e.target.style.background = 'linear-gradient(135deg, #1976D2, #1565C0)'}
                onMouseOut={(e) => e.target.style.background = 'linear-gradient(135deg, #2196F3, #1976D2)'}
              >
                <span style={{ fontSize: '18px' }}>📸</span>
                Take Snapshot
              </button>
            </div>
          </div>
        )}

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

 

        {/* Add these CSS animations */}
        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
            100% {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}