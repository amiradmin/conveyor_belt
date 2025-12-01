import React from 'react';
import styled from 'styled-components';

const Placeholder = styled.div`
  height: 100%;
  border: 2px dashed ${({ theme }) => theme.colors.accent};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.accent};
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.25rem;
  font-weight: 600;
  user-select: none;
  background-color: ${({ theme }) =>
    theme.colors.background === '#121212' ? '#1a1a1a' : '#f0f0f0'};
`;

export default function ChartPlaceholder({ text }) {
  return <Placeholder aria-label="Chart Placeholder">{text || 'Chart Placeholder'}</Placeholder>;
}
