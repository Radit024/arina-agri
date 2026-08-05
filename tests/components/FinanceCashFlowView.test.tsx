import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import FinanceCashFlowView from '@/app/dashboard/keuangan/_components/FinanceCashFlowView';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';

const theme = createTheme();

type FinanceReports = UseKeuanganControllerResult['financeReports'];

function makeFinanceReports(overrides: Partial<FinanceReports> = {}): FinanceReports {
  return {
    reportTransactions: [],
    reportStartMonth: '2026-06',
    reportEndMonth: '2026-07',
    labaRugi: { totalPendapatan: 0, totalPengeluaran: 0, labaRugi: 0 },
    arusKasBulanan: [
      { bulan: '2026-06', kasMasuk: 6_500_000, kasKeluar: 200_000, kasBersih: 6_300_000, kasKumulatif: 6_300_000 },
      { bulan: '2026-07', kasMasuk: 0, kasKeluar: 500_000, kasBersih: -500_000, kasKumulatif: 5_800_000 },
    ],
    ...overrides,
  } as unknown as FinanceReports;
}

function renderView(financeReports = makeFinanceReports()) {
  return render(
    <ThemeProvider theme={theme}>
      <FinanceCashFlowView financeReports={financeReports} />
    </ThemeProvider>,
  );
}

describe('FinanceCashFlowView', () => {
  it('renders the monthly cash-flow table with correct data for each row', () => {
    renderView();

    expect(screen.getByText('Arus Kas Bulanan')).toBeInTheDocument();
    expect(screen.getByText(/Periode/)).toBeInTheDocument();

    expect(screen.getAllByText('+Rp 6.500.000').length).toBeGreaterThan(0);
    expect(screen.getByText('−Rp 200.000')).toBeInTheDocument();
    expect(screen.getAllByText('−Rp 500.000').length).toBeGreaterThan(0);
  });

  it('renders totals in the table footer', () => {
    renderView();

    // Total inflow = 6.500.000, total outflow = 700.000, net = 5.800.000
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('−Rp 700.000')).toBeInTheDocument();
  });

  it('shows a surplus chip when the net cash flow is positive', () => {
    renderView();

    expect(screen.getByText(/Surplus/)).toBeInTheDocument();
  });

  it('shows a deficit chip when the net cash flow is negative', () => {
    renderView(
      makeFinanceReports({
        arusKasBulanan: [
          { bulan: '2026-06', kasMasuk: 100_000, kasKeluar: 900_000, kasBersih: -800_000, kasKumulatif: -800_000 },
        ],
      }),
    );

    expect(screen.getByText(/Defisit/)).toBeInTheDocument();
  });

  it('renders an empty state when there is no cash-flow data', () => {
    renderView(makeFinanceReports({ arusKasBulanan: [] }));

    expect(screen.getByText('Belum ada data arus kas')).toBeInTheDocument();
    expect(screen.getByText('Tambahkan transaksi untuk melihat arus kas bulanan.')).toBeInTheDocument();
  });
});
