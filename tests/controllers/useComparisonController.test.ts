import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useComparisonController } from '@/controllers/keuangan/useComparisonController';
import type { ApiFinanceProject } from '@/lib/api';
import type { FinanceScenarioEntity } from '@/lib/finance/rabTypes';

vi.mock('@/controllers/keuangan/useScenarioOutput', () => ({
  useScenarioOutput: ({ scenarioId }: { scenarioId: string | null }) => {
    if (scenarioId === 'sc-proj') {
      return {
        output: {
          totalPendapatan: 5000000,
          totalBiayaProduksi: 2000000,
          labaRugi: 3000000,
          hpp: 2000,
          bepProduksi: 400,
          bcRatio: 1.5,
          kategoriTotals: {
            'income:Penjualan': 5000000,
            'expense:Benih': 2000000,
          },
          arusKasBulanan: [
            {
              bulan: '2026-06',
              kasMasuk: 5000000,
              kasKeluar: 2000000,
              kasBersih: 3000000,
              kasKumulatif: 3000000,
            },
          ],
          kebutuhanModalKerja: 0,
          bunga: 0,
          kasAkhirPascaPembiayaan: 3000000,
        },
        loading: false,
        error: null,
        hasData: true,
      };
    }
    if (scenarioId === 'sc-real') {
      return {
        output: {
          totalPendapatan: 4500000,
          totalBiayaProduksi: 2500000,
          labaRugi: 2000000,
          hpp: 2500,
          bepProduksi: 500,
          bcRatio: 0.8,
          kategoriTotals: {
            'income:Penjualan': 4500000,
            'expense:Benih': 2000000,
            'expense:Pupuk': 500000,
          },
          arusKasBulanan: [
            {
              bulan: '2026-06',
              kasMasuk: 4500000,
              kasKeluar: 2500000,
              kasBersih: 2000000,
              kasKumulatif: 2000000,
            },
          ],
          kebutuhanModalKerja: 0,
          bunga: 0,
          kasAkhirPascaPembiayaan: 2000000,
        },
        loading: false,
        error: null,
        hasData: true,
      };
    }
    return {
      output: {
        totalPendapatan: 0,
        totalBiayaProduksi: 0,
        labaRugi: 0,
        hpp: null,
        bepProduksi: null,
        bcRatio: null,
        kategoriTotals: {},
        arusKasBulanan: [],
        kebutuhanModalKerja: 0,
        bunga: 0,
        kasAkhirPascaPembiayaan: 0,
      },
      loading: false,
      error: null,
      hasData: false,
    };
  },
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

const scenarios: FinanceScenarioEntity[] = [
  {
    id: 'sc-proj',
    projectId: 'project-1',
    mode: 'PROJECTION',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'sc-real',
    projectId: 'project-1',
    mode: 'REALIZATION',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
];

describe('useComparisonController', () => {
  it('does not load data when active is false (lazy loading)', () => {
    const { result } = renderHook(() =>
      useComparisonController({ scenarios, project, active: false }),
    );
    expect(result.current.hasEnoughData).toBe(false);
    expect(result.current.comparison).toBeNull();
  });

  it('computes comparison when active is true and both scenarios have data', () => {
    const { result } = renderHook(() =>
      useComparisonController({ scenarios, project, active: true }),
    );
    expect(result.current.hasEnoughData).toBe(true);
    expect(result.current.comparison).not.toBeNull();

    const metrics = result.current.comparison!.metrics;
    const labaRugiMetric = metrics.find((m) => m.label === 'Laba/Rugi');
    expect(labaRugiMetric?.proyeksi).toBe(3000000);
    expect(labaRugiMetric?.realisasi).toBe(2000000);
    expect(labaRugiMetric?.selisih).toBe(-1000000);

    const pupukCat = result.current.comparison!.kategoriMetrics.find(
      (m) => m.label === 'expense:Pupuk',
    );
    expect(pupukCat?.unmatched).toBe(true);
    expect(pupukCat?.realisasi).toBe(500000);
  });
});
