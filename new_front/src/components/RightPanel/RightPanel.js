import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const PanelContainer = styled.div`
  height: 100%;
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.panelBackground};
  color: ${({ theme }) => theme.colors.textPrimary};
  overflow-y: auto;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.borderColor};
  border-radius: 8px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MetricName = styled.span`
  font-weight: 600;
  flex: 1;
`;

const StatusIcon = styled.span`
  font-size: 1.4rem;
  color: ${({ status, theme }) =>
    status === 'ok' ? theme.colors.success : theme.colors.error};
  margin-right: 12px;
`;

const Confidence = styled.span`
  font-weight: 700;
  min-width: 60px;
  text-align: right;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const metricsInitial = [
  { id: 'spillage', name: 'Spillage Detected', status: true, confidence: 98 },
  { id: 'alignment', name: 'Belt Alignment Deviation', status: false, confidence: 75 },
  { id: 'loadPosition', name: 'Load Position', status: true, confidence: 95 },
  { id: 'objectOnBelt', name: 'Object on Belt', status: true, confidence: 99 },
  { id: 'sensorDamage', name: 'Damaged Sensor Detected', status: false, confidence: 65 },
];

export default function RightPanel() {
  const [metrics, setMetrics] = useState(metricsInitial);

  // Simulate metric updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prevMetrics) =>
        prevMetrics.map((metric) => ({
          ...metric,
          status: Math.random() > 0.1,
          confidence: Math.min(100, Math.max(50, Math.floor(Math.random() * 51) + 50)),
        }))
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PanelContainer aria-label="AI Detection Metrics">
      {metrics.map(({ id, name, status, confidence }) => (
        <Card key={id} role="region" aria-live="polite" aria-atomic="true">
          <StatusIcon status={status} aria-label={status ? 'OK' : 'Alert'}>
            {status ? <FaCheckCircle /> : <FaExclamationTriangle />}
          </StatusIcon>
          <MetricName>{name}</MetricName>
          <Confidence>{confidence}%</Confidence>
        </Card>
      ))}
    </PanelContainer>
  );
}
