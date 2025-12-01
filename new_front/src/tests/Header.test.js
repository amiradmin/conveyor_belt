import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../components/Header/Header';

describe('Header Component', () => {
  test('renders system title and user profile icon', () => {
    render(<Header darkMode={true} onToggleDarkMode={() => {}} />);
    expect(screen.getByText(/Conveyor Belt Monitoring & Vision System/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/User Profile/i)).toBeInTheDocument();
  });

  test('calls onToggleDarkMode when dark mode button clicked', () => {
    const toggleMock = jest.fn();
    render(<Header darkMode={true} onToggleDarkMode={toggleMock} />);
    const toggleButton = screen.getByLabelText(/Toggle Dark Mode/i);
    fireEvent.click(toggleButton);
    expect(toggleMock).toHaveBeenCalledTimes(1);
  });

  test('user profile button click triggers alert', () => {
    window.alert = jest.fn();
    render(<Header darkMode={true} onToggleDarkMode={() => {}} />);
    const userButton = screen.getByLabelText(/User Profile/i);
    fireEvent.click(userButton);
    expect(window.alert).toHaveBeenCalledWith('User Profile clicked');
  });
});
