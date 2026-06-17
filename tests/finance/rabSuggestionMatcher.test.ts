import { describe, expect, it } from 'vitest';

import { suggestRabItemsForTransaction } from '@/lib/finance/rabSuggestionMatcher';
import type { RabItem } from '@/lib/finance/rabTypes';

const items: RabItem[] = [
  {
    id: 'npk',
    projectId: 'p1',
    categoryId: 'saprodi',
    categoryName: 'Saprodi',
    type: 'expense',
    name: 'Pupuk NPK Subsidi',
    volume: 140,
    unit: 'Kg',
    unitPrice: 2_300,
    plannedTotal: 322_000,
    plannedCashMonth: '2026-08',
    aliases: ['npk', 'pupuk npk'],
    sortOrder: 1,
  },
  {
    id: 'panen',
    projectId: 'p1',
    categoryId: 'alsintan',
    categoryName: 'Jasa Alsintan',
    type: 'expense',
    name: 'Jasa Panen Combine Harvester',
    volume: 1,
    unit: 'Paket',
    unitPrice: 2_450_000,
    plannedTotal: 2_450_000,
    plannedCashMonth: '2026-12',
    aliases: ['combine', 'panen'],
    sortOrder: 2,
  },
];

describe('suggestRabItemsForTransaction', () => {
  it('matches transaction text to aliases and item names', () => {
    const suggestions = suggestRabItemsForTransaction({
      items,
      transaction: {
        jenis: 'pengeluaran',
        kategori: 'pupuk',
        keterangan: 'Pembelian pupuk NPK subsidi',
      },
    });

    expect(suggestions[0].item.id).toBe('npk');
    expect(suggestions[0].score).toBeGreaterThan(0);
    expect(suggestions[0].reason).toContain('pupuk npk');
  });

  it('does not suggest income items for expense transactions', () => {
    const suggestions = suggestRabItemsForTransaction({
      items: [{ ...items[0], id: 'income', type: 'income', name: 'Penjualan Gabah' }],
      transaction: {
        jenis: 'pengeluaran',
        kategori: 'pupuk',
        keterangan: 'penjualan gabah',
      },
    });

    expect(suggestions).toEqual([]);
  });
});
