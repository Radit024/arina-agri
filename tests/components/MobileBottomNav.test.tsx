import { render, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

const pushMock = vi.fn();
const prefetchMock = vi.fn();
let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: pushMock, prefetch: prefetchMock }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

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
  pushMock.mockReset();
  prefetchMock.mockReset();
});

describe('MobileBottomNav', () => {
  it('shows 5 main items including lainnya', () => {
    const view = render(<MobileBottomNav />);
    expect(view.getAllByRole('button').length).toBe(5);
    expect(view.getByRole('button', { name: 'dashboard' })).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'keuangan' })).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'ensiklopedia' })).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'kalender' })).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'lainnya' })).toBeInTheDocument();
  });

  it('activates lainnya for non-bottom-nav routes', () => {
    mockPathname = '/dashboard/stok';
    const view = render(<MobileBottomNav />);

    expect(view.getByRole('button', { name: 'lainnya' })).toHaveClass('Mui-selected');
    expect(view.getByRole('button', { name: 'dashboard' })).not.toHaveClass('Mui-selected');
  });

  it('opens sheet, navigates through menu item, and closes sheet', async () => {
    const view = render(<MobileBottomNav />);

    view.getByRole('button', { name: 'lainnya' }).click();
    expect(await view.findByText('featureMenuTitle')).toBeInTheDocument();

    view.getByRole('button', { name: 'stok' }).click();
    expect(pushMock).toHaveBeenCalledWith('/dashboard/stok');

    await waitFor(() => {
      expect(view.getByText('featureMenuTitle')).not.toBeVisible();
    });
  });
});
