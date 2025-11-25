import { createTheme } from '@mui/material/styles';
import { prefixer } from 'jss-rtl';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [rtlPlugin],
});

// Create RTL theme
const rtlTheme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: [
      'Vazir',
      'Tahoma',
      'Arial',
      'sans-serif',
    ].join(','),
    body1: {
      textAlign: 'right',
    },
    body2: {
      textAlign: 'right',
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          textAlign: 'right',
        },
      },
    },
  },
});

export { rtlTheme, cacheRtl };