// src/contexts/ConveyorContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { cameraAPI, wsService } from '../utils/api';
import { useSnackbar } from './SnackbarContext';

const ConveyorContext = createContext();

export const useConveyor = () => {
  const context = useContext(ConveyorContext);
  if (!context) {
    throw new Error('useConveyor must be used within ConveyorProvider');
  }
  return context;
};

export const ConveyorProvider = ({ children }) => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for data
  const [dashboardStats, setDashboardStats] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [belts, setBelts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unresolvedAlerts, setUnresolvedAlerts] = useState([]);
  const [realTimeData, setRealTimeData] = useState({});
  const [processingProgress, setProcessingProgress] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();

    // Connect to WebSockets
    wsService.connectProgress();
    wsService.connectRealTime();

    // Setup WebSocket listeners
    wsService.on('progress', handleProgressUpdate);
    wsService.on('realtime', handleRealTimeUpdate);
    wsService.on('analysis', handleAnalysisUpdate);

    return () => {
      wsService.disconnect();
      wsService.off('progress', handleProgressUpdate);
      wsService.off('realtime', handleRealTimeUpdate);
      wsService.off('analysis', handleAnalysisUpdate);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [
        statsResponse,
        statusResponse,
        camerasResponse,
        beltsResponse,
        alertsResponse,
        unresolvedResponse
      ] = await Promise.all([
        cameraAPI.getDashboardStats(),
        cameraAPI.getSystemStatus(),
        cameraAPI.getAllCameras(),
        cameraAPI.getBeltsWithCameras(),
        cameraAPI.getAllAlerts(),
        cameraAPI.getUnresolvedAlerts()
      ]);

      setDashboardStats(statsResponse.data);
      setSystemStatus(statusResponse.data);
      setCameras(camerasResponse.data);
      setBelts(beltsResponse.data.belts || []);
      setAlerts(alertsResponse.data);
      setUnresolvedAlerts(unresolvedResponse.data);

      showSnackbar('داده‌ها با موفقیت بارگذاری شدند', 'success');
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('خطا در بارگذاری داده‌ها');
      showSnackbar('خطا در بارگذاری داده‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = useCallback(({ data }) => {
    setProcessingProgress(data);

    if (data.is_final) {
      showSnackbar('پردازش ویدیو تکمیل شد', 'success');
      setProcessingProgress(null);
    }
  }, [showSnackbar]);

  const handleRealTimeUpdate = useCallback(({ data }) => {
    setRealTimeData(prev => ({
      ...prev,
      [data.data.camera_id]: data.data
    }));
  }, []);

  const handleAnalysisUpdate = useCallback(({ data }) => {
    const cameraId = data.data.camera_id;
    setRealTimeData(prev => ({
      ...prev,
      [cameraId]: { ...prev[cameraId], ...data.data }
    }));

    // Check for alerts
    if (data.data.alerts && data.data.alerts.length > 0) {
      showSnackbar(`آلارم جدید شناسایی شد در دوربین ${cameraId}`, 'warning');
    }
  }, [showSnackbar]);

  // Camera operations
  const updateCameraStatus = async (cameraId, status) => {
    try {
      await cameraAPI.updateCameraStatus(cameraId, status);

      setCameras(prev =>
        prev.map(camera =>
          camera.id === cameraId ? { ...camera, status } : camera
        )
      );

      showSnackbar('وضعیت دوربین به‌روزرسانی شد', 'success');
      return true;
    } catch (error) {
      console.error('Error updating camera status:', error);
      showSnackbar('خطا در به‌روزرسانی وضعیت دوربین', 'error');
      return false;
    }
  };

  // Belt operations
  const updateBeltSpeed = async (beltId, speed) => {
    try {
      await cameraAPI.updateBeltSpeed(beltId, speed);

      setBelts(prev =>
        prev.map(belt =>
          belt.id === beltId ? { ...belt, current_speed: speed } : belt
        )
      );

      showSnackbar('سرعت نوار به‌روزرسانی شد', 'success');
      return true;
    } catch (error) {
      console.error('Error updating belt speed:', error);
      showSnackbar('خطا در به‌روزرسانی سرعت نوار', 'error');
      return false;
    }
  };

  // Alert operations
  const resolveAlert = async (alertId) => {
    try {
      await cameraAPI.resolveAlert(alertId);

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, resolved: true, resolved_at: new Date().toISOString() } : alert
        )
      );

      setUnresolvedAlerts(prev => prev.filter(alert => alert.id !== alertId));

      showSnackbar('آلارم حل شد', 'success');
      return true;
    } catch (error) {
      console.error('Error resolving alert:', error);
      showSnackbar('خطا در حل آلارم', 'error');
      return false;
    }
  };

  // Video processing
  const processVideo = async (videoFile) => {
    try {
      const formData = new FormData();
      formData.append('video_path', videoFile);

      const response = await cameraAPI.processVideo(formData);
      showSnackbar('پردازش ویدیو شروع شد', 'info');
      return response.data;
    } catch (error) {
      console.error('Error processing video:', error);
      showSnackbar('خطا در پردازش ویدیو', 'error');
      throw error;
    }
  };

  const value = {
    // State
    loading,
    error,
    dashboardStats,
    systemStatus,
    cameras,
    belts,
    alerts,
    unresolvedAlerts,
    realTimeData,
    processingProgress,

    // Operations
    refreshData: loadInitialData,
    updateCameraStatus,
    updateBeltSpeed,
    resolveAlert,
    processVideo,

    // WebSocket
    connectToCamera: (cameraId) => wsService.connectRealTime(cameraId),
    sendWebSocketMessage: (data) => wsService.send(data),
  };

  return (
    <ConveyorContext.Provider value={value}>
      {children}
    </ConveyorContext.Provider>
  );
};