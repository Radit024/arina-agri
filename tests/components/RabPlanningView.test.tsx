import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import RabPlanningView from '@/app/dashboard/keuangan/_components/RabPlanningView';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';

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
  return {
    categories: [],
    items: [],
    imports: [],
    loading: false,
    error: null,
    backendOnline: true,
    createCategory: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    replaceRab: vi.fn(),
    reload: vi.fn(),
    rabItemDialogOpen: true,
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
      name: 'Pupuk Urea',
      volume: '10',
      unit: 'karung',
      unitPrice: '20000',
      plannedCashMonth: '2026-08',
      aliases: 'urea, pupuk nitrogen',
    },
    rabItemPlannedTotal: 200000,
    rabItemSubmitting: false,
    updateRabItemDraftField: vi.fn(),
    openRabItemDialog: vi.fn(),
    closeRabItemDialog: vi.fn(),
    totals: {
      plannedIncome: 0,
      plannedExpense: 0,
      plannedProfit: 0,
    },
    addRabItem: vi.fn(),
    submitRabItemDraft: vi.fn(),
    importRabFile: vi.fn(),
    ...overrides,
  } as RabController;
}

function renderView(rabOverrides: Partial<RabController> = {}) {
  const rab = makeRab(rabOverrides);
  const view = render(
    <ThemeProvider theme={theme}>
      <RabPlanningView financeProject={makeFinanceProject()} rab={rab} />
    </ThemeProvider>,
  );
  return { rab, ...view };
}

describe('RabPlanningView', () => {
  it('uses a ledger-style add button and renders the complete RAB item form', () => {
    const submitRabItemDraft = vi.fn();
    const updateRabItemDraftField = vi.fn();
    const openRabItemDialog = vi.fn();
    const closedView = renderView({
      rabItemDialogOpen: false,
      openRabItemDialog,
      submitRabItemDraft,
      updateRabItemDraftField,
    });

    const addButton = screen.getByRole('button', { name: /Tambah Item RAB/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveClass('MuiButton-contained');
    fireEvent.click(addButton);
    expect(openRabItemDialog).toHaveBeenCalledTimes(1);
    closedView.unmount();

    const { rab } = renderView({ submitRabItemDraft, updateRabItemDraftField });

    const dialog = screen.getByRole('dialog', { name: /Tambah Item RAB/i });
    expect(within(dialog).getByRole('combobox', { name: /Jenis RAB/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Kategori RAB/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Nama Item/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: /Volume/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Satuan/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: /Harga Satuan/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Bulan Kas Rencana/i })).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox', { name: /Alias \/ Kata Kunci/i }), {
      target: { value: 'urea, pupuk subsidi' },
    });

    expect(within(dialog).getByText('Total Rencana')).toBeInTheDocument();
    expect(within(dialog).getByText(/Rp\s*200\.000/)).toBeInTheDocument();
    expect(updateRabItemDraftField).toHaveBeenCalledWith('aliases', 'urea, pupuk subsidi');

    fireEvent.submit(within(dialog).getByTestId('rab-item-form'));

    expect(submitRabItemDraft).toHaveBeenCalledTimes(1);
    expect(rab.closeRabItemDialog).not.toHaveBeenCalled();
  });
});
