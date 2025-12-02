// src/components/conveyor/VideoModal.jsx
import React from 'react';

export default function VideoModal({ isOpen, onClose, videoUrl }) {
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
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '90%',
        maxHeight: '90%'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: 'white' }}>Conveyor Camera View</h3>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer'
          }}>×</button>
        </div>
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          controls
          style={{
            maxWidth: '100%',
            maxHeight: '70vh',
            borderRadius: '5px'
          }}
        />
      </div>
    </div>
  );
}