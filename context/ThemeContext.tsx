'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { lightTheme, darkTheme } from '@/lib/theme';
import type { Theme } from '@mui/material/styles';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  theme: lightTheme,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  // Persist & sync with system preference on first load
  useEffect(() => {
    const stored = localStorage.getItem('arina_theme_mode') as 'light' | 'dark' | null;
    if (stored) {
      setMode(stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }
  }, []);

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('arina_theme_mode', next);
      return next;
    });
  };

  const setThemeMode = (newMode: 'light' | 'dark') => {
    setMode(newMode);
    localStorage.setItem('arina_theme_mode', newMode);
  };

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
