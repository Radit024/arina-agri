import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import KeuanganView from '@/app/dashboard/keuangan/_components/KeuanganView';
import type { ApiTransaction } from '@/lib/api';
import { darkTheme } from '@/lib/theme';

vi.mock('next/dynamic', () => ({
  default: () => function DynamicChartStub() {
    return <div data-testid="finance-pie-chart" />;
  },
}));

const theme = createTheme();

type KeuanganViewProps = ComponentProps<typeof KeuanganView>;

type TransactionFormData = {
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: string;
  tanggal: string;
  keterangan?: string;
};

const transaction: ApiTransaction = {
  _id: 'tx-1',
  jenis: 'pengeluaran',
  kategori: 'pupuk',
  nominal: 50000,
  tanggal: '2026-06-05',
  keterangan: '',
  createdAt: '2026-06-05T00:00:00.000Z',
  updatedAt: '2026-06-05T00:00:00.000Z',
};

const labels: Record<string, string> = {
  title: 'Manajemen Keuangan',
  subtitle: 'Pantau arus kas kebun Anda',
  exportCsv: 'Ekspor Laporan',
  'buttons.hppBep': 'Perhitungan HPP & BEP',
  'buttons.addTransaction': 'Catat Transaksi',
  'common.income': 'Pemasukan',
  'common.expense': 'Pengeluaran',
  'common.cancel': 'Batal',
  'filters.month': 'Filter Bulan',
  'filters.type': 'Filter Tipe',
  'filters.allMonths': 'Semua Bulan',
  'filters.allTypes': 'Semua',
  'ledger.title': 'Buku Besar Transaksi',
  'ledger.subheader': '{count} transaksi ditampilkan',
  'ledger.empty': 'Belum ada transaksi',
  'ledger.addFirst': 'Tambah transaksi pertama',
  'ledger.columns.date': 'Tanggal',
  'ledger.columns.category': 'Kategori',
  'ledger.columns.note': 'Catatan',
  'ledger.columns.type': 'Jenis',
  'ledger.columns.value': 'Nominal',
  'ledger.columns.action': 'Aksi',
  'summary.title': 'Ringkasan',
  'summary.totalIncome': 'Total Pemasukan',
  'summary.totalExpense': 'Total Pengeluaran',
  'summary.netProfit': 'Laba Bersih',
  'summary.deficit': 'Defisit',
  'distribution.title': 'Distribusi Pengeluaran',
  'distribution.empty': 'Kosong',
  'categories.fertilizer': 'Pupuk',
  'categories.pesticide': 'Pestisida',
  'categories.labor': 'Tenaga Kerja',
  'categories.irrigation': 'Irigasi',
  'categories.tools': 'Alat Tani',
  'categories.other': 'Lainnya',
  'categories.harvestSales': 'Penjualan Panen',
  'categories.service': 'Layanan Jasa',
  'transactionDialog.addTitle': 'Catat Transaksi Baru',
  'transactionDialog.editTitle': 'Edit Transaksi',
  'transactionDialog.addSubtitle': 'Masukkan data transaksi',
  'transactionDialog.editSubtitle': 'Perbarui data transaksi',
  'transactionDialog.fields.type': 'Jenis Transaksi',
  'transactionDialog.fields.date': 'Tanggal',
  'transactionDialog.fields.category': 'Kategori',
  'transactionDialog.fields.amount': 'Nominal',
  'transactionDialog.fields.note': 'Catatan',
  'transactionDialog.fields.notePlaceholder': 'Catatan tambahan',
  'transactionDialog.options.income': 'Pemasukan',
  'transactionDialog.options.expense': 'Pengeluaran',
  'transactionDialog.save': 'Simpan Transaksi',
  'transactionDialog.update': 'Perbarui Transaksi',
  'hppDialog.title': 'Perhitungan HPP & BEP',
  'hppDialog.subtitle': 'Hitung biaya produksi',
  'hppDialog.fields.fixedCost': 'Biaya Tetap',
  'hppDialog.fields.totalProduction': 'Jumlah Produksi',
  'hppDialog.fields.unitPrice': 'Harga Jual',
  'hppDialog.results.variableCostTotal': 'Biaya Variabel Total',
  'hppDialog.results.variableCostPerUnit': 'Biaya Variabel per Unit',
  'hppDialog.results.hppPerUnit': 'HPP/Unit',
  'hppDialog.results.bepUnit': 'BEP Unit',
  'hppDialog.results.bepValue': 'BEP Rupiah',
  'hppDialog.results.inputProduction': 'Masukkan produksi',
  'hppDialog.results.notCalculatable': 'Belum bisa dihitung',
  'hppDialog.results.invalidBepUnit': 'Nilai BEP unit tidak valid',
  'reportDialog.title': 'Laporan Keuangan',
  'reportDialog.period': 'Periode',
  'reportDialog.loading': 'Membuat laporan',
  'reportDialog.summary.title': 'Ringkasan Data',
  'reportDialog.summary.transactionCount': 'Jumlah Transaksi',
  'reportDialog.summary.transactions': 'transaksi',
  'reportDialog.manual.title': 'PDF Manual',
  'reportDialog.manual.desc': 'Ekspor laporan manual',
  'reportDialog.manual.button': 'Unduh PDF',
  'reportDialog.ai.title': 'PDF AI',
  'reportDialog.ai.quotaRemaining': 'tersisa',
  'reportDialog.ai.descActive': 'Buat laporan AI',
  'reportDialog.ai.descEmpty': 'Kuota habis',
  'reportDialog.ai.button': 'Buat Laporan AI',
};

function translate(key: string, values?: Record<string, unknown>) {
  const template = labels[key] ?? key;
  if (!values) return template;

  return Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  );
}

function KeuanganViewHarness({ overrides = {} }: { overrides?: Partial<KeuanganViewProps> }) {
  const form = useForm<TransactionFormData>({
    defaultValues: {
      jenis: 'pengeluaran',
      kategori: '',
      nominal: '',
      tanggal: '2026-06-06',
      keterangan: '',
    },
  });
  const activeTheme = overrides.theme ?? theme;

  const props: KeuanganViewProps = {
    t: translate as KeuanganViewProps['t'],
    bepHppInputs: { biayaTetap: 0, jumlahProduksi: 0, hargaJualPerUnit: 0 },
    aiDialogOpen: false,
    setAiDialogOpen: vi.fn(),
    reportLoading: false,
    reportError: null,
    setReportError: vi.fn(),
    bepHppDialogOpen: false,
    setBepHppDialogOpen: vi.fn(),
    txDialogOpen: false,
    setTxDialogOpen: vi.fn(),
    editingId: null,
    setEditingId: vi.fn(),
    deleteConfirmId: null,
    setDeleteConfirmId: vi.fn(),
    snackbar: { open: false, message: '', severity: 'success' },
    setSnackbar: vi.fn(),
    filterBulan: 'semua',
    setFilterBulan: vi.fn(),
    filterJenis: 'semua',
    setFilterJenis: vi.fn(),
    theme: activeTheme,
    isMobile: true,
    control: form.control,
    handleSubmit: form.handleSubmit,
    errors: form.formState.errors,
    selectedJenis: 'pengeluaran',
    kategoriFiltered: ['Pupuk', 'Pestisida', 'Lainnya'],
    openAddDialog: vi.fn(),
    handleEdit: vi.fn(),
    onSubmit: vi.fn(),
    txSubmitting: false,
    handleDelete: vi.fn(),
    handleConfirmDelete: vi.fn(),
    handleNominalChange: vi.fn(),
    handleBepHppInputChange: vi.fn(),
    getBepHppInputDisplayValue: (value) => (value === 0 ? '' : String(value)),
    handleExportExcel: vi.fn(),
    aiQuotaRemaining: 3,
    handleGeneratePdfManual: vi.fn(),
    handleGeneratePdfAI: vi.fn(),
    monthFilteredTransactions: [transaction],
    totalPendapatan: 0,
    totalPengeluaran: transaction.nominal,
    labaBersih: -transaction.nominal,
    jumlahProduksi: 0,
    biayaVariabelTotal: transaction.nominal,
    biayaVariabelPerUnit: 0,
    hppPerUnit: 0,
    marginKontribusiPerUnit: 0,
    bepUnit: null,
    marginKontribusiRasio: null,
    bepRupiah: null,
    formatAngka: (value) => String(value),
    biayaTetapDisplayValue: '',
    hargaJualDisplayValue: '',
    finalPieData: [{ id: 'Kosong', value: 1, label: 'Kosong', color: '#e2e8f0' }],
    finalPieColors: ['#e2e8f0'],
    bulanOptions: ['2026-06'],
    getBulanLabel: () => 'Juni 2026',
    displayedTransactions: [transaction],
    ...overrides,
  };

  return (
    <ThemeProvider theme={activeTheme}>
      <KeuanganView {...props} />
    </ThemeProvider>
  );
}

function renderView(overrides: Partial<KeuanganViewProps> = {}) {
  return render(<KeuanganViewHarness overrides={overrides} />);
}

describe('KeuanganView', () => {
  it('keeps mobile edit and delete actions visible on each transaction card', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    renderView({ handleEdit, handleDelete });

    const editButton = screen.getByRole('button', { name: 'Edit transaksi pupuk' });
    const deleteButton = screen.getByRole('button', { name: 'Hapus transaksi pupuk' });

    expect(editButton).toHaveAttribute('data-touch-target', '44');
    expect(deleteButton).toHaveAttribute('data-touch-target', '44');

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(handleEdit).toHaveBeenCalledWith(transaction);
    expect(handleDelete).toHaveBeenCalledWith(transaction._id);
  });

  it('keeps dark-mode finance action buttons visible before hover', () => {
    const { unmount } = renderView({ theme: darkTheme });

    const editButton = screen.getByRole('button', { name: 'Edit transaksi pupuk' });
    const deleteButton = screen.getByRole('button', { name: 'Hapus transaksi pupuk' });
    const reportButton = screen.getByRole('button', { name: 'Laporan Keuangan' });

    expect(getComputedStyle(editButton).backgroundColor).toBe('rgba(82, 183, 136, 0.28)');
    expect(getComputedStyle(editButton).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(deleteButton).backgroundColor).toBe('rgba(212, 131, 106, 0.24)');
    expect(getComputedStyle(deleteButton).color).toBe('rgb(212, 131, 106)');
    expect(getComputedStyle(reportButton).backgroundColor).toBe('rgba(82, 183, 136, 0.28)');
    expect(getComputedStyle(reportButton).color).toBe('rgb(255, 255, 255)');

    unmount();
    renderView({ theme: darkTheme, aiDialogOpen: true });

    const generateAiButton = screen.getByRole('button', { name: 'Buat Laporan AI' });

    expect(getComputedStyle(generateAiButton).backgroundColor).toBe('rgb(82, 183, 136)');
    expect(getComputedStyle(generateAiButton).color).toBe('rgb(255, 255, 255)');
  });
});
