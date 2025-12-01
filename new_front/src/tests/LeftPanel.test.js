import React from 'react';
import { render, screen } from '@testing-library/react';
import LeftPanel from '../components/LeftPanel/LeftPanel';

describe('LeftPanel Component', () => {
  test('renders all conveyor status indicators with correct labels', () => {
    render(<LeftPanel />);
    expect(screen.getByText(/Conveyor Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Belt Speed/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Volume/i)).toBeInTheDocument();
    expect(screen.getByText(/Material Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Camera Connection/i)).toBeInTheDocument();
  });

  test('renders placeholder values for indicators', () => {
    render(<LeftPanel />);
    expect(screen.getByLabelText(/Running|Stopped/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Connected|Disconnected/)).toBeInTheDocument();
  });
});
