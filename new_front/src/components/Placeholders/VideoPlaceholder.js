import React from 'react';
import styled from 'styled-components';

const VideoBox = styled.div`
  width: 640px;
  max-width: 100%;
  height: 360px;
  border-radius: 12px;
  background-color: ${({ theme }) =>
    theme.colors.background === '#121212' ? '#222' : '#ddd'};
  box-shadow: 0 0 12px ${({ theme }) => theme.colors.accent};
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.colors.accent};
  font-weight: 700;
  font-size: 1.5rem;
  user-select: none;
  position: relative;
`;

const FreezeOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 180, 212, 0.3);
  border-radius: 12px;
  pointer-events: none;
  user-select: none;
`;

export default function VideoPlaceholder({ freezeFrame, cameraName }) {
  return (
    <VideoBox aria-label={`Video Feed Placeholder for ${cameraName}`}>
      {cameraName}
      {freezeFrame && <FreezeOverlay aria-label="Freeze Frame Enabled" />}
    </VideoBox>
  );
}
