// src/hooks/useVideoProcessing.js - UPDATED FOR REAL-TIME STREAMING
import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

export const useVideoProcessing = ({
  beltId,
  apiBase,
  videoRef,
  canvasRef,
  setLog,
  setAnalysisResults,
  setProcessedFrame,
  setLastProcessedTime,
  setFrameCount,
  setCurrentFPS,
  processingFPS,
  setProcessingFPS
}) => {
  const [showProcessedFeed, setShowProcessedFeed] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Refs
  const isProcessingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now(), currentFPS: 0 });
  const wsRef = useRef(null);
  const processedCanvasRef = useRef(null);

  // Helper functions
  const addLog = useCallback((message) => {
    if (setLog) {
      const timestamp = new Date().toLocaleTimeString();
      setLog(l => [`[${timestamp}] ${message}`, ...l].slice(0, 50));
    }
  }, [setLog]);

  // Initialize canvas for processed frames
  const initProcessedCanvas = useCallback(() => {
    if (!processedCanvasRef.current) {
      processedCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // WebSocket connection for real-time streaming
  const connectWebSocket = useCallback(() => {
    try {
      // Replace http with ws for WebSocket connection
      const wsUrl = apiBase.replace('http://', 'ws://').replace('/api/camera/', '/ws/video/');
      const ws = new WebSocket(`${wsUrl}${beltId}/`);

      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        addLog('📡 Connected to real-time video stream');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.frame_data) {
            // Create image from base64 data
            const img = new Image();
            img.onload = () => {
              // Draw to canvas
              initProcessedCanvas();
              const canvas = processedCanvasRef.current;
              const ctx = canvas.getContext('2d');

              canvas.width = img.width;
              canvas.height = img.height;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);

              // Convert to data URL for display
              const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              if (setProcessedFrame) setProcessedFrame(processedDataUrl);

              // Update FPS counter
              fpsCounterRef.current.frames++;
              const now = Date.now();
              if (now - fpsCounterRef.current.lastTime >= 1000) {
                fpsCounterRef.current.currentFPS = fpsCounterRef.current.frames;
                fpsCounterRef.current.frames = 0;
                fpsCounterRef.current.lastTime = now;
                if (setCurrentFPS) setCurrentFPS(fpsCounterRef.current.currentFPS);
              }

              if (setLastProcessedTime) setLastProcessedTime(new Date());
              if (setFrameCount) setFrameCount(prev => prev + 1);
            };
            img.src = `data:image/jpeg;base64,${data.frame_data}`;
          }

          if (data.analysis) {
            if (setAnalysisResults) setAnalysisResults(data.analysis);
          }

        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('❌ WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        addLog('📡 Disconnected from video stream');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      addLog('❌ Failed to connect to real-time stream');
    }
  }, [apiBase, beltId, addLog, setProcessedFrame, setAnalysisResults, setCurrentFPS, setLastProcessedTime, setFrameCount, initProcessedCanvas]);

  // HTTP fallback method (original method)
  const captureAndProcessFrame = useCallback(async () => {
    if (!videoRef.current || !showProcessedFeed || isProcessingRef.current) {
      return false;
    }

    try {
      isProcessingRef.current = true;
      const video = videoRef.current;

      if (video.readyState < 2 || video.videoWidth === 0) {
        isProcessingRef.current = false;
        return false;
      }

      const captureCanvas = canvasRef.current || document.createElement('canvas');
      if (!canvasRef.current) {
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
      }
      const captureCtx = captureCanvas.getContext('2d');
      captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

      return new Promise((resolve) => {
        captureCanvas.toBlob(async (blob) => {
          if (!blob) {
            isProcessingRef.current = false;
            resolve(false);
            return;
          }

          const formData = new FormData();
          formData.append('frame', blob, `frame_${Date.now()}.jpg`);
          formData.append('camera_id', `belt_${beltId}`);

          try {
            const response = await axios.post(`${apiBase}analyze/`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 3000 // Shorter timeout for faster retry
            });

            if (response.data) {
              const analysisData = {
                ...response.data,
                timestamp: new Date().toISOString(),
                frame_id: Date.now()
              };

              if (setAnalysisResults) setAnalysisResults(analysisData);
              if (setLastProcessedTime) setLastProcessedTime(new Date());
              if (setFrameCount) setFrameCount(prev => prev + 1);

              // Create processed frame faster
              initProcessedCanvas();
              const processedCanvas = processedCanvasRef.current;
              const processedCtx = processedCanvas.getContext('2d');

              processedCanvas.width = video.videoWidth || 640;
              processedCanvas.height = video.videoHeight || 480;

              // Draw video frame
              processedCtx.drawImage(video, 0, 0, processedCanvas.width, processedCanvas.height);

              // Draw bounding boxes for detected objects with green contours
              const objects = response.data.objects || [];
              const objectCount = response.data.object_count || objects.length || 0;
              
              if (objects.length > 0) {
                // Draw green contours and bounding boxes for each detected Iron Ore object
                objects.forEach((obj, index) => {
                  if (obj.bbox && Array.isArray(obj.bbox) && obj.bbox.length >= 4) {
                    const [x1, y1, x2, y2] = obj.bbox;
                    const width = x2 - x1;
                    const height = y2 - y1;
                    
                    // Draw actual contour shape if available (more accurate representation)
                    if (obj.contour && Array.isArray(obj.contour) && obj.contour.length > 0) {
                      processedCtx.beginPath();
                      processedCtx.moveTo(obj.contour[0][0], obj.contour[0][1]);
                      for (let i = 1; i < obj.contour.length; i++) {
                        processedCtx.lineTo(obj.contour[i][0], obj.contour[i][1]);
                      }
                      processedCtx.closePath();
                      
                      // Draw filled contour with semi-transparent green
                      processedCtx.fillStyle = 'rgba(0, 255, 0, 0.15)';
                      processedCtx.fill();
                      
                      // Draw contour outline with bright green and thicker line
                      processedCtx.strokeStyle = '#00FF00'; // Bright green
                      processedCtx.lineWidth = 4; // Thicker line for better visibility
                      processedCtx.setLineDash([]);
                      processedCtx.stroke();
                    } else {
                      // Fallback to bounding box if contour not available
                      // Draw green bounding box with thicker line
                      processedCtx.strokeStyle = '#00FF00'; // Bright green
                      processedCtx.lineWidth = 4; // Increased from 3 to 4
                      processedCtx.setLineDash([]);
                      processedCtx.strokeRect(x1, y1, width, height);
                      
                      // Draw filled rectangle with transparency for better visibility
                      processedCtx.fillStyle = 'rgba(0, 255, 0, 0.15)';
                      processedCtx.fillRect(x1, y1, width, height);
                    }
                    
                    // Draw Iron Ore label with confidence - Larger and more readable
                    if (obj.confidence !== undefined) {
                      const label = `Rock ${obj.id || index + 1} (${Math.round(obj.confidence * 100)}%)`;
                      
                      // Use larger font for better readability
                      processedCtx.font = 'bold 18px Arial';
                      const labelMetrics = processedCtx.measureText(label);
                      const labelWidth = labelMetrics.width + 20; // More padding
                      const labelHeight = 26; // Taller label
                      const labelX = Math.max(0, Math.min(x1, processedCanvas.width - labelWidth));
                      const labelY = Math.max(labelHeight + 5, y1 - 5); // Position above object
                      
                      // Larger background for label with rounded corners effect
                      processedCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                      processedCtx.fillRect(labelX, labelY - labelHeight, labelWidth, labelHeight);
                      
                      // Border for better visibility
                      processedCtx.strokeStyle = '#00FF00';
                      processedCtx.lineWidth = 2;
                      processedCtx.strokeRect(labelX, labelY - labelHeight, labelWidth, labelHeight);
                      
                      // Label text in bright green - larger font
                      processedCtx.fillStyle = '#00FF00';
                      processedCtx.fillText(label, labelX + 10, labelY - 6);
                    }
                  }
                });
              }
              
              // Draw Rock count overlay
              if (objectCount > 0) {
                processedCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                processedCtx.fillRect(10, 10, 180, 35);
                processedCtx.fillStyle = '#00FF00';
                processedCtx.font = 'bold 16px Arial';
                processedCtx.fillText(`${objectCount} Rock${objectCount > 1 ? 's' : ''} detected`, 15, 32);
              }

              const processedDataUrl = processedCanvas.toDataURL('image/jpeg', 0.9); // High quality to see boxes clearly
              if (setProcessedFrame) setProcessedFrame(processedDataUrl);
              
              // Also store the analysis data with the frame for overlay drawing
              if (setAnalysisResults) {
                setAnalysisResults({
                  ...analysisData,
                  frameImage: processedDataUrl // Store frame URL with analysis
                });
              }

              // Update FPS counter
              fpsCounterRef.current.frames++;
              const now = Date.now();
              if (now - fpsCounterRef.current.lastTime >= 1000) {
                fpsCounterRef.current.currentFPS = fpsCounterRef.current.frames;
                fpsCounterRef.current.frames = 0;
                fpsCounterRef.current.lastTime = now;
                if (setCurrentFPS) setCurrentFPS(fpsCounterRef.current.currentFPS);
              }
            }
            resolve(true);
          } catch (error) {
            console.warn('⚠️ Backend not responding');
            // Use faster demo
            const demoAnalysis = {
              object_count: Math.floor(Math.random() * 5) + 1,
              timestamp: new Date().toISOString()
            };
            if (setAnalysisResults) setAnalysisResults(demoAnalysis);

            // Create simple demo frame
            initProcessedCanvas();
            const processedCanvas = processedCanvasRef.current;
            const processedCtx = processedCanvas.getContext('2d');
            processedCanvas.width = 640;
            processedCanvas.height = 480;
            processedCtx.fillStyle = '#263238';
            processedCtx.fillRect(0, 0, processedCanvas.width, processedCanvas.height);
            processedCtx.fillStyle = '#4CAF50';
            processedCtx.font = 'bold 16px Arial';
            processedCtx.fillText(`Demo: ${demoAnalysis.object_count} objects`, 20, 40);

            const processedDataUrl = processedCanvas.toDataURL('image/jpeg', 0.5);
            if (setProcessedFrame) setProcessedFrame(processedDataUrl);

            resolve(true);
          } finally {
            isProcessingRef.current = false;
          }
        }, 'image/jpeg', 0.6); // Lower quality for faster processing
      });

    } catch (error) {
      console.error('❌ Frame capture error:', error);
      isProcessingRef.current = false;
      return false;
    }
  }, [apiBase, beltId, showProcessedFeed, addLog, videoRef, canvasRef, setAnalysisResults, setProcessedFrame, setLastProcessedTime, setFrameCount, setCurrentFPS, initProcessedCanvas]);

  // Fast real-time processing loop (optimized)
  const startRealTimeProcessing = useCallback(() => {
    console.log('🚀 Starting optimized real-time processing');

    if (!showProcessedFeed || !videoRef.current || animationFrameRef.current) {
      console.log('❌ Conditions not met');
      return;
    }

    // Try WebSocket first
    if (apiBase.includes('ws://') || apiBase.includes('wss://')) {
      connectWebSocket();
    }

    const fastProcessLoop = (timestamp) => {
      if (!showProcessedFeed || !animationFrameRef.current) {
        console.log('🛑 Stopping loop');
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      const deltaTime = timestamp - lastFrameTimeRef.current;
      const frameInterval = Math.max(1000 / processingFPS, 100); // Min 10 FPS, max based on setting

      if (deltaTime >= frameInterval) {
        lastFrameTimeRef.current = timestamp;

        // Skip frame if still processing previous one
        if (!isProcessingRef.current) {
          captureAndProcessFrame().catch(console.error);
        }
      }

      if (animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(fastProcessLoop);
      }
    };

    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(fastProcessLoop);
    addLog(`🎬 Real-time processing started (target: ${processingFPS} FPS)`);
  }, [showProcessedFeed, processingFPS, captureAndProcessFrame, addLog, connectWebSocket, apiBase, videoRef]);

  // Stop processing
  const stopRealTimeProcessing = useCallback(() => {
    console.log('🛑 stopRealTimeProcessing called');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close WebSocket if open
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    fpsCounterRef.current = { frames: 0, lastTime: Date.now(), currentFPS: 0 };
    if (setCurrentFPS) setCurrentFPS(0);
    setWsConnected(false);

    console.log('✅ Real-time processing stopped');
    addLog('⏸️ Real-time processing stopped');
  }, [addLog, setCurrentFPS]);

  // Toggle processing
  const toggleVideoProcessing = useCallback(() => {
    console.log('🔄 toggleVideoProcessing called, current state:', showProcessedFeed);

    if (showProcessedFeed) {
      stopRealTimeProcessing();
      setShowProcessedFeed(false);
      if (setProcessedFrame) setProcessedFrame(null);
      if (setAnalysisResults) setAnalysisResults(null);
      if (setFrameCount) setFrameCount(0);
    } else {
      setShowProcessedFeed(true);
      // Start processing after state update
      setTimeout(() => {
        if (videoRef.current?.readyState >= 2) {
          startRealTimeProcessing();
        } else {
          const waitForVideo = setInterval(() => {
            if (videoRef.current?.readyState >= 2) {
              clearInterval(waitForVideo);
              startRealTimeProcessing();
            }
          }, 100);
        }
      }, 0);
    }
  }, [showProcessedFeed, startRealTimeProcessing, stopRealTimeProcessing, setProcessedFrame, setAnalysisResults, setFrameCount]);

  // Change FPS
  const changeProcessingFPS = useCallback((newFPS) => {
    const clampedFPS = Math.max(1, Math.min(30, newFPS)); // Limit to 1-30 FPS
    if (setProcessingFPS) setProcessingFPS(clampedFPS);
    addLog(`📊 Processing FPS changed to ${clampedFPS}`);
  }, [addLog, setProcessingFPS]);

  // Test backend
  const testBackendResponse = useCallback(async () => {
    try {
      addLog('🔧 Testing backend connection...');

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#37474F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(100, 100, 50, 50);
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(200, 200, 60, 40);
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(300, 150, 40, 60);

      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('frame', blob, 'test.jpg');
        formData.append('camera_id', `belt_${beltId}`);

        try {
          const startTime = Date.now();
          const response = await axios.post(`${apiBase}analyze/`, formData);
          const endTime = Date.now();
          const latency = endTime - startTime;

          addLog(`✅ Analyze endpoint: ${response.data.object_count || 0} objects (${latency}ms)`);
        } catch (error) {
          addLog(`❌ Test failed: ${error.message}`);
        }
      }, 'image/jpeg');

    } catch (error) {
      addLog(`❌ Test setup error: ${error.message}`);
    }
  }, [apiBase, beltId, addLog]);

  // Test coffee detection
  const testCoffeeDetection = useCallback(async () => {
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
        if (response.data.coffee_detected) {
          addLog(`☕ Coffee detected! Confidence: ${Math.round(response.data.confidence * 100)}%`);
        } else {
          addLog('No coffee detected in frame');
        }
      }, 'image/jpeg');

    } catch (error) {
      console.error('Coffee detection test failed:', error);
    }
  }, [apiBase, addLog, videoRef]);

  // Effect to manage processing loop
  useEffect(() => {
    const video = videoRef.current;
    const isVideoReady = video?.readyState >= 2;

    if (showProcessedFeed && isVideoReady && !animationFrameRef.current) {
      console.log('🎯 Starting processing...');
      startRealTimeProcessing();
    } else if (!showProcessedFeed && animationFrameRef.current) {
      console.log('🎯 Stopping processing...');
      stopRealTimeProcessing();
    }

    return () => {
      if (!showProcessedFeed) {
        console.log('🧹 Cleaning up processing effect');
        stopRealTimeProcessing();
      }
    };
  }, [showProcessedFeed, startRealTimeProcessing, stopRealTimeProcessing]);

  return {
    showProcessedFeed,
    captureAndProcessFrame,
    toggleVideoProcessing,
    startRealTimeProcessing, // Export this so we can restart processing directly
    changeProcessingFPS,
    testBackendResponse,
    testCoffeeDetection,
    wsConnected
  };
};