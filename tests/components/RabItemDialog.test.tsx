import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import RabItemDialog from '@/app/dashboard/keuangan/_components/RabItemDialog';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';

const theme = createTheme();

type RabController = UseKeuanganControllerResult['rab'];

function makeRab(overrides: Partial<RabController> = {}): RabController {
  return {
    categories: [],
    items: [],
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
    rabItemDialogOpen: true,
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
      name: 'Pupuk Urea',
      volume: '10',
      unit: 'karung',
      unitPrice: '20000',
      plannedCashMonth: '2026-08',
      aliases: 'urea, pupuk nitrogen',
    },
    rabItemPlannedTotal: 200000,
    rabItemSubmitting: false,
    rabCategoryOptions: ['Saprodi', 'Tenaga Kerja', 'Transport Panen'],
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

function renderDialog(overrides: Partial<RabController> = {}) {
  const rab = makeRab(overrides);
  const view = render(
    <ThemeProvider theme={theme}>
      <RabItemDialog rab={rab} />
    </ThemeProvider>,
  );
  return { rab, ...view };
}

describe('RabItemDialog', () => {
  it('renders the complete RAB item form for creating an item', () => {
    const submitRabItemDraft = vi.fn();
    const updateRabItemDraftField = vi.fn();
    const { rab } = renderDialog({ submitRabItemDraft, updateRabItemDraftField });

    const dialog = screen.getByRole('dialog', { name: /Tambah Item RAB/i });
    expect(within(dialog).getByRole('combobox', { name: /Jenis RAB/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: /Kategori RAB/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Kelola Kategori RAB/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Nama Item/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: /Volume/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Satuan/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: /Harga Satuan/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Bulan Kas Rencana/i })).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox', { name: /Alias \/ Kata Kunci/i }), {
      target: { value: 'urea, pupuk subsidi' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Kelola Kategori RAB/i }));

    expect(within(dialog).getByText('Total Rencana')).toBeInTheDocument();
    expect(within(dialog).getByText(/Rp\s*200\.000/)).toBeInTheDocument();
    expect(updateRabItemDraftField).toHaveBeenCalledWith('aliases', 'urea, pupuk subsidi');
    expect(rab.setRabCategoryDialogOpen).toHaveBeenCalledWith(true);

    fireEvent.submit(within(dialog).getByTestId('rab-item-form'));

    expect(submitRabItemDraft).toHaveBeenCalledTimes(1);
    expect(rab.closeRabItemDialog).not.toHaveBeenCalled();
  });

  it('shows edit copy and submit label when editing an existing item', () => {
    renderDialog({ editingRabItemId: 'rab-item-1' });

    const dialog = screen.getByRole('dialog', { name: /Edit Item RAB/i });
    expect(within(dialog).getByRole('button', { name: /Simpan Perubahan/i })).toBeInTheDocument();
  });

  it('shows the Indonesian validation alert when rabItemError is set', () => {
    renderDialog({ rabItemError: 'Nama barang/jasa tidak boleh kosong' });

    expect(screen.getByText('Nama barang/jasa tidak boleh kosong')).toBeInTheDocument();
  });

  it('opens a custom RAB category manager from the item form', async () => {
    const addRabCategory = vi.fn(async () => null);
    renderDialog({
      rabCategoryDialogOpen: true,
      rabCategoryDialogItems: [{ id: 'cat-saprodi', nama: 'Saprodi' }],
      addRabCategory,
    });

    const manager = screen.getByRole('dialog', { name: /Kelola Kategori RAB Pengeluaran/i });
    expect(within(manager).getByText('Saprodi')).toBeInTheDocument();

    fireEvent.change(within(manager).getByPlaceholderText('Nama baru...'), {
      target: { value: 'Transport Panen' },
    });
    fireEvent.click(within(manager).getByRole('button', { name: /Tambah/i }));

    await waitFor(() => {
      expect(addRabCategory).toHaveBeenCalledWith('Transport Panen');
    });
  });
});
