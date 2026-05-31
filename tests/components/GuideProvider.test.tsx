import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import GuideProvider, { useGuide } from '@/components/shared/guide/GuideProvider';
import {
  getGuideForPathname,
  getGuideStorageKey,
  markGuideSeen,
} from '@/components/shared/guide/guideConfig';

let mockPathname = '/dashboard';
const GUIDE_DIALOG_TIMEOUT = 3000;

function findGuideDialog() {
  return screen.findByRole('dialog', {}, { timeout: GUIDE_DIALOG_TIMEOUT });
}

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, string | number>) => {
      if (!values) return key;
      return `${key}:${JSON.stringify(values)}`;
    };

    t.raw = (key: string) => ({
      eyebrow: `${key}.eyebrow`,
      title: `${key}.title`,
      intro: `${key}.intro`,
      steps: new Proxy(
        {},
        {
          get: (_target, stepKey: string) => ({
            title: `${key}.steps.${stepKey}.title`,
            body: `${key}.steps.${stepKey}.body`,
          }),
        }
      ),
    });

    return t;
  },
}));

function ManualLauncher() {
  const { openGuide } = useGuide();
  return <button onClick={() => openGuide()}>open guide</button>;
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  mockPathname = '/dashboard';
  window.localStorage.clear();
});

describe('guide config', () => {
  it('matches feature routes to guide ids', () => {
    expect(getGuideForPathname('/dashboard/keuangan')?.id).toBe('finance');
    expect(getGuideForPathname('/dashboard/stok')?.id).toBe('stock');
    expect(getGuideForPathname('/dashboard/cuaca')?.id).toBe('weather');
    expect(getGuideForPathname('/dashboard/unknown')).toBeNull();
  });

  it('stores seen state in versioned guide keys', () => {
    markGuideSeen(window.localStorage, 'global');
    expect(window.localStorage.getItem(getGuideStorageKey('global'))).toBe('true');
  });
});

describe('GuideProvider', () => {
  it('auto-opens the global guide for first-time dashboard users', async () => {
    render(
      <GuideProvider>
        <div>dashboard</div>
      </GuideProvider>
    );

    expect(await findGuideDialog()).toHaveTextContent('global.title');
  });

  it('highlights the current target and moves the spotlight as steps advance', async () => {
    render(
      <GuideProvider>
        <button data-guide-target="nav-dashboard">Dashboard target</button>
        <button data-guide-target="nav-keuangan">Finance target</button>
      </GuideProvider>
    );

    expect(await findGuideDialog()).toHaveTextContent('global.title');
    expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-target', 'nav-dashboard');

    fireEvent.click(screen.getByRole('button', { name: 'actions.next' }));

    expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-target', 'nav-keuangan');
  });

  it('skips the global mutation observer on mobile viewports', async () => {
    const originalMatchMedia = window.matchMedia;
    const OriginalMutationObserver = window.MutationObserver;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const mutationObserverConstructor = vi.fn().mockImplementation(() => ({
      observe,
      disconnect,
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width: 899.95px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    Object.defineProperty(window, 'MutationObserver', {
      configurable: true,
      writable: true,
      value: mutationObserverConstructor,
    });

    try {
      markGuideSeen(window.localStorage, 'global');
      render(
        <GuideProvider>
          <button data-guide-target="nav-dashboard">Dashboard target</button>
          <ManualLauncher />
        </GuideProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'open guide' }));

      expect(screen.getByRole('dialog')).toHaveTextContent('global.title');
      expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-target', 'nav-dashboard');
      expect(observe).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      });
      Object.defineProperty(window, 'MutationObserver', {
        configurable: true,
        writable: true,
        value: OriginalMutationObserver,
      });
    }
  });

  it('marks a guide as seen when skipped', async () => {
    render(
      <GuideProvider>
        <div>dashboard</div>
      </GuideProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'actions.skip' }, { timeout: GUIDE_DIALOG_TIMEOUT }));

    await waitFor(() => {
      expect(window.localStorage.getItem(getGuideStorageKey('global'))).toBe('true');
    });
  });

  it('auto-opens a feature guide when global onboarding is already seen', async () => {
    mockPathname = '/dashboard/keuangan';
    markGuideSeen(window.localStorage, 'global');

    render(
      <GuideProvider>
        <div>finance</div>
      </GuideProvider>
    );

    expect(await findGuideDialog()).toHaveTextContent('pages.finance.title');
  });

  it('manual launcher opens the current page guide even after it was seen', async () => {
    mockPathname = '/dashboard/stok';
    markGuideSeen(window.localStorage, 'global');
    markGuideSeen(window.localStorage, 'stock');

    render(
      <GuideProvider>
        <ManualLauncher />
      </GuideProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'open guide' }));

    expect(await findGuideDialog()).toHaveTextContent('pages.stock.title');
  });
});
