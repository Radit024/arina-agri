import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickActions from '@/components/dashboard/QuickActions';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Manajemen Stok Panen',
      description: 'Pantau stok dan batch panen terbaru.',
      action: 'Buka Stok',
    };

    return translations[key] ?? key;
  },
}));

describe('QuickActions', () => {
  it('renders Buka Stok link', () => {
    render(<QuickActions />);
    const link = screen.getByRole('link', { name: /buka stok/i });
    expect(link).toHaveAttribute('href', '/dashboard/stok');
  });
});
