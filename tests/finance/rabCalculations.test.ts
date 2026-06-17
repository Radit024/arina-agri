import { describe, expect, it } from 'vitest';

import {
  buildCashFlowComparison,
  buildIncomeStatementComparison,
  getVarianceStatus,
  sumRabItemsByType,
} from '@/lib/finance/rabCalculations';
import type { FinanceTransactionForReport, RabItem } from '@/lib/finance/rabTypes';

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

const transactions: FinanceTransactionForReport[] = [
  {
    id: 'tx1',
    jenis: 'pengeluaran',
    kategori: 'Benih',
    nominal: 412_500,
    tanggal: '2026-08-01',
    keterangan: 'Pembelian benih',
    rabItemId: 'seed',
  },
  {
    id: 'tx2',
    jenis: 'pendapatan',
    kategori: 'Penjualan',
    nominal: 45_500_000,
    tanggal: '2026-12-25',
    keterangan: 'Penjualan gabah',
    rabItemId: 'sales',
  },
];

describe('RAB calculations', () => {
  it('sums planned RAB by type', () => {
    expect(sumRabItemsByType(rabItems, 'expense')).toBe(7_412_500);
    expect(sumRabItemsByType(rabItems, 'income')).toBe(45_500_000);
  });

  it('builds income statement comparison', () => {
    const result = buildIncomeStatementComparison({ rabItems, transactions });

    expect(result.summary.plannedProfit).toBe(38_087_500);
    expect(result.summary.actualProfit).toBe(45_087_500);
    expect(result.rows.find((row) => row.itemId === 'rent')).toMatchObject({
      planned: 7_000_000,
      actual: 0,
      status: 'belum_ada_realisasi',
    });
  });

  it('builds monthly cash flow comparison', () => {
    const result = buildCashFlowComparison({
      rabItems,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    expect(result.rows[0]).toMatchObject({
      month: '2026-08',
      plannedOutflow: 7_412_500,
      actualOutflow: 412_500,
    });
    expect(result.rows[4]).toMatchObject({
      month: '2026-12',
      plannedInflow: 45_500_000,
      actualInflow: 45_500_000,
    });
  });

  it('classifies variance statuses', () => {
    expect(getVarianceStatus({ type: 'expense', planned: 100, actual: 120 })).toBe('over_budget');
    expect(getVarianceStatus({ type: 'expense', planned: 100, actual: 80 })).toBe('hemat');
    expect(getVarianceStatus({ type: 'income', planned: 100, actual: 120 })).toBe('di_atas_target');
    expect(getVarianceStatus({ type: 'income', planned: 100, actual: 80 })).toBe('di_bawah_target');
  });
});
