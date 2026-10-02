import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const sidebar = readFileSync('components/shared/Sidebar.tsx', 'utf8');
const settings = readFileSync('components/shared/SettingsModalView.tsx', 'utf8');

test('sidebar icon buttons have aria-labels', () => {
  expect(sidebar).toContain('aria-label="Toggle sidebar"');
});

test('settings modal close button has aria-label', () => {
  expect(settings).toContain('aria-label="Close settings"');
});
