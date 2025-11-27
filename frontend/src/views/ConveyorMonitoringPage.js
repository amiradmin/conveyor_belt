// src/views/ConveyorMonitoringPage.js
import React, { useRef, useState, useEffect } from "react";
import "./ConveyorMonitoringPage.css";

const API_BASE_URL = "http://localhost:8000";

export default function ConveyorMonitoringPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [status, setStatus] = useState("آماده به کار");
  const [useLiveCamera, setUseLiveCamera] = useState(true);

  // Initialize with default values
  const defaultAnalysisData = {
    object_count: 0,
    belt_speed: 0,
    large_count: 0,
    medium_count: 0,
    small_count: 0,
    objects: []
  };

  useEffect(() => {
    setAnalysisData(defaultAnalysisData);
    return () => {
      if (streamActive) stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreamActive(true);
      setStatus("دوربین فعال - در حال نظارت");

      // Start processing frames
      const interval = setInterval(() => {
        if (useLiveCamera) {
          processFrame();
        }
      }, 1000);

      videoRef.current._intervalId = interval;
    } catch (err) {
      console.error("خطا در دوربین:", err);
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
    setAnalysisData(defaultAnalysisData);
  };

  const drawStoneContour = (ctx, x, y, width, height, color) => {
    // Draw a more natural-looking contour around the stone
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Create irregular contour (like a stone shape)
    ctx.beginPath();

    // Start from top-left with some randomness
    ctx.moveTo(x + width * 0.1, y + height * 0.1);

    // Top edge with irregularities
    ctx.lineTo(x + width * 0.3, y + height * 0.05);
    ctx.lineTo(x + width * 0.7, y + height * 0.08);
    ctx.lineTo(x + width * 0.9, y + height * 0.15);

    // Right edge
    ctx.lineTo(x + width * 0.95, y + height * 0.4);
    ctx.lineTo(x + width * 0.9, y + height * 0.7);
    ctx.lineTo(x + width * 0.85, y + height * 0.9);

    // Bottom edge
    ctx.lineTo(x + width * 0.6, y + height * 0.95);
    ctx.lineTo(x + width * 0.3, y + height * 0.9);
    ctx.lineTo(x + width * 0.15, y + height * 0.8);

    // Left edge
    ctx.lineTo(x + width * 0.05, y + height * 0.6);
    ctx.lineTo(x + width * 0.1, y + height * 0.3);

    ctx.closePath();
    ctx.stroke();

    // Add some internal texture lines to make it look like a stone
    ctx.strokeStyle = color + "80"; // Semi-transparent
    ctx.lineWidth = 1;

    // Internal cracks/features
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height * 0.3);
    ctx.lineTo(x + width * 0.5, y + height * 0.4);
    ctx.moveTo(x + width * 0.6, y + height * 0.2);
    ctx.lineTo(x + width * 0.7, y + height * 0.5);
    ctx.stroke();
  };

  const generateDemoObjects = () => {
    const canvas = canvasRef.current;
    if (!canvas) return [];

    const objects = [];
    const numObjects = Math.floor(Math.random() * 6) + 2;

    for (let i = 0; i < numObjects; i++) {
      const width = Math.random() * 100 + 50;
      const height = Math.random() * 100 + 50;
      const x = Math.random() * (canvas.width - width - 200) + 100;
      const y = Math.random() * (canvas.height - height - 300) + 150;

      const area = width * height;
      let type = "small";
      if (area > 15000) type = "large";
      else if (area > 5000) type = "medium";

      objects.push({
        bbox: [x, y, x + width, y + height],
        confidence: Math.random() * 0.3 + 0.6,
        type: type
      });
    }

    return objects;
  };

  const setDemoData = () => {
    // Demo data for testing
    const demoObjects = generateDemoObjects();
    const largeCount = demoObjects.filter(obj => obj.type === "large").length;
    const mediumCount = demoObjects.filter(obj => obj.type === "medium").length;
    const smallCount = demoObjects.filter(obj => obj.type === "small").length;

    const demoData = {
      object_count: demoObjects.length,
      belt_speed: (Math.random() * 2 + 1.5).toFixed(1),
      large_count: largeCount,
      medium_count: mediumCount,
      small_count: smallCount,
      objects: demoObjects
    };

    setAnalysisData(demoData);

    // Also draw demo results
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);
      drawAnalysisResults(ctx, demoData);
    }
  };

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame first
    ctx.drawImage(video, 0, 0);

    setProcessing(true);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("frame", blob, "conveyor_frame.jpg");

      try {
        const resp = await fetch(`${API_BASE_URL}/api/camera/conveyor/analyze/`, {
          method: "POST",
          body: formData,
        });

        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();

        // Ensure all required fields exist
        const processedData = {
          object_count: data.object_count || 0,
          belt_speed: data.belt_speed || 0,
          large_count: data.large_count || 0,
          medium_count: data.medium_count || 0,
          small_count: data.small_count || 0,
          objects: data.objects || []
        };

        setAnalysisData(processedData);
        drawAnalysisResults(ctx, processedData);
        setStatus(`نظارت فعال - ${processedData.object_count} مواد شناسایی شد`);

      } catch (err) {
        console.error("خطا در پردازش:", err);
        setStatus("خطا در پردازش تصویر");
        // Set demo data when backend is not available
        setDemoData();
      } finally {
        setProcessing(false);
      }
    }, "image/jpeg", 0.8);
  };

  const drawAnalysisResults = (ctx, data) => {
    const { width, height } = ctx.canvas;

    // Redraw the video frame to clear previous drawings
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0);
    }

    // Draw conveyor belt ROI
    ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(width * 0.1, height * 0.3, width * 0.8, height * 0.4);
    ctx.setLineDash([]);

    // Draw detected objects with contours
    if (data.objects && data.objects.length > 0) {
      data.objects.forEach((obj, index) => {
        const [x1, y1, x2, y2] = obj.bbox;
        const objWidth = x2 - x1;
        const objHeight = y2 - y1;

        // Choose color based on object type
        let color, contourColor;
        if (obj.type === "large") {
          color = "#ff4444";
          contourColor = "#ff0000";
        } else if (obj.type === "medium") {
          color = "#ffaa00";
          contourColor = "#ff7700";
        } else {
          color = "#00ff88";
          contourColor = "#00cc66";
        }

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, objWidth, objHeight);

        // Draw contour around the object (more natural shape)
        drawStoneContour(ctx, x1, y1, objWidth, objHeight, contourColor);

        // Draw label
        let typeText;
        if (obj.type === "large") typeText = "سنگ بزرگ";
        else if (obj.type === "medium") typeText = "سنگ متوسط";
        else typeText = "سنگ کوچک";

        const label = `${typeText} ${(obj.confidence * 100).toFixed(1)}%`;
        const textWidth = ctx.measureText(label).width;

        // Label background
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x1 - 2, y1 - 25, textWidth + 4, 20);

        // Label text
        ctx.fillStyle = color;
        ctx.font = "bold 14px Arial";
        ctx.fillText(label, x1, y1 - 8);

        // Draw center point
        const centerX = x1 + objWidth / 2;
        const centerY = y1 + objHeight / 2;
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Draw size indicator
        const sizeText = `${Math.round(objWidth)}x${Math.round(objHeight)}`;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x2 - ctx.measureText(sizeText).width - 4, y2 + 2,
                    ctx.measureText(sizeText).width + 4, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px Arial";
        ctx.fillText(sizeText, x2 - ctx.measureText(sizeText).width - 2, y2 + 14);
      });
    }

    // Draw belt speed indicator
    const speedText = `سرعت نوار: ${data.belt_speed} کیلومتر بر ساعت`;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, 10, ctx.measureText(speedText).width + 10, 25);
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 16px Arial";
    ctx.fillText(speedText, 15, 28);

    // Draw object count
    const countText = `تعداد مواد: ${data.object_count}`;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, 40, ctx.measureText(countText).width + 10, 25);
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 16px Arial";
    ctx.fillText(countText, 15, 58);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      processFrame();
    };
  };

  const toggleCameraMode = () => {
    setUseLiveCamera(!useLiveCamera);
    if (!useLiveCamera && !streamActive) {
      startWebcam();
    }
  };

  return (
    <div className="conveyor-page">
      <div className="conveyor-header">
        <h1 className="page-title">🚛 سیستم نظارت بر نوار نقاله</h1>
        <p className="page-subtitle">Conti LoadSense - مانیتورینگ هوشمند مواد معدنی</p>
      </div>

      <div className="controls-panel">
        <div className="control-group">
          <button
            className={`btn ${useLiveCamera ? 'btn-active' : 'btn-secondary'}`}
            onClick={toggleCameraMode}
          >
            {useLiveCamera ? '📹 دوربین زنده' : '📁 آپلود ویدیو'}
          </button>

          {useLiveCamera ? (
            !streamActive ? (
              <button className="btn btn-start" onClick={startWebcam}>
                ▶️ شروع نظارت
              </button>
            ) : (
              <button className="btn btn-stop" onClick={stopWebcam}>
                ⏹️ توقف نظارت
              </button>
            )
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              📤 انتخاب فایل ویدیویی
            </button>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="video/*"
          style={{ display: 'none' }}
        />
      </div>

      <div className="monitoring-container">
        <div className="video-section">
          <div className="video-card">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="conveyor-video"
            />
            <h3>📹 ورودی ویدیو</h3>
          </div>

          <div className="video-card">
            <canvas ref={canvasRef} className="conveyor-canvas" />
            <h3>🎯 خروجی پردازش شده با کانتور سنگ‌ها</h3>
          </div>
        </div>

        {analysisData && (
          <div className="analytics-panel">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-value">{analysisData.object_count}</div>
                <div className="metric-label">تعداد مواد شناسایی شده</div>
              </div>

              <div className="metric-card">
                <div className="metric-value">{analysisData.belt_speed}</div>
                <div className="metric-label">کیلومتر بر ساعت</div>
              </div>

              <div className="metric-card">
                <div className="metric-value">{analysisData.large_count}</div>
                <div className="metric-label">سنگ‌های بزرگ</div>
              </div>

              <div className="metric-card">
                <div className="metric-value">{analysisData.small_count + analysisData.medium_count}</div>
                <div className="metric-label">سنگ‌های کوچک/متوسط</div>
              </div>
            </div>

            <div className="detailed-analysis">
              <h3>📊 آنالیز دقیق</h3>
              <div className="analysis-list">
                {analysisData.objects?.map((obj, index) => (
                  <div key={index} className="object-item">
                    <span className={`object-type ${obj.type}`}>
                      {obj.type === 'large' ? 'سنگ بزرگ' :
                       obj.type === 'medium' ? 'سنگ متوسط' : 'سنگ کوچک'}
                    </span>
                    <span className="object-confidence">
                      اطمینان: {(obj.confidence * 100).toFixed(1)}%
                    </span>
                    <span className="object-size">
                      اندازه: {Math.round(obj.bbox[2] - obj.bbox[0])}x{Math.round(obj.bbox[3] - obj.bbox[1])}px
                    </span>
                  </div>
                ))}
                {(!analysisData.objects || analysisData.objects.length === 0) && (
                  <div className="no-objects">هیچ شیئی شناسایی نشد</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="status-bar">
        <div className={`status-indicator ${processing ? 'processing' : 'ready'}`}>
          {processing ? '🔄 در حال پردازش...' : '✅ آماده'}
        </div>
        <div className="status-message">{status}</div>
      </div>
    </div>
  );
}