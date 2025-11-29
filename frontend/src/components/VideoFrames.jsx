import { useEffect, useState } from "react";
import axios from "axios";
import Header from "./Header";
import FrameList from "./FrameList";
import FramePlayer from "./FramePlayer";

function VideoFrames() {
  const [frames, setFrames] = useState([]);
  const [totalFrames, setTotalFrames] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [objectCount, setObjectCount] = useState(0);
  const [beltSpeed, setBeltSpeed] = useState(0);

  useEffect(() => {
    // ✅ WebSocket connection
    const ws = new WebSocket("ws://localhost:8000/ws/progress/");

    ws.onopen = () => console.log("WebSocket connected for progress tracking");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.frame && totalFrames > 0) {
        setProcessedCount(data.frame);
        setProgress(Math.floor((data.frame / totalFrames) * 100));
      }
        setProcessedCount(data.frame);
        setProgress(Math.floor((data.frame / totalFrames) * 100));
      if (data.object_count !== undefined) setObjectCount(data.object_count);
      if (data.belt_speed !== undefined) setBeltSpeed(data.belt_speed.toFixed(2));
    };

    ws.onclose = () => console.log("WebSocket disconnected");
    ws.onerror = (err) => console.error("WebSocket error:", err);

    // Cleanup
    return () => ws.close();
  }, [totalFrames]);

  // ✅ Request video processing
  useEffect(() => {
    async function fetchFrames() {
      try {
        const response = await axios.post(
          "http://localhost:8000/api/camera/process-video/",
          { video_path: "/app/media/test3.mp4" }
        );

        setTotalFrames(response.data.total_frames);
        setFrames(response.data.frames);
        setVideoUrl(response.data.original_video_url);
        setProgress(100); // Finish
      } catch (error) {
        console.error("Error fetching frames:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFrames();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <div className="spinner" />
        <p>Processed Frame Count: {processedCount}</p>
        <p>Objects detected: {objectCount}</p>
        <p>Belt speed: {beltSpeed} m/s</p>
        <style>
          {`
            .spinner {
              border: 8px solid #f3f3f3;
              border-top: 8px solid #3498db;
              border-radius: 50%;
              width: 60px;
              height: 60px;
              animation: spin 1s linear infinite;
              margin: auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div>
      <Header totalFrames={totalFrames} processedCount={processedCount} />

      {videoUrl && (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h3>Original Video</h3>
          <video src={videoUrl} controls width="600" />
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <p>Objects detected: {objectCount}</p>
        <p>Belt speed: {beltSpeed} m/s</p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>Processed Video Playback</h3>
        <FramePlayer frames={frames} fps={5} />
      </div>

      <div>
        <h3>All Processed Frames</h3>
        <FrameList frames={frames} />
      </div>
    </div>
  );
}

export default VideoFrames;
