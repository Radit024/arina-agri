import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import GuideProvider, { useGuide } from '@/components/shared/guide/GuideProvider';
import {
  GLOBAL_GUIDE,
  getGuideDefinition,
  getGuideForPathname,
  getGuideStorageKey,
  markGuideSeen,
} from '@/components/shared/guide/guideConfig';

let mockPathname = '/dashboard';
const GUIDE_DIALOG_TIMEOUT = 8000;

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

function createDomRect(rect: Partial<DOMRect>): DOMRect {
  const left = rect.left ?? rect.x ?? 0;
  const top = rect.top ?? rect.y ?? 0;
  const width = rect.width ?? 0;
  const height = rect.height ?? 0;

  return {
    bottom: rect.bottom ?? top + height,
    height,
    left,
    right: rect.right ?? left + width,
    top,
    width,
    x: rect.x ?? left,
    y: rect.y ?? top,
    toJSON: () => ({}),
  };
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

  it('uses precise anchors for the reported guide targets', () => {
    const financeGuide = getGuideDefinition('finance');
    const marketGuide = getGuideDefinition('market');
    const globalStepKeys = GLOBAL_GUIDE.steps.map((step) => step.key);
    const globalTargets = GLOBAL_GUIDE.steps.flatMap((step) => (Array.isArray(step.target) ? step.target : [step.target]));

    expect(globalStepKeys).not.toContain('settings');
    expect(financeGuide?.steps.find((step) => step.key === 'record')?.target).toEqual([
      'finance-add-transaction',
      'finance-add-transaction-mobile',
      'finance-add-transaction-empty',
    ]);
    expect(financeGuide?.steps.find((step) => step.key === 'export')?.target).toBe('finance-export');
    expect(financeGuide?.steps.find((step) => step.key === 'report')?.target).toBe('finance-report');
    expect(marketGuide?.steps.find((step) => step.key === 'categories')?.target).toBe('market-categories');
    expect(marketGuide?.steps.find((step) => step.key === 'prices')?.target).toBe('market-refresh');
    expect(globalTargets).toEqual(
      expect.arrayContaining(['nav-kabarPasar', 'nav-ensiklopedia', 'nav-kalender', 'profile-menu'])
    );
  });
});

describe('GuideProvider', () => {
  it('auto-opens the global guide for first-time dashboard users', async () => {
    render(
      <GuideProvider>
        <button data-guide-target="nav-dashboard">Dashboard target</button>
      </GuideProvider>
    );

    expect(await findGuideDialog()).toHaveTextContent('global.title');
  }, GUIDE_DIALOG_TIMEOUT);

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

  it('waits to auto-open a feature guide until the first page target is rendered', async () => {
    mockPathname = '/dashboard/kalender';

    const { rerender } = render(
      <GuideProvider>
        <div>calendar shell</div>
      </GuideProvider>
    );

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <GuideProvider>
        <button data-guide-target="calendar-grid">Calendar target</button>
      </GuideProvider>
    );

    expect(await findGuideDialog()).toHaveTextContent('pages.calendar.title');
    expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-target', 'calendar-grid');
  });

  it('waits to open a manual guide until the first page target is rendered', async () => {
    mockPathname = '/dashboard/kalender';
    markGuideSeen(window.localStorage, 'global');
    markGuideSeen(window.localStorage, 'calendar');

    const { rerender } = render(
      <GuideProvider>
        <ManualLauncher />
      </GuideProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'open guide' }));

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <GuideProvider>
        <button data-guide-target="calendar-grid">Calendar target</button>
        <ManualLauncher />
      </GuideProvider>
    );

    expect(await findGuideDialog()).toHaveTextContent('pages.calendar.title');
    expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-target', 'calendar-grid');
  });

  it('keeps an oversized spotlight inside the viewport', async () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 360 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 640 });

    try {
      mockPathname = '/dashboard/kalender';
      markGuideSeen(window.localStorage, 'global');
      markGuideSeen(window.localStorage, 'calendar');

      render(
        <GuideProvider>
          <button data-guide-target="calendar-grid">Calendar target</button>
          <ManualLauncher />
        </GuideProvider>
      );

      const target = screen.getByRole('button', { name: 'Calendar target' });
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(createDomRect({ left: -24, top: 12, width: 720, height: 80 }));

      fireEvent.click(screen.getByRole('button', { name: 'open guide' }));
      await findGuideDialog();

      const spotlight = screen.getByTestId('guide-spotlight');
      expect(spotlight).toHaveAttribute('data-guide-spotlight-width');
      expect(Number(spotlight.getAttribute('data-guide-spotlight-left'))).toBeGreaterThanOrEqual(7);
      expect(Number(spotlight.getAttribute('data-guide-spotlight-width'))).toBeLessThanOrEqual(346);
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: originalInnerHeight });
    }
  });

  it('remeasures the spotlight when the highlighted target resizes', async () => {
    const OriginalResizeObserver = window.ResizeObserver;
    const callbacksByElement = new Map<Element, ResizeObserverCallback[]>();
    let targetRect = createDomRect({ left: 24, top: 80, width: 120, height: 48 });

    class MockResizeObserver {
      private callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe = (element: Element) => {
        callbacksByElement.set(element, [...(callbacksByElement.get(element) ?? []), this.callback]);
      };

      disconnect = vi.fn();
      unobserve = vi.fn();
    }

    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });

    try {
      mockPathname = '/dashboard/kalender';
      markGuideSeen(window.localStorage, 'global');
      markGuideSeen(window.localStorage, 'calendar');

      render(
        <GuideProvider>
          <button data-guide-target="calendar-grid">Calendar target</button>
          <ManualLauncher />
        </GuideProvider>
      );

      const target = screen.getByRole('button', { name: 'Calendar target' });
      vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => targetRect);

      fireEvent.click(screen.getByRole('button', { name: 'open guide' }));
      await findGuideDialog();

      await waitFor(() => {
        expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-spotlight-width', '132');
      });

      targetRect = createDomRect({ left: 24, top: 80, width: 280, height: 48 });

      await act(async () => {
        callbacksByElement.get(target)?.forEach((callback) => callback([], {} as ResizeObserver));
      });

      await waitFor(() => {
        expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-spotlight-width', '292');
      });
    } finally {
      Object.defineProperty(window, 'ResizeObserver', {
        configurable: true,
        writable: true,
        value: OriginalResizeObserver,
      });
    }
  });

  it('watches mobile layout changes so the spotlight can follow late-rendered targets', async () => {
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

      expect(await findGuideDialog()).toHaveTextContent('global.title');
      expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-target', 'nav-dashboard');
      expect(observe).toHaveBeenCalled();
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

  it('keeps the mobile guide card away from a bottom-aligned highlighted target', async () => {
    const originalMatchMedia = window.matchMedia;
    const bottomTargetRect = createDomRect({ left: 24, top: 620, width: 320, height: 56 });

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

    try {
      mockPathname = '/dashboard/kalender';
      markGuideSeen(window.localStorage, 'global');
      markGuideSeen(window.localStorage, 'calendar');

      render(
        <GuideProvider>
          <button data-guide-target="calendar-grid">Calendar target</button>
          <ManualLauncher />
        </GuideProvider>
      );

      const target = screen.getByRole('button', { name: 'Calendar target' });
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(bottomTargetRect);

      fireEvent.click(screen.getByRole('button', { name: 'open guide' }));

      await findGuideDialog();
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('data-guide-placement-zone', 'top');
      });
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('marks a guide as seen when skipped', async () => {
    render(
      <GuideProvider>
        <button data-guide-target="nav-dashboard">Dashboard target</button>
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
        <button data-guide-target="finance-ledger">Finance target</button>
      </GuideProvider>
    );

    expect(await findGuideDialog()).toHaveTextContent('pages.finance.title');
  });

  it('prefers the calendar guide on direct calendar entry even when global onboarding is unseen', async () => {
    mockPathname = '/dashboard/kalender';

    render(
      <GuideProvider>
        <button data-guide-target="calendar-grid">Calendar target</button>
        <button data-guide-target="calendar-add-schedule">Add schedule target</button>
        <button data-guide-target="calendar-upcoming">Upcoming target</button>
      </GuideProvider>
    );

    expect(await findGuideDialog()).toHaveTextContent('pages.calendar.title');
    expect(screen.getByTestId('guide-spotlight')).toHaveAttribute('data-guide-target', 'calendar-grid');
  });

  it('manual launcher opens the current page guide even after it was seen', async () => {
    mockPathname = '/dashboard/stok';
    markGuideSeen(window.localStorage, 'global');
    markGuideSeen(window.localStorage, 'stock');

    render(
      <GuideProvider>
        <button data-guide-target="stock-summary">Stock target</button>
        <ManualLauncher />
      </GuideProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'open guide' }));

    expect(await findGuideDialog()).toHaveTextContent('pages.stock.title');
  });
});
