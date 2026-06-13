'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { lightTheme, darkTheme } from '@/lib/theme';
import type { Theme } from '@mui/material/styles';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  theme: lightTheme,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

const THEME_STORAGE_KEY = 'arina_theme_mode';

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const rootTheme = document.documentElement.dataset.theme;
  if (isThemeMode(rootTheme)) {
    return rootTheme;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeMode(storedTheme)) {
    return storedTheme;
  }

  return 'light';
}

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(getInitialThemeMode());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode, mounted]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      mode, 
      theme: mode === 'dark' ? darkTheme : lightTheme, 
      toggleTheme,
      setThemeMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
