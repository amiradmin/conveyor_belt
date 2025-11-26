// src/views/TestPage.js
import React, { useRef, useState, useEffect } from "react";
import "./TestPage.css";

const API_BASE_URL = "http://localhost:8000"; // backend

export default function TestPage() {
  const videoRef = useRef(null);
  const canvasRefEdge = useRef(null);
  const canvasRefHidden = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [detections, setDetections] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    return () => stopWebcam();
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreamActive(true);

      const interval = setInterval(() => {
        captureAndSendFrame();
        drawEdgeWithYOLO();
      }, 200);

      videoRef.current._intervalId = interval;
    } catch (err) {
      console.error("Camera error:", err);
      setStatus("خطا در دسترسی به دوربین");
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (videoRef.current && videoRef.current._intervalId) clearInterval(videoRef.current._intervalId);
    setStreamActive(false);
    setStatus("دوربین متوقف شد");
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current) return;

    const W = 640, H = 480;
    const canvas = canvasRefHidden.current || document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, W, H);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("frame", blob, "frame.jpg");

      setStatus("در حال ارسال تصویر برای پردازش ...");

      try {
        const resp = await fetch(`${API_BASE_URL}/api/camera/stream/`, { method: "POST", body: formData });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();

        let extraFeatures = {};
        if (data.bbox && window.cv) {
          const [x1, y1, x2, y2] = data.bbox;
          const width = x2 - x1, height = y2 - y1;
          const aspectRatio = (width / height).toFixed(2);

          // Estimate fill percentage
          let fillPercent = 0, temp = 25; // default room temp
          const mugCanvas = document.createElement("canvas");
          mugCanvas.width = width; mugCanvas.height = height;
          const mugCtx = mugCanvas.getContext("2d");
          mugCtx.drawImage(canvas, x1, y1, width, height, 0, 0, width, height);

          const src = cv.matFromImageData(mugCtx.getImageData(0, 0, width, height));
          const gray = new cv.Mat(), thresh = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
          cv.threshold(gray, thresh, 100, 255, cv.THRESH_BINARY_INV);

          const contours = new cv.MatVector(), hierarchy = new cv.Mat();
          cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          let liquidHeight = 0;
          for (let i = 0; i < contours.size(); i++) {
            const rect = cv.boundingRect(contours.get(i));
            if (rect.height > liquidHeight) liquidHeight = rect.height;
          }
          fillPercent = ((liquidHeight / height) * 100).toFixed(1);

          // Detect steam above mug for temperature estimate
          const steamRegionHeight = Math.floor(height * 0.5);
          const steamMat = src.roi(new cv.Rect(0, 0, width, steamRegionHeight));
          const steamGray = new cv.Mat();
          cv.cvtColor(steamMat, steamGray, cv.COLOR_RGBA2GRAY, 0);
          const mean = cv.mean(steamGray)[0];
          if (mean > 150) temp = 70; // hot coffee
          else if (mean > 120) temp = 50; // warm
          else temp = 25; // room temp

          src.delete(); gray.delete(); thresh.delete(); contours.delete(); hierarchy.delete(); steamMat.delete(); steamGray.delete();

          extraFeatures = { width, height, aspectRatio, fillPercent, temperature: temp };
        }

        setDetections(data.bbox ? [{ ...data, ...extraFeatures }] : []);
        setStatus("تشخیص انجام شد");
      } catch (err) {
        console.error("Detect error:", err);
        setStatus("خطا در پردازش تصویر");
      }
    }, "image/jpeg", 0.8);
  };

  const getColorByConfidence = (conf) => conf >= 0.8 ? "rgba(0,255,0,0.9)" : conf >= 0.5 ? "rgba(255,255,0,0.9)" : "rgba(255,0,0,0.9)";

  const drawEdgeWithYOLO = () => {
    if (!videoRef.current || !canvasRefEdge.current || !window.cv) return;

    const video = videoRef.current;
    const canvas = canvasRefEdge.current;
    const W = video.videoWidth, H = video.videoHeight;
    canvas.width = W; canvas.height = H;

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = W; tmpCanvas.height = H;
    tmpCanvas.getContext("2d").drawImage(video, 0, 0, W, H);

    const src = cv.matFromImageData(tmpCanvas.getContext("2d").getImageData(0, 0, W, H));
    const gray = new cv.Mat(), edges = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.Canny(gray, edges, 50, 150);
    cv.imshow(canvas, edges);

    const ctx = canvas.getContext("2d");
    detections.forEach(d => {
      const [x1, y1, x2, y2] = d.bbox;
      const color = getColorByConfidence(d.confidence);
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      const label = `Mug ${(d.confidence * 100).toFixed(1)}% | Fill: ${d.fillPercent}% | Temp: ${d.temperature}°C`;
      ctx.font = "16px sans-serif"; ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 22, ctx.measureText(label).width + 6, 20);
      ctx.fillStyle = "#000"; ctx.fillText(label, x1 + 3, y1 - 6);
    });

    src.delete(); gray.delete(); edges.delete();
  };

  return (
    <div className="page-container">
      <h1 className="page-title">☕ Mug Detection + Fill + Temp</h1>
      <div className="controls">
        {!streamActive ? (
          <button className="btn btn-start" onClick={startWebcam}>Start Webcam</button>
        ) : (
          <button className="btn btn-stop" onClick={stopWebcam}>Stop Webcam</button>
        )}
      </div>

      <div className="video-container">
        <div className="video-card"><video ref={videoRef} autoPlay muted playsInline /><h3>Camera Feed</h3></div>
        <div className="video-card"><canvas ref={canvasRefEdge} /><h3>Edge + Mug Features</h3></div>
      </div>

      <canvas ref={canvasRefHidden} style={{ display: "none" }} />

      {detections.length > 0 && (
        <div className="features-box">
          {detections.map((d, i) => (
            <div key={i} className="mug-features">
              <p>Confidence: {(d.confidence * 100).toFixed(1)}%</p>
              <p>Fill Level: {d.fillPercent}%</p>
              <p>Width: {d.width}px, Height: {d.height}px</p>
              <p>Aspect Ratio: {d.aspectRatio}</p>
              <p>Estimated Temp: {d.temperature}°C</p>
            </div>
          ))}
        </div>
      )}

      <p className="status-text">Status: {status}</p>
    </div>
  );
}
