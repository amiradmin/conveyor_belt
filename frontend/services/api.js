// src/services/api.js
const API_BASE_URL = 'http://localhost:8000/api/camera';

class ConveyorAPI {
  static async analyzeFrame(frameBlob, cameraId = 'default') {
    const formData = new FormData();
    formData.append('frame', frameBlob);
    formData.append('camera_id', cameraId);

    try {
      const response = await fetch(`${API_BASE_URL}/conveyor/analyze/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing frame:', error);
      throw error;
    }
  }

  static async getSystemStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/system/status/`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  }

  static async getHistoricalData(days = 7) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/historical/?days=${days}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  static async processVideo(videoFile) {
    const formData = new FormData();
    formData.append('video', videoFile);

    try {
      const response = await fetch(`${API_BASE_URL}/process-video/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing video:', error);
      throw error;
    }
  }
}

export default ConveyorAPI;