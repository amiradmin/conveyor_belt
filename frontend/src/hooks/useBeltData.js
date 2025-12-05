
// src/components/conveyor/hooks/useBeltData.js
import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { defaultPLC, defaultStyle, normalizeStyle } from '../components/conveyor/PLCUtils';

export const useBeltData = ({
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
}) => {
  const [availableVideos, setAvailableVideos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const pollingIntervalRef = useRef(null);

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

  const fetchBeltData = useCallback(async () => {
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

      if (setLog) {
        setLog(l => [`[${new Date().toLocaleTimeString()}] ✅ Data fetched from backend`, ...l].slice(0, 50));
      }

    } catch (e) {
      console.error('Error fetching belt data:', e);
      if (setLog) {
        setLog(l => [`[${new Date().toLocaleTimeString()}] ❌ Error fetching data: ${e.message}`, ...l].slice(0, 50));
      }
    }
  }, [apiBase, beltId, setBelt, setStyle, setPlc, setObjects, setCameraUrl, setCurrentSpeed, setLog]);

  const fetchAvailableVideos = useCallback(async () => {
    try {
      const response = await axios.get(`${apiBase}process-video/`);
      if (response.data && response.data.available_videos) {
        setAvailableVideos(response.data.available_videos);
      }
    } catch (error) {
      console.error('Error fetching available videos:', error);
      setAvailableVideos([]);
    }
  }, [apiBase]);

  // Define checkProcessingStatus first to avoid circular dependency
  const checkProcessingStatus = useCallback(async () => {
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

                if (setLog) {
                  setLog(l => [`[${new Date().toLocaleTimeString()}] 🎬 Video processing completed! Avg objects: ${results.average_objects?.toFixed(1) || 'N/A'}`, ...l].slice(0, 50));
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
  }, [apiBase, setLog]);

  // Now define processVideoFile using checkProcessingStatus
  const processVideoFile = useCallback(async (videoPath) => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Starting video processing...');

      const response = await axios.post(`${apiBase}process-video/`, {
        video_path: videoPath || '3.mp4',
        camera_id: `belt_${beltId}`
      });

      console.log('Video processing response:', response.data);

      if (response.data?.status === 'processing_started') {
        setProcessingStatus(`Processing started! Video: ${response.data.video_path}`);

        if (setLog) {
          setLog(l => [`[${new Date().toLocaleTimeString()}] 🎬 Processing video: ${videoPath}`, ...l].slice(0, 50));
        }

        // Start polling for status
        const pollInterval = setInterval(() => checkProcessingStatus(), 3000);
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
        if (setLog) {
          setLog(l => [`[${new Date().toLocaleTimeString()}] ❌ Processing failed: ${error.response.data.error}`, ...l].slice(0, 50));
        }
      } else {
        setProcessingStatus(`Error: ${error.message}`);
        if (setLog) {
          setLog(l => [`[${new Date().toLocaleTimeString()}] ❌ Error: ${error.message}`, ...l].slice(0, 50));
        }
      }
      setIsProcessing(false);
    }
  }, [apiBase, beltId, setLog, checkProcessingStatus, isProcessing]);

  return {
    fetchBeltData,
    fetchAvailableVideos,
    availableVideos,
    isProcessing,
    processingStatus,
    processVideoFile,
    checkProcessingStatus,
    pollingIntervalRef
  };
};