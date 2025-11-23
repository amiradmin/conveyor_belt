import React, { useRef, useState, useEffect } from "react";
import "./ImageProcessingPage.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ImageProcessingPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [coffeeDetected, setCoffeeDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    if (!streamActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const interval = setInterval(() => {
      if (!video || !canvas) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append("frame", blob, "frame.jpg");

        try {
          const res = await fetch(`${API_BASE_URL}/api/camera/stream/`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          setCoffeeDetected(data.coffee_detected);
          setConfidence(data.confidence || 0);

          // Clear previous bounding box
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0);

          // Draw bounding box if detected
          if (data.bbox) {
            const [x1, y1, x2, y2] = data.bbox;
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            ctx.font = "18px Arial";
            ctx.fillStyle = "#00ff88";
            ctx.fillText(`Mug ${(data.confidence*100).toFixed(1)}%`, x1, y1-8);
          }
        } catch (err) {
          console.error(err);
        }
      }, "image/jpeg");
    }, 200);

    return () => clearInterval(interval);
  }, [streamActive]);

  const startWebcam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    videoRef.current.srcObject = stream;
    setStreamActive(true);
  };

  const stopWebcam = () => {
    const stream = videoRef.current.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setStreamActive(false);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">☕ Mug Detection (YOLOv8 - CPU)</h1>

      <div className="controls">
        {!streamActive ? (
          <button className="btn btn-start" onClick={startWebcam}>Start Webcam</button>
        ) : (
          <button className="btn btn-stop" onClick={stopWebcam}>Stop Webcam</button>
        )}
      </div>

      <div className="video-container">
        <div className="video-card">
          <video ref={videoRef} autoPlay muted playsInline />
          <h3>Camera Feed</h3>
        </div>
        <div className="video-card">
          <canvas ref={canvasRef} />
          <h3>Processed Output</h3>
        </div>
      </div>

      <div className={`detection-box ${coffeeDetected ? "detected" : "not-detected"}`}>
        {coffeeDetected ? `☕ Mug detected! Confidence: ${(confidence*100).toFixed(1)}%` : "No mug detected."}
      </div>
    </div>
  );
}
