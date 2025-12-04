// src/components/conveyor/ConveyorSimulator.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import './ConveyorSimulator.css';


export default function ConveyorSimulator({ beltId = 1, apiBase = 'http://localhost:8000/api/camera/' }) {
  const [belt, setBelt] = useState(null);
  const [style, setStyle] = useState(null);
  const [plc, setPlc] = useState(null);
  const [objects, setObjects] = useState([]);
  const [offset, setOffset] = useState(0);
  const [log, setLog] = useState([]);
  const [cameraUrl, setCameraUrl] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Video processing states
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVideoSection, setShowVideoSection] = useState(true);
  const [showProcessedFeed, setShowProcessedFeed] = useState(true);
  const [processedFrame, setProcessedFrame] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [selectedVideoPath, setSelectedVideoPath] = useState('3.mp4');
  const [availableVideos, setAvailableVideos] = useState([]);
  const [lastProcessedTime, setLastProcessedTime] = useState(null);

  // Refs
  const rafRef = useRef(null);
  const lastTimeRef = useRef(Date.now());
  const lastFetchRef = useRef(0);
  const pollingIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const processingCanvasRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Initialize PLC
  const initializePLC = (backendPLC) => {
    if (!backendPLC) return defaultPLC;
    return {
      ...defaultPLC,
      ...backendPLC,
      inputs: { ...defaultPLC.inputs, ...(backendPLC.inputs || {}) },
      outputs: { ...defaultPLC.outputs, ...(backendPLC.outputs || {}) },
      counters: { ...defaultPLC.counters, ...(backendPLC.counters || {}) },
      flags: { ...defaultPLC.flags, ...(backendPLC.flags || {}) },
      rungs: backendPLC.rungs || defaultPLC.rungs
    };
  };

  // Fetch belt data
  const fetchBeltData = async () => {
    try {
      const res = await axios.get(`${apiBase}conveyor-belts/${beltId}/`);
      const data = res.data;

      setBelt(data);
      if (data.style) setStyle(normalizeStyle(data.style));

      const initializedPLC = initializePLC(data.plc_logic);
      setPlc(initializedPLC);

      setObjects([
        { id: 1, x: 100, triggered_s1: false, triggered_s2: false },
        { id: 2, x: 250, triggered_s1: false, triggered_s2: false },
        { id: 3, x: 400, triggered_s1: false, triggered_s2: false }
      ]);

      if (data.video_url) setCameraUrl(data.video_url);
      if (data.current_speed) setCurrentSpeed(data.current_speed);

      lastFetchRef.current = Date.now();
      addLog(`✅ Data fetched from backend @ ${new Date().toLocaleTimeString()}`);

    } catch (e) {
      console.error('Error fetching belt data:', e);
      addLog(`❌ Error fetching data: ${e.message}`);
    }
  };

  // Fetch available videos
  const fetchAvailableVideos = async () => {
    try {
      const response = await axios.get(`${apiBase}process-video/`);
      if (response.data && response.data.available_videos) {
        setAvailableVideos(response.data.available_videos);
      }
    } catch (error) {
      console.error('Error fetching available videos:', error);
      setAvailableVideos([]);
    }
  };

  // Log helper
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(l => [`[${timestamp}] ${message}`, ...l].slice(0, 50));
  };

  // Test backend connection
  const testBackendResponse = async () => {
    try {
      console.log('Testing backend analysis endpoint...');
      addLog('🔧 Testing backend connection...');

      // Create a test canvas
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      // Draw test pattern
      ctx.fillStyle = '#37474F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw some test objects
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(100, 100, 50, 50); // Red box
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(200, 200, 60, 40); // Blue box
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(300, 150, 40, 60); // Yellow box

      // Add timestamp
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px Arial';
      ctx.fillText('Test Frame', 250, 30);
      ctx.font = '12px Arial';
      ctx.fillText(new Date().toLocaleTimeString(), 250, 50);

      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('frame', blob, 'test.jpg');
        formData.append('camera_id', `belt_${beltId}`);

        try {
          const analyzeResponse = await axios.post(`${apiBase}analyze/`, formData);
          console.log('Analyze endpoint response:', analyzeResponse.data);
          addLog(`✅ Analyze endpoint: ${analyzeResponse.data.object_count || 0} objects detected`);

          if (analyzeResponse.data.objects) {
            analyzeResponse.data.objects.forEach((obj, idx) => {
              addLog(`   Object ${idx + 1}: ${obj.label || 'unknown'} (${Math.round((obj.confidence || 0) * 100)}%)`);
            });
          }

        } catch (error) {
          console.error('API test failed:', error);
          addLog(`❌ Test failed: ${error.message}`);
        }
      }, 'image/jpeg');

    } catch (error) {
      console.error('Test setup failed:', error);
      addLog(`❌ Test setup error: ${error.message}`);
    }
  };

  // Create processed frame with visualizations
  const createProcessedFrame = useCallback((video, analysisData) => {
    if (!video || !analysisData) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas size
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw original video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw analysis results
      drawConveyorAnalysisResults(ctx, analysisData, canvas.width, canvas.height);

      // Convert to data URL for display
      const processedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setProcessedFrame(processedDataUrl);

      // Store canvas for later use
      processingCanvasRef.current = canvas;

    } catch (error) {
      console.error('Error creating processed frame:', error);
    }
  }, []);

  // Draw analysis results
  const drawConveyorAnalysisResults = useCallback((ctx, analysis, width, height) => {
    if (!analysis) return;

    console.log('Drawing analysis:', analysis);

    // Draw object count badge
    const objectCount = analysis.object_count ||
                       analysis.objects?.length ||
                       0;

    if (objectCount > 0) {
      // Draw semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 180, 80);

      // Draw object count
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`Objects: ${objectCount}`, 20, 35);

      // Draw system health if available
      if (analysis.system_health !== undefined) {
        ctx.fillStyle = analysis.system_health > 80 ? '#4CAF50' :
                       analysis.system_health > 60 ? '#FF9800' : '#F44336';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`Health: ${analysis.system_health}%`, 20, 60);
      }

      // Draw timestamp
      ctx.fillStyle = '#2196F3';
      ctx.font = '12px Arial';
      ctx.fillText(new Date().toLocaleTimeString(), 20, 80);
    }

    // Draw objects with bounding boxes
    if (analysis.objects && Array.isArray(analysis.objects)) {
      console.log(`Drawing ${analysis.objects.length} objects`);

      analysis.objects.forEach((obj, index) => {
        // Handle different object formats
        let bbox = obj.bbox || obj.bounding_box;
        let label = obj.label || obj.type || `Object ${index + 1}`;
        let confidence = obj.confidence || obj.score || 0.8;
        let color = obj.color || getColorForIndex(index);

        if (bbox && bbox.length >= 4) {
          const [x1, y1, x2, y2] = bbox;

          // Draw bounding box
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          // Draw label background
          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 20, 150, 20);

          // Draw label text
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`${label} (${Math.round(confidence * 100)}%)`, x1 + 5, y1 - 5);
        }
      });
    }

    // Draw detection zones
    if (analysis.detection_zones) {
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      analysis.detection_zones.forEach(zone => {
        ctx.strokeRect(zone.x || 0, zone.y || 0, zone.width || 100, zone.height || 100);
      });

      ctx.setLineDash([]);
    }
  }, []);

  // Helper function to get colors for objects
  const getColorForIndex = useCallback((index) => {
    const colors = ['#00FF00', '#FF0000', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8800', '#8800FF'];
    return colors[index % colors.length];
  }, []);

  // Demo mode as fallback
  const useDemoAnalysis = useCallback((video) => {
    console.log('Using demo analysis');

    // Generate realistic demo data
    const demoAnalysis = {
      object_count: Math.floor(Math.random() * 8) + 1,
      objects: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
        bbox: [
          Math.random() * 400 + 50,
          Math.random() * 300 + 50,
          Math.random() * 100 + 100,
          Math.random() * 100 + 100
        ],
        label: ['Package', 'Box', 'Product', 'Item', 'Container'][i % 5],
        confidence: 0.7 + Math.random() * 0.3,
        color: getColorForIndex(i)
      })),
      system_health: 75 + Math.random() * 25,
      timestamp: new Date().toISOString()
    };

    setAnalysisResults(demoAnalysis);
    createProcessedFrame(video, demoAnalysis);
    addLog(`📊 Demo: ${demoAnalysis.object_count} objects detected`);
  }, [createProcessedFrame, getColorForIndex, addLog]);

  // Capture and process a single frame
  const captureAndProcessFrame = useCallback(async () => {
    if (!videoRef.current || !showProcessedFeed || isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;
      const video = videoRef.current;

      // Check if video is ready
      if (video.readyState < 2 || video.videoWidth === 0) {
        console.log('Video not ready yet');
        isProcessingRef.current = false;
        return;
      }

      console.log('📸 Capturing frame...', {
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState
      });

      // Create canvas for capture
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      const captureCtx = captureCanvas.getContext('2d');

      // Draw video frame
      captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

      // Add timestamp to frame for debugging
      captureCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      captureCtx.fillRect(10, captureCanvas.height - 30, 200, 25);
      captureCtx.fillStyle = '#FFFFFF';
      captureCtx.font = '12px Arial';
      captureCtx.fillText(`Captured: ${new Date().toLocaleTimeString()}`, 15, captureCanvas.height - 12);

      // Convert to blob
      captureCanvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Failed to create blob');
          isProcessingRef.current = false;
          return;
        }

        console.log('📤 Sending frame to backend...', {
          size: blob.size,
          type: blob.type
        });

        const formData = new FormData();
        formData.append('frame', blob, `frame_${Date.now()}.jpg`);
        formData.append('camera_id', `belt_${beltId}`);

        try {
          // Try real backend first
          const response = await axios.post(`${apiBase}analyze/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 5000
          });

          console.log('✅ Backend response:', response.data);

          if (response.data) {
            setAnalysisResults(prev => ({
              ...response.data,
              timestamp: new Date().toISOString(),
              frame_id: Date.now()
            }));

            setLastProcessedTime(new Date());
            createProcessedFrame(video, response.data);

            const objectCount = response.data.object_count || response.data.objects?.length || 0;
            if (objectCount > 0) {
              addLog(`🤖 AI detected ${objectCount} objects`);
            }
          }

        } catch (error) {
          console.warn('⚠️ Backend not responding, using demo mode');
          // Use demo analysis as fallback
          useDemoAnalysis(video);
        } finally {
          isProcessingRef.current = false;
        }
      }, 'image/jpeg', 0.8);

    } catch (error) {
      console.error('❌ Frame capture error:', error);
      isProcessingRef.current = false;
    }
  }, [apiBase, beltId, showProcessedFeed, createProcessedFrame, useDemoAnalysis, addLog]);

  // Start/Stop real-time video processing
  const toggleVideoProcessing = useCallback(() => {
    if (showProcessedFeed) {
      // Stop processing
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      setShowProcessedFeed(false);
      setProcessedFrame(null);
      setAnalysisResults(null);
      addLog(`⏸️ AI processing stopped`);
    } else {
      // Start processing
      setShowProcessedFeed(true);
      addLog(`▶️ AI processing started`);

      // Start capturing frames every 2 seconds
      captureIntervalRef.current = setInterval(() => {
        if (!isProcessingRef.current) {
          captureAndProcessFrame();
        }
      }, 2000);

      // Initial capture after a short delay
      setTimeout(() => {
        if (!isProcessingRef.current) {
          captureAndProcessFrame();
        }
      }, 500);
    }
  }, [showProcessedFeed, captureAndProcessFrame, addLog]);

  // Process video file
  const processVideoFile = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Starting video processing...');

      const response = await axios.post(`${apiBase}process-video/`, {
        video_path: selectedVideoPath || '3.mp4',
        camera_id: `belt_${beltId}`
      });

      console.log('Video processing response:', response.data);

      if (response.data?.status === 'processing_started') {
        setProcessingStatus(`Processing started! Video: ${response.data.video_path}`);
        addLog(`🎬 Processing video: ${selectedVideoPath}`);

        // Start polling for status
        const pollInterval = setInterval(checkProcessingStatus, 3000);
        pollingIntervalRef.current = pollInterval;

        // Auto-stop after 60 seconds
        setTimeout(() => {
          if (pollingIntervalRef.current === pollInterval) {
            clearInterval(pollInterval);
            if (isProcessing) {
              setProcessingStatus('Processing timeout');
              setIsProcessing(false);
            }
          }
        }, 60000);

      } else {
        setProcessingStatus(`Unexpected response: ${JSON.stringify(response.data)}`);
        setIsProcessing(false);
      }

    } catch (error) {
      console.error('Video processing error:', error);
      if (error.response?.data) {
        setProcessingStatus(`Error: ${error.response.data.error || 'Unknown'}`);
        addLog(`❌ Processing failed: ${error.response.data.error}`);
      } else {
        setProcessingStatus(`Error: ${error.message}`);
        addLog(`❌ Error: ${error.message}`);
      }
      setIsProcessing(false);
    }
  };

  const checkProcessingStatus = async () => {
    try {
      const response = await axios.get(`${apiBase}process-video/`);
      console.log('Processing status:', response.data);

      if (response.data) {
        const activeJobs = response.data.active_jobs || 0;
        const completedJobs = response.data.completed_jobs || 0;

        if (activeJobs > 0) {
          setProcessingStatus(`Processing... ${activeJobs} active job(s)`);
        } else if (completedJobs > 0) {
          setProcessingStatus(`✅ Completed ${completedJobs} job(s)`);

          // Get job details
          if (response.data.jobs?.length > 0) {
            const jobId = response.data.jobs[response.data.jobs.length - 1];
            try {
              const jobResponse = await axios.get(`${apiBase}process-video/?job_id=${jobId}`);
              if (jobResponse.data?.status === 'completed') {
                const results = jobResponse.data.results;
                addLog(`🎬 Video processing completed! Avg objects: ${results.average_objects?.toFixed(1) || 'N/A'}`);

                // Update analysis results
                if (results.object_counts?.length > 0) {
                  setAnalysisResults(prev => ({
                    ...prev,
                    object_count: results.average_objects || 0,
                    system_health: 95,
                    details: results,
                    is_video_processing: true
                  }));
                }
              }
            } catch (jobError) {
              console.error('Error getting job details:', jobError);
            }
          }

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsProcessing(false);
        }

        if (response.data.available_videos) {
          setAvailableVideos(response.data.available_videos);
        }
      }
    } catch (error) {
      console.error('Status check error:', error);
      setProcessingStatus(`Error checking status: ${error.message}`);
    }
  };

  // Test coffee detection
  const testCoffeeDetection = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('frame', blob, 'coffee_test.jpg');

        const response = await axios.post(`${apiBase}stream/`, formData);
        console.log('Coffee detection:', response.data);

        if (response.data.coffee_detected) {
          addLog(`☕ Coffee detected! Confidence: ${Math.round(response.data.confidence * 100)}%`);
        } else {
          addLog('No coffee detected in frame');
        }
      }, 'image/jpeg');

    } catch (error) {
      console.error('Coffee detection test failed:', error);
    }
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
    newPlc.inputs.start = false;
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
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [beltId, apiBase, refreshTrigger]);

  // Start/stop real-time processing based on showProcessedFeed
  useEffect(() => {
    console.log('🔄 Processing effect triggered, showProcessedFeed:', showProcessedFeed);

    if (showProcessedFeed) {
      // Start processing
      console.log('🚀 Starting real-time processing...');

      // Clear any existing interval
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }

      // Start new interval
      captureIntervalRef.current = setInterval(() => {
        if (!isProcessingRef.current && videoRef.current?.readyState >= 2) {
          captureAndProcessFrame();
        }
      }, 2000);

      // Initial capture
      const initialCapture = setTimeout(() => {
        if (videoRef.current?.readyState >= 2) {
          captureAndProcessFrame();
        } else {
          // Wait for video to load
          const waitForVideo = setInterval(() => {
            if (videoRef.current?.readyState >= 2) {
              clearInterval(waitForVideo);
              captureAndProcessFrame();
            }
          }, 500);
        }
      }, 1000);

      return () => {
        clearTimeout(initialCapture);
      };
    } else {
      // Stop processing
      console.log('🛑 Stopping real-time processing...');
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [showProcessedFeed, captureAndProcessFrame]);

  // Animation tick
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
        }
        if (!o.triggered_s2 && o.x >= sensor2X - 5 && o.x <= sensor2X + 5) {
          s2Triggered = true;
          o.triggered_s2 = true;
        }
        return o;
      }));

      const newPlc = deepClone(plc);
      if (!newPlc.inputs) newPlc.inputs = {};
      newPlc.inputs.sensor_1 = s1Triggered;
      newPlc.inputs.sensor_2 = s2Triggered;

      for (const rung of newPlc.rungs || []) {
        const hold = evalExpr(rung.expr, newPlc);
        if (hold) {
          applyActions(rung.actions || [], newPlc);
        }
      }

      if (!newPlc.outputs?.motor_on && newPlc.flags?.start_sealed) {
        newPlc.flags.start_sealed = false;
      }

      setPlc(newPlc);
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
        style={{
          display: 'none',
          width: '640px',
          height: '480px'
        }}
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
              style={{ background: '#2196F3', color: 'white' }}
            >
              📸 Capture
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
            processVideoFile={processVideoFile}
            analysisResults={analysisResults}
            processedFrame={processedFrame}
            showProcessedFeed={showProcessedFeed}
            toggleVideoProcessing={toggleVideoProcessing}
            lastProcessedTime={lastProcessedTime}
          />
        )}

        {/* Processing Status */}
        <ProcessingStatus
          isProcessing={isProcessing}
          processingStatus={processingStatus}
          analysisResults={analysisResults}
          onStopProcessing={() => {
            setIsProcessing(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setProcessingStatus('Processing stopped by user');
          }}
          onClearResults={() => setAnalysisResults(null)}
        />

        {/* Results Visualization */}
        {analysisResults?.details && (
          <ResultsVisualization results={analysisResults.details} />
        )}

        {/* Debug Panel */}
        {analysisResults && (
          <div className="debug-panel">
            <details>
              <summary>📊 Analysis Data</summary>
              <div className="debug-grid">
                <div className="debug-item">
                  <span className="debug-label">Objects:</span>
                  <span className="debug-value">{analysisResults.object_count || analysisResults.objects?.length || 0}</span>
                </div>
                <div className="debug-item">
                  <span className="debug-label">Health:</span>
                  <span className="debug-value">{analysisResults.system_health || '--'}%</span>
                </div>
                <div className="debug-item">
                  <span className="debug-label">Timestamp:</span>
                  <span className="debug-value">{new Date(analysisResults.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
                <div className="debug-item">
                  <span className="debug-label">Mode:</span>
                  <span className="debug-value">{analysisResults.is_video_processing ? 'Video' : 'Real-time'}</span>
                </div>
              </div>
              <pre>{JSON.stringify(analysisResults, null, 2)}</pre>
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