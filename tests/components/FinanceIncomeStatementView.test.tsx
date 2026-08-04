import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinanceIncomeStatementView from '@/app/dashboard/keuangan/_components/FinanceIncomeStatementView';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
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

describe('FinanceIncomeStatementView (Phase B Scenario-Aware)', () => {
  it('renders summary cards with Total Pendapatan, Total Pengeluaran, and Laba Bersih', () => {
    renderView();

    expect(screen.getByText('Laba Rugi')).toBeInTheDocument();
    expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
    expect(screen.getByText('Total Pengeluaran')).toBeInTheDocument();
    expect(screen.getByText('Laba Bersih')).toBeInTheDocument();

    expect(screen.getByText('Rp 6.500.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 200.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 6.300.000')).toBeInTheDocument();
  });

  it('renders category breakdown when transactions exist', () => {
    renderView();

    expect(screen.getByText('Rincian per Kategori')).toBeInTheDocument();
    expect(screen.getByText('Penjualan Padi')).toBeInTheDocument();
    expect(screen.getByText('Pupuk Urea')).toBeInTheDocument();
  });

  it('renders empty state when there are no transactions', () => {
    renderView([]);

    expect(screen.getByText('Belum ada data transaksi')).toBeInTheDocument();
    expect(
      screen.getByText('Tambahkan transaksi ke skenario ini untuk melihat laporan laba rugi.'),
    ).toBeInTheDocument();
  });

  it('renders Kelayakan Usaha metrics when assumptions are present', () => {
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

    expect(screen.getByText('Kelayakan Usaha (Asumsi Produksi & Penjualan)')).toBeInTheDocument();
    expect(screen.getByText('HPP (Harga Pokok Produksi)')).toBeInTheDocument();
    expect(screen.getByText('BEP Produksi (Batas Impas)')).toBeInTheDocument();
    expect(screen.getByText('B/C Ratio')).toBeInTheDocument();
    expect(screen.getByText('Status Kelayakan')).toBeInTheDocument();
    expect(screen.getByText('UNTUNG')).toBeInTheDocument();
  });
});
