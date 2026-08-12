import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFinanceReportController } from '@/controllers/keuangan/useFinanceReportController';
import type { ApiFinanceProject, ApiTransaction } from '@/lib/api';
import type { RabItem } from '@/lib/finance/rabTypes';

const project: ApiFinanceProject = {
  id: 'project-1',
  name: 'Padi MT 1',
  commodity: 'Padi',
  landArea: 1,
  landAreaUnit: 'ha',
  seasonLabel: 'MT 1',
  startDate: '2026-06-01',
  endDate: '2026-08-31',
  status: 'active',
};

const rabItems: RabItem[] = [];

function tx(overrides: Partial<ApiTransaction>): ApiTransaction {
  return {
    _id: 'tx',
    jenis: 'pendapatan',
    kategori: 'Penjualan',
    nominal: 0,
    tanggal: '2026-06-01',
    keterangan: '',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('useFinanceReportController', () => {
  it('produces correct labaRugi and arusKasBulanan totals from a small fixture', () => {
    const transactions: ApiTransaction[] = [
      tx({ _id: 'tx-1', jenis: 'pendapatan', nominal: 6_500_000, tanggal: '2026-06-15', projectId: 'project-1' }),
      tx({ _id: 'tx-2', jenis: 'pengeluaran', nominal: 200_000, tanggal: '2026-06-10', projectId: 'project-1' }),
      tx({ _id: 'tx-3', jenis: 'pengeluaran', nominal: 500_000, tanggal: '2026-07-05', projectId: 'project-1' }),
    ];

    const { result } = renderHook(() =>
      useFinanceReportController({ project, rabItems, transactions }),
    );

    expect(result.current.labaRugi).toEqual({
      totalPendapatan: 6_500_000,
      totalPengeluaran: 700_000,
      labaRugi: 5_800_000,
    });

    expect(result.current.reportStartMonth).toBe('2026-06');
    expect(result.current.reportEndMonth).toBe('2026-08');

    expect(result.current.arusKasBulanan).toEqual([
      { bulan: '2026-06', kasMasuk: 6_500_000, kasKeluar: 200_000, kasBersih: 6_300_000, kasKumulatif: 6_300_000 },
      { bulan: '2026-07', kasMasuk: 0, kasKeluar: 500_000, kasBersih: -500_000, kasKumulatif: 5_800_000 },
      { bulan: '2026-08', kasMasuk: 0, kasKeluar: 0, kasBersih: 0, kasKumulatif: 5_800_000 },
    ]);

    expect(result.current.reportTransactions).toHaveLength(3);
    expect(result.current.incomeStatementWorksheet.incomeGroups).toHaveLength(1);
    expect(result.current.incomeStatementWorksheet.expenseGroups).toHaveLength(1);
  });

  it('filters out transactions belonging to a different project', () => {
    const transactions: ApiTransaction[] = [
      tx({ _id: 'tx-1', jenis: 'pendapatan', nominal: 1_000_000, tanggal: '2026-06-15', projectId: 'project-1' }),
      tx({ _id: 'tx-2', jenis: 'pendapatan', nominal: 999_999, tanggal: '2026-06-15', projectId: 'other-project' }),
    ];

    const { result } = renderHook(() =>
      useFinanceReportController({ project, rabItems, transactions }),
    );

    expect(result.current.reportTransactions).toHaveLength(1);
    expect(result.current.labaRugi.totalPendapatan).toBe(1_000_000);
  });

  it('includes transactions with no projectId as a safety net for legacy data', () => {
    const transactions: ApiTransaction[] = [
      tx({ _id: 'tx-1', jenis: 'pendapatan', nominal: 1_000_000, tanggal: '2026-06-15', projectId: null }),
    ];

    const { result } = renderHook(() =>
      useFinanceReportController({ project, rabItems, transactions }),
    );

    expect(result.current.reportTransactions).toHaveLength(1);
  });

  it('handles an empty transaction list without a project, falling back to the current month', () => {
    const { result } = renderHook(() =>
      useFinanceReportController({ project: null, rabItems: [], transactions: [] }),
    );

    const now = new Date().toISOString().slice(0, 7);
    expect(result.current.reportStartMonth).toBe(now);
    expect(result.current.reportEndMonth).toBe(now);
    expect(result.current.labaRugi).toEqual({ totalPendapatan: 0, totalPengeluaran: 0, labaRugi: 0 });
    expect(result.current.arusKasBulanan).toEqual([
      { bulan: now, kasMasuk: 0, kasKeluar: 0, kasBersih: 0, kasKumulatif: 0 },
    ]);
  });

  it('derives the report range from RAB item plannedCashMonth when there are no transactions', () => {
    const rabItemsWithMonths: RabItem[] = [
      {
        id: 'item-1',
        projectId: 'project-1',
        categoryId: 'cat-1',
        type: 'expense',
        name: 'Pupuk',
        volume: 1,
        unit: 'karung',
        unitPrice: 100000,
        plannedTotal: 100000,
        plannedCashMonth: '2026-05',
        aliases: [],
        sortOrder: 1,
      },
    ];

    const { result } = renderHook(() =>
      useFinanceReportController({ project, rabItems: rabItemsWithMonths, transactions: [] }),
    );

    // Start candidates include project.startDate (2026-06) and RAB plannedCashMonth (2026-05) -> min is 2026-05
    expect(result.current.reportStartMonth).toBe('2026-05');
    expect(result.current.reportEndMonth).toBe('2026-08');
  });

  it('computes kelayakanUsaha metrics when productionSalesAssumptions is provided', () => {
    const transactions: ApiTransaction[] = [
      tx({ _id: 'tx-1', jenis: 'pendapatan', nominal: 45_500_000, tanggal: '2026-06-15', projectId: 'project-1' }),
      tx({ _id: 'tx-2', jenis: 'pengeluaran', nominal: 22_159_000, tanggal: '2026-06-10', projectId: 'project-1' }),
    ];

    const { result } = renderHook(() =>
      useFinanceReportController({
        project,
        rabItems,
        transactions,
        productionSalesAssumptions: {
          id: 'asm-1',
          scenarioId: 'sc-1',
          produksi: 7000,
          satuan: 'Kg',
          hargaJual: 6500,
        },
      }),
    );

    expect(result.current.kelayakanUsaha).toBeDefined();
    expect(result.current.kelayakanUsaha?.totalBiayaProduksi).toBe(22_159_000);
    expect(result.current.kelayakanUsaha?.hpp).toBeCloseTo(3165.57, 1);
    expect(result.current.kelayakanUsaha?.bepProduksi).toBeCloseTo(3409.08, 1);
    expect(result.current.kelayakanUsaha?.kelayakanStatus).toBe('untung');
  });
});
