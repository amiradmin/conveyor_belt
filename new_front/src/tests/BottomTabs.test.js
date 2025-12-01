import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomTabs from '../components/BottomTabs/BottomTabs';

describe('BottomTabs Component', () => {
  test('renders four tabs with correct labels', () => {
    render(<BottomTabs />);
    expect(screen.getByRole('tab', { name: /Volume Flow Analytics/i })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /Belt Alignment & Speed Analysis/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Anomaly History/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /System Settings/i })).toBeInTheDocument();
  });

  test('switches active tab on click and displays corresponding content', () => {
    render(<BottomTabs />);
    const beltTab = screen.getByRole('tab', { name: /Belt Alignment & Speed Analysis/i });
    fireEvent.click(beltTab);
    expect(beltTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByLabelText(/Belt Alignment & Speed Analysis Chart Placeholder/i) ||
        screen.getByText(/Belt Alignment & Speed Analysis Chart Placeholder/i)
    ).toBeInTheDocument();
  });
});
