import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import FinanceProjectToolbar from '@/app/dashboard/keuangan/_components/FinanceProjectToolbar';

const theme = createTheme();

type ToolbarProps = ComponentProps<typeof FinanceProjectToolbar>;

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

function ToolbarHarness({ overrides = {} }: { overrides?: Partial<ToolbarProps> }) {
  const setActiveMode = vi.fn();

  const props: ToolbarProps = {
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
    } as unknown as ToolbarProps['financeProject'],
    financeScenario: {
      activeMode: 'PROJECTION' as const,
      setActiveMode,
      scenarios: [],
      activeScenario: null,
      loading: false,
      error: null,
      projectionScenario: null,
      realizationScenario: null,
      createScenario: vi.fn(),
    } as unknown as ToolbarProps['financeScenario'],
    rab: makeRab() as unknown as ToolbarProps['rab'],
    financeExport: {
      exportLoading: false,
      exportError: null,
      setExportError: vi.fn(),
      handleExportFinanceWorkbook: vi.fn(),
    },
    reportLoading: false,
    transactionBatch: makeTransactionBatch() as unknown as ToolbarProps['transactionBatch'],
    onOpenPdfReport: vi.fn(),
    ...overrides,
  };

  return (
    <ThemeProvider theme={theme}>
      <FinanceProjectToolbar {...props} />
    </ThemeProvider>
  );
}

function renderToolbar(overrides: Partial<ToolbarProps> = {}) {
  return render(<ToolbarHarness overrides={overrides} />);
}

describe('FinanceProjectToolbar - mode switch dirty-state confirmation', () => {
  it('berpindah mode langsung tanpa konfirmasi ketika tidak ada draft belum tersimpan', () => {
    const setActiveMode = vi.fn();
    renderToolbar({
      financeScenario: {
        activeMode: 'PROJECTION',
        setActiveMode,
        scenarios: [],
        activeScenario: null,
        loading: false,
        error: null,
        projectionScenario: null,
        realizationScenario: null,
        createScenario: vi.fn(),
      } as unknown as ToolbarProps['financeScenario'],
      transactionBatch: makeTransactionBatch() as unknown as ToolbarProps['transactionBatch'],
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Realisasi' }));

    expect(setActiveMode).toHaveBeenCalledWith('REALIZATION');
    expect(screen.queryByText('Ganti mode?')).not.toBeInTheDocument();
  });

  it('menampilkan konfirmasi dan tidak langsung berpindah mode ketika ada draft transaksi belum tersimpan', () => {
    const setActiveMode = vi.fn();
    renderToolbar({
      financeScenario: {
        activeMode: 'PROJECTION',
        setActiveMode,
        scenarios: [],
        activeScenario: null,
        loading: false,
        error: null,
        projectionScenario: null,
        realizationScenario: null,
        createScenario: vi.fn(),
      } as unknown as ToolbarProps['financeScenario'],
      transactionBatch: makeTransactionBatch({
        dialogOpen: true,
        stage: 'input',
        drafts: [
          {
            id: 'draft-1',
            jenis: 'pengeluaran',
            kategori: 'Pupuk',
            volume: '',
            satuan: '',
            hargaSatuan: '',
            nominal: '',
            tanggal: '2026-08-03',
            keterangan: '',
          },
        ],
      }) as unknown as ToolbarProps['transactionBatch'],
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Realisasi' }));

    expect(setActiveMode).not.toHaveBeenCalled();
    expect(screen.getByText('Ganti mode?')).toBeInTheDocument();
  });

  it('mengonfirmasi dialog akan menutup draft transaksi dan berpindah mode', async () => {
    const setActiveMode = vi.fn();
    const closeDialog = vi.fn();
    renderToolbar({
      financeScenario: {
        activeMode: 'PROJECTION',
        setActiveMode,
        scenarios: [],
        activeScenario: null,
        loading: false,
        error: null,
        projectionScenario: null,
        realizationScenario: null,
        createScenario: vi.fn(),
      } as unknown as ToolbarProps['financeScenario'],
      transactionBatch: makeTransactionBatch({
        dialogOpen: true,
        stage: 'input',
        closeDialog,
        drafts: [
          {
            id: 'draft-1',
            jenis: 'pengeluaran',
            kategori: 'Pupuk',
            volume: '',
            satuan: '',
            hargaSatuan: '',
            nominal: '',
            tanggal: '2026-08-03',
            keterangan: '',
          },
        ],
      }) as unknown as ToolbarProps['transactionBatch'],
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Realisasi' }));
    expect(screen.getByText('Ganti mode?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ya, Ganti Mode' }));

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(setActiveMode).toHaveBeenCalledWith('REALIZATION');
    await waitFor(() => expect(screen.queryByText('Ganti mode?')).not.toBeInTheDocument());
  });

  it('membatalkan konfirmasi tetap di mode semula dan tidak menutup dialog draft', async () => {
    const setActiveMode = vi.fn();
    const closeDialog = vi.fn();
    renderToolbar({
      financeScenario: {
        activeMode: 'PROJECTION',
        setActiveMode,
        scenarios: [],
        activeScenario: null,
        loading: false,
        error: null,
        projectionScenario: null,
        realizationScenario: null,
        createScenario: vi.fn(),
      } as unknown as ToolbarProps['financeScenario'],
      transactionBatch: makeTransactionBatch({
        dialogOpen: true,
        stage: 'input',
        closeDialog,
        drafts: [
          {
            id: 'draft-1',
            jenis: 'pengeluaran',
            kategori: 'Pupuk',
            volume: '',
            satuan: '',
            hargaSatuan: '',
            nominal: '',
            tanggal: '2026-08-03',
            keterangan: '',
          },
        ],
      }) as unknown as ToolbarProps['transactionBatch'],
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Realisasi' }));
    expect(screen.getByText('Ganti mode?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut Mengisi' }));

    expect(closeDialog).not.toHaveBeenCalled();
    expect(setActiveMode).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Ganti mode?')).not.toBeInTheDocument());
  });

  it('menampilkan konfirmasi ketika ada draft item RAB belum tersimpan', () => {
    const setActiveMode = vi.fn();
    const closeRabItemDialog = vi.fn();
    renderToolbar({
      financeScenario: {
        activeMode: 'PROJECTION',
        setActiveMode,
        scenarios: [],
        activeScenario: null,
        loading: false,
        error: null,
        projectionScenario: null,
        realizationScenario: null,
        createScenario: vi.fn(),
      } as unknown as ToolbarProps['financeScenario'],
      rab: makeRab({
        rabItemDialogOpen: true,
        closeRabItemDialog,
        rabItemDraft: {
          categoryName: 'Saprodi',
          type: 'expense',
          name: 'Pupuk Urea',
          volume: '1',
          unit: 'Unit',
          unitPrice: '',
          plannedCashMonth: '',
          aliases: '',
        },
      }) as unknown as ToolbarProps['rab'],
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Realisasi' }));

    expect(setActiveMode).not.toHaveBeenCalled();
    expect(screen.getByText('Ganti mode?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ya, Ganti Mode' }));

    expect(closeRabItemDialog).toHaveBeenCalledTimes(1);
    expect(setActiveMode).toHaveBeenCalledWith('REALIZATION');
  });
});
