import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinanceCashFlowView, {
  type FinanceCashFlowReportData,
  type FinanceCashFlowViewProps,
} from '@/app/dashboard/keuangan/_components/FinanceCashFlowView';

const theme = createTheme();

function makeFinanceReports(overrides: Partial<FinanceCashFlowReportData> = {}): FinanceCashFlowReportData {
  return {
    reportTransactions: [],
    reportStartMonth: '2026-06',
    reportEndMonth: '2026-07',
    arusKasBulanan: [
      { bulan: '2026-06', kasMasuk: 6_500_000, kasKeluar: 200_000, kasBersih: 6_300_000, kasKumulatif: 6_300_000 },
      { bulan: '2026-07', kasMasuk: 0, kasKeluar: 500_000, kasBersih: -500_000, kasKumulatif: 5_800_000 },
    ],
    ...overrides,
  };
}

function renderView(overrides: Partial<FinanceCashFlowViewProps> = {}) {
  const props: FinanceCashFlowViewProps = {
    financeReports: makeFinanceReports(),
    canAddTransaction: true,
    onAddTransaction: vi.fn(),
    onCreateProject: vi.fn(),
    ...overrides,
  };

  return render(
    <ThemeProvider theme={theme}>
      <FinanceCashFlowView {...props} />
    </ThemeProvider>,
  );
}

describe('FinanceCashFlowView', () => {
  it('renders the monthly cash-flow table with correct data for each row', () => {
    renderView();

    expect(screen.getByText('Arus Kas Bulanan')).toBeInTheDocument();
    expect(screen.getByText(/Periode/)).toBeInTheDocument();

    expect(screen.getAllByText('+Rp 6.500.000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('−Rp 200.000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('−Rp 500.000').length).toBeGreaterThan(0);
  });

  it('renders totals in the table footer', () => {
    renderView();

    // Total inflow = 6.500.000, total outflow = 700.000, net = 5.800.000
    const table = screen.getByRole('table', { name: 'Arus kas bulanan' });
    expect(within(table).getByText('Total')).toBeInTheDocument();
    expect(within(table).getByText('−Rp 700.000')).toBeInTheDocument();
  });

  it('shows a surplus chip when the net cash flow is positive', () => {
    renderView();

    expect(screen.getByText(/Surplus/)).toBeInTheDocument();
  });

  it('shows a deficit chip when the net cash flow is negative', () => {
    renderView(
      {
        financeReports: makeFinanceReports({
          arusKasBulanan: [
            { bulan: '2026-06', kasMasuk: 100_000, kasKeluar: 900_000, kasBersih: -800_000, kasKumulatif: -800_000 },
          ],
        }),
      },
    );

    expect(screen.getByText(/Defisit/)).toBeInTheDocument();
  });

  it('renders mobile metrics for cash inflow, outflow, and the final balance', () => {
    renderView();

    expect(screen.getByRole('region', { name: 'Kas Masuk' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Kas Keluar' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Saldo Akhir' })).toBeInTheDocument();
  });

  it('labels the desktop expand control with the relevant month', () => {
    renderView();

    const expandButton = screen.getByRole('button', { name: 'Buka detail transaksi Juni 2026' });
    expect(expandButton).toHaveStyle({ minHeight: '44px', minWidth: '44px' });
  });

  it('uses the transaction CTA for a selected project with no cash-flow data', () => {
    const onAddTransaction = vi.fn();
    renderView({
      financeReports: makeFinanceReports({ arusKasBulanan: [] }),
      onAddTransaction,
    });

    expect(screen.getByText('Belum ada data arus kas')).toBeInTheDocument();
    expect(screen.getByText('Catat transaksi pertama untuk melihat arus kas bulanan.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Kas Masuk' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Catat Transaksi' }));
    expect(onAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('uses the project CTA when a project has not been selected', () => {
    const onCreateProject = vi.fn();
    renderView({
      canAddTransaction: false,
      financeReports: makeFinanceReports({ arusKasBulanan: [] }),
      onCreateProject,
    });

    expect(screen.getByText('Buat proyek terlebih dahulu untuk mulai mencatat arus kas.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Buat Proyek' }));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });
});
