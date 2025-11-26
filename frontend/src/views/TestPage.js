// src/views/TestPage.js
import React, { useRef, useState, useEffect } from "react";

const API_URL = "http://127.0.0.1:8000/api/camera/stream/"; // your working backend

export default function TestPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [coffeeDetected, setCoffeeDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let interval;
    if (streamActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      interval = setInterval(() => {
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const formData = new FormData();
          formData.append("frame", blob, "frame.jpg");

          try {
            const response = await fetch(API_URL, { method: "POST", body: formData });
            const data = await response.json();

            setCoffeeDetected(data.coffee_detected);
            setConfidence(data.confidence || 0);

            // draw bounding box
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0);

            if (data.bbox) {
              const [x1, y1, x2, y2] = data.bbox;
              ctx.strokeStyle = "#00ff88";
              ctx.lineWidth = 3;
              ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
              ctx.font = "16px Arial";
              ctx.fillStyle = "#00ff88";
              ctx.fillText(`Mug ${(data.confidence * 100).toFixed(1)}%`, x1, y1 - 6);
            }
          } catch (err) {
            console.error("detect error", err);
            setStatus("خطا در پردازش تصویر");
          }
        }, "image/jpeg");
      }, 300);

      return () => clearInterval(interval);
    }
  }, [streamActive]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      setStreamActive(true);
      setStatus("دوربین فعال شد");
    } catch (err) {
      console.error(err);
      setStatus("خطا در دسترسی به دوربین");
    }
  };

  const stopWebcam = () => {
    const stream = videoRef.current.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setStreamActive(false);
    setStatus("دوربین متوقف شد");
  };

  return (
    <div className="container-fluid" dir="rtl">
      <h3 className="my-3">صفحه تست تشخیص فنجان</h3>

      <div className="mb-3 d-flex gap-2">
        {!streamActive ? (
          <button className="btn btn-success" onClick={startWebcam}>روشن کردن دوربین</button>
        ) : (
          <button className="btn btn-danger" onClick={stopWebcam}>خاموش کردن دوربین</button>
        )}
      </div>

      <div className="d-flex justify-content-center mb-3" style={{ position: "relative" }}>
        <video ref={videoRef} width="640" height="480" autoPlay muted playsInline style={{ borderRadius: 8, background: "#000" }} />
        <canvas ref={canvasRef} style={{ position: "absolute", top: 0, right: 0, pointerEvents: "none", borderRadius: 8 }} />
      </div>

      <p>وضعیت: {status}</p>
      <div className={`detection-box ${coffeeDetected ? "detected" : "not-detected"}`}>
        {coffeeDetected ? `☕ فنجان شناسایی شد! اطمینان: ${(confidence*100).toFixed(1)}%` : "هیچ فنجانی شناسایی نشد."}
      </div>
    </div>
  );
}
