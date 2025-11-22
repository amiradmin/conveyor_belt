function FrameList({ frames }) {
  return (
    <div className="frames-container">
      {frames.map((frame, idx) => (
        <div className="frame-card" key={idx}>
          <img
            src={`data:image/jpeg;base64,${frame}`}
            alt={`frame-${idx}`}
          />
        </div>
      ))}
    </div>
  );
}

export default FrameList;
