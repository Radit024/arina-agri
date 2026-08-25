import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import RabPlanningView from '@/app/dashboard/keuangan/_components/RabPlanningView';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import type { RabItem } from '@/lib/finance/rabTypes';

const theme = createTheme();

type FinanceProject = UseKeuanganControllerResult['financeProject'];
type RabController = UseKeuanganControllerResult['rab'];

const selectedProject = {
  id: 'project-padi',
  name: 'Padi MT 1',
  commodity: 'Padi',
  landArea: 1,
  landAreaUnit: 'ha',
  seasonLabel: 'MT 1',
  startDate: '2026-01-01',
  endDate: '2026-04-30',
  status: 'active' as const,
};

const pupukUrea: RabItem = {
  id: 'rab-pupuk-urea',
  projectId: selectedProject.id,
  categoryId: 'cat-saprodi',
  categoryName: 'Saprodi',
  type: 'expense',
  name: 'Pupuk Urea',
  volume: 10,
  unit: 'karung',
  unitPrice: 20000,
  plannedTotal: 200000,
  plannedCashMonth: '2026-08',
  aliases: ['urea'],
  sortOrder: 1,
};

const penjualanPanen: RabItem = {
  id: 'rab-penjualan',
  projectId: selectedProject.id,
  categoryId: 'cat-penjualan',
  categoryName: 'Penjualan Hasil Panen',
  type: 'income',
  name: 'Penjualan Padi',
  volume: 1000,
  unit: 'kg',
  unitPrice: 6500,
  plannedTotal: 6_500_000,
  aliases: ['penjualan padi'],
  sortOrder: 2,
};

function makeFinanceProject(overrides: Partial<FinanceProject> = {}): FinanceProject {
  return {
    projects: [selectedProject],
    selectedProject,
    selectedProjectId: selectedProject.id,
    projectDialogOpen: false,
    setProjectDialogOpen: vi.fn(),
    createProject: vi.fn(),
    selectProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    loading: false,
    error: null,
    ...overrides,
  } as FinanceProject;
}

function makeRab(overrides: Partial<RabController> = {}): RabController {
  const items = [pupukUrea, penjualanPanen];
  return {
    categories: [],
    items,
    imports: [],
    loading: false,
    error: null,
    backendOnline: true,
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    replaceRab: vi.fn(),
    reload: vi.fn(),
    rabItemDialogOpen: false,
    setRabItemDialogOpen: vi.fn(),
    editingRabItemId: null,
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
    addRabCategory: vi.fn(),
    renameRabCategory: vi.fn(),
    deleteRabCategory: vi.fn(),
    updateRabItemDraftField: vi.fn(),
    openRabItemDialog: vi.fn(),
    openRabItemEditDialog: vi.fn(),
    closeRabItemDialog: vi.fn(),
    totals: { plannedIncome: 6_500_000, plannedExpense: 200000, plannedProfit: 6_300_000 },
    addRabItem: vi.fn(),
    updateRabItem: vi.fn(),
    deleteRabItem: vi.fn(async () => {}),
    rabItemDeleteError: null,
    setRabItemDeleteError: vi.fn(),
    submitRabItemDraft: vi.fn(),
    importRabFile: vi.fn(),
    filteredRabItems: items,
    rabSearchQuery: '',
    setRabSearchQuery: vi.fn(),
    rabFilterJenis: 'semua',
    setRabFilterJenis: vi.fn(),
    selectedRabItemIds: [],
    toggleSelectRabItem: vi.fn(),
    clearRabItemSelection: vi.fn(),
    rabBulkDeleteConfirm: false,
    setRabBulkDeleteConfirm: vi.fn(),
    handleBulkDeleteRabItems: vi.fn(),
    ...overrides,
  } as RabController;
}

interface RenderViewExtraProps {
  rabLinkCountsByItemId?: Record<string, number>;
  realizedByRabItemId?: Record<string, { total: number; count: number }>;
  realizedRabTotals?: { income: number; expense: number };
}

function renderView(
  rabOverrides: Partial<RabController> = {},
  financeProjectOverrides: Partial<FinanceProject> = {},
  extraProps: RenderViewExtraProps = {},
) {
  const rab = makeRab(rabOverrides);
  const financeProject = makeFinanceProject(financeProjectOverrides);
  const view = render(
    <ThemeProvider theme={theme}>
      <RabPlanningView
        financeProject={financeProject}
        rab={rab}
        rabLinkCountsByItemId={extraProps.rabLinkCountsByItemId}
        realizedByRabItemId={extraProps.realizedByRabItemId}
        realizedRabTotals={extraProps.realizedRabTotals}
      />
    </ThemeProvider>,
  );
  return { rab, financeProject, ...view };
}

describe('RabPlanningView', () => {
  it('shows an empty-project message when no project is selected', () => {
    renderView({}, { selectedProject: null, selectedProjectId: null });
    expect(screen.getByText('Belum ada proyek')).toBeInTheDocument();
  });

  it('opens the add-item dialog when the add button is clicked', () => {
    const openRabItemDialog = vi.fn();
    renderView({ openRabItemDialog });

    fireEvent.click(screen.getByRole('button', { name: /Tambah Item RAB/i }));
    expect(openRabItemDialog).toHaveBeenCalledTimes(1);
  });

  it('renders RAB items and filters via the jenis dropdown and search box', () => {
    const setRabFilterJenis = vi.fn();
    const setRabSearchQuery = vi.fn();
    renderView({ setRabFilterJenis, setRabSearchQuery });

    expect(screen.getAllByText('Pupuk Urea')).toHaveLength(2);
    expect(screen.getAllByText('Penjualan Padi')).toHaveLength(2);

    fireEvent.change(screen.getByPlaceholderText('Cari item atau kategori...'), { target: { value: 'urea' } });
    expect(setRabSearchQuery).toHaveBeenCalledWith('urea');

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Pengeluaran' }));
    expect(setRabFilterJenis).toHaveBeenCalledWith('expense');
  });

  it('reveals edit and delete actions when a row is selected, and edit opens the edit dialog', () => {
    const toggleSelectRabItem = vi.fn();
    const openRabItemEditDialog = vi.fn();
    renderView({
      toggleSelectRabItem,
      openRabItemEditDialog,
      selectedRabItemIds: ['rab-pupuk-urea'],
    });

    const desktopTable = screen.getByRole('table', { name: 'Daftar item RAB' });
    const editButton = within(desktopTable).getByRole('button', { name: 'Edit item RAB Pupuk Urea' });
    fireEvent.click(editButton);
    expect(openRabItemEditDialog).toHaveBeenCalledWith(pupukUrea);

    expect(within(desktopTable).queryByRole('button', { name: /Edit item RAB Penjualan Padi/i })).not.toBeInTheDocument();
  });

  it('renders a selected RAB mobile card with its details and edit action', () => {
    const toggleSelectRabItem = vi.fn();
    const openRabItemEditDialog = vi.fn();
    renderView({
      openRabItemEditDialog,
      selectedRabItemIds: ['rab-pupuk-urea'],
      toggleSelectRabItem,
    });

    const mobileCard = screen.getByRole('article', { name: 'Item RAB Pupuk Urea' });
    expect(within(mobileCard).getByText('Saprodi')).toBeInTheDocument();
    expect(within(mobileCard).getByText('10 karung')).toBeInTheDocument();
    expect(within(mobileCard).getByText(/Rp\s*200\.000/)).toBeInTheDocument();

    fireEvent.click(within(mobileCard).getByRole('checkbox'));
    expect(toggleSelectRabItem).toHaveBeenCalledWith('rab-pupuk-urea');
    fireEvent.click(within(mobileCard).getByRole('button', { name: 'Edit item RAB Pupuk Urea' }));
    expect(openRabItemEditDialog).toHaveBeenCalledWith(pupukUrea);
  });

  it('renders an error ContentState without stale RAB items', () => {
    renderView({ error: 'RAB tidak dapat dimuat.' });

    expect(screen.getByRole('alert')).toHaveTextContent('RAB tidak dapat dimuat.');
    expect(screen.queryByRole('article', { name: 'Item RAB Pupuk Urea' })).not.toBeInTheDocument();
  });

  it('renders an empty-filter ContentState without stale RAB items', () => {
    renderView({ filteredRabItems: [] });

    expect(screen.getByText('Tidak ada item RAB yang cocok dengan filter.')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Item RAB Pupuk Urea' })).not.toBeInTheDocument();
  });

  it('deletes a single item after confirming in the delete dialog', async () => {
    const deleteRabItem = vi.fn(async () => {});
    renderView({ selectedRabItemIds: ['rab-pupuk-urea'], deleteRabItem });

    const desktopTable = screen.getByRole('table', { name: 'Daftar item RAB' });
    fireEvent.click(within(desktopTable).getByRole('button', { name: 'Hapus item RAB Pupuk Urea' }));

    const confirmDialog = await screen.findByRole('dialog', { name: /Hapus item RAB\?/i });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Hapus' }));

    await waitFor(() => expect(deleteRabItem).toHaveBeenCalledWith('rab-pupuk-urea'));
  });

  it('shows a bulk-selection bar that opens the bulk delete confirmation', () => {
    const setRabBulkDeleteConfirm = vi.fn();
    renderView({
      selectedRabItemIds: ['rab-pupuk-urea', 'rab-penjualan'],
      setRabBulkDeleteConfirm,
    });

    expect(screen.getByText('2 item dipilih')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hapus 2/i }));
    expect(setRabBulkDeleteConfirm).toHaveBeenCalledWith(true);
  });

  it('confirms the bulk delete from the confirmation dialog', async () => {
    const handleBulkDeleteRabItems = vi.fn();
    renderView({
      selectedRabItemIds: ['rab-pupuk-urea', 'rab-penjualan'],
      rabBulkDeleteConfirm: true,
      handleBulkDeleteRabItems,
    });

    const bulkDialog = screen.getByRole('dialog', { name: /Hapus 2 item RAB\?/i });
    fireEvent.click(within(bulkDialog).getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(handleBulkDeleteRabItems).toHaveBeenCalledTimes(1));
  });

  it('selects all filtered items via the header checkbox', () => {
    const toggleSelectRabItem = vi.fn();
    renderView({ toggleSelectRabItem });

    const desktopTable = screen.getByRole('table', { name: 'Daftar item RAB' });
    const selectAllCheckbox = within(desktopTable).getByRole('checkbox', { name: 'Pilih semua item RAB' });
    fireEvent.click(selectAllCheckbox);

    expect(toggleSelectRabItem).toHaveBeenCalledWith('rab-pupuk-urea');
    expect(toggleSelectRabItem).toHaveBeenCalledWith('rab-penjualan');
  });

  it('shows Rugi Rencana label when planned profit is negative', () => {
    renderView({
      totals: { plannedIncome: 6_000_000, plannedExpense: 8_500_000, plannedProfit: -2_500_000 },
    });

    expect(screen.getByText('Rugi Rencana')).toBeInTheDocument();
    expect(screen.queryByText('Laba Rencana')).not.toBeInTheDocument();
    expect(screen.getByText('Rp 2.500.000')).toBeInTheDocument();
  });

  it('shows realized amounts per item and totals from linked transactions', () => {
    renderView({}, {}, {
      realizedByRabItemId: { 'rab-pupuk-urea': { total: 120_000, count: 2 } },
      realizedRabTotals: { income: 650_000, expense: 120_000 },
    });

    expect(screen.getByText('Pendapatan Terealisasi')).toBeInTheDocument();
    expect(screen.getByText('Biaya Terealisasi')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 120.000 (2 tx)').length).toBeGreaterThan(0);
    expect(screen.getByText('Rp 650.000')).toBeInTheDocument();
  });
});
