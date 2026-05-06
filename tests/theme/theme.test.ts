import { test, expect } from 'vitest';
import theme from '@/lib/theme';

test('theme has status palette tokens', () => {
  expect(theme.palette.success.main).toBe('#16a34a');
  expect(theme.palette.warning.main).toBe('#f59e0b');
  expect(theme.palette.error.main).toBe('#dc2626');
  expect(theme.palette.info.main).toBe('#2563eb');
});
