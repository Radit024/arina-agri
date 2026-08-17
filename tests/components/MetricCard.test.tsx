import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MetricCard from '@/components/ui/MetricCard';

describe('MetricCard', () => {
  it('renders the supplied metric label and value', () => {
    render(<MetricCard label="Total panen" value="1.250 kg" />);

    expect(screen.getByRole('region', { name: 'Total panen' })).toBeInTheDocument();
    expect(screen.getByText('Total panen')).toBeInTheDocument();
    expect(screen.getByText('1.250 kg')).toBeInTheDocument();
  });

  it('renders an accessible loading state without formatting the supplied value', () => {
    render(<MetricCard label="Luas lahan" value={12.5} loading />);

    expect(screen.getByRole('status', { name: 'Memuat Luas lahan' })).toBeInTheDocument();
  });
});
