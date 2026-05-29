import { test, expect } from 'vitest';
import theme from '@/lib/theme';

test('theme has status palette tokens', () => {
  expect(theme.palette.success.main).toBe('#52B788');
  expect(theme.palette.warning.main).toBe('#F4E285');
  expect(theme.palette.error.main).toBe('#E07A5F');
  expect(theme.palette.info.main).toBe('#74A57F');
});
