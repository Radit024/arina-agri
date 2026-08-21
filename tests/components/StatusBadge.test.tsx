import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusBadge, StatusChip } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders a passive badge with intent label', () => {
    render(<StatusBadge intent="success" label="LUNAS" />);

    expect(screen.getByText('LUNAS')).toBeInTheDocument();
  });

  it('renders interactive StatusChip and fires onClick', () => {
    const handleClick = vi.fn();
    render(
      <StatusChip
        intent="primary"
        label="Semua Komoditas"
        selected={true}
        onClick={handleClick}
      />
    );

    const chip = screen.getByText('Semua Komoditas');
    expect(chip).toBeInTheDocument();

    fireEvent.click(chip);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
