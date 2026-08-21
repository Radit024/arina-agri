import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileTabBar } from '@/components/shared/navigation/MobileTabBar';

describe('MobileTabBar', () => {
  const tabs = [
    { id: 'buku-besar', label: 'Buku Besar' },
    { id: 'rab', label: 'RAB' },
    { id: 'laba-rugi', label: 'Laba / Rugi' },
  ];

  it('renders tab items with accessible labels', () => {
    const handleChange = vi.fn();
    render(
      <MobileTabBar
        tabs={tabs}
        value="buku-besar"
        onChange={handleChange}
        ariaLabel="Navigasi Laporan"
      />
    );

    expect(screen.getByRole('tablist', { name: 'Navigasi Laporan' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Buku Besar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'RAB' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Laba / Rugi' })).toBeInTheDocument();
  });

  it('fires onChange with target tab id when clicked', () => {
    const handleChange = vi.fn();
    render(
      <MobileTabBar
        tabs={tabs}
        value="buku-besar"
        onChange={handleChange}
      />
    );

    const rabTab = screen.getByRole('tab', { name: 'RAB' });
    fireEvent.click(rabTab);

    expect(handleChange).toHaveBeenCalledWith('rab', expect.anything());
  });
});
