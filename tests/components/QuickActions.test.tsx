import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QuickActions from '@/components/dashboard/QuickActions';

describe('QuickActions', () => {
  it('renders Buka Stok link', () => {
    render(<QuickActions />);
    const link = screen.getByRole('link', { name: /buka stok/i });
    expect(link).toHaveAttribute('href', '/dashboard/stok');
  });
});
