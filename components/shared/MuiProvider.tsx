'use client';

import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeContextProvider, useThemeMode } from '@/context/ThemeContext';

// Inner component that reads from ThemeContext
function MuiThemeConsumer({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeMode();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function MuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeContextProvider>
        <MuiThemeConsumer>
          {children}
        </MuiThemeConsumer>
      </ThemeContextProvider>
    </AppRouterCacheProvider>
  );
}
