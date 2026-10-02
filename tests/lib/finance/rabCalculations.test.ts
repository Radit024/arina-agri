import { describe, expect, it } from 'vitest';

import { sumRabItemsByType } from '@/lib/finance/rabCalculations';
import type { RabItem } from '@/lib/finance/rabTypes';

const rabItems: RabItem[] = [
  {
    id: 'seed',
    projectId: 'p1',
    categoryId: 'saprodi',
    categoryName: 'Saprodi',
    type: 'expense',
    name: 'Benih',
    volume: 25,
    unit: 'Kg',
    unitPrice: 16_500,
    plannedTotal: 412_500,
    plannedCashMonth: '2026-08',
    aliases: ['benih'],
    sortOrder: 1,
  },
  {
    id: 'rent',
    projectId: 'p1',
    categoryId: 'fixed',
    categoryName: 'Biaya Tetap',
    type: 'expense',
    name: 'Sewa Lahan',
    volume: 1,
    unit: 'Ha/Musim',
    unitPrice: 7_000_000,
    plannedTotal: 7_000_000,
    plannedCashMonth: '2026-08',
    aliases: ['sewa'],
    sortOrder: 2,
  },
  {
    id: 'sales',
    projectId: 'p1',
    categoryId: 'income',
    categoryName: 'Pendapatan',
    type: 'income',
    name: 'Penjualan Gabah',
    volume: 7_000,
    unit: 'Kg',
    unitPrice: 6_500,
    plannedTotal: 45_500_000,
    plannedCashMonth: '2026-12',
    aliases: ['penjualan'],
    sortOrder: 3,
  },
];

describe('RAB calculations', () => {
  it('sums planned RAB by type', () => {
    expect(sumRabItemsByType(rabItems, 'expense')).toBe(7_412_500);
    expect(sumRabItemsByType(rabItems, 'income')).toBe(45_500_000);
  });
});
