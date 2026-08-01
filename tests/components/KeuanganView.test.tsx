import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import KeuanganView from '@/app/dashboard/keuangan/_components/KeuanganView';
import type { ApiTransaction } from '@/lib/api';
import type { RabItem } from '@/lib/finance/rabTypes';
import { darkTheme } from '@/lib/theme';

vi.mock('next/dynamic', () => ({
  default: () => function DynamicChartStub(props: { highlightedItem?: unknown; onHighlightChange?: unknown; series?: Array<{ id?: string }> }) {
    const highlightedItemState = Object.prototype.hasOwnProperty.call(props, 'highlightedItem')
      ? props.highlightedItem === null ? 'null' : 'set'
      : 'missing';

    return (
      <div
        data-testid="finance-pie-chart"
        data-highlighted-item={highlightedItemState}
        data-has-on-highlight-change={typeof props.onHighlightChange === 'function' ? 'true' : 'false'}
        data-series-id={props.series?.[0]?.id ?? ''}
      />
    );
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
  keterangan: 'Pembelian urea',
  volume: 2,
  satuan: 'kg',
  hargaSatuan: 25000,
  createdAt: '2026-06-05T00:00:00.000Z',
  updatedAt: '2026-06-05T00:00:00.000Z',
};

const financeProject = {
  id: 'project-padi-1',
  name: 'Padi 1 Ha',
  commodity: 'Padi',
  landArea: 1,
  landAreaUnit: 'Ha',
  seasonLabel: 'Musim Tanam 2026',
  startDate: '2026-06-01',
  endDate: '2026-09-30',
  status: 'active' as const,
};

const rabItem: RabItem = {
  id: 'rab-pupuk',
  projectId: financeProject.id,
  categoryId: 'rab-cat-saprodi',
  categoryName: 'Saprodi',
  type: 'expense',
  name: 'Pupuk Urea',
  volume: 10,
  unit: 'karung',
  unitPrice: 200000,
  plannedTotal: 2000000,
  plannedCashMonth: '2026-06',
  aliases: ['urea'],
  sortOrder: 1,
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
  'ledger.columns.quantity': 'Volume',
  'ledger.columns.unit': 'Satuan',
  'ledger.columns.unitPrice': 'Harga Satuan',
  'ledger.columns.note': 'Catatan',
  'ledger.columns.type': 'Jenis',
  'ledger.columns.value': 'Nominal (Rp)',
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
    submitEdit: vi.fn(),
    rabSuggestion: null,
    getRabLinkForDraft: vi.fn(),
    ...overrides,
  };
}

function makeRab(overrides: Record<string, unknown> = {}) {
  return {
    categories: [],
    items: [],
    imports: [],
    loading: false,
    error: null,
    backendOnline: false,
    reload: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
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
    rabItemError: null,
    setRabItemError: vi.fn(),
    rabItemDraft: {
      categoryName: 'Saprodi',
      type: 'expense',
      name: '',
      volume: '1',
      unit: 'Unit',
      unitPrice: '',
      plannedCashMonth: '',
      aliases: '',
    },
    rabItemPlannedTotal: 0,
    rabItemSubmitting: false,
    rabCategoryOptions: ['Saprodi', 'Tenaga Kerja'],
    rabCategoryDialogOpen: false,
    setRabCategoryDialogOpen: vi.fn(),
    rabCategoryDialogItems: [],
    rabCategoryDeleteError: null,
    setRabCategoryDeleteError: vi.fn(),
    addRabCategory: vi.fn(async () => null),
    renameRabCategory: vi.fn(),
    deleteRabCategory: vi.fn(),
    updateRabItemDraftField: vi.fn(),
    openRabItemDialog: vi.fn(),
    openRabItemEditDialog: vi.fn(),
    closeRabItemDialog: vi.fn(),
    editingRabItemId: null,
    totals: { plannedIncome: 0, plannedExpense: 0, plannedProfit: 0 },
    addRabItem: vi.fn(),
    updateRabItem: vi.fn(),
    deleteRabItem: vi.fn(),
    rabItemDeleteError: null,
    setRabItemDeleteError: vi.fn(),
    submitRabItemDraft: vi.fn(),
    importRabFile: vi.fn(),
    filteredRabItems: [],
    rabSearchQuery: '',
    setRabSearchQuery: vi.fn(),
    rabFilterJenis: 'semua' as const,
    setRabFilterJenis: vi.fn(),
    selectedRabItemIds: [],
    toggleSelectRabItem: vi.fn(),
    clearRabItemSelection: vi.fn(),
    rabBulkDeleteConfirm: false,
    setRabBulkDeleteConfirm: vi.fn(),
    handleBulkDeleteRabItems: vi.fn(),
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

function makeRabTransactionLink(overrides: Record<string, unknown> = {}) {
  return {
    dialogOpen: false,
    targetTransactionIds: [],
    targetTransactions: [],
    targetRabType: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    submitting: false,
    linkError: null,
    filteredRabOptions: [],
    openForTransactions: vi.fn(),
    closeDialog: vi.fn(),
    linkToRabItem: vi.fn(async () => ({ success: 0, failed: 0 })),
    getLinkedRabItem: vi.fn(() => null),
    ...overrides,
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
    aiQuotaRemaining: 3,
    handleOpenFinanceReportDialog: vi.fn(),
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
    finalPieData: [{ id: 'Kosong', value: 1, label: 'Kosong', color: '#e2e8f0', percentage: 0 }],
    finalPieColors: ['#e2e8f0'],
    bulanOptions: ['2026-06'],
    getBulanLabel: () => 'Juni 2026',
    displayedTransactions: [transaction],
    pagedTransactions: [transaction],
    ledgerPage: 1,
    setLedgerPage: vi.fn(),
    ledgerTotalPages: 1,
    financeAccess: {
      hasSelectedProject: true,
      hasProjectData: true,
      canInputFinance: true,
      canExportFinance: true,
    },
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
    rab: makeRab() as KeuanganViewProps['rab'],
    rabTransactionLink: makeRabTransactionLink() as KeuanganViewProps['rabTransactionLink'],
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
    labaRugiActions: {
      filteredRows: [],
      searchQuery: '',
      setSearchQuery: vi.fn(),
      filterJenis: 'semua' as const,
      setFilterJenis: vi.fn(),
      selectedItemIds: [],
      toggleSelect: vi.fn(),
      clearSelection: vi.fn(),
      bulkDeleteConfirm: false,
      setBulkDeleteConfirm: vi.fn(),
      handleBulkDelete: vi.fn(),
      editRow: vi.fn(),
      deleteTargetRow: null,
      setDeleteTargetRow: vi.fn(),
      confirmDeleteRow: vi.fn(),
    },
    financeExport: {
      exportLoading: false,
      exportError: null,
      setExportError: vi.fn(),
      handleExportFinanceWorkbook: vi.fn(),
    },
    searchQuery: '',
    setSearchQuery: vi.fn(),
    sortColumn: 'tanggal' as const,
    sortDir: 'desc' as const,
    toggleSort: vi.fn(),
    selectedTxIds: [],
    toggleSelectTx: vi.fn(),
    clearSelectionTxs: vi.fn(),
    bulkDeleteConfirm: false,
    setBulkDeleteConfirm: vi.fn(),
    handleBulkDeleteConfirm: vi.fn(),
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
  it('membuat seluruh panel tab keuangan mengisi tinggi konten', () => {
    const panels: Array<[KeuanganViewProps['financeTab'], string, string]> = [
      ['buku-besar', 'finance-panel-buku-besar', 'Buku Besar Transaksi'],
      ['rab', 'finance-panel-rab', 'Belum ada proyek'],
      ['laba-rugi', 'finance-panel-laba-rugi', 'Laba Rugi Rencana vs Aktual'],
      ['arus-kas', 'finance-panel-arus-kas', 'Arus Kas Rencana vs Aktual'],
    ];

    for (const [financeTab, testId, visibleTitle] of panels) {
      const { unmount } = renderView({ financeTab });

      expect(screen.getByTestId(testId)).toHaveAttribute('data-finance-fill-height', 'true');
      expect(screen.getByText(visibleTitle)).toBeInTheDocument();

      unmount();
    }
  });

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

  it('menampilkan rincian input transaksi pada ledger', () => {
    renderView();

    expect(screen.getByRole('columnheader', { name: 'Volume Harga Satuan' })).toBeInTheDocument();
    expect(screen.getAllByText('5 Juni 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Volume').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Satuan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Harga Satuan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('kg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pembelian urea').length).toBeGreaterThan(0);
    expect(screen.getAllByText((text) => text.includes('25.000')).length).toBeGreaterThan(0);
    expect(screen.getByText('2 kg')).toBeInTheDocument();
  });

  it('menampilkan tombol aksi desktop hanya ketika transaksi dipilih', () => {
    const openForEdit = vi.fn();
    const handleDelete = vi.fn();
    const toggleSelectTx = vi.fn();

    const { unmount } = renderView({
      isMobile: false,
      handleDelete,
      toggleSelectTx,
      transactionBatch: makeTransactionBatch({ openForEdit }) as KeuanganViewProps['transactionBatch'],
    });

    const table = screen.getByRole('table');
    expect(within(table).queryByRole('columnheader', { name: 'Aksi' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Edit transaksi pupuk' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Hapus transaksi pupuk' })).not.toBeInTheDocument();

    unmount();
    renderView({
      isMobile: false,
      handleDelete,
      toggleSelectTx,
      selectedTxIds: [transaction._id],
      transactionBatch: makeTransactionBatch({ openForEdit }) as KeuanganViewProps['transactionBatch'],
    });

    const selectedTable = screen.getByRole('table');
    const editButton = within(selectedTable).getByRole('button', { name: 'Edit transaksi pupuk' });
    const deleteButton = within(selectedTable).getByRole('button', { name: 'Hapus transaksi pupuk' });

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(openForEdit).toHaveBeenCalledWith(transaction);
    expect(handleDelete).toHaveBeenCalledWith(transaction._id);
    expect(toggleSelectTx).not.toHaveBeenCalled();
  });

  it('menampilkan tombol hubungkan RAB pada bar transaksi terpilih', () => {
    const openForTransactions = vi.fn();

    renderView({
      isMobile: false,
      selectedTxIds: [transaction._id],
      rabTransactionLink: makeRabTransactionLink({
        openForTransactions,
      }) as KeuanganViewProps['rabTransactionLink'],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Hubungkan RAB' }));

    expect(openForTransactions).toHaveBeenCalledWith([transaction._id]);
  });

  it('menampilkan daftar RAB yang bisa dipilih pada dialog hubungkan RAB', () => {
    const linkToRabItem = vi.fn(async () => ({ success: 1, failed: 0 }));

    renderView({
      rabTransactionLink: makeRabTransactionLink({
        dialogOpen: true,
        targetTransactionIds: [transaction._id],
        targetTransactions: [transaction],
        targetRabType: 'expense',
        filteredRabOptions: [{ item: rabItem, isSuggested: true }],
        linkToRabItem,
      }) as KeuanganViewProps['rabTransactionLink'],
    });

    expect(screen.getByRole('heading', { name: 'Hubungkan RAB' })).toBeInTheDocument();
    expect(screen.getByText('Pupuk Urea')).toBeInTheDocument();
    expect(screen.getByText('Disarankan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hubungkan RAB Pupuk Urea' }));
    expect(linkToRabItem).toHaveBeenCalledWith(rabItem);
  });

  it('menampilkan badge RAB pada transaksi yang sudah terhubung', () => {
    renderView({
      displayedTransactions: [{ ...transaction, rabItemId: rabItem.id, rabCategoryId: rabItem.categoryId }],
      pagedTransactions: [{ ...transaction, rabItemId: rabItem.id, rabCategoryId: rabItem.categoryId }],
      rabTransactionLink: makeRabTransactionLink({
        getLinkedRabItem: vi.fn(() => rabItem),
      }) as KeuanganViewProps['rabTransactionLink'],
    });

    expect(screen.getAllByText('RAB: Pupuk Urea').length).toBeGreaterThan(0);
  });

  it('mengontrol highlight chart distribusi agar MUI chart tidak menerima state undefined', () => {
    renderView();

    const charts = screen.getAllByTestId('finance-pie-chart');
    expect(charts.length).toBeGreaterThan(0);

    for (const chart of charts) {
      expect(chart).toHaveAttribute('data-highlighted-item', 'null');
      expect(chart).toHaveAttribute('data-has-on-highlight-change', 'true');
      expect(chart).toHaveAttribute('data-series-id', 'expense-distribution');
    }
  });

  it('meluruskan panel distribusi dengan buku besar dan menampilkan persentase pengeluaran', () => {
    renderView({
      isMobile: false,
      finalPieData: [
        { id: 'Pupuk', value: 75_000, label: 'Pupuk', color: '#16a34a', percentage: 75 },
        { id: 'Pestisida', value: 25_000, label: 'Pestisida', color: '#dc2626', percentage: 25 },
      ],
      finalPieColors: ['#16a34a', '#dc2626'],
    });

    const ledgerCard = screen.getByTestId('finance-ledger-card');
    const distributionCard = screen.getByTestId('finance-distribution-card');
    expect(ledgerCard).toHaveAttribute('data-finance-card-align', 'ledger');
    expect(distributionCard).toHaveAttribute('data-finance-card-align', 'ledger');
    expect(distributionCard).toHaveAttribute('data-finance-card-fill-bottom', 'true');
    expect(distributionCard.querySelector('[data-finance-distribution-breakdown="fill"]')).toBeInTheDocument();

    const distribution = within(distributionCard);
    expect(distribution.getByText('Pupuk')).toBeInTheDocument();
    expect(distribution.getByText(/75,0%/)).toBeInTheDocument();
    expect(distribution.getByText(/Rp\s*75\.000/)).toBeInTheDocument();
    expect(distribution.getByText('Pestisida')).toBeInTheDocument();
    expect(distribution.getByText(/25,0%/)).toBeInTheDocument();
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
    const reportButton = screen.getByRole('button', { name: 'Export Laporan' });

    expect(getComputedStyle(editButton).backgroundColor).toBe('rgb(82, 183, 136)');
    expect(getComputedStyle(editButton).color).toBe('rgb(30, 38, 32)');
    expect(getComputedStyle(deleteButton).backgroundColor).toBe('rgb(212, 131, 106)');
    expect(getComputedStyle(deleteButton).color).toBe('rgb(30, 38, 32)');
    expect(reportButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Perhitungan HPP & BEP' })).not.toBeInTheDocument();

    unmount();
    renderView({ theme: darkTheme, aiDialogOpen: true });

    const generateAiButton = screen.getByRole('button', { name: 'Buat Laporan AI' });

    expect(getComputedStyle(generateAiButton).backgroundColor).toBe('rgb(82, 183, 136)');
    expect(getComputedStyle(generateAiButton).color).toBe('rgb(255, 255, 255)');
  });

  it('menonaktifkan input dan export ketika belum ada proyek', () => {
    const openForCreate = vi.fn();
    renderView({
      displayedTransactions: [],
      pagedTransactions: [],
      financeAccess: {
        hasSelectedProject: false,
        hasProjectData: false,
        canInputFinance: false,
        canExportFinance: false,
      },
      transactionBatch: makeTransactionBatch({ openForCreate }) as KeuanganViewProps['transactionBatch'],
    });

    expect(screen.getByRole('button', { name: 'Catat Transaksi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export Laporan' })).toBeDisabled();
    expect(screen.getAllByText('Buat proyek terlebih dahulu untuk mulai mencatat transaksi.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Tambah transaksi pertama' })).toBeDisabled();
    expect(openForCreate).not.toHaveBeenCalled();
  });

  it('mengaktifkan input tetapi menonaktifkan export ketika proyek belum punya data', () => {
    const openForCreate = vi.fn();
    renderView({
      displayedTransactions: [],
      pagedTransactions: [],
      financeAccess: {
        hasSelectedProject: true,
        hasProjectData: false,
        canInputFinance: true,
        canExportFinance: false,
      },
      financeProject: {
        projects: [financeProject],
        activeProjects: [financeProject],
        loading: false,
        error: null,
        backendOnline: true,
        reload: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        selectedProjectId: financeProject.id,
        setSelectedProjectId: vi.fn(),
        selectedProject: financeProject,
        projectDialogOpen: false,
        setProjectDialogOpen: vi.fn(),
      },
      transactionBatch: makeTransactionBatch({ openForCreate }) as KeuanganViewProps['transactionBatch'],
    });

    const addButton = screen.getByRole('button', { name: 'Catat Transaksi' });
    expect(addButton).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export Laporan' })).toBeDisabled();

    fireEvent.click(addButton);
    expect(openForCreate).toHaveBeenCalled();
  });

  it('mengaktifkan export ketika proyek sudah punya transaksi atau RAB', () => {
    renderView({
      financeAccess: {
        hasSelectedProject: true,
        hasProjectData: true,
        canInputFinance: true,
        canExportFinance: true,
      },
      financeProject: {
        projects: [financeProject],
        activeProjects: [financeProject],
        loading: false,
        error: null,
        backendOnline: true,
        reload: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        selectedProjectId: financeProject.id,
        setSelectedProjectId: vi.fn(),
        selectedProject: financeProject,
        projectDialogOpen: false,
        setProjectDialogOpen: vi.fn(),
      },
    });

    const exportExcelButton = screen.getByRole('button', { name: 'Export Excel' });
    const exportReportButton = screen.getByRole('button', { name: 'Export Laporan' });
    expect(exportExcelButton).toBeEnabled();
    expect(exportExcelButton).toHaveClass('MuiButton-outlined');
    expect(within(exportExcelButton).getByTestId('finance-export-excel-logo')).toHaveAttribute('src', '/icons/excel-logo.svg');
    expect(exportReportButton).toBeEnabled();
    expect(exportReportButton).toHaveClass('MuiButton-outlined');
    expect(within(exportReportButton).getByTestId('finance-export-pdf-logo')).toHaveAttribute('src', '/icons/pdf-logo.svg');
  });

  it('memaginasi Buku Besar Transaksi menjadi 7 item per halaman', () => {
    const allTransactions: ApiTransaction[] = Array.from({ length: 10 }, (_, index) => ({
      ...transaction,
      _id: `tx-${index + 1}`,
      kategori: `kategori-${index + 1}`,
    }));
    const setLedgerPage = vi.fn();

    renderView({
      displayedTransactions: allTransactions,
      pagedTransactions: allTransactions.slice(0, 7),
      ledgerPage: 1,
      setLedgerPage,
      ledgerTotalPages: 2,
    });

    expect(screen.getByText('10 transaksi ditampilkan')).toBeInTheDocument();
    expect(screen.getAllByText('kategori-1').length).toBeGreaterThan(0);
    expect(screen.queryByText('kategori-8')).not.toBeInTheDocument();

    const pageTwoButtons = screen.getAllByRole('button', { name: 'Go to page 2' });
    fireEvent.click(pageTwoButtons[0]);
    expect(setLedgerPage).toHaveBeenCalledWith(2);
  });
});
