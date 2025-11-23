import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to the Dashboard</h1>

      <div className="flex flex-col gap-4">
        <Link
          to="/image-processing"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Image Processing
        </Link>
<br />
        <Link
          to="/video-frames"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Go to Video Frames
        </Link>
      </div>
    </div>
  );
}
