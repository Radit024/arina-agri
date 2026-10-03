import { describe, expect, it } from 'vitest';

import { darkTheme, lightTheme } from '@/lib/theme';
import {
  accentText,
  elevatedShadow,
  softBg,
  softHoverBg,
  softText,
  tableHoverBg,
} from '@/lib/themeColors';

const LIGHT_ELEVATION = '0 1px 2px rgba(0, 0, 0, 0.1)';

describe('theme colour helpers', () => {
  it('paints a light-mode status chip with the palette tint token', () => {
    expect(softBg(lightTheme, 'success')).toBe('#D8F3DC');
  });

  it('paints a dark-mode status chip with a translucent main colour instead of the tint token', () => {
    expect(softBg(darkTheme, 'success')).toBe('rgba(104, 201, 154, 0.14)');
  });

  it('reads success as the default status intent', () => {
    expect(softBg(darkTheme)).toBe('rgba(104, 201, 154, 0.14)');
    expect(softText(lightTheme)).toBe('#2D6A4F');
  });

  it('follows the requested palette intent instead of always reading success', () => {
    expect(softText(lightTheme, 'error')).toBe('#C85A3F');
    expect(softBg(darkTheme, 'warning')).toBe('rgba(212, 192, 96, 0.14)');
    expect(accentText(lightTheme, 'warning')).toBe('#2C2A29');
  });

  it('lets a dark-mode status chip carry any alpha from fully clear to fully opaque', () => {
    expect(softBg(darkTheme, 'success', 0)).toBe('rgba(104, 201, 154, 0)');
    expect(softBg(darkTheme, 'success', 1)).toBe('rgba(104, 201, 154, 1)');
  });

  it('keeps a dark-mode hover stronger than the resting status chip tint', () => {
    expect(softHoverBg(darkTheme, 'success')).toBe('rgba(104, 201, 154, 0.2)');
  });

  it('returns the same tint as the resting light-mode chip because light mode ignores the hover alpha', () => {
    expect(softHoverBg(lightTheme, 'success')).toBe('#D8F3DC');
  });

  it('labels a light-mode status chip with the palette dark shade so text stays legible', () => {
    expect(softText(lightTheme, 'success')).toBe('#2D6A4F');
  });

  it('labels a dark-mode status chip with the palette main colour instead of the dark shade', () => {
    expect(softText(darkTheme, 'success')).toBe('#68C99A');
  });

  it('keeps status chip labels on the theme contrast colour rather than the brand colour', () => {
    expect(accentText(lightTheme)).toBe('#ffffff');
    expect(accentText(darkTheme)).toBe('#1E2620');
  });

  it('hovers a table row on a barely-there dark wash in light mode', () => {
    expect(tableHoverBg(lightTheme)).toBe('rgba(0, 0, 0, 0.025)');
  });

  it('hovers a table row on a barely-there light wash in dark mode', () => {
    expect(tableHoverBg(darkTheme)).toBe('rgba(255, 255, 255, 0.04)');
  });

  it('keeps the elevation shadow the caller asked for in light mode', () => {
    expect(elevatedShadow(lightTheme, LIGHT_ELEVATION)).toBe(LIGHT_ELEVATION);
  });

  it('swaps in a deeper shadow than the caller asked for in dark mode', () => {
    expect(elevatedShadow(darkTheme, LIGHT_ELEVATION)).toBe('0 8px 28px rgba(0, 0, 0, 0.42)');
  });

  it('keeps the dark-mode blur while letting the caller weaken the shadow opacity', () => {
    expect(elevatedShadow(darkTheme, LIGHT_ELEVATION, 0.1)).toBe('0 8px 28px rgba(0, 0, 0, 0.1)');
  });
});
