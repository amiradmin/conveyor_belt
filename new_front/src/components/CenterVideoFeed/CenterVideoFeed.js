import React, { useState } from 'react';
import styled from 'styled-components';
import { FaSyncAlt, FaCameraRetro, FaStethoscope } from 'react-icons/fa';
import VideoPlaceholder from '../Placeholders/VideoPlaceholder';

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-height: 100%;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const ControlsOverlay = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 12px;
  z-index: 10;
`;

const ControlButton = styled.button`
  background-color: ${({ theme }) => theme.colors.panelBackground};
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: 6px 12px;
  font-size: 0.9rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s ease-in-out;

  &:hover,
  &:focus {
    background-color: ${({ theme }) => theme.colors.hover};
    outline: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const CheckboxInput = styled.input`
  cursor: pointer;
  width: 16px;
  height: 16px;
`;

export default function CenterVideoFeed() {
  const [cameraIndex, setCameraIndex] = useState(0);
  const [freezeFrame, setFreezeFrame] = useState(false);

  const cameras = [
    { id: 0, name: 'Camera 1' },
    { id: 1, name: 'Camera 2' },
    { id: 2, name: 'Camera 3' },
  ];

  function handleSwitchCamera() {
    setCameraIndex((prev) => (prev + 1) % cameras.length);
  }

  function handleFreezeToggle() {
    setFreezeFrame((prev) => !prev);
  }

  function handleCaptureIssue() {
    alert(`Issue captured on ${cameras[cameraIndex].name}`);
  }

  function handleDiagnostics() {
    alert('Running diagnostics...');
  }

  return (
    <Container aria-label="Center Video Feed">
      <VideoPlaceholder freezeFrame={freezeFrame} cameraName={cameras[cameraIndex].name} />
      <ControlsOverlay>
        <ControlButton onClick={handleSwitchCamera} aria-label="Switch Camera" title="Switch Camera">
          <FaSyncAlt /> Switch Camera
        </ControlButton>
        <CheckboxLabel>
          <CheckboxInput
            type="checkbox"
            checked={freezeFrame}
            onChange={handleFreezeToggle}
            aria-checked={freezeFrame}
            aria-label="Freeze Frame toggle"
          />
          Freeze Frame
        </CheckboxLabel>
        <ControlButton onClick={handleCaptureIssue} aria-label="Capture Issue" title="Capture Issue">
          <FaCameraRetro /> Capture Issue
        </ControlButton>
        <ControlButton onClick={handleDiagnostics} aria-label="Diagnostics" title="Diagnostics">
          <FaStethoscope /> Diagnostics
        </ControlButton>
      </ControlsOverlay>
    </Container>
  );
}
