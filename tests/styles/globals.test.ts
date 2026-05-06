import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('app/globals.css', 'utf8');

test('globals includes reduced-motion override', () => {
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
});

test('globals include weather gradient tokens', () => {
  expect(css).toContain('--weather-sunny-start');
  expect(css).toContain('--weather-cloudy-start');
  expect(css).toContain('--weather-rainy-start');
});
