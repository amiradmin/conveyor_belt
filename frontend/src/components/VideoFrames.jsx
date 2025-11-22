import { useEffect, useState } from "react";
import axios from "axios";
import Header from "./Header";
import FrameList from "./FrameList";

function VideoFrames() {
  const [frames, setFrames] = useState([]);
  const [totalFrames, setTotalFrames] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  useEffect(() => {
    async function fetchFrames() {
      try {
        const response = await axios.post(
          "http://localhost:8000/api/camera/process-video/",
          { video_path: "/app/video/test.mp4" }
        );

        setTotalFrames(response.data.total_frames);
        setProcessedCount(response.data.processed_frames_count);

        // استفاده از تمام فریم‌های پردازش شده
        setFrames(response.data.frames);
      } catch (error) {
        console.error("Error fetching frames:", error);
      }
    }

    fetchFrames();
  }, []);

  return (
    <div>
      <Header totalFrames={totalFrames} processedCount={processedCount} />
      <FrameList frames={frames} />
    </div>
  );
}

export default VideoFrames;
