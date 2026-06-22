import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import TransactionBatchDialog from '@/app/dashboard/keuangan/_components/TransactionBatchDialog';
import type { TransactionDraft } from '@/controllers/keuangan/useTransactionBatchController';

const theme = createTheme();

type DialogProps = ComponentProps<typeof TransactionBatchDialog>;
type Batch = DialogProps['batch'];
type Master = DialogProps['master'];

const draft: TransactionDraft = {
  id: 'tx-1',
  jenis: 'pengeluaran',
  kategori: 'Pupuk',
  volume: '10',
  satuan: 'karung',
  hargaSatuan: '20.000',
  nominal: '200.000',
  tanggal: '2026-06-19',
  keterangan: 'Urea',
};

function makeBatch(overrides: Partial<Batch> & { submitEdit?: Batch['submitAll'] } = {}): Batch {
  return {
    dialogOpen: true,
    drafts: [draft],
    expandedDraftId: draft.id,
    stage: 'input',
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
  } as Batch;
}

function makeMaster(): Master {
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
    allKategori: vi.fn(() => ['Pupuk', 'Penjualan Hasil Panen']),
    allSatuan: ['kg', 'karung'],
    addKategori: vi.fn(),
    renameKategori: vi.fn(),
    deleteKategori: vi.fn(),
    addSatuan: vi.fn(),
    renameSatuan: vi.fn(),
    deleteSatuan: vi.fn(),
  } as Master;
}

function renderDialog(batchOverrides: Partial<Batch> & { submitEdit?: Batch['submitAll'] } = {}) {
  const batch = makeBatch(batchOverrides);
  render(
    <ThemeProvider theme={theme}>
      <TransactionBatchDialog batch={batch} master={makeMaster()} selectedProjectId="project-padi" />
    </ThemeProvider>,
  );
  return batch;
}

describe('TransactionBatchDialog', () => {
  it('keeps the add transaction form as a batch flow', () => {
    renderDialog();

    expect(screen.getByText('Catat Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Bisa tambah lebih dari satu sekaligus')).toBeInTheDocument();
    expect(screen.getByText('Input Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Konfirmasi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tambah Transaksi Lagi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Konfirmasi/i })).toBeInTheDocument();
  });

  it('renders edit transaction as a single direct-edit form', () => {
    const submitEdit = vi.fn();
    const batch = renderDialog({ editingTransactionId: draft.id, submitEdit });

    expect(screen.getByText('Edit Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Perbarui data transaksi terpilih')).toBeInTheDocument();
    expect(screen.queryByText('Input Transaksi')).not.toBeInTheDocument();
    expect(screen.queryByText('Konfirmasi')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tambah Transaksi Lagi/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/i }));

    expect(submitEdit).toHaveBeenCalledTimes(1);
    expect(batch.goToConfirm).not.toHaveBeenCalled();
  });
});
