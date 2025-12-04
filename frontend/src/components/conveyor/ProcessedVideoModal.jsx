// src/components/conveyor/ProcessedVideoModal.jsx
import React from 'react';

export default function ProcessedVideoModal({ isOpen, onClose, processedFrame, analysisResults }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(5px)'
    }} onClick={onClose}>
      <div style={{
        background: '#263238',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '90%',
        maxHeight: '90%',
        overflow: 'auto',
        color: 'white',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        position: 'relative'
      }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: '#F44336',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px',
            zIndex: 1001
          }}
        >
          ✕
        </button>

        <h2 style={{ marginTop: 0, color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔬</span>
          AI Analysis Details
        </h2>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Processed Image */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h3>Processed Frame</h3>
            {processedFrame ? (
              <img
                src={processedFrame}
                alt="Processed Analysis"
                style={{
                  width: '100%',
                  border: '2px solid #4CAF50',
                  borderRadius: '8px',
                  maxHeight: '500px',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div style={{
                border: '2px dashed #4CAF50',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                color: '#4CAF50'
              }}>
                No processed frame available
              </div>
            )}
          </div>

          {/* Analysis Results */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h3>Analysis Results</h3>
            {analysisResults ? (
              <div style={{
                background: '#37474F',
                borderRadius: '8px',
                padding: '15px',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ color: '#4CAF50', marginBottom: '10px' }}>📊 Summary</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#BDBDBD' }}>Objects Detected</div>
                      <div style={{ fontSize: '24px', color: 'white', fontWeight: 'bold' }}>
                        {analysisResults.object_count || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#BDBDBD' }}>Confidence</div>
                      <div style={{ fontSize: '24px', color: '#4CAF50', fontWeight: 'bold' }}>
                        {analysisResults.confidence ? `${Math.round(analysisResults.confidence * 100)}%` : '--%'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#BDBDBD' }}>System Health</div>
                      <div style={{ fontSize: '24px', color: '#2196F3', fontWeight: 'bold' }}>
                        {analysisResults.system_health ? `${Math.round(analysisResults.system_health)}%` : '--%'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#BDBDBD' }}>Timestamp</div>
                      <div style={{ fontSize: '12px', color: 'white' }}>
                        {analysisResults.timestamp || '--'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Results */}
                {analysisResults.objects && analysisResults.objects.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ color: '#FF9800', marginBottom: '10px' }}>🎯 Detected Objects</h4>
                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      background: '#263238',
                      borderRadius: '6px',
                      padding: '10px'
                    }}>
                      {analysisResults.objects.map((obj, index) => (
                        <div key={index} style={{
                          padding: '8px',
                          marginBottom: '5px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: 'white' }}>
                              {obj.label || `Object ${index + 1}`}
                            </div>
                            <div style={{ fontSize: '11px', color: '#BDBDBD' }}>
                              Confidence: {Math.round((obj.confidence || 0) * 100)}%
                            </div>
                          </div>
                          <div style={{
                            background: obj.color || '#4CAF50',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px'
                          }}>
                            {obj.type || 'object'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety Analysis */}
                {analysisResults.safety_analysis && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ color: '#F44336', marginBottom: '10px' }}>⚠️ Safety Analysis</h4>
                    <div style={{
                      padding: '10px',
                      background: 'rgba(244, 67, 54, 0.1)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      {analysisResults.safety_analysis.issues?.map((issue, idx) => (
                        <div key={idx} style={{ marginBottom: '5px', color: '#FFCDD2' }}>
                          • {issue}
                        </div>
                      )) || 'No safety issues detected'}
                    </div>
                  </div>
                )}

                {/* Raw Data */}
                <div>
                  <h4 style={{ color: '#9C27B0', marginBottom: '10px' }}>📝 Raw Data</h4>
                  <pre style={{
                    background: '#263238',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    maxHeight: '100px',
                    overflow: 'auto',
                    color: '#E1BEE7'
                  }}>
                    {JSON.stringify(analysisResults, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#37474F',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                color: '#BDBDBD'
              }}>
                No analysis results available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}