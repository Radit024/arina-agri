import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  FinanceComparisonView,
  type FinanceComparisonViewProps,
} from '@/app/dashboard/keuangan/_components/FinanceComparisonView';

const baseProps: FinanceComparisonViewProps = {
  comparison: {
    metrics: [
      {
        label: 'Total Pendapatan',
        proyeksi: 5000000,
        realisasi: 6000000,
        selisih: 1000000,
        selisihPercent: 0.2,
      },
      {
        label: 'HPP',
        proyeksi: 0,
        realisasi: 2500,
        selisih: 2500,
        selisihPercent: null,
      },
    ],
    kategoriMetrics: [
      {
        label: 'expense:Benih',
        proyeksi: 1000000,
        realisasi: 1000000,
        selisih: 0,
        selisihPercent: 0,
      },
      {
        label: 'expense:Pupuk',
        proyeksi: 0,
        realisasi: 500000,
        selisih: 500000,
        selisihPercent: null,
        unmatched: true,
      },
    ],
    arusKasBulanan: [
      {
        bulan: '2026-06',
        proyeksi: 2000000,
        realisasi: 2500000,
        selisih: 500000,
        selisihPercent: 0.25,
      },
    ],
  },
  loading: false,
  error: null,
  hasEnoughData: true,
  projectionHasData: true,
  realizationHasData: true,
};

describe('FinanceComparisonView', () => {
  it('renders gating message when hasEnoughData is false', () => {
    render(
      <FinanceComparisonView
        {...baseProps}
        hasEnoughData={false}
        projectionHasData={false}
        realizationHasData={false}
      />,
    );
    expect(
      screen.getByText(/Kedua skenario \(Proyeksi & Realisasi\) belum memiliki data/i),
    ).toBeInTheDocument();
  });

  it('renders gating message specifying realization missing when projectionHasData=true, realizationHasData=false', () => {
    render(
      <FinanceComparisonView
        {...baseProps}
        hasEnoughData={false}
        projectionHasData={true}
        realizationHasData={false}
      />,
    );
    expect(
      screen.getByText(/Skenario Realisasi belum memiliki data/i),
    ).toBeInTheDocument();
  });

  it('renders comparison metrics, cash-flow cards, and the labelled desktop cash-flow table', () => {
    render(<FinanceComparisonView {...baseProps} />);
    expect(screen.getByText('Metrik Finansial Utama')).toBeInTheDocument();
    expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
    expect(screen.getByText('HPP')).toBeInTheDocument();
    expect(screen.getByText('Pupuk')).toBeInTheDocument();
    expect(screen.getByText('Hanya di Realisasi')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByRole('article', { name: 'Perbandingan arus kas Juni 2026' })).toBeInTheDocument();
    const cashFlowTable = screen.getByRole('table', { name: 'Tabel perbandingan arus kas bulanan' });
    expect(cashFlowTable).toHaveTextContent('Bulan');
    expect(cashFlowTable).toHaveTextContent('Proyeksi (Kas Bersih)');
    expect(cashFlowTable).toHaveTextContent('Realisasi (Kas Bersih)');
    expect(cashFlowTable).toHaveTextContent('Selisih (%)');
    expect(cashFlowTable).toHaveTextContent('2026-06');
  });

  it('shows the cash-flow empty state without stale mobile or desktop data', () => {
    render(
      <FinanceComparisonView
        {...baseProps}
        comparison={{ ...baseProps.comparison!, arusKasBulanan: [] }}
      />,
    );

    expect(screen.getByText('Belum ada arus kas bulanan')).toBeInTheDocument();
    expect(screen.getByText('Belum ada data arus kas bulanan yang dapat dibandingkan.')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Perbandingan arus kas Juni 2026' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Tabel perbandingan arus kas bulanan' })).not.toBeInTheDocument();
  });
});
