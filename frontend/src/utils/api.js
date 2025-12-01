// src/utils/api.js
import axios from 'axios';

// URLs
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/camera';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const cameraAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/dashboard/stats/'),
  getSystemStatus: () => api.get('/status/'),
  getHistoricalData: (days = 7) => api.get(`/historical/?days=${days}`),

  // Cameras
  getAllCameras: () => api.get('/cameras/'),
  getCamera: (id) => api.get(`/cameras/${id}/`),
  updateCameraStatus: (id, status) => api.post(`/cameras/${id}/update_status/`, { status }),

  // Belts
  getAllBelts: () => api.get('/conveyor-belts/'),
  getBelt: (id) => api.get(`/conveyor-belts/${id}/`),
  getBeltsWithCameras: () => api.get('/belts-cameras/'),
  updateBeltSpeed: (id, speed) => api.post(`/conveyor-belts/${id}/update_speed/`, { speed }),
  getCameraBelts: (cameraId) => api.get(`/cameras/${cameraId}/belts/`),

  // Alerts
  getAllAlerts: () => api.get('/alerts/'),
  getUnresolvedAlerts: () => api.get('/alerts/unresolved/'),
  getAlertsBySeverity: () => api.get('/alerts/by_severity/'),
  resolveAlert: (id) => api.post(`/alerts/${id}/resolve/`),

  // Video Processing
  processVideo: (data) => api.post('/process-video/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  analyzeFrame: (data) => api.post('/analyze/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  streamFrame: (data) => api.post('/stream/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Real-time Analysis
  realtimeAnalysis: (cameraId, frame) => {
    const formData = new FormData();
    formData.append('camera_id', cameraId);
    formData.append('frame', frame);
    return api.post('/realtime-analysis/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// WebSocket Service
class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connectProgress() {
    this.connect(`${WS_BASE_URL}/progress/`, 'progress');
  }

  connectRealTime(cameraId = 'default') {
    this.connect(`${WS_BASE_URL}/realtime/${cameraId}/`, `realtime_${cameraId}`);
  }

  connect(url, type) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log(`${type} WebSocket connected`);
      this.reconnectAttempts = 0;
      this.triggerCallbacks('connected', { type });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.triggerCallbacks('message', { type, data });
        this.triggerCallbacks(data.type, { type, data });
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`${type} WebSocket disconnected:`, event.code, event.reason);
      this.triggerCallbacks('disconnected', { type, code: event.code, reason: event.reason });

      // Reconnect logic
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`Reconnecting ${type} (attempt ${this.reconnectAttempts})...`);
          this.connect(url, type);
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };

    this.socket.onerror = (error) => {
      console.error(`${type} WebSocket error:`, error);
      this.triggerCallbacks('error', { type, error });
    };
  }

  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  off(event, callback) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  triggerCallbacks(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => callback(data));
    }
  }

  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();