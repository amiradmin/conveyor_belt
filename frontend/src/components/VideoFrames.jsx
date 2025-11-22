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

  useEffect(() => {
    async function fetchFrames() {
      try {
        const response = await axios.post(
          "http://localhost:8000/api/camera/process-video/",
          { video_path: "/app/media/test3.mp4" }
        );

        setTotalFrames(response.data.total_frames);
        setProcessedCount(response.data.processed_frames_count);
        setFrames(response.data.frames); // استفاده از تمام فریم‌ها
        setVideoUrl(response.data.original_video_url);
      } catch (error) {
        console.error("Error fetching frames:", error);
      }
    }

    fetchFrames();
  }, []);

  return (
    <div>
      <Header totalFrames={totalFrames} processedCount={processedCount} />

      {/* نمایش ویدیو اصلی */}
      {videoUrl && (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h3>Original Video</h3>
          <video src={videoUrl} controls width="600" />
        </div>
      )}

      {/* پخش فریم‌های پردازش شده شبیه ویدیو */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Processed Video Playback</h3>
        <FramePlayer frames={frames} fps={5} />
      </div>

      {/* نمایش تمام فریم‌ها */}
      <div>
        <h3>All Processed Frames</h3>
        <FrameList frames={frames} />
      </div>
    </div>
  );
}

export default VideoFrames;
