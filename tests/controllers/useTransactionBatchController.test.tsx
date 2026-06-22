import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTransactionBatchController } from '@/controllers/keuangan/useTransactionBatchController';
import type { ApiTransaction } from '@/lib/api';
import type { RabItem } from '@/lib/finance/rabTypes';

const transaction: ApiTransaction = {
  _id: 'tx-1',
  jenis: 'pengeluaran',
  kategori: 'Pupuk',
  nominal: 200000,
  tanggal: '2026-06-19',
  keterangan: 'Urea',
  volume: 10,
  satuan: 'karung',
  hargaSatuan: 20000,
  createdAt: '2026-06-19T00:00:00.000Z',
  updatedAt: '2026-06-19T00:00:00.000Z',
};

const matchingRabItem: RabItem = {
  id: 'rab-pupuk',
  projectId: 'project-padi',
  categoryId: 'rab-cat-saprodi',
  categoryName: 'Saprodi',
  type: 'expense',
  name: 'Pupuk Urea',
  volume: 10,
  unit: 'karung',
  unitPrice: 20000,
  plannedTotal: 200000,
  plannedCashMonth: '2026-06',
  aliases: ['urea', 'pupuk'],
  sortOrder: 1,
};


describe('useTransactionBatchController', () => {
  it('toggles the active transaction draft when the same draft is clicked again', () => {
    const { result } = renderHook(() => useTransactionBatchController([], vi.fn(), vi.fn()));

    act(() => {
      result.current.openForCreate();
    });

    const firstDraftId = result.current.drafts[0].id;
    expect(result.current.expandedDraftId).toBe(firstDraftId);

    act(() => {
      result.current.expandDraft(firstDraftId);
    });
    expect(result.current.expandedDraftId).toBeNull();

    act(() => {
      result.current.expandDraft(firstDraftId);
    });
    expect(result.current.expandedDraftId).toBe(firstDraftId);
  });

  it('validates the edit form before updating a transaction', async () => {
    const updateTransaction = vi.fn();
    const { result } = renderHook(() => useTransactionBatchController([], vi.fn(), updateTransaction));

    act(() => {
      result.current.openForEdit(transaction);
      result.current.updateDraftField(transaction._id, 'nominal', '');
    });

    await act(async () => {
      await result.current.submitEdit(() => transaction.projectId ?? undefined);
    });

    expect(updateTransaction).not.toHaveBeenCalled();
    expect(result.current.draftErrors[transaction._id]?.nominal).toBe('Nominal harus lebih dari 0');
  });

  it('updates the selected transaction from the edit form without creating a new transaction', async () => {
    const addTransaction = vi.fn();
    const updateTransaction = vi.fn();
    const { result } = renderHook(() => useTransactionBatchController([], addTransaction, updateTransaction));

    act(() => {
      result.current.openForEdit(transaction);
      result.current.updateDraftField(transaction._id, 'kategori', 'Pupuk Organik');
    });

    await act(async () => {
      await result.current.submitEdit(() => 'project-padi');
    });

    expect(addTransaction).not.toHaveBeenCalled();
    expect(updateTransaction).toHaveBeenCalledWith(
      transaction._id,
      expect.objectContaining({
        kategori: 'Pupuk Organik',
        nominal: transaction.nominal,
        projectId: 'project-padi',
      }),
    );
  });

  it('does not auto-link a RAB item while editing an existing transaction', async () => {
    const updateTransaction = vi.fn();
    const { result } = renderHook(() => useTransactionBatchController([matchingRabItem], vi.fn(), updateTransaction));

    act(() => {
      result.current.openForEdit(transaction);
      result.current.updateDraftField(transaction._id, 'keterangan', 'Beli urea tambahan');
    });

    await act(async () => {
      await result.current.submitEdit(() => 'project-padi');
    });

    expect(updateTransaction).toHaveBeenCalledWith(
      transaction._id,
      expect.not.objectContaining({
        rabCategoryId: matchingRabItem.categoryId,
        rabItemId: matchingRabItem.id,
      }),
    );
    expect(updateTransaction).toHaveBeenCalledWith(
      transaction._id,
      expect.objectContaining({
        keterangan: 'Beli urea tambahan',
        projectId: 'project-padi',
      }),
    );
  });
});
