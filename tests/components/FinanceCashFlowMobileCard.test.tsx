import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import FinanceCashFlowMobileCard from '@/app/dashboard/keuangan/_components/FinanceCashFlowMobileCard';
import type { ArusKasBulanan, FinanceTransactionForReport } from '@/lib/finance/rabTypes';

const theme = createTheme();

const row: ArusKasBulanan = {
  bulan: '2026-06',
  kasMasuk: 6_500_000,
  kasKeluar: 200_000,
  kasBersih: 6_300_000,
  kasKumulatif: 6_300_000,
};

const transactions: FinanceTransactionForReport[] = [
  {
    id: 'income-june',
    jenis: 'pendapatan',
    kategori: 'Penjualan Padi',
    nominal: 6_500_000,
    tanggal: '2026-06-15',
    keterangan: 'Hasil panen',
  },
  {
    id: 'expense-june',
    jenis: 'pengeluaran',
    kategori: 'Pupuk',
    nominal: 200_000,
    tanggal: '2026-06-10',
  },
  {
    id: 'expense-july',
    jenis: 'pengeluaran',
    kategori: 'Irigasi',
    nominal: 500_000,
    tanggal: '2026-07-02',
    keterangan: 'Biaya bulan berikutnya',
  },
];

function renderCard(overrides: Partial<React.ComponentProps<typeof FinanceCashFlowMobileCard>> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <FinanceCashFlowMobileCard row={row} transactions={transactions} {...overrides} />
    </ThemeProvider>,
  );
}

describe('FinanceCashFlowMobileCard', () => {
  it('renders an accessible monthly article with all cash-flow labels', () => {
    renderCard();

    const article = screen.getByRole('article', { name: 'Arus kas Juni 2026' });
    expect(article).toBeInTheDocument();
    expect(within(article).getByText('Kas Masuk')).toBeInTheDocument();
    expect(within(article).getByText('Kas Keluar')).toBeInTheDocument();
    expect(within(article).getByText('Kas Bersih')).toBeInTheDocument();
    expect(within(article).getByText('Kumulatif')).toBeInTheDocument();
    expect(within(article).getAllByText('+Rp 6.500.000').length).toBeGreaterThan(0);
    expect(within(article).getAllByText('−Rp 200.000').length).toBeGreaterThan(0);
  });

  it('shows only transactions for its month in the accessible accordion detail', () => {
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Detail transaksi Juni 2026' }));

    const transactionList = screen.getByRole('list', { name: 'Transaksi Juni 2026' });
    expect(within(transactionList).getByText('Penjualan Padi')).toBeInTheDocument();
    expect(within(transactionList).getByText('Pupuk')).toBeInTheDocument();
    expect(within(transactionList).getByText('Hasil panen')).toBeInTheDocument();
    expect(within(transactionList).getByText('-')).toBeInTheDocument();
    expect(within(transactionList).queryByText('Irigasi')).not.toBeInTheDocument();
    expect(within(transactionList).queryByText('Biaya bulan berikutnya')).not.toBeInTheDocument();
  });

  it('explains when the selected month has no transactions', () => {
    renderCard({ transactions: [] });

    fireEvent.click(screen.getByRole('button', { name: 'Detail transaksi Juni 2026' }));

    expect(screen.getByText('Tidak ada transaksi di bulan ini.')).toBeInTheDocument();
  });
});
