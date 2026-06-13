import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeContextProvider, useThemeMode } from '@/context/ThemeContext';

function ThemeProbe() {
  const { mode, setThemeMode } = useThemeMode();

  return (
    <div>
      <span data-testid="theme-mode">{mode}</span>
      <button onClick={() => setThemeMode('dark')}>set dark</button>
    </div>
  );
}

function mockPrefersDark(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
});

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
});

describe('ThemeContextProvider default mode', () => {
  it('defaults to light mode even when the system prefers dark mode', async () => {
    mockPrefersDark(true);

    render(
      <ThemeContextProvider>
        <ThemeProbe />
      </ThemeContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  });

  it('still honors a saved dark-mode user preference', async () => {
    mockPrefersDark(false);
    window.localStorage.setItem('arina_theme_mode', 'dark');

    render(
      <ThemeContextProvider>
        <ThemeProbe />
      </ThemeContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });
});
