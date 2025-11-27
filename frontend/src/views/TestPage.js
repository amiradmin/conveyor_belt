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
  const [loading, setLoading] = useState(false);

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
    setDetections([]);
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current) return;

    const W = 640, H = 480;
    const canvas = canvasRefHidden.current || document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, W, H);

    setLoading(true);

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

        // Draw the detection immediately after receiving data
        drawMugWithEdges(data);
      } catch (err) {
        console.error("Detect error:", err);
        setStatus("خطا در پردازش تصویر");
      } finally {
        setLoading(false);
      }
    }, "image/jpeg", 0.8);
  };

  const drawMugWithEdges = (detectionData) => {
    if (!videoRef.current || !canvasRefEdge.current) return;

    const video = videoRef.current;
    const canvas = canvasRefEdge.current;
    const W = video.videoWidth, H = video.videoHeight;
    canvas.width = W; canvas.height = H;

    const ctx = canvas.getContext("2d");

    // Clear canvas and draw video frame
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(video, 0, 0, W, H);

    // Draw detection if available
    if (detectionData.bbox) {
      const [x1, y1, x2, y2] = detectionData.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      const confidence = detectionData.confidence;

      // If OpenCV is available, detect and draw mug edges/contours
      if (window.cv) {
        try {
          // Extract mug region from video
          const mugCanvas = document.createElement("canvas");
          mugCanvas.width = width;
          mugCanvas.height = height;
          const mugCtx = mugCanvas.getContext("2d");
          mugCtx.drawImage(video, x1, y1, width, height, 0, 0, width, height);

          // Convert to OpenCV mat
          const src = cv.matFromImageData(mugCtx.getImageData(0, 0, width, height));
          const gray = new cv.Mat();
          const edges = new cv.Mat();

          // Convert to grayscale and detect edges
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
          cv.Canny(gray, edges, 50, 150, 3, false);

          // Find contours from edges
          const contours = new cv.MatVector();
          const hierarchy = new cv.Mat();
          cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

          // Draw green contours on the main canvas
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 3;
          ctx.fillStyle = "rgba(0, 255, 0, 0.1)";

          // Find and draw the largest contour (likely the mug)
          let largestContour = null;
          let maxArea = 0;

          for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            if (area > maxArea) {
              maxArea = area;
              largestContour = contour;
            }
          }

          // Draw the largest contour (mug edges)
          if (largestContour && maxArea > 500) { // Filter small contours
            ctx.beginPath();
            const points = [];

            // Convert contour points to canvas coordinates
            for (let j = 0; j < largestContour.data32S.length; j += 2) {
              const x = largestContour.data32S[j] + x1;
              const y = largestContour.data32S[j + 1] + y1;
              points.push({x, y});

              if (j === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            ctx.stroke();

            // Optional: Fill with light green
            // ctx.fill();
          } else {
            // Fallback: draw bounding box if no good contours found
            drawBoundingBox(ctx, x1, y1, width, height, confidence, detectionData);
          }

          // Clean up
          src.delete();
          gray.delete();
          edges.delete();
          contours.delete();
          hierarchy.delete();

        } catch (error) {
          console.warn("Edge detection failed, using bounding box:", error);
          // Fallback to bounding box
          drawBoundingBox(ctx, x1, y1, width, height, confidence, detectionData);
        }
      } else {
        // OpenCV not available, use bounding box
        drawBoundingBox(ctx, x1, y1, width, height, confidence, detectionData);
      }
    }
  };

  const drawBoundingBox = (ctx, x1, y1, width, height, confidence, data) => {
    // Draw green bounding box
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 3;
    ctx.strokeRect(x1, y1, width, height);

    // Draw confidence text
    drawConfidenceText(ctx, x1, y1, width, confidence, data);
  };

  const drawConfidenceText = (ctx, x1, y1, width, confidence, data) => {
    const confidenceText = `Mug: ${(confidence * 100).toFixed(1)}%`;
    const textWidth = ctx.measureText(confidenceText).width;

    // Background for text
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x1 - 2, y1 - 25, textWidth + 4, 20);

    // Confidence text
    ctx.fillStyle = "#00FF00";
    ctx.font = "bold 16px Arial";
    ctx.fillText(confidenceText, x1, y1 - 8);

    // Additional info if available
    if (data.fillPercent !== undefined) {
      const infoText = `Fill: ${data.fillPercent}% | Temp: ${data.temperature}°C`;
      const infoWidth = ctx.measureText(infoText).width;
      const y2 = y1 + (data.height || (data.bbox ? data.bbox[3] - data.bbox[1] : height));

      // Background for info text
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(x1 - 2, y2 + 5, infoWidth + 4, 20);

      // Info text
      ctx.fillStyle = "#00FF00";
      ctx.font = "14px Arial";
      ctx.fillText(infoText, x1, y2 + 20);
    }
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
        <div className="video-card">
          <video ref={videoRef} autoPlay muted playsInline />
          <h3>Camera Feed</h3>
        </div>
        <div className="video-card">
          <canvas ref={canvasRefEdge} />
          <h3>Mug Detection with Edges</h3>
        </div>
      </div>

      <canvas ref={canvasRefHidden} style={{ display: "none" }} />
    <br />
      {detections.length > 0 && (
        <div className="features-box">
          {detections.map((d, i) => (
            <div key={i} className="mug-features">
              <p>Confidence: <strong>{(d.confidence * 100).toFixed(1)}%</strong></p>
              <p>Fill Level: <strong>{d.fillPercent}%</strong></p>
              <p>Width: {d.width}px, Height: {d.height}px</p>
              <p>Aspect Ratio: {d.aspectRatio}</p>
              <p>Estimated Temp: <strong>{d.temperature}°C</strong></p>
            </div>
          ))}
        </div>
      )}


    </div>
  );
}