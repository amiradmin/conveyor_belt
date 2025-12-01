import React from 'react';
import styled from 'styled-components';
import { FaUserCircle, FaMoon, FaSun } from 'react-icons/fa';

const HeaderContainer = styled.div`
  height: 60px;
  padding: 0 20px;
  background-color: ${({ theme }) => theme.colors.headerBackground};
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  user-select: none;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;
  font-size: 1.8rem;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.2s ease-in-out;
  border-radius: 4px;

  &:hover,
  &:focus {
    color: ${({ theme }) => theme.colors.accent};
    outline: none;
  }
`;

export default function Header({ darkMode, onToggleDarkMode }) {
  return (
    <HeaderContainer>
      <Title>Conveyor Belt Monitoring & Vision System</Title>
      <Actions>
        <IconButton
          aria-label="Toggle Dark Mode"
          title="Toggle Dark Mode (Ctrl+D)"
          onClick={onToggleDarkMode}
          type="button"
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </IconButton>
        <IconButton aria-label="User Profile" title="User Profile" type="button" onClick={() => alert('User Profile clicked')}>
          <FaUserCircle />
        </IconButton>
      </Actions>
    </HeaderContainer>
  );
}
