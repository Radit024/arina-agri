import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FinanceComparisonView } from '@/app/dashboard/keuangan/_components/FinanceComparisonView';
import type { UseComparisonControllerResult } from '@/controllers/keuangan/useComparisonController';
import type { ScenarioOutput } from '@/lib/finance/rabTypes';

const emptyOutput: ScenarioOutput = {
  totalPendapatan: 0,
  totalBiayaProduksi: 0,
  labaRugi: 0,
  hpp: null,
  bepProduksi: null,
  bcRatio: null,
  kategoriTotals: {},
  arusKasBulanan: [],
  kebutuhanModalKerja: 0,
  bunga: 0,
  kasAkhirPascaPembiayaan: 0,
};

const baseProps: UseComparisonControllerResult = {
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
  projectionOutput: emptyOutput,
  realizationOutput: emptyOutput,
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

  it('renders comparison metrics table, unmatched badge, and handles null selisihPercent', () => {
    render(<FinanceComparisonView {...baseProps} />);
    expect(screen.getByText('Metrik Finansial Utama')).toBeInTheDocument();
    expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
    expect(screen.getByText('HPP')).toBeInTheDocument();

    // Check unmatched badge for 'expense:Pupuk' -> cleaned label 'Pupuk'
    expect(screen.getByText('Pupuk')).toBeInTheDocument();
    expect(screen.getByText('Hanya di Realisasi')).toBeInTheDocument();

    // Check null selisihPercent rendered as '—'
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});
