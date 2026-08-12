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

  it('matches Pembelian dolomit to Dolomit @40kg after noise stripping', () => {
    const testItems: RabItem[] = [
      {
        id: 'dolomit-item',
        projectId: 'p1',
        categoryId: 'saprodi',
        categoryName: 'SAPRODI',
        type: 'expense',
        name: 'Dolomit @40kg',
        volume: 4,
        unit: 'Karung',
        unitPrice: 28_000,
        plannedTotal: 112_000,
        aliases: [],
        sortOrder: 1,
      },
    ];

    const suggestions = suggestRabItemsForTransaction({
      items: testItems,
      transaction: {
        jenis: 'pengeluaran',
        kategori: 'SAPRODI',
        keterangan: 'Pembelian dolomit',
      },
    });

    expect(suggestions[0].item.id).toBe('dolomit-item');
    expect(suggestions[0].score).toBeGreaterThanOrEqual(4);
  });

  it('matches Pembelian herbisida persiapan lahan to Herbisida (kontak)', () => {
    const testItems: RabItem[] = [
      {
        id: 'herbisida-item',
        projectId: 'p1',
        categoryId: 'saprodi',
        categoryName: 'SAPRODI',
        type: 'expense',
        name: 'Herbisida (kontak)',
        volume: 3,
        unit: 'Liter',
        unitPrice: 100_000,
        plannedTotal: 300_000,
        aliases: [],
        sortOrder: 1,
      },
    ];

    const suggestions = suggestRabItemsForTransaction({
      items: testItems,
      transaction: {
        jenis: 'pengeluaran',
        kategori: 'SAPRODI',
        keterangan: 'Pembelian herbisida persiapan lahan',
      },
    });

    expect(suggestions[0].item.id).toBe('herbisida-item');
    expect(suggestions[0].score).toBeGreaterThanOrEqual(4);
  });
});
