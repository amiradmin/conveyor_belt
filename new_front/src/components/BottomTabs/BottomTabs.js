import React, { useState } from 'react';
import styled from 'styled-components';
import ChartPlaceholder from '../Placeholders/ChartPlaceholder';

const tabsList = [
  { id: 'volumeFlow', label: 'Volume Flow Analytics' },
  { id: 'beltAlignment', label: 'Belt Alignment & Speed Analysis' },
  { id: 'anomalyHistory', label: 'Anomaly History' },
  { id: 'systemSettings', label: 'System Settings' },
];

const TabsContainer = styled.nav`
  display: flex;
  background-color: ${({ theme }) => theme.colors.panelBackground};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  user-select: none;
`;

const TabButton = styled.button`
  flex: 1;
  background: none;
  border: none;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 0.9rem;
  color: ${({ active, theme }) =>
    active ? theme.colors.accent : theme.colors.textSecondary};
  border-bottom: ${({ active, theme }) =>
    active ? `3px solid ${theme.colors.accent}` : '3px solid transparent'};
  cursor: pointer;
  transition: color 0.2s ease-in-out, border-color 0.2s ease-in-out;

  &:hover,
  &:focus {
    color: ${({ theme }) => theme.colors.accent};
    outline: none;
  }
`;

const TabContent = styled.section`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 18px 24px;
  height: 150px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 1rem;
  overflow-y: auto;
`;

export default function BottomTabs() {
  const [activeTab, setActiveTab] = useState(tabsList[0].id);

  function renderContent() {
    switch (activeTab) {
      case 'volumeFlow':
        return <ChartPlaceholder text="Volume Flow Analytics Chart Placeholder" />;
      case 'beltAlignment':
        return <ChartPlaceholder text="Belt Alignment & Speed Analysis Chart Placeholder" />;
      case 'anomalyHistory':
        return <ChartPlaceholder text="Anomaly History Chart Placeholder" />;
      case 'systemSettings':
        return (
          <div>
            <h3>System Settings</h3>
            <p>
              Configure system parameters, user preferences, and monitoring thresholds here.
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <>
      <TabsContainer role="tablist" aria-label="System Bottom Tabs">
        {tabsList.map(({ id, label }) => (
          <TabButton
            key={id}
            active={activeTab === id}
            onClick={() => setActiveTab(id)}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`${id}-tab`}
            id={`${id}-tab-button`}
            tabIndex={activeTab === id ? 0 : -1}
            type="button"
          >
            {label}
          </TabButton>
        ))}
      </TabsContainer>
      <TabContent
        role="tabpanel"
        id={`${activeTab}-tab`}
        aria-labelledby={`${activeTab}-tab-button`}
        tabIndex={0}
      >
        {renderContent()}
      </TabContent>
    </>
  );
}
