import { useState } from "react";

function App() {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/camera/process-video/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_path: "/app/video/test.mp4" }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setFrames(data.frames || []);
    } catch (err) {
      setError(err.message);
      console.error("Error processing video:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Conveyor Belt Video Processing</h1>

      <button
        onClick={handleSend}
        disabled={loading}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Processing..." : "Process Video"}
      </button>

      {error && (
        <div style={{ color: "red", margin: "10px 0" }}>
          Error: {error}
        </div>
      )}

      {frames.length > 0 && (
        <div>
          <h2>Processed Frames ({frames.length})</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {frames.map((frame, index) => (
              <div key={index} style={{ border: "1px solid #ddd", padding: "5px" }}>
                <img
                  src={`data:image/jpeg;base64,${frame}`}
                  alt={`Frame ${index + 1}`}
                  style={{
                    width: "200px",
                    height: "150px",
                    objectFit: "cover"
                  }}
                />
                <div style={{ textAlign: "center", fontSize: "12px" }}>
                  Frame {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {frames.length === 0 && !loading && !error && (
        <p style={{ marginTop: "20px", color: "#666" }}>
          No frames processed yet. Click the button to start processing.
        </p>
      )}
    </div>
  );
}

export default App;