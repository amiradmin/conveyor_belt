// src/views/TestPage.js
import React, { useRef, useState, useEffect } from "react";
import "./TestPage.css";

const API_BASE_URL = "http://localhost:8000";

// Helper class for simple centroid tracking
class CentroidTracker {
  constructor(maxDistance = 50) {
    this.nextId = 1;
    this.objects = {}; // {id: {bbox, centroid, features}}
    this.maxDistance = maxDistance;
  }

  update(detections) {
    const newObjects = {};
    const usedIds = new Set();

    detections.forEach((d) => {
      const [x1, y1, x2, y2] = d.bbox;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;

      let matchedId = null;
      let minDistance = this.maxDistance;

      for (const [id, obj] of Object.entries(this.objects)) {
        if (usedIds.has(id)) continue;
        const dist = Math.hypot(cx - obj.centroid[0], cy - obj.centroid[1]);
        if (dist < minDistance) {
          minDistance = dist;
          matchedId = id;
        }
      }

      if (matchedId) {
        newObjects[matchedId] = {
          ...d,
          centroid: [cx, cy],
        };
        usedIds.add(matchedId);
      } else {
        newObjects[this.nextId] = {
          ...d,
          centroid: [cx, cy],
        };
        this.nextId += 1;
      }
    });

    this.objects = newObjects;
    return this.objects;
  }
}

export default function TestPage() {
  const videoRef = useRef(null);
  const canvasRefEdge = useRef(null);
  const canvasRefHidden = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [trackedMugs, setTrackedMugs] = useState({});
  const [status, setStatus] = useState("");

  const trackerRef = useRef(new CentroidTracker());

  useEffect(() => {
    return () => stopWebcam();
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreamActive(true);

      const interval = setInterval(() => {
        captureAndSendFrame();
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
    if (videoRef.current && videoRef.current._intervalId) {
      clearInterval(videoRef.current._intervalId);
    }
    setStreamActive(false);
    setStatus("دوربین متوقف شد");
    setTrackedMugs({});
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current) return;

    const W = 640;
    const H = 480;
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
        const resp = await fetch(`${API_BASE_URL}/api/camera/stream/`, {
          method: "POST",
          body: formData,
        });

        if (!resp.ok) throw new Error(await resp.text());

        const data = await resp.json();
        const detections = data.bbox
          ? [
              {
                bbox: data.bbox,
                confidence: data.confidence,
              },
            ]
          : [];

        // Compute extra features
        detections.forEach((d) => {
          const [x1, y1, x2, y2] = d.bbox;
          d.width = x2 - x1;
          d.height = y2 - y1;
          d.area = d.width * d.height;
          d.aspectRatio = (d.width / d.height).toFixed(2);
          d.centerX = x1 + d.width / 2;
          d.centerY = y1 + d.height / 2;
        });

        // Update tracker
        const updated = trackerRef.current.update(detections);
        setTrackedMugs({ ...updated });

        drawEdgeWithYOLO(updated);
        setStatus("تشخیص انجام شد");
      } catch (err) {
        console.error("Detect error:", err);
        setStatus("خطا در پردازش تصویر");
      }
    }, "image/jpeg", 0.8);
  };

  const getColorByConfidence = (conf) => {
    if (conf >= 0.8) return "rgba(0,255,0,0.9)";
    if (conf >= 0.5) return "rgba(255,255,0,0.9)";
    return "rgba(255,0,0,0.9)";
  };

  const drawEdgeWithYOLO = (tracked) => {
    if (!videoRef.current || !canvasRefEdge.current || !window.cv) return;

    const video = videoRef.current;
    const canvas = canvasRefEdge.current;
    const W = video.videoWidth;
    const H = video.videoHeight;
    canvas.width = W;
    canvas.height = H;

    // Draw video + edges
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = W;
    tmpCanvas.height = H;
    const tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.drawImage(video, 0, 0, W, H);

    const src = cv.matFromImageData(tmpCtx.getImageData(0, 0, W, H));
    const gray = new cv.Mat();
    const edges = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.Canny(gray, edges, 50, 150);
    cv.imshow(canvas, edges);

    const ctx = canvas.getContext("2d");

    Object.entries(tracked).forEach(([id, d]) => {
      const [x1, y1, x2, y2] = d.bbox;
      const color = getColorByConfidence(d.confidence);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      const label = `ID:${id} ${(d.confidence * 100).toFixed(1)}%`;
      ctx.font = "16px sans-serif";
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 18, ctx.measureText(label).width + 6, 18);
      ctx.fillStyle = "#000";
      ctx.fillText(label, x1 + 3, y1 - 3);

      const info = `W:${d.width}px H:${d.height}px AR:${d.aspectRatio} Area:${d.area}`;
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "white";
      ctx.fillText(info, x1, y2 + 16);
    });

    src.delete();
    gray.delete();
    edges.delete();
  };

  return (
    <div className="page-container" style={{ display: "flex", gap: "20px" }}>
      <div style={{ flex: 2 }}>
        <h1 className="page-title">☕ Mug Detection + Tracking + Edge Detection</h1>

        <div className="controls">
          {!streamActive ? (
            <button className="btn btn-start" onClick={startWebcam}>
              Start Webcam
            </button>
          ) : (
            <button className="btn btn-stop" onClick={stopWebcam}>
              Stop Webcam
            </button>
          )}
        </div>

        <div className="video-container">
          <div className="video-card">
            <video ref={videoRef} autoPlay muted playsInline />
            <h3>Camera Feed</h3>
          </div>
          <div className="video-card">
            <canvas ref={canvasRefEdge} />
            <h3>Edge Detection + YOLO Overlay</h3>
          </div>
        </div>

        <canvas ref={canvasRefHidden} style={{ display: "none" }} />
        <p>Status: {status}</p>
      </div>

      <div style={{
        flex: 1,
        background: "rgba(20,20,20,0.8)",
        padding: "15px",
        borderRadius: "12px",
        color: "#fff",
        height: "fit-content",
        maxHeight: "600px",
        overflowY: "auto"
      }}>
        <h2>Mug Dashboard</h2>
        {Object.keys(trackedMugs).length === 0 && <p>No mugs detected</p>}
        {Object.entries(trackedMugs).map(([id, d]) => (
          <div key={id} style={{
            marginBottom: "10px",
            padding: "8px",
            border: "1px solid #00ff88",
            borderRadius: "8px"
          }}>
            <p><strong>Mug ID: {id}</strong></p>
            <p>Confidence: {(d.confidence*100).toFixed(1)}%</p>
            <p>Width: {d.width}px</p>
            <p>Height: {d.height}px</p>
            <p>Area: {d.area}px²</p>
            <p>Aspect Ratio: {d.aspectRatio}</p>
            <p>Center: ({d.centerX.toFixed(1)}, {d.centerY.toFixed(1)})</p>
          </div>
        ))}
      </div>
    </div>
  );
}
