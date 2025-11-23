import React, { useRef, useState, useEffect } from "react";
import "./ImageProcessingPage.css";

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

    const interval = setInterval(async () => {
      if (!video || !canvas) return;

      // Resize canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw frame
      ctx.drawImage(video, 0, 0);

      // Convert canvas to JPEG
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append("frame", blob, "frame.jpg");

        try {
          const res = await fetch("http://localhost:8000/api/camera/stream/", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          setCoffeeDetected(data.coffee_detected);
          setConfidence(data.confidence || 0);

          // Draw YOLO box if exists
          if (data.bbox) {
            const [x1, y1, x2, y2] = data.bbox;
            ctx.strokeStyle = "lime";
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            ctx.font = "16px Arial";
            ctx.fillStyle = "lime";
            ctx.fillText(
              `Mug ${(data.confidence * 100).toFixed(1)}%`,
              x1,
              y1 - 6
            );
          }
        } catch (err) {
          console.error(err);
        }
      }, "image/jpeg");
    }, 150);

    return () => clearInterval(interval);
  }, [streamActive]);

  const startWebcam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    videoRef.current.srcObject = stream;
    setStreamActive(true);
  };

  const stopWebcam = () => {
    setStreamActive(false);
    const stream = videoRef.current.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    videoRef.current.srcObject = null;
  };

  return (
    <div className="page-container">
      <h1 className="page-title">☕ Mug Detection (YOLOv8 - CPU)</h1>

      <div className="controls">
        {!streamActive ? (
          <button onClick={startWebcam} className="btn btn-start">
            Start Webcam
          </button>
        ) : (
          <button onClick={stopWebcam} className="btn btn-stop">
            Stop Webcam
          </button>
        )}
      </div>

      <div className="video-box">
        <video ref={videoRef} autoPlay muted playsInline />
        <canvas ref={canvasRef} />
      </div>

      <div className={`detection-box ${coffeeDetected ? "detected" : ""}`}>
        {coffeeDetected
          ? `☕ Mug detected! Confidence: ${(confidence * 100).toFixed(1)}%`
          : "No mug detected."}
      </div>
    </div>
  );
}
