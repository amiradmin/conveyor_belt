// src/components/conveyor/ResultsVisualization.jsx
import React from 'react';

export default function ResultsVisualization({ results }) {
  if (!results || !results.object_counts || results.object_counts.length === 0) {
    return null;
  }

  const counts = results.object_counts.map(item => item.count);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;

  return (
    <div className="results-visualization">
      <h4>📈 Object Detection Trends</h4>
      <div className="chart-container">
        {counts.slice(0, 40).map((count, index) => {
          const height = (count / maxCount) * 80;
          const color = count > avgCount * 1.5 ? '#F44336' :
                       count > avgCount * 1.2 ? '#FF9800' :
                       count < avgCount * 0.5 ? '#9C27B0' : '#4CAF50';

          return (
            <div
              key={index}
              className="chart-bar"
              style={{
                height: `${height}px`,
                background: color
              }}
              title={`Frame ${index * 10}: ${count} objects`}
            >
              <div className="frame-label">
                {index % 5 === 0 ? index * 10 : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div className="chart-stats">
        <div className="stat">
          <div className="stat-value" style={{ color: '#4CAF50' }}>
            {avgCount.toFixed(1)}
          </div>
          <div className="stat-label">Average</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#F44336' }}>
            {maxCount}
          </div>
          <div className="stat-label">Peak</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#9C27B0' }}>
            {minCount}
          </div>
          <div className="stat-label">Low</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#2196F3' }}>
            {counts.length}
          </div>
          <div className="stat-label">Frames</div>
        </div>
      </div>

      <style jsx>{`
        .results-visualization {
          background: #37474F;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }

        h4 {
          color: #4CAF50;
          margin-top: 0;
          margin-bottom: 10px;
        }

        .chart-container {
          display: flex;
          align-items: flex-end;
          height: 100px;
          gap: 2px;
          margin-bottom: 15px;
          border-bottom: 1px solid #455A64;
          padding-bottom: 10px;
        }

        .chart-bar {
          flex: 1;
          border-radius: 2px;
          position: relative;
          opacity: 0.8;
        }

        .frame-label {
          position: absolute;
          bottom: 100%;
          font-size: 8px;
          color: #BDBDBD;
          width: 100%;
          text-align: center;
          padding-bottom: 2px;
        }

        .chart-stats {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #BDBDBD;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          font-weight: bold;
          font-size: 18px;
        }

        .stat-label {
          font-size: 10px;
        }
      `}</style>
    </div>
  );
}