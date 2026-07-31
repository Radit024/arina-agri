import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinanceIncomeStatementView from '@/app/dashboard/keuangan/_components/FinanceIncomeStatementView';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import type { IncomeStatementComparisonRow } from '@/lib/finance/rabTypes';

const theme = createTheme();

type FinanceReports = UseKeuanganControllerResult['financeReports'];
type LabaRugiActions = UseKeuanganControllerResult['labaRugiActions'];

const pupukRow: IncomeStatementComparisonRow = {
  categoryId: 'cat-saprodi',
  categoryName: 'Saprodi',
  itemId: 'rab-pupuk-urea',
  itemName: 'Pupuk Urea',
  type: 'expense',
  planned: 200000,
  actual: 180000,
  variance: -20000,
  variancePercent: -10,
  status: 'hemat',
};

const penjualanRow: IncomeStatementComparisonRow = {
  categoryId: 'cat-penjualan',
  categoryName: 'Penjualan Hasil Panen',
  itemId: 'rab-penjualan',
  itemName: 'Penjualan Padi',
  type: 'income',
  planned: 6_500_000,
  actual: 6_500_000,
  variance: 0,
  variancePercent: 0,
  status: 'sesuai_rencana',
};

function makeFinanceReports(rows: IncomeStatementComparisonRow[] = [pupukRow, penjualanRow]): FinanceReports {
  return {
    reportTransactions: [],
    reportStartMonth: '2026-06',
    reportEndMonth: '2026-06',
    incomeStatementComparison: {
      rows,
      summary: {
        plannedIncome: 6_500_000,
        plannedExpense: 200000,
        plannedProfit: 6_300_000,
        actualIncome: 6_500_000,
        actualExpense: 180000,
        actualProfit: 6_320_000,
        profitVariance: 20000,
        profitVariancePercent: 0.3,
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
  } as FinanceReports;
}

function makeLabaRugiActions(overrides: Partial<LabaRugiActions> = {}): LabaRugiActions {
  const filteredRows = overrides.filteredRows ?? [pupukRow, penjualanRow];
  return {
    filteredRows,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filterJenis: 'semua',
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
    ...overrides,
  } as LabaRugiActions;
}

function renderView(labaRugiOverrides: Partial<LabaRugiActions> = {}, rows: IncomeStatementComparisonRow[] = [pupukRow, penjualanRow]) {
  const labaRugiActions = makeLabaRugiActions(labaRugiOverrides);
  const view = render(
    <ThemeProvider theme={theme}>
      <FinanceIncomeStatementView financeReports={makeFinanceReports(rows)} labaRugiActions={labaRugiActions} />
    </ThemeProvider>,
  );
  return { labaRugiActions, ...view };
}

describe('FinanceIncomeStatementView', () => {
  it('renders comparison rows and filters via jenis dropdown and search box', () => {
    const setFilterJenis = vi.fn();
    const setSearchQuery = vi.fn();
    renderView({ setFilterJenis, setSearchQuery });

    expect(screen.getByText('Pupuk Urea')).toBeInTheDocument();
    expect(screen.getByText('Penjualan Padi')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Cari item atau kategori...'), { target: { value: 'pupuk' } });
    expect(setSearchQuery).toHaveBeenCalledWith('pupuk');

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Pengeluaran' }));
    expect(setFilterJenis).toHaveBeenCalledWith('expense');
  });

  it('reveals edit and delete actions only for a selected row and edits the underlying RAB item', () => {
    const editRow = vi.fn();
    renderView({ selectedItemIds: ['rab-pupuk-urea'], editRow });

    fireEvent.click(screen.getByRole('button', { name: 'Edit item RAB Pupuk Urea' }));
    expect(editRow).toHaveBeenCalledWith(pupukRow);
    expect(screen.queryByRole('button', { name: /Edit item RAB Penjualan Padi/i })).not.toBeInTheDocument();
  });

  it('opens the delete confirmation dialog and confirms deletion', () => {
    const setDeleteTargetRow = vi.fn();
    renderView({ selectedItemIds: ['rab-pupuk-urea'], setDeleteTargetRow });

    fireEvent.click(screen.getByRole('button', { name: 'Hapus item RAB Pupuk Urea' }));
    expect(setDeleteTargetRow).toHaveBeenCalledWith(pupukRow);
  });

  it('confirms a single-row delete from the dialog', async () => {
    const confirmDeleteRow = vi.fn();
    renderView({ deleteTargetRow: pupukRow, confirmDeleteRow });

    const dialog = screen.getByRole('dialog', { name: /Hapus item RAB\?/i });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(confirmDeleteRow).toHaveBeenCalledWith(pupukRow.itemId));
  });

  it('shows a bulk-selection bar that opens the bulk delete confirmation', () => {
    const setBulkDeleteConfirm = vi.fn();
    renderView({ selectedItemIds: ['rab-pupuk-urea', 'rab-penjualan'], setBulkDeleteConfirm });

    expect(screen.getByText('2 item dipilih')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hapus 2/i }));
    expect(setBulkDeleteConfirm).toHaveBeenCalledWith(true);
  });

  it('confirms the bulk delete from the confirmation dialog', async () => {
    const handleBulkDelete = vi.fn();
    renderView({ selectedItemIds: ['rab-pupuk-urea', 'rab-penjualan'], bulkDeleteConfirm: true, handleBulkDelete });

    const bulkDialog = screen.getByRole('dialog', { name: /Hapus 2 item RAB\?/i });
    fireEvent.click(within(bulkDialog).getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(handleBulkDelete).toHaveBeenCalledTimes(1));
  });

  it('selects all filtered rows that have an underlying RAB item via the header checkbox', () => {
    const toggleSelect = vi.fn();
    renderView({ toggleSelect });

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(toggleSelect).toHaveBeenCalledWith('rab-pupuk-urea');
    expect(toggleSelect).toHaveBeenCalledWith('rab-penjualan');
  });
});
