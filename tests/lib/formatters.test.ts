import { describe, expect, it } from 'vitest';
import {
  formatDateInputValue,
  formatDateShort,
  isValidDateInputValue,
  normalizeDateInputValue,
} from '@/lib/formatters';

describe('date input helpers', () => {
  it('formats ISO dates as dd-MM-yyyy for text inputs', () => {
    expect(formatDateInputValue('2026-06-05')).toBe('05-06-2026');
  });

  it('normalizes dd-MM-yyyy input back to ISO date strings', () => {
    expect(normalizeDateInputValue('05-06-2026')).toBe('2026-06-05');
  });

  it('keeps partial input while the user is typing', () => {
    expect(formatDateInputValue('05-')).toBe('05-');
    expect(normalizeDateInputValue('05-')).toBe('05-');
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidDateInputValue('31-02-2026')).toBe(false);
    expect(isValidDateInputValue('2026-02-31')).toBe(false);
  });

  it('formats dd-MM-yyyy values without relying on browser date parsing', () => {
    expect(formatDateShort('05-06-2026')).toBe('5 Jun 2026');
  });
});
