// VideoTestPage.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function VideoTestPage() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [response, setResponse] = useState(null);
  const [liveProgress, setLiveProgress] = useState("No progress yet...");
  const [allProgress, setAllProgress] = useState([]);

  const wsRef = useRef(null);

  useEffect(() => {
    // Fetch available videos from API
    axios.get("http://localhost:8000/api/camera/process-video/")
      .then(res => {
        if (res.data.available_videos) {
          setVideos(res.data.available_videos);
          if (res.data.available_videos.length > 0) {
            setSelectedVideo(res.data.available_videos[0].path);
          }
        }
      })
      .catch(err => console.error(err));

    // Connect WebSocket for live progress
    wsRef.current = new WebSocket("ws://localhost:8000/ws/progress/");

    wsRef.current.onopen = () => console.log("WebSocket connected");
    wsRef.current.onclose = () => console.log("WebSocket disconnected");
    wsRef.current.onerror = (e) => console.log("WebSocket error:", e);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "progress") {
        setLiveProgress(
          `Frame: ${data.frame} | Objects: ${data.object_count} | Progress: ${data.progress}% ${data.is_final ? "| Finished!" : ""}`
        );
        setAllProgress(prev => [...prev, data]);
      } else if (data.type === "error") {
        setLiveProgress(`Error: ${data.error}`);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleStartProcessing = () => {
    if (!selectedVideo) return;

    axios.post("http://localhost:8000/api/camera/process-video/", {
      video_path: selectedVideo
    })
      .then(res => {
        setResponse(res.data);
        setLiveProgress("Processing started...");
        setAllProgress([]);
      })
      .catch(err => {
        console.error("Upload error:", err);
        setResponse({ error: err.message });
      });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Video Processing Test</h2>

      <div>
        <label>Select a video:</label>
        <select
          value={selectedVideo}
          onChange={e => setSelectedVideo(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          {videos.map(v => (
            <option key={v.path} value={v.path}>
              {v.path} ({(v.size / (1024*1024)).toFixed(2)} MB)
            </option>
          ))}
        </select>
      </div>

      <button onClick={handleStartProcessing} style={{ marginTop: 10 }}>
        Start Processing
      </button>

      <div style={{ marginTop: 20 }}>
        <h3>Response:</h3>
        <pre>{JSON.stringify(response, null, 2)}</pre>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Live Progress:</h3>
        <p>{liveProgress}</p>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>All Progress Updates:</h3>
        <pre>{JSON.stringify(allProgress, null, 2)}</pre>
      </div>
    </div>
  );
}
