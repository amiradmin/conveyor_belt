function Header({ totalFrames, processedCount }) {
  return (
    <div style={{ textAlign: "center", marginBottom: "20px" }}>
      <h2>Conveyor Belt Video Analysis</h2>
      <p>
        Total frames: <strong>{totalFrames}</strong> | Processed frames: <strong>{processedCount}</strong>
      </p>
    </div>
  );
}

export default Header;