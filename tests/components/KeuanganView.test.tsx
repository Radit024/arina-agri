import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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
  'hppDialog.title': 'Analisis Kelayakan Usaha',
  'hppDialog.subtitle': 'Perencanaan bisnis sebelum musim tanam',
  'hppDialog.fields.totalBiaya': 'Estimasi Total Biaya',
  'hppDialog.fields.totalBiayaHelper': 'Semua biaya produksi',
  'hppDialog.fields.proyeksiPanen': 'Proyeksi Hasil Panen',
  'hppDialog.fields.proyeksiPanenHelper': 'Perkiraan total panen (kg)',
  'hppDialog.fields.targetHargaJual': 'Target Harga Jual',
  'hppDialog.fields.targetHargaJualHelper': 'Isi harga jual atau margin, keduanya saling otomatis',
  'hppDialog.fields.targetMargin': 'Mark-up (%)',
  'hppDialog.fields.targetMarginHelper': 'Keuntungan dari modal — isi mark-up atau harga jual, keduanya saling otomatis',
  'hppDialog.results.hpp': 'HPP/kg',
  'hppDialog.results.bepKg': 'BEP (kg)',
  'hppDialog.results.bepRupiah': 'BEP (Rp)',
  'hppDialog.results.proyeksiLaba': 'Proyeksi Laba',
  'hppDialog.results.inputRequired': 'Lengkapi input',
  'hppDialog.results.layak': 'Usaha ini layak dijalankan',
  'hppDialog.results.tidakLayak': 'Proyeksi panen tidak mencukupi BEP',
  'hppDialog.results.kurangPanen': 'Perlu tambah {kg} kg lagi untuk mencapai BEP',
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

function makeTransactionBatch(overrides: Record<string, unknown> = {}) {
  return {
    dialogOpen: false,
    drafts: [],
    expandedDraftId: null,
    stage: 'input' as const,
    submitting: false,
    editingTransactionId: null,
    draftErrors: {},
    closeConfirmOpen: false,
    submitResults: null,
    openForCreate: vi.fn(),
    openForEdit: vi.fn(),
    requestClose: vi.fn(),
    closeDialog: vi.fn(),
    setCloseConfirmOpen: vi.fn(),
    updateDraftField: vi.fn(),
    expandDraft: vi.fn(),
    addDraft: vi.fn(),
    removeDraft: vi.fn(),
    goToConfirm: vi.fn(),
    goBackToInput: vi.fn(),
    submitAll: vi.fn(),
    rabSuggestion: null,
    getRabLinkForDraft: vi.fn(),
    ...overrides,
  };
}

function makeTransactionMaster() {
  return {
    customKategori: [],
    customSatuan: [],
    kategoriDialogOpen: false,
    setKategoriDialogOpen: vi.fn(),
    satuanDialogOpen: false,
    setSatuanDialogOpen: vi.fn(),
    deleteKategoriError: null,
    setDeleteKategoriError: vi.fn(),
    deleteSatuanError: null,
    setDeleteSatuanError: vi.fn(),
    allKategori: vi.fn(() => [] as string[]),
    allSatuan: [] as string[],
    addKategori: vi.fn(),
    renameKategori: vi.fn(),
    deleteKategori: vi.fn(),
    addSatuan: vi.fn(),
    renameSatuan: vi.fn(),
    deleteSatuan: vi.fn(),
  };
}

function KeuanganViewHarness({ overrides = {} }: { overrides?: Partial<KeuanganViewProps> }) {
  const activeTheme = overrides.theme ?? theme;

  const props: KeuanganViewProps = {
    t: translate as KeuanganViewProps['t'],
    bepHppInputs: { totalBiaya: 0, proyeksiPanen: 0, targetHargaJual: 0, targetMargin: 0 },
    aiDialogOpen: false,
    setAiDialogOpen: vi.fn(),
    reportLoading: false,
    reportError: null,
    setReportError: vi.fn(),
    bepHppDialogOpen: false,
    setBepHppDialogOpen: vi.fn(),
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
    handleDelete: vi.fn(),
    handleConfirmDelete: vi.fn(),
    handleBepHppInputChange: vi.fn(),
    getBepHppInputDisplayValue: (value) => (value === 0 ? '' : String(value)),
    handleExportExcel: vi.fn(),
    aiQuotaRemaining: 3,
    handleGeneratePdfManual: vi.fn(),
    handleGeneratePdfAI: vi.fn(),
    transactionBatch: makeTransactionBatch() as KeuanganViewProps['transactionBatch'],
    transactionMaster: makeTransactionMaster() as KeuanganViewProps['transactionMaster'],
    monthFilteredTransactions: [transaction],
    totalPendapatan: 0,
    totalPengeluaran: transaction.nominal,
    labaBersih: -transaction.nominal,
    bfaHpp: null,
    bfaBepKg: null,
    bfaBepRupiah: null,
    bfaProyeksiLaba: null,
    bfaLayak: false,
    finalPieData: [{ id: 'Kosong', value: 1, label: 'Kosong', color: '#e2e8f0' }],
    finalPieColors: ['#e2e8f0'],
    bulanOptions: ['2026-06'],
    getBulanLabel: () => 'Juni 2026',
    displayedTransactions: [transaction],
    financeTab: 'buku-besar',
    setFinanceTab: vi.fn(),
    financeProject: {
      projects: [],
      activeProjects: [],
      loading: false,
      error: null,
      backendOnline: false,
      reload: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      selectedProjectId: null,
      setSelectedProjectId: vi.fn(),
      selectedProject: null,
      projectDialogOpen: false,
      setProjectDialogOpen: vi.fn(),
    },
    rab: {
      categories: [],
      items: [],
      imports: [],
      loading: false,
      error: null,
      backendOnline: false,
      reload: vi.fn(),
      createCategory: vi.fn(),
      createItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      replaceRab: vi.fn(),
      rabItemDialogOpen: false,
      setRabItemDialogOpen: vi.fn(),
      importDialogOpen: false,
      setImportDialogOpen: vi.fn(),
      importLoading: false,
      importError: null,
      setImportError: vi.fn(),
      totals: { plannedIncome: 0, plannedExpense: 0, plannedProfit: 0 },
      addRabItem: vi.fn(),
      importRabFile: vi.fn(),
    },
    financeReports: {
      reportTransactions: [],
      reportStartMonth: '2026-06',
      reportEndMonth: '2026-06',
      incomeStatementComparison: {
        rows: [],
        summary: {
          plannedIncome: 0,
          plannedExpense: 0,
          plannedProfit: 0,
          actualIncome: 0,
          actualExpense: 0,
          actualProfit: 0,
          profitVariance: 0,
          profitVariancePercent: null,
        },
      },
      cashFlowComparison: {
        rows: [],
        summary: {
          plannedInflow: 0,
          actualInflow: 0,
          plannedOutflow: 0,
          actualOutflow: 0,
          plannedNet: 0,
          actualNet: 0,
          variance: 0,
          variancePercent: null,
        },
      },
    },
    financeExport: {
      exportLoading: false,
      exportError: null,
      setExportError: vi.fn(),
      handleExportFinanceWorkbook: vi.fn(),
    },
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
    const openForEdit = vi.fn();
    const handleDelete = vi.fn();
    renderView({
      handleDelete,
      transactionBatch: makeTransactionBatch({ openForEdit }) as KeuanganViewProps['transactionBatch'],
    });

    const editButton = screen.getByRole('button', { name: 'Edit transaksi pupuk' });
    const deleteButton = screen.getByRole('button', { name: 'Hapus transaksi pupuk' });

    expect(editButton).toHaveAttribute('data-touch-target', '44');
    expect(deleteButton).toHaveAttribute('data-touch-target', '44');

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(openForEdit).toHaveBeenCalledWith(transaction);
    expect(handleDelete).toHaveBeenCalledWith(transaction._id);
  });

  it('menampilkan 4 input field BFA ketika dialog dibuka', () => {
    renderView({ bepHppDialogOpen: true });

    expect(screen.getByLabelText('Estimasi Total Biaya')).toBeInTheDocument();
    expect(screen.getByLabelText('Proyeksi Hasil Panen')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Harga Jual')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark-up (%)')).toBeInTheDocument();
  });

  it('menampilkan verdict layak ketika bfaLayak = true', () => {
    renderView({
      bepHppDialogOpen: true,
      bfaHpp: 15000,
      bfaBepKg: 33.3,
      bfaBepRupiah: 22500000,
      bfaProyeksiLaba: 2250000,
      bfaLayak: true,
      bepHppInputs: { totalBiaya: 1500000, proyeksiPanen: 100, targetHargaJual: 45000, targetMargin: 200 },
    });

    expect(screen.getByText('Usaha ini layak dijalankan')).toBeInTheDocument();
  });

  it('menampilkan verdict tidak layak beserta sisa kg yang dibutuhkan', () => {
    renderView({
      bepHppDialogOpen: true,
      bfaHpp: 15000,
      bfaBepKg: 100,
      bfaBepRupiah: null,
      bfaProyeksiLaba: -750000,
      bfaLayak: false,
      bepHppInputs: { totalBiaya: 1500000, proyeksiPanen: 50, targetHargaJual: 15000, targetMargin: 0 },
    });

    expect(screen.getByText('Proyeksi panen tidak mencukupi BEP')).toBeInTheDocument();
    expect(screen.getByText(/Perlu tambah 50.0 kg/)).toBeInTheDocument();
  });

  it('menampilkan margin input dengan nilai yang tersimpan', () => {
    renderView({
      bepHppDialogOpen: true,
      bepHppInputs: { totalBiaya: 1500000, proyeksiPanen: 100, targetHargaJual: 45000, targetMargin: 200 },
    });

    const marginInput = screen.getByLabelText('Mark-up (%)') as HTMLInputElement;
    expect(marginInput.value).toBe('200');
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
