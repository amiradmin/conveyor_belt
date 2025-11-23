import React, { useRef, useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "./ImageProcessingPage.css";

export default function ImageProcessingPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState("grayscale");
  const [error, setError] = useState(null);
  const [coffeeDetected, setCoffeeDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const modelRef = useRef(null);

  // Load object detection model
  useEffect(() => {
    cocoSsd.load().then(model => {
      modelRef.current = model;
      console.log("Coco-SSD model loaded");
    });
  }, []);

  const startWebcam = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await new Promise(resolve => (videoRef.current.onloadedmetadata = resolve));
      setStreamActive(true);
    } catch (err) {
      setError(`Failed to access webcam: ${err.message}`);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    setStreamActive(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Frame processing
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (processing) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      if (mode === "grayscale") {
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
      } else if (mode === "edge") {
        // Sobel edge detection
        const grayData = [];
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          grayData.push(gray);
        }
        const w = canvas.width;
        const h = canvas.height;
        const newData = new Uint8ClampedArray(data.length);
        const sobelX = [-1,0,1,-2,0,2,-1,0,1];
        const sobelY = [-1,-2,-1,0,0,0,1,2,1];

        for (let y = 1; y < h-1; y++) {
          for (let x = 1; x < w-1; x++) {
            let gx = 0, gy = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const idx = (y+ky)*w + (x+kx);
                const kIdx = (ky+1)*3 + (kx+1);
                gx += grayData[idx]*sobelX[kIdx];
                gy += grayData[idx]*sobelY[kIdx];
              }
            }
            const mag = Math.min(255, Math.sqrt(gx*gx + gy*gy));
            const i = (y*w + x)*4;
            newData[i] = newData[i+1] = newData[i+2] = mag;
            newData[i+3] = 255;
          }
        }
        imageData.data.set(newData);
      }

      ctx.putImageData(imageData, 0, 0);
    }

    // Object detection
    if (modelRef.current) {
      const predictions = await modelRef.current.detect(video);
      const cup = predictions.find(p => p.class === "cup" && p.score > 0.5);
      if (cup) {
        setCoffeeDetected(true);
        setConfidence(cup.score);
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 3;
        ctx.strokeRect(cup.bbox[0], cup.bbox[1], cup.bbox[2], cup.bbox[3]);
        ctx.font = "16px Arial";
        ctx.fillStyle = "lime";
        ctx.fillText(`Cup ${Math.round(cup.score*100)}%`, cup.bbox[0], cup.bbox[1]-5);
      } else {
        setCoffeeDetected(false);
        setConfidence(0);
      }
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [processing, mode]);

  useEffect(() => {
    if (streamActive) rafRef.current = requestAnimationFrame(processFrame);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [streamActive, processFrame]);

  return (
    <div className="page-container">
      <h1 className="page-title">☕ Coffee Mug Detection</h1>
      {error && <div className="error-box">{error}</div>}
      <div className="controls">
        {!streamActive ? (
          <button className="btn btn-start" onClick={startWebcam}>Start Webcam</button>
        ) : (
          <button className="btn btn-stop" onClick={stopWebcam}>Stop Webcam</button>
        )}
        <label className="checkbox-label">
          <input type="checkbox" checked={processing} onChange={e => setProcessing(e.target.checked)} />
          Apply Processing
        </label>
        <select value={mode} onChange={e => setMode(e.target.value)} className="select">
          <option value="grayscale">Grayscale</option>
          <option value="edge">Edge Detect</option>
        </select>
      </div>
      <div className="video-container">
        <div className="video-card">
          <video ref={videoRef} autoPlay muted playsInline />
          <h2>Camera Feed</h2>
        </div>
        <div className="video-card">
          <canvas ref={canvasRef} />
          <h2>Processed Output</h2>
        </div>
      </div>
      <div className={`detection-box ${coffeeDetected ? "detected" : ""}`}>
        {coffeeDetected ? `☕ Mug detected! Confidence: ${(confidence*100).toFixed(1)}%` : "No coffee detected."}
      </div>
    </div>
  );
}
