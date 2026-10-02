import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('theme bootstrap script', () => {
  it('uses light mode as the fallback before React hydration', () => {
    const layoutSource = readFileSync('app/layout.tsx', 'utf8');
    const themeScriptStart = layoutSource.indexOf('const themeInitScript');
    const themeScriptEnd = layoutSource.indexOf('export default async function RootLayout');
    const themeScript = layoutSource.slice(themeScriptStart, themeScriptEnd);

    expect(themeScript).toContain("stored === 'light' || stored === 'dark' ? stored : 'light'");
    expect(themeScript).not.toContain('prefers-color-scheme: dark');
  });
});
