import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileTopAppBar from '@/components/shared/MobileTopAppBar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/keuangan',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MobileTopAppBar', () => {
  it('renders title', () => {
    render(<MobileTopAppBar />);
    expect(screen.getByText('keuangan')).toBeInTheDocument();
    expect(screen.queryByLabelText('Open settings')).not.toBeInTheDocument();
  });
});
