import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinanceIncomeStatementView from '@/app/dashboard/keuangan/_components/FinanceIncomeStatementView';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { buildIncomeStatementWorksheetData } from '@/lib/finance/incomeStatementWorksheet';
import type { FinanceTransactionForReport } from '@/lib/finance/rabTypes';

const theme = createTheme();

type FinanceReports = UseKeuanganControllerResult['financeReports'];
type LabaRugiActions = UseKeuanganControllerResult['labaRugiActions'];

const mockTransactions: FinanceTransactionForReport[] = [
  {
    id: 'tx-1',
    jenis: 'pendapatan',
    kategori: 'Penjualan Padi',
    nominal: 6_500_000,
    tanggal: '2026-06-15',
    keterangan: 'Hasil panen musim ini',
  },
  {
    id: 'tx-2',
    jenis: 'pengeluaran',
    kategori: 'Pupuk Urea',
    nominal: 200_000,
    tanggal: '2026-06-10',
    keterangan: 'Pembelian urea 50kg',
  },
];

function makeFinanceReports(reportTransactions = mockTransactions): FinanceReports {
  const totalPendapatan = reportTransactions
    .filter((tx) => tx.jenis === 'pendapatan')
    .reduce((sum, tx) => sum + tx.nominal, 0);
  const totalPengeluaran = reportTransactions
    .filter((tx) => tx.jenis === 'pengeluaran')
    .reduce((sum, tx) => sum + tx.nominal, 0);

  const incomeStatementWorksheet = buildIncomeStatementWorksheetData({
    transactions: reportTransactions,
    rabItems: [],
  });

  return {
    reportTransactions,
    reportStartMonth: '2026-06',
    reportEndMonth: '2026-06',
    labaRugi: {
      totalPendapatan,
      totalPengeluaran,
      labaRugi: totalPendapatan - totalPengeluaran,
    },
    arusKasBulanan: [],
    incomeStatementWorksheet,
  } as unknown as FinanceReports;
}

function makeLabaRugiActions(): LabaRugiActions {
  return {
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filterJenis: 'semua',
    setFilterJenis: vi.fn(),
  } as unknown as LabaRugiActions;
}

function renderView(reportTransactions = mockTransactions) {
  return render(
    <ThemeProvider theme={theme}>
      <FinanceIncomeStatementView
        financeReports={makeFinanceReports(reportTransactions)}
        labaRugiActions={makeLabaRugiActions()}
      />
    </ThemeProvider>,
  );
}

describe('FinanceIncomeStatementView (Modern Grouped Layout)', () => {
  it('renders grouped panels with Pengeluaran, Pendapatan, and Ringkasan Laba / Rugi', () => {
    renderView();

    expect(screen.getByTestId('income-statement-card')).toBeInTheDocument();
    expect(screen.getByTestId('income-statement-expense-panel')).toBeInTheDocument();
    expect(screen.getByTestId('income-statement-income-panel')).toBeInTheDocument();
    expect(screen.getByTestId('income-statement-summary-panel')).toBeInTheDocument();

    expect(screen.getAllByText('Total Pendapatan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Total Pengeluaran').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Ringkasan Laba / Rugi')).toBeInTheDocument();

    expect(screen.getAllByText('Rp 6.500.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rp 200.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Rp 6.300.000')).toBeInTheDocument();
  });

  it('renders category and item labels when transactions exist', () => {
    renderView();

    expect(screen.getAllByText('Pendapatan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hasil panen musim ini')).toBeInTheDocument();
    expect(screen.getByText('Pupuk Urea')).toBeInTheDocument();
    expect(screen.getByText('Pembelian urea 50kg')).toBeInTheDocument();
  });

  it('renders empty state when there are no transactions', () => {
    renderView([]);

    expect(screen.getByText('Belum ada data transaksi')).toBeInTheDocument();
    expect(
      screen.getByText('Tambahkan transaksi pengeluaran atau pendapatan untuk melihat laporan laba rugi.'),
    ).toBeInTheDocument();
  });

  it('renders Kelayakan Usaha strip when assumptions are present', () => {
    const customReports = {
      ...makeFinanceReports(),
      kelayakanUsaha: {
        totalBiayaProduksi: 200_000,
        produksi: 1000,
        satuan: 'kg',
        hargaJual: 6500,
        penerimaan: 6_500_000,
        hpp: 200,
        bepProduksi: 30.77,
        bcRatio: 31.5,
        kelayakanStatus: 'untung' as const,
      },
    };

    render(
      <ThemeProvider theme={theme}>
        <FinanceIncomeStatementView
          financeReports={customReports}
          labaRugiActions={makeLabaRugiActions()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Kelayakan Usaha')).toBeInTheDocument();
    expect(screen.getByText('HPP')).toBeInTheDocument();
    expect(screen.getByText('BEP Produksi')).toBeInTheDocument();
    expect(screen.getByText('B/C Ratio')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('UNTUNG')).toBeInTheDocument();
  });
});
