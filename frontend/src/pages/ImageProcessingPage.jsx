import React, { useRef, useState, useEffect, useCallback } from "react";

// Full React page with live webcam streaming to Django REST
export default function ImageProcessingPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState("grayscale");
  const [streamActive, setStreamActive] = useState(false);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Unable to access webcam", err);
      alert("Webcam access denied");
    }
  }, []);

  const stopWebcam = useCallback(() => {
    const s = videoRef.current?.srcObject;
    if (s) s.getTracks().forEach((t) => t.stop());
    setStreamActive(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (useWebcam) startWebcam();
    else stopWebcam();
    return () => stopWebcam();
  }, [useWebcam]);

  function toGrayscale(imageData) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    return imageData;
  }

  function edgeDetect(imageData) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
      d[i] = d[i + 1] = d[i + 2] = avg > 128 ? 255 : 0;
    }
    return imageData;
  }

  const processFrame = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = videoRef.current.videoWidth;
    const h = videoRef.current.videoHeight;

    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(videoRef.current, 0, 0, w, h);

    if (processing) {
      let frame = ctx.getImageData(0, 0, w, h);
      if (mode === "grayscale") frame = toGrayscale(frame);
      else if (mode === "edge") frame = edgeDetect(frame);
      ctx.putImageData(frame, 0, 0);
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [processing, mode]);

  useEffect(() => {
    if (streamActive) rafRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [streamActive, processFrame]);

  const sendFrameToServer = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      const fd = new FormData();
      fd.append("frame", blob, "frame.jpg");
      try {
        await fetch("http://127.0.0.1:8000/api/camera/stream/", {
          method: "POST",
          body: fd,
        });
      } catch (err) {
        console.error("Streaming error", err);
      }
    }, "image/jpeg", 0.8);
  };

  useEffect(() => {
    if (!useWebcam) return;
    const interval = setInterval(() => sendFrameToServer(), 300);
    return () => clearInterval(interval);
  }, [useWebcam]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Live Camera Streaming + Processing</h1>

      <div className="flex gap-4 mb-4">
        <button onClick={() => setUseWebcam((v) => !v)} className="px-4 py-2 bg-blue-600 text-white rounded">
          {useWebcam ? "Stop Webcam" : "Start Webcam"}
        </button>

        <select value={mode} onChange={(e) => setMode(e.target.value)} className="border px-2 py-1 rounded">
          <option value="grayscale">Grayscale</option>
          <option value="edge">Edge Detection</option>
        </select>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={processing} onChange={(e) => setProcessing(e.target.checked)} />
          Apply Processing
        </label>
      </div>

      <video ref={videoRef} className="w-full max-w-xl border mb-4" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="w-full max-w-xl border" />
    </div>
  );
}
