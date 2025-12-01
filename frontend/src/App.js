// src/App.js
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { faTheme } from './theme/faTheme';
import MainLayout from './components/layout/MainLayout';
import MainDashboard from './pages/MainDashboard';
import BeltDetail from './pages/BeltDetail';

import { ConveyorProvider } from './contexts/ConveyorContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import './styles/faStyles.css';

// فونت فارسی
import '@fontsource/vazirmatn/300.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/700.css';

// ایجاد کش RTL
const cacheRTL = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

function App() {
  return (
    <CacheProvider value={cacheRTL}>
      <ThemeProvider theme={faTheme}>
        <CssBaseline />
        <SnackbarProvider>
          <ConveyorProvider>
            <BrowserRouter>
              <div dir="rtl" style={{ minHeight: '100vh' }}>
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<MainDashboard />} />
                    <Route path="belt/:id" element={<BeltDetail />} />

                  </Route>
                </Routes>
              </div>
            </BrowserRouter>
          </ConveyorProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;