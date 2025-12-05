// src/components/conveyor/ConveyorSimulator.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import VideoModal from './VideoModal';
import ConveyorVisualization from './ConveyorVisualization';
import ControlPanel from './ControlPanel';
import StatusPanel from './StatusPanel';
import LogPanel from './LogPanel';
import VideoProcessingSection from './VideoProcessingSection';
import ProcessingStatus from './ProcessingStatus';
import ResultsVisualization from './ResultsVisualization';
import {
  deepClone,
  evalExpr,
  applyActions,
  defaultPLC,
  defaultStyle,
  normalizeStyle
} from './PLCUtils';
import { useBeltData } from '../../hooks/useBeltData';
import { useVideoProcessing } from '../../hooks/useVideoProcessing';
import { useAnimationLoop } from '../../hooks/useAnimationLoop';
import './ConveyorSimulator.css';

export default function ConveyorSimulator({ beltId = 1, apiBase = 'http://localhost:8000/api/camera/' }) {
  // State management
  const [belt, setBelt] = useState(null);
  const [style, setStyle] = useState(null);
  const [plc, setPlc] = useState(null);
  const [objects, setObjects] = useState([]);
  const [offset, setOffset] = useState(0);
  const [log, setLog] = useState([]);
  const [cameraUrl, setCameraUrl] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVideoSection, setShowVideoSection] = useState(true);
  const [selectedVideoPath, setSelectedVideoPath] = useState('3.mp4');
  const [isProcessingState, setIsProcessingState] = useState(false);

  // Add the missing state variables
  const [processedFrame, setProcessedFrame] = useState(null);
  const [analysisResultsState, setAnalysisResultsState] = useState(null);
  const [lastProcessedTime, setLastProcessedTime] = useState(null);
  const [processingFPS, setProcessingFPS] = useState(2);
  const [frameCount, setFrameCount] = useState(0);
  const [currentFPS, setCurrentFPS] = useState(0);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastFetchRef = useRef(0);

  // Custom hooks
  const {
    fetchBeltData,
    fetchAvailableVideos,
    availableVideos,
    isProcessing,
    processingStatus,
    processVideoFile,
    checkProcessingStatus,
    pollingIntervalRef
  } = useBeltData({
    beltId,
    apiBase,
    setBelt,
    setStyle,
    setPlc,
    setObjects,
    setCameraUrl,
    setCurrentSpeed,
    setLog,
    setSelectedVideoPath,
    setIsProcessing: setIsProcessingState
  });

  const {
    showProcessedFeed,
    captureAndProcessFrame,
    toggleVideoProcessing,
    changeProcessingFPS,
    testBackendResponse,
    testCoffeeDetection
  } = useVideoProcessing({
    beltId,
    apiBase,
    videoRef,
    canvasRef,
    setLog,
    setAnalysisResults: setAnalysisResultsState,
    setProcessedFrame,
    setLastProcessedTime,
    setFrameCount,
    setCurrentFPS,
    processingFPS,
    setProcessingFPS
  });

  // Animation loop
  useAnimationLoop({ plc, style, currentSpeed, objects, setObjects, setOffset, setPlc });

  // Log helper
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(l => [`[${timestamp}] ${message}`, ...l].slice(0, 50));
  };

  // Control functions
  const toggleStart = () => {
    const newPlc = deepClone(plc);
    if (!newPlc.inputs) newPlc.inputs = {};
    newPlc.inputs.start = true;
    newPlc.inputs.stop = true;
    setPlc(newPlc);
    addLog(`Start pressed`);
  };

  const toggleStop = () => {
    const newPlc = deepClone(plc);
    if (!newPlc.inputs) newPlc.inputs = {};
    newPlc.inputs.stop = false;
    newPlc.inputs.stop = false;
    setPlc(newPlc);
    addLog(`Stop pressed`);
  };

  const emergencyStop = () => {
    const newPlc = deepClone(plc);
    if (!newPlc.inputs) newPlc.inputs = {};
    newPlc.inputs.emergency_stop = false;
    setPlc(newPlc);
    addLog(`🚨 EMERGENCY STOP`);
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
    addLog(`Objects and counters reset`);
  };

  const saveConfig = async () => {
    try {
      const saveData = {};
      if (style) saveData.style = style;
      if (plc) saveData.plc_logic = plc;

      await axios.patch(`${apiBase}conveyor-belts/${beltId}/`, saveData);
      addLog(`✅ Config saved to backend`);

      setTimeout(() => {
        fetchBeltData();
      }, 500);

    } catch (e) {
      console.error('Save error:', e);
      addLog(`❌ Save error: ${e.message}`);
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

  // Effects
  useEffect(() => {
    fetchBeltData();
    fetchAvailableVideos();

    const intervalId = setInterval(fetchBeltData, 5000);

    return () => {
      clearInterval(intervalId);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [beltId, apiBase]);

  if (!belt || !plc || !style) {
    return <div>Loading conveyor simulator...</div>;
  }

  const motorStatus = plc?.outputs?.motor_on ? 'ON' : 'OFF';

  return (
    <div className="conveyor-simulator">
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        videoUrl={cameraUrl || 'http://localhost:8000/media/3.mp4'}
      />

      {/* Hidden canvas for frame capture */}
      <canvas
        ref={canvasRef}
        className="capture-canvas"
        style={{ display: 'none' }}
        width="640"
        height="480"
      />

      <div className="simulator-content">
        {/* Header */}
        <div className="simulator-header">
          <h3>
            <span>🏭 {belt.name || `Conveyor Belt ${beltId}`}</span>
            <span className={`motor-status ${motorStatus.toLowerCase()}`}>
              {motorStatus}
            </span>
          </h3>
          <div className="header-controls">
            <div className="style-indicator">
              Style: {style.id ? 'Backend' : 'Local'}
            </div>
            <div className="fps-control">
              <span className="fps-label">FPS:</span>
              <select
                value={processingFPS}
                onChange={(e) => changeProcessingFPS(Number(e.target.value))}
                className="fps-select"
              >
                <option value={1}>1 FPS</option>
                <option value={2}>2 FPS</option>
                <option value={5}>5 FPS</option>
                <option value={10}>10 FPS</option>
                <option value={15}>15 FPS</option>
              </select>
            </div>
            <button
              className="toggle-camera-btn"
              onClick={() => setShowVideoSection(!showVideoSection)}
            >
              {showVideoSection ? '👁️ Hide Camera' : '📹 Show Camera'}
            </button>
            <button
              className="debug-btn"
              onClick={testBackendResponse}
              title="Test backend response"
            >
              🔧 Test
            </button>
            <button
              className="coffee-btn"
              onClick={testCoffeeDetection}
              title="Test coffee detection"
            >
              ☕ Test Coffee
            </button>
            <button
              className="capture-btn"
              onClick={captureAndProcessFrame}
              title="Manually capture and process frame"
            >
              📸 Single Frame
            </button>
          </div>
        </div>

        {/* Video Processing Section */}
        {showVideoSection && (
          <VideoProcessingSection
            cameraUrl={cameraUrl}
            videoRef={videoRef}
            showVideoModal={showVideoModal}
            setShowVideoModal={setShowVideoModal}
            availableVideos={availableVideos}
            selectedVideoPath={selectedVideoPath}
            setSelectedVideoPath={setSelectedVideoPath}
            processVideoFile={() => processVideoFile(selectedVideoPath)}
            analysisResults={analysisResultsState}
            processedFrame={processedFrame}
            showProcessedFeed={showProcessedFeed}
            toggleVideoProcessing={toggleVideoProcessing}
            lastProcessedTime={lastProcessedTime}
            processingFPS={processingFPS}
            frameCount={frameCount}
            currentFPS={currentFPS}
          />
        )}

        {/* Processing Status */}
        <ProcessingStatus
          isProcessing={isProcessing}
          processingStatus={processingStatus}
          analysisResults={analysisResultsState}
          onStopProcessing={() => {
            setIsProcessingState(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setProcessingStatus('Processing stopped by user');
          }}
          onClearResults={() => setAnalysisResultsState(null)}
          currentFPS={currentFPS}
          frameCount={frameCount}
        />

        {/* Results Visualization */}
        {analysisResultsState?.details && (
          <ResultsVisualization results={analysisResultsState.details} />
        )}

        {/* Debug Panel */}
        {analysisResultsState && (
          <div className="debug-panel">
            <details>
              <summary>📊 Analysis Data</summary>
              <div className="debug-grid">
                <div className="debug-item">
                  <span className="debug-label">Objects:</span>
                  <span className="debug-value">{analysisResultsState.object_count || analysisResultsState.objects?.length || 0}</span>
                </div>
                <div className="debug-item">
                  <span className="debug-label">Health:</span>
                  <span className="debug-value">{analysisResultsState.system_health || '--'}%</span>
                </div>
                <div className="debug-item">
                  <span className="debug-label">Timestamp:</span>
                  <span className="debug-value">{new Date(analysisResultsState.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
                <div className="debug-item">
                  <span className="debug-label">Frames:</span>
                  <span className="debug-value">{frameCount}</span>
                </div>
              </div>
              <pre>{JSON.stringify(analysisResultsState, null, 2)}</pre>
            </details>
          </div>
        )}

        {/* Main Components */}
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
          onRefresh={() => {
            fetchBeltData();
            fetchAvailableVideos();
          }}
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
          onClearLog={() => setLog([])}
        />
      </div>
    </div>
  );
}