import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaCircle, FaVideo } from 'react-icons/fa';

const PanelContainer = styled.div`
  padding: 20px;
  height: 100%;
  color: ${({ theme }) => theme.colors.textPrimary};
  background-color: ${({ theme }) => theme.colors.panelBackground};
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const IndicatorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Label = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Value = styled.span`
  font-weight: 700;
`;

const StatusDot = styled(FaCircle)`
  color: ${({ status, theme }) =>
    status === 'ok'
      ? theme.colors.success
      : status === 'error'
      ? theme.colors.error
      : theme.colors.warning};
  margin-right: 8px;
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
`;

const CameraStatus = styled.div`
  display: flex;
  align-items: center;
  color: ${({ connected, theme }) => (connected ? theme.colors.success : theme.colors.error)};
  font-weight: 700;
  gap: 6px;
`;

export default function LeftPanel() {
  const [conveyorStatus, setConveyorStatus] = useState(true);
  const [beltSpeed, setBeltSpeed] = useState(120); // rpm
  const [loadVolume, setLoadVolume] = useState(15.5); // tons
  const [materialType, setMaterialType] = useState('Coal');
  const [cameraConnected, setCameraConnected] = useState(true);

  // Simulate dynamic values update every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setConveyorStatus(Math.random() > 0.1); // 90% chance ok
      setBeltSpeed((110 + Math.random() * 20).toFixed(1));
      setLoadVolume((14 + Math.random() * 4).toFixed(2));
      const materials = ['Coal', 'Gravel', 'Sand', 'Ore'];
      setMaterialType(materials[Math.floor(Math.random() * materials.length)]);
      setCameraConnected(Math.random() > 0.05); // 95% chance connected
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PanelContainer aria-label="Live Conveyor Status Indicators">
      <IndicatorRow>
        <Label>Conveyor Status</Label>
        <StatusContainer>
          <StatusDot status={conveyorStatus ? 'ok' : 'error'} aria-label={conveyorStatus ? 'Running' : 'Stopped'} />
          <Value>{conveyorStatus ? 'Running' : 'Stopped'}</Value>
        </StatusContainer>
      </IndicatorRow>

      <IndicatorRow>
        <Label>Belt Speed (rpm)</Label>
        <Value>{beltSpeed}</Value>
      </IndicatorRow>

      <IndicatorRow>
        <Label>Load Volume (tons)</Label>
        <Value>{loadVolume}</Value>
      </IndicatorRow>

      <IndicatorRow>
        <Label>Material Type</Label>
        <Value>{materialType}</Value>
      </IndicatorRow>

      <IndicatorRow>
        <Label>Camera Connection</Label>
        <CameraStatus connected={cameraConnected} aria-label={cameraConnected ? 'Connected' : 'Disconnected'}>
          <FaVideo />
          {cameraConnected ? 'Connected' : 'Disconnected'}
        </CameraStatus>
      </IndicatorRow>
    </PanelContainer>
  );
}
