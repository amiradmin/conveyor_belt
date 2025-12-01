import React from 'react';
import { render, screen } from '@testing-library/react';
import RightPanel from '../components/RightPanel/RightPanel';

describe('RightPanel Component', () => {
  test('renders all AI detection cards with metric names and confidence scores', () => {
    render(<RightPanel />);
    expect(screen.getByText(/Spillage Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Belt Alignment Deviation/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Position/i)).toBeInTheDocument();
    expect(screen.getByText(/Object on Belt/i)).toBeInTheDocument();
    expect(screen.getByText(/Damaged Sensor Detected/i)).toBeInTheDocument();
    // Check for confidence percentages
    expect(screen.getAllByText(/%/).length).toBeGreaterThanOrEqual(5);
  });
});
