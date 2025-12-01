import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CenterVideoFeed from '../components/CenterVideoFeed/CenterVideoFeed';

describe('CenterVideoFeed Component', () => {
  test('renders video placeholder and all overlay controls', () => {
    render(<CenterVideoFeed />);
    expect(screen.getByLabelText(/Center Video Feed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch Camera/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Freeze Frame toggle/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Capture Issue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Diagnostics/i })).toBeInTheDocument();
  });

  test('freeze frame checkbox toggles state', () => {
    render(<CenterVideoFeed />);
    const freezeCheckbox = screen.getByLabelText(/Freeze Frame toggle/i);
    expect(freezeCheckbox).not.toBeChecked();
    fireEvent.click(freezeCheckbox);
    expect(freezeCheckbox).toBeChecked();
  });

  test('switch camera button cycles cameras', () => {
    render(<CenterVideoFeed />);
    const switchBtn = screen.getByRole('button', { name: /Switch Camera/i });
    const videoPlaceholder = screen.getByLabelText(/Video Feed Placeholder for Camera 1/i);
    expect(videoPlaceholder).toBeInTheDocument();
    fireEvent.click(switchBtn);
    expect(screen.getByLabelText(/Video Feed Placeholder for Camera 2/i)).toBeInTheDocument();
    fireEvent.click(switchBtn);
    expect(screen.getByLabelText(/Video Feed Placeholder for Camera 3/i)).toBeInTheDocument();
  });
});
