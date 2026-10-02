import { describe, expect, it } from 'vitest';

import { buildIncomeStatementWorksheetData } from '@/lib/finance/incomeStatementWorksheet';
import type { FinanceTransactionForReport, RabItem } from '@/lib/finance/rabTypes';

function makeTransaction(overrides?: Partial<FinanceTransactionForReport>): FinanceTransactionForReport {
  return {
    id: 'tx-1',
    projectId: 'proj-1',
    tanggal: '2026-06-15',
    kategori: 'Benih',
    jenis: 'pengeluaran',
    nominal: 100000,
    keterangan: 'Benih padi',
    ...overrides,
  };
}

function makeRabItem(overrides?: Partial<RabItem>): RabItem {
  return {
    id: 'rab-item-1',
    projectId: 'proj-1',
    categoryId: 'cat-saprodi',
    categoryName: 'SAPRODI',
    type: 'expense',
    name: 'Benih',
    unit: 'kg',
    volume: 10,
    unitPrice: 10000,
    plannedTotal: 100000,
    aliases: [],
    sortOrder: 1,
    ...overrides,
  };
}

describe('buildIncomeStatementWorksheetData', () => {
  it('groups transactions by RAB item and category name when rabItemId is present', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', nominal: 412500, rabItemId: 'rab-1' }),
      makeTransaction({ id: 'tx-2', nominal: 322000, rabItemId: 'rab-2' }),
      makeTransaction({ id: 'tx-3', nominal: 45500000, jenis: 'pendapatan', rabItemId: 'rab-3' }),
    ];

    const rabItems = [
      makeRabItem({ id: 'rab-1', categoryId: 'cat-1', categoryName: 'SAPRODI', name: 'Benih', sortOrder: 1 }),
      makeRabItem({ id: 'rab-2', categoryId: 'cat-1', categoryName: 'SAPRODI', name: 'Pupuk NPK Subsidi', sortOrder: 2 }),
      makeRabItem({ id: 'rab-3', categoryId: 'cat-2', categoryName: 'Pendapatan', name: 'Penjualan Hasil Panen', sortOrder: 1 }),
    ];

    const result = buildIncomeStatementWorksheetData({ transactions, rabItems });

    expect(result.expenseGroups).toHaveLength(1);
    expect(result.expenseGroups[0].label).toBe('SAPRODI');
    expect(result.expenseGroups[0].subtotal).toBe(734500);
    expect(result.expenseGroups[0].items).toEqual([
      { id: 'expense:saprodi:rab-1', label: 'Benih', amount: 412500 },
      { id: 'expense:saprodi:rab-2', label: 'Pupuk NPK Subsidi', amount: 322000 },
    ]);

    expect(result.incomeGroups).toHaveLength(1);
    expect(result.incomeGroups[0].label).toBe('Pendapatan');
    expect(result.incomeGroups[0].subtotal).toBe(45500000);
    expect(result.incomeGroups[0].items).toEqual([
      { id: 'income:pendapatan:rab-3', label: 'Penjualan Hasil Panen', amount: 45500000 },
    ]);

    expect(result.totalPendapatan).toBe(45500000);
    expect(result.totalPengeluaran).toBe(734500);
    expect(result.labaRugi).toBe(44765500);
  });

  it('falls back to transaction category and keterangan when rabItemId is missing', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', nominal: 100000, kategori: 'Operasional', keterangan: 'Biaya BBM' }),
      makeTransaction({ id: 'tx-2', nominal: 200000, kategori: 'Operasional', keterangan: 'Biaya BBM' }),
      makeTransaction({ id: 'tx-3', nominal: 50000, kategori: '', keterangan: 'Lainnya' }),
    ];

    const result = buildIncomeStatementWorksheetData({ transactions, rabItems: [] });

    expect(result.expenseGroups).toHaveLength(2);
    expect(result.expenseGroups[0].label).toBe('Operasional');
    expect(result.expenseGroups[0].subtotal).toBe(300000);
    expect(result.expenseGroups[0].items).toEqual([
      { id: 'expense:operasional:biaya-bbm', label: 'Biaya BBM', amount: 300000 },
    ]);
  });

  it('sorts groups and items by RAB sortOrder before fallback order', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', nominal: 100, rabItemId: 'rab-2' }),
      makeTransaction({ id: 'tx-2', nominal: 200, rabItemId: 'rab-1' }),
    ];

    const rabItems = [
      makeRabItem({ id: 'rab-2', categoryId: 'cat-2', categoryName: 'TENAGA KERJA', name: 'Upah', sortOrder: 2 }),
      makeRabItem({ id: 'rab-1', categoryId: 'cat-1', categoryName: 'SAPRODI', name: 'Benih', sortOrder: 1 }),
    ];

    const result = buildIncomeStatementWorksheetData({ transactions, rabItems });

    expect(result.expenseGroups.map((g) => g.label)).toEqual(['SAPRODI', 'TENAGA KERJA']);
  });

  it('merges linked RAB items and unlinked ledger transactions sharing the same category name into a single group', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', nominal: 412500, kategori: 'SAPRODI', keterangan: 'Benih padi', rabItemId: 'rab-1' }),
      makeTransaction({ id: 'tx-2', nominal: 112000, kategori: 'SAPRODI', keterangan: 'Pembelian dolomit', rabItemId: undefined }),
      makeTransaction({ id: 'tx-3', nominal: 180000, kategori: 'SAPRODI', keterangan: 'Pembelian herbisida', rabItemId: undefined }),
    ];

    const rabItems = [
      makeRabItem({ id: 'rab-1', categoryId: 'cat-saprodi-id', categoryName: 'SAPRODI', name: 'Benih', sortOrder: 1 }),
    ];

    const result = buildIncomeStatementWorksheetData({ transactions, rabItems });

    expect(result.expenseGroups).toHaveLength(1);
    expect(result.expenseGroups[0].label).toBe('SAPRODI');
    expect(result.expenseGroups[0].subtotal).toBe(412500 + 112000 + 180000);
    expect(result.expenseGroups[0].items.map((i) => i.label)).toEqual([
      'Benih',
      'Pembelian dolomit',
      'Pembelian herbisida',
    ]);
  });
});
