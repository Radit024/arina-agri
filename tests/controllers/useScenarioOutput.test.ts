import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useScenarioOutput } from '@/controllers/keuangan/useScenarioOutput';
import type { ApiFinanceProject } from '@/lib/api';

vi.mock('@/hooks/useRabItemsForScenario', () => ({
  useRabItemsForScenario: (scenarioId: string | null) => {
    if (scenarioId === 'sc-1') {
      return {
        rabItems: [
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
            plannedCashMonth: '2026-06',
            aliases: [],
            sortOrder: 1,
          },
        ],
        loading: false,
        error: null,
      };
    }
    return { rabItems: [], loading: false, error: null };
  },
}));

vi.mock('@/hooks/useTransactionsForScenario', () => ({
  useTransactionsForScenario: (scenarioId: string | null) => {
    if (scenarioId === 'sc-1') {
      return {
        transactions: [
          {
            _id: 'tx-1',
            projectId: 'project-1',
            scenarioId: 'sc-1',
            jenis: 'pendapatan',
            kategori: 'Penjualan',
            nominal: 500000,
            tanggal: '2026-06-15',
            keterangan: '',
            createdAt: '2026-06-15T00:00:00Z',
            updatedAt: '2026-06-15T00:00:00Z',
          },
          {
            _id: 'tx-2',
            projectId: 'project-1',
            scenarioId: 'sc-1',
            jenis: 'pengeluaran',
            kategori: 'Benih',
            nominal: 100000,
            tanggal: '2026-06-10',
            keterangan: '',
            createdAt: '2026-06-10T00:00:00Z',
            updatedAt: '2026-06-10T00:00:00Z',
          },
        ],
        loading: false,
        error: null,
      };
    }
    return { transactions: [], loading: false, error: null };
  },
}));

vi.mock('@/hooks/useProductionSalesAssumptions', () => ({
  useProductionSalesAssumptions: (scenarioId: string | null) => {
    if (scenarioId === 'sc-1') {
      return {
        assumptions: {
          id: 'asm-1',
          scenarioId: 'sc-1',
          produksi: 100,
          satuan: 'kg',
          hargaJual: 5000,
          createdAt: '2026-06-01T00:00:00Z',
          updatedAt: '2026-06-01T00:00:00Z',
        },
        loading: false,
        error: null,
      };
    }
    return { assumptions: null, loading: false, error: null };
  },
}));

vi.mock('@/hooks/useFinancingAssumptions', () => ({
  useFinancingAssumptions: () => ({ assumptions: null, loading: false, error: null }),
}));

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

describe('useScenarioOutput', () => {
  it('returns empty output when scenarioId is null', () => {
    const { result } = renderHook(() => useScenarioOutput({ scenarioId: null, project }));
    expect(result.current.hasData).toBe(false);
    expect(result.current.output.totalPendapatan).toBe(0);
    expect(result.current.output.totalBiayaProduksi).toBe(0);
    expect(result.current.output.labaRugi).toBe(0);
  });

  it('aggregates transactions, RAB, and assumptions correctly for valid scenarioId', () => {
    const { result } = renderHook(() => useScenarioOutput({ scenarioId: 'sc-1', project }));
    expect(result.current.hasData).toBe(true);
    expect(result.current.output.totalPendapatan).toBe(500000);
    expect(result.current.output.totalBiayaProduksi).toBe(100000);
    expect(result.current.output.labaRugi).toBe(400000);
    expect(result.current.output.hpp).toBeCloseTo(1000, 1);
    expect(result.current.output.bepProduksi).toBeCloseTo(20, 1);
    expect(result.current.output.bcRatio).toBeCloseTo(4, 1);
    expect(result.current.output.kategoriTotals['income:Penjualan']).toBe(500000);
    expect(result.current.output.kategoriTotals['expense:Benih']).toBe(100000);
  });
});
