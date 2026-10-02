import { describe, expect, it } from 'vitest';
import {
  dashboardRadii,
  pageActionButtonSx,
  pageHeaderSx,
  pageShellSx,
  pageTitleSx,
} from '@/lib/ui/dashboardDesign';

describe('dashboardDesign tokens', () => {
  it('preserves the Keuangan page title treatment as the shared page title', () => {
    expect(pageTitleSx).toMatchObject({
      fontFamily: 'var(--font-sora)',
      fontWeight: 700,
      fontSize: { xs: '1.5rem', md: '2.125rem' },
    });
  });

  it('preserves the shared page action radius and touch target', () => {
    expect(dashboardRadii.action).toBe(8);
    expect(pageActionButtonSx).toMatchObject({
      borderRadius: 8,
      minHeight: 44,
      whiteSpace: 'nowrap',
      fontWeight: 600,
    });
  });

  it('keeps page shell and header layout consistent with the finance baseline', () => {
    expect(pageShellSx).toMatchObject({
      p: { xs: 2, md: 3 },
      minHeight: { md: 'calc(100dvh - 96px)' },
      display: 'flex',
      flexDirection: 'column',
    });

    expect(pageHeaderSx).toMatchObject({
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      justifyContent: 'space-between',
      alignItems: { xs: 'stretch', md: 'center' },
      gap: 2,
      mb: 2,
    });
  });

  it('does not place page-specific raw hex colors in shared layout tokens', () => {
    const serializedTokens = JSON.stringify({
      dashboardRadii,
      pageActionButtonSx,
      pageHeaderSx,
      pageShellSx,
      pageTitleSx,
    });

    expect(serializedTokens).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
