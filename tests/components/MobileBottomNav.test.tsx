import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MobileBottomNav', () => {
  it('shows 5 items and no settings', () => {
    render(<MobileBottomNav />);
    const actions = screen.getAllByRole('button');
    expect(actions.length).toBe(5);
    expect(screen.queryByText('pengaturan')).not.toBeInTheDocument();
  });
});
