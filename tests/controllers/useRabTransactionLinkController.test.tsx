import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRabTransactionLinkController } from '@/controllers/keuangan/useRabTransactionLinkController';
import type { ApiTransaction } from '@/lib/api';
import type { RabItem } from '@/lib/finance/rabTypes';

const expenseRabItem: RabItem = {
  id: 'rab-pupuk',
  projectId: 'project-padi',
  categoryId: 'rab-cat-saprodi',
  categoryName: 'Saprodi',
  type: 'expense',
  name: 'Pupuk Urea',
  volume: 10,
  unit: 'karung',
  unitPrice: 200000,
  plannedTotal: 2000000,
  plannedCashMonth: '2026-06',
  aliases: ['urea', 'pupuk nitrogen'],
  sortOrder: 2,
};

const incomeRabItem: RabItem = {
  id: 'rab-panen',
  projectId: 'project-padi',
  categoryId: 'rab-cat-panen',
  categoryName: 'Penjualan',
  type: 'income',
  name: 'Penjualan Gabah',
  volume: 1000,
  unit: 'kg',
  unitPrice: 6000,
  plannedTotal: 6000000,
  plannedCashMonth: '2026-09',
  aliases: ['gabah'],
  sortOrder: 1,
};

const transactions: ApiTransaction[] = [
  {
    _id: 'tx-1',
    jenis: 'pengeluaran',
    kategori: 'Pupuk',
    nominal: 300000,
    tanggal: '2026-06-10',
    keterangan: 'Beli urea awal tanam',
    projectId: 'project-padi',
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
  {
    _id: 'tx-2',
    jenis: 'pengeluaran',
    kategori: 'Pupuk',
    nominal: 250000,
    tanggal: '2026-06-20',
    keterangan: 'Tambahan pupuk nitrogen',
    projectId: 'project-padi',
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
  },
];

describe('useRabTransactionLinkController', () => {
  it('links multiple selected transactions to one RAB item', async () => {
    const updateTransaction = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useRabTransactionLinkController({
        rabItems: [incomeRabItem, expenseRabItem],
        transactions,
        updateTransaction,
      }),
    );

    act(() => {
      result.current.openForTransactions(['tx-1', 'tx-2']);
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.targetTransactions.map((tx) => tx._id)).toEqual(['tx-1', 'tx-2']);
    expect(result.current.filteredRabOptions.map((option) => option.item.id)).toEqual(['rab-pupuk']);

    await act(async () => {
      await result.current.linkToRabItem(expenseRabItem);
    });

    expect(updateTransaction).toHaveBeenCalledTimes(2);
    expect(updateTransaction).toHaveBeenNthCalledWith(1, 'tx-1', {
      projectId: 'project-padi',
      rabCategoryId: 'rab-cat-saprodi',
      rabItemId: 'rab-pupuk',
    });
    expect(updateTransaction).toHaveBeenNthCalledWith(2, 'tx-2', {
      projectId: 'project-padi',
      rabCategoryId: 'rab-cat-saprodi',
      rabItemId: 'rab-pupuk',
    });
    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.linkError).toBeNull();
  });

  it('keeps suggested RAB items at the top for a single transaction', () => {
    const updateTransaction = vi.fn().mockResolvedValue(undefined);
    const unrelatedRabItem: RabItem = {
      ...expenseRabItem,
      id: 'rab-traktor',
      categoryId: 'rab-cat-alat',
      categoryName: 'Alat Tani',
      name: 'Sewa Traktor',
      aliases: ['olah lahan'],
      sortOrder: 1,
    };
    const { result } = renderHook(() =>
      useRabTransactionLinkController({
        rabItems: [unrelatedRabItem, expenseRabItem],
        transactions,
        updateTransaction,
      }),
    );

    act(() => {
      result.current.openForTransactions(['tx-1']);
    });

    expect(result.current.filteredRabOptions.map((option) => ({
      id: option.item.id,
      isSuggested: option.isSuggested,
    }))).toEqual([
      { id: 'rab-pupuk', isSuggested: true },
      { id: 'rab-traktor', isSuggested: false },
    ]);
  });
});
