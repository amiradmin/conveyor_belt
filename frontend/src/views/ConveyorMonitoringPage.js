// src/views/ConveyorMonitoringPage.js
import React, { useRef, useState, useEffect } from "react";
import "./ConveyorMonitoringPage.css";

const API_BASE_URL = "http://localhost:8000";

export default function ConveyorMonitoringPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationRef = useRef(null);
  const processingRef = useRef(false);
  const lastProcessTimeRef = useRef(0);

  const [streamActive, setStreamActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [status, setStatus] = useState("آماده به کار");
  const [useLiveCamera, setUseLiveCamera] = useState(true);
  const [frameCount, setFrameCount] = useState(0);
  const [processingRate, setProcessingRate] = useState(0);

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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
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
      startAnimationLoop();
    } catch (err) {
      console.error("خطا در دوربین:", err);
      setStatus("خطا در دسترسی به دوربین");
    }
  };

  const startAnimationLoop = () => {
    let lastTimestamp = 0;
    const processInterval = 300;

    const animate = (timestamp) => {
      if (!canvasRef.current || !videoRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      drawLiveVideoWithGreenContours();

      if (timestamp - lastProcessTimeRef.current > processInterval && !processingRef.current) {
        lastProcessTimeRef.current = timestamp;
        processFrame();
      }

      if (timestamp - lastTimestamp > 1000) {
        const rate = Math.round((frameCount / ((timestamp - lastTimestamp) / 1000)) * 10) / 10;
        setProcessingRate(rate);
        lastTimestamp = timestamp;
        setFrameCount(0);
      }

      setFrameCount(prev => prev + 1);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const drawLiveVideoWithGreenContours = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const { width, height } = canvas;

    drawConveyorROI(ctx, width, height);
    drawMovingConveyorEffects(ctx, width, height);

    if (analysisData && analysisData.objects) {
      drawGreenContours(ctx, analysisData.objects);
      drawObjectLabels(ctx, analysisData.objects);
    }

    drawHUD(ctx, analysisData || defaultAnalysisData);
  };

  const drawGreenContours = (ctx, objects) => {
    objects.forEach((obj, index) => {
      const { contour_points, bbox, type } = obj;

      if (contour_points && contour_points.length > 2) {
        // Draw green contour around the object
        ctx.strokeStyle = "#00FF00"; // Bright green
        ctx.lineWidth = 3;
        ctx.shadowColor = "#00FF00";
        ctx.shadowBlur = 10;

        ctx.beginPath();

        // Move to first point
        ctx.moveTo(contour_points[0][0], contour_points[0][1]);

        // Draw lines to all other points
        for (let i = 1; i < contour_points.length; i++) {
          ctx.lineTo(contour_points[i][0], contour_points[i][1]);
        }

        // Close the contour
        ctx.closePath();
        ctx.stroke();

        // Remove shadow for other elements
        ctx.shadowBlur = 0;

        // Draw filled area with slight transparency
        ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
        ctx.fill();

        // Draw inner edge for better visibility
        ctx.strokeStyle = "#00CC00";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Fallback: draw rectangle if no contour points
        const [x1, y1, x2, y2] = bbox;
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      }

      // Draw center point
      const centerX = obj.center_x || (bbox[0] + bbox[2]) / 2;
      const centerY = obj.center_y || (bbox[1] + bbox[3]) / 2;

      ctx.fillStyle = "#00FF00";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawObjectLabels = (ctx, objects) => {
    const currentTime = Date.now();

    objects.forEach((obj, index) => {
      const [x1, y1, x2, y2] = obj.bbox;
      const width = x2 - x1;
      const confidence = (obj.confidence * 100).toFixed(1);

      const time = currentTime * 0.002 + index;
      const bounce = Math.sin(time * 3) * 2;

      // Type text in Persian
      let typeText;
      switch (obj.type) {
        case "large": typeText = "سنگ بزرگ"; break;
        case "medium": typeText = "سنگ متوسط"; break;
        default: typeText = "سنگ کوچک"; break;
      }

      const label = `${typeText} ${confidence}%`;
      const textWidth = ctx.measureText(label).width;

      // Label background
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(x1 - 3, y1 - 30 + bounce, textWidth + 6, 24);

      // Label border
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 1;
      ctx.strokeRect(x1 - 3, y1 - 30 + bounce, textWidth + 6, 24);

      // Label text
      ctx.fillStyle = "#00FF00";
      ctx.font = "bold 14px Arial";
      ctx.fillText(label, x1, y1 - 12 + bounce);

      // Size indicator
      const sizeText = `${Math.round(width)}px`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      const sizeWidth = ctx.measureText(sizeText).width;
      ctx.fillRect(x2 - sizeWidth - 4, y2 + 5, sizeWidth + 4, 18);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "12px Arial";
      ctx.fillText(sizeText, x2 - sizeWidth - 2, y2 + 18);
    });
  };

  const drawConveyorROI = (ctx, width, height) => {
    const beltX = width * 0.1;
    const beltY = height * 0.3;
    const beltWidth = width * 0.8;
    const beltHeight = height * 0.4;

    ctx.fillStyle = "rgba(50, 50, 50, 0.2)";
    ctx.fillRect(beltX, beltY, beltWidth, beltHeight);

    ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(beltX, beltY, beltWidth, beltHeight);
    ctx.setLineDash([]);
  };

  const drawMovingConveyorEffects = (ctx, width, height) => {
    const beltX = width * 0.1;
    const beltY = height * 0.3;
    const beltWidth = width * 0.8;
    const beltHeight = height * 0.4;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;

    const lineSpacing = 25;
    const movement = (Date.now() * 0.1) % lineSpacing;

    for (let y = beltY + movement; y < beltY + beltHeight; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(beltX, y);
      ctx.lineTo(beltX + beltWidth, y);
      ctx.stroke();
    }
  };

  const drawHUD = (ctx, data) => {
    const { width } = ctx.canvas;

    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(15, 15, 350, 90);
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, 350, 90);

    ctx.fillStyle = "#00FF00";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`سرعت نوار: ${data.belt_speed} کیلومتر بر ساعت`, 30, 40);

    ctx.fillStyle = "#FFCC00";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`تعداد سنگ‌ها: ${data.object_count}`, 30, 65);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "12px Arial";
    ctx.fillText(`نرخ پردازش: ${processingRate} فریم/ثانیه`, 30, 85);

    // Detection status
    const statusText = data.object_count > 0 ? "سنگ‌ها شناسایی شدند" : "در حال جستجو...";
    ctx.fillStyle = data.object_count > 0 ? "#00FF00" : "#FFCC00";
    ctx.font = "bold 14px Arial";
    ctx.fillText(statusText, width - 180, 35);
  };

  const processFrame = async () => {
    if (!videoRef.current || processingRef.current) return;

    processingRef.current = true;
    setProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext("2d");
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          processingRef.current = false;
          setProcessing(false);
          return;
        }

        const formData = new FormData();
        formData.append("frame", blob, `frame_${Date.now()}.jpg`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const resp = await fetch(`${API_BASE_URL}/api/camera/conveyor/analyze/`, {
            method: "POST",
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!resp.ok) throw new Error(await resp.text());
          const data = await resp.json();

          setAnalysisData(data);
          setStatus(`نظارت فعال - ${data.object_count} سنگ شناسایی شد`);

        } catch (err) {
          console.error("خطا در پردازش:", err);
          setStatus("خطا در پردازش تصویر");
          setDemoData();
        } finally {
          processingRef.current = false;
          setProcessing(false);
        }
      }, "image/jpeg", 0.7);
    } catch (err) {
      console.error("خطا در پردازش فریم:", err);
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const setDemoData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const demoObjects = [];
    const numObjects = Math.floor(Math.random() * 6) + 2;

    for (let i = 0; i < numObjects; i++) {
      const objWidth = Math.random() * 100 + 40;
      const objHeight = Math.random() * 100 + 40;
      const x = Math.random() * (canvas.width - objWidth - 200) + 100;
      const y = Math.random() * (canvas.height - objHeight - 300) + 150;

      const area = objWidth * objHeight;
      let type = "small";
      if (area > 12000) type = "large";
      else if (area > 5000) type = "medium";

      // Generate contour points for demo
      const contour_points = generateDemoContour(x, y, objWidth, objHeight);

      demoObjects.push({
        bbox: [x, y, x + objWidth, y + objHeight],
        confidence: Math.random() * 0.3 + 0.65,
        type: type,
        area: area,
        width: objWidth,
        height: objHeight,
        center_x: x + objWidth/2,
        center_y: y + objHeight/2,
        contour_points: contour_points
      });
    }

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
  };

  const generateDemoContour = (x, y, width, height) => {
    const points = [];
    const numPoints = 10;

    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints;
      const radiusVariation = 0.7 + Math.random() * 0.6;

      const pointX = x + width/2 + (width/2 * Math.cos(angle) * radiusVariation);
      const pointY = y + height/2 + (height/2 * Math.sin(angle) * radiusVariation);

      points.push([pointX, pointY]);
    }

    return points;
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setStreamActive(false);
    setStatus("دوربین متوقف شد");
    setAnalysisData(defaultAnalysisData);
    setFrameCount(0);
    setProcessingRate(0);
    processingRef.current = false;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startAnimationLoop();
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
        <p className="page-subtitle">تشخیص سنگ‌ها با کانتور سبز رنگ</p>
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
            <h3>📹 ورودی ویدیو خام</h3>
          </div>

          <div className="video-card">
            <canvas ref={canvasRef} className="conveyor-canvas live-output" />
            <h3>🎯 ویدیو زنده با کانتور سبز</h3>
          </div>
        </div>

        {analysisData && (
          <div className="analytics-panel">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-value" style={{color: '#00FF00'}}>
                  {analysisData.object_count}
                </div>
                <div className="metric-label">تعداد سنگ‌ها</div>
                <div className="metric-subtext">کانتور سبز</div>
              </div>

              <div className="metric-card">
                <div className="metric-value">{analysisData.belt_speed}</div>
                <div className="metric-label">کیلومتر بر ساعت</div>
                <div className="metric-subtext">سرعت نوار</div>
              </div>

              <div className="metric-card">
                <div className="metric-value" style={{color: '#FF4444'}}>
                  {analysisData.large_count}
                </div>
                <div className="metric-label">سنگ‌های بزرگ</div>
                <div className="metric-subtext">بیش از ۱۲۰۰۰ پیکسل</div>
              </div>

              <div className="metric-card">
                <div className="metric-value" style={{color: '#00FF88'}}>
                  {analysisData.small_count + analysisData.medium_count}
                </div>
                <div className="metric-label">سنگ‌های کوچک/متوسط</div>
                <div className="metric-subtext">تا ۱۲۰۰۰ پیکسل</div>
              </div>
            </div>

            <div className="detailed-analysis">
              <h3>📊 جزئیات شناسایی</h3>
              <div className="objects-list">
                {analysisData.objects?.map((obj, index) => (
                  <div key={index} className="object-item">
                    <div className="object-header">
                      <span className={`object-type ${obj.type}`}>
                        {obj.type === 'large' ? 'سنگ بزرگ' :
                         obj.type === 'medium' ? 'سنگ متوسط' : 'سنگ کوچک'}
                      </span>
                      <span className="object-confidence">
                        اطمینان: {(obj.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="object-details">
                      <span>اندازه: {Math.round(obj.width)}×{Math.round(obj.height)} پیکسل</span>
                      <span>مساحت: {Math.round(obj.area)} پیکسل²</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="status-bar">
        <div className={`status-indicator ${processing ? 'processing' : 'ready'}`}>
          {processing ? '🔄 در حال پردازش...' : '✅ سیستم فعال'}
        </div>
        <div className="status-message">{status}</div>
        <div className="processing-info">
          نرخ پردازش: {processingRate} فریم/ثانیه
        </div>
      </div>
    </div>
  );
}