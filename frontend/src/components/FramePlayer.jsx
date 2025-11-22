import { useEffect, useState } from "react";

function FramePlayer({ frames, fps = 5 }) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (!frames || frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frames, fps]);

  if (!frames || frames.length === 0) return <p>Loading frames...</p>;

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <img
        src={`data:image/jpeg;base64,${frames[currentFrame]}`}
        alt={`frame-${currentFrame}`}
        style={{ width: "600px", borderRadius: "8px", objectFit: "cover" }}
      />
      <p>Frame {currentFrame + 1} / {frames.length}</p>
    </div>
  );
}

export default FramePlayer;
