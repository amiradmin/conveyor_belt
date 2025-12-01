import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import Header from './components/Header/Header';
import LeftPanel from './components/LeftPanel/LeftPanel';
import CenterVideoFeed from './components/CenterVideoFeed/CenterVideoFeed';
import RightPanel from './components/RightPanel/RightPanel';
import BottomTabs from './components/BottomTabs/BottomTabs';

const darkTheme = {
  colors: {
    background: '#121212',
    panelBackground: '#1f1f1f',
    headerBackground: '#1a1a1a',
    textPrimary: '#e0e0e0',
    textSecondary: '#9e9e9e',
    accent: '#00bcd4',
    error: '#f44336',
    warning: '#ff9800',
    success: '#4caf50',
    borderColor: '#333',
    hover: '#333',
  },
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const lightTheme = {
  colors: {
    background: '#f5f5f5',
    panelBackground: '#ffffff',
    headerBackground: '#eeeeee',
    textPrimary: '#212121',
    textSecondary: '#616161',
    accent: '#2196f3',
    error: '#d32f2f',
    warning: '#f57c00',
    success: '#388e3c',
    borderColor: '#ccc',
    hover: '#ddd',
  },
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.fontFamily};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    user-select: none;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
`;

const AppContainer = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  grid-template-rows: 60px 1fr 50px;
  grid-template-areas:
    'header header header'
    'left center right'
    'bottom bottom bottom';
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

const HeaderArea = styled.header`
  grid-area: header;
  background-color: ${({ theme }) => theme.colors.headerBackground};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  user-select: none;
`;

const LeftArea = styled.aside`
  grid-area: left;
  background-color: ${({ theme }) => theme.colors.panelBackground};
  border-right: 1px solid ${({ theme }) => theme.colors.borderColor};
  overflow-y: auto;
`;

const CenterArea = styled.main`
  grid-area: center;
  background-color: ${({ theme }) => theme.colors.background};
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const RightArea = styled.aside`
  grid-area: right;
  background-color: ${({ theme }) => theme.colors.panelBackground};
  border-left: 1px solid ${({ theme }) => theme.colors.borderColor};
  overflow-y: auto;
`;

const BottomArea = styled.footer`
  grid-area: bottom;
  background-color: ${({ theme }) => theme.colors.headerBackground};
  border-top: 1px solid ${({ theme }) => theme.colors.borderColor};
  user-select: none;
`;

export default function App() {
  const [darkMode, setDarkMode] = useState(true);

  // Example: could toggle dark mode with keyboard shortcut (Ctrl+D)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        setDarkMode((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <GlobalStyle />
      <AppContainer>
        <HeaderArea>
          <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />
        </HeaderArea>
        <LeftArea>
          <LeftPanel />
        </LeftArea>
        <CenterArea>
          <CenterVideoFeed />
        </CenterArea>
        <RightArea>
          <RightPanel />
        </RightArea>
        <BottomArea>
          <BottomTabs />
        </BottomArea>
      </AppContainer>
    </ThemeProvider>
  );
}
