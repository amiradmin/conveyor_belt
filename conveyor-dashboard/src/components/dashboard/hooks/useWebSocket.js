import { useState, useEffect } from 'react';

export const useWebSocket = (videoData) => {
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const setupWebSocket = () => {
      try {
        const ws = new WebSocket("ws://localhost:8000/ws/progress/");

        ws.onopen = () => {
          console.log("WebSocket connected for video progress");
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket data received:", data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setWsConnected(false);
        };

        ws.onerror = (err) => {
          console.error("WebSocket error:", err);
          setWsConnected(false);
        };

      } catch (error) {
        console.error("Error setting up WebSocket:", error);
      }
    };

    setupWebSocket();
  }, [videoData]);

  return { wsConnected };
};