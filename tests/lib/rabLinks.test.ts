import { describe, expect, it } from 'vitest';

import { findTransactionsLinkedToRabItems } from '@/lib/finance/rabLinks';
import type { ApiTransaction } from '@/lib/api';

function tx(id: string, rabItemId?: string): ApiTransaction {
  return {
    _id: id,
    jenis: 'pengeluaran',
    kategori: 'Pupuk',
    nominal: 1000,
    tanggal: '2026-08-05',
    keterangan: '',
    createdAt: '',
    updatedAt: '',
    ...(rabItemId ? { rabItemId } : {}),
  } as ApiTransaction;
}

describe('findTransactionsLinkedToRabItems', () => {
  it('returns only transactions linked to the given RAB items', () => {
    const transactions = [tx('a', 'item-1'), tx('b', 'item-2'), tx('c'), tx('d', 'item-1')];

    const result = findTransactionsLinkedToRabItems(transactions, ['item-1']);

    expect(result.map((t) => t._id)).toEqual(['a', 'd']);
  });

  it('returns empty array when nothing matches', () => {
    expect(findTransactionsLinkedToRabItems([tx('a', 'item-9')], ['item-1'])).toEqual([]);
  });
});
