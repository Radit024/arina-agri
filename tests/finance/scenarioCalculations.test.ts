import { describe, expect, it } from 'vitest';

import {
  computeBcRatio,
  computeBepProduksi,
  computeHpp,
  computeKelayakanStatus,
  computeKeuntungan,
  computePenerimaan,
  computeRabTotals,
} from '@/lib/finance/scenarioCalculations';
import type { RabItem } from '@/lib/finance/rabTypes';

const padi1HaRabItems: RabItem[] = [
  {
    id: 'benih', projectId: 'p1', categoryId: 'saprodi', categoryName: 'Saprodi',
    type: 'expense', name: 'Benih', volume: 25, unit: 'Kg', unitPrice: 16_500,
    plannedTotal: 412_500, aliases: [], sortOrder: 1,
  },
  {
    id: 'sewa', projectId: 'p1', categoryId: 'fixed', categoryName: 'Biaya Tetap',
    type: 'expense', name: 'Sewa Lahan', volume: 1, unit: 'Ha/Musim', unitPrice: 7_000_000,
    plannedTotal: 7_000_000, aliases: [], sortOrder: 2,
  },
  {
    id: 'lain', projectId: 'p1', categoryId: 'lain', categoryName: 'Lain-lain',
    type: 'expense', name: 'Sisa Biaya', volume: 1, unit: 'paket', unitPrice: 14_746_500,
    plannedTotal: 14_746_500, aliases: [], sortOrder: 3,
  },
  {
    id: 'panen', projectId: 'p1', categoryId: 'income', categoryName: 'Pendapatan',
    type: 'income', name: 'Penjualan Gabah', volume: 7_000, unit: 'Kg', unitPrice: 6_500,
    plannedTotal: 45_500_000, aliases: [], sortOrder: 4,
  },
];

describe('computeRabTotals', () => {
  it('sums total biaya produksi and total pendapatan RAB from Padi 1 Ha fixture', () => {
    const result = computeRabTotals(padi1HaRabItems);

    expect(result.totalBiayaProduksi).toBe(22_159_000);
    expect(result.totalPendapatanRab).toBe(45_500_000);
  });
});

describe('computePenerimaan', () => {
  it('multiplies produksi by hargaJual', () => {
    expect(computePenerimaan(7_000, 6_500)).toBe(45_500_000);
  });

  it('returns null for negative produksi', () => {
    expect(computePenerimaan(-1, 6_500)).toBeNull();
  });

  it('returns null for negative hargaJual', () => {
    expect(computePenerimaan(7_000, -1)).toBeNull();
  });
});

describe('computeKeuntungan', () => {
  it('subtracts total biaya produksi from penerimaan', () => {
    expect(computeKeuntungan(45_500_000, 22_159_000)).toBe(23_341_000);
  });

  it('allows a negative result (rugi)', () => {
    expect(computeKeuntungan(10_000, 20_000)).toBe(-10_000);
  });

  it('returns null for non-finite input (NaN/Infinity)', () => {
    expect(computeKeuntungan(NaN, 20_000)).toBeNull();
    expect(computeKeuntungan(10_000, Infinity)).toBeNull();
  });
});

describe('computeHpp', () => {
  it('divides total biaya produksi by produksi', () => {
    expect(computeHpp(22_159_000, 7_000)).toBeCloseTo(3165.5714, 4);
  });

  it('returns null when produksi is zero ("tidak dapat dihitung")', () => {
    expect(computeHpp(22_159_000, 0)).toBeNull();
  });

  it('returns null when produksi is negative', () => {
    expect(computeHpp(22_159_000, -1)).toBeNull();
  });
});

describe('computeBepProduksi', () => {
  it('divides total biaya produksi by harga jual (audit-corrected formula)', () => {
    expect(computeBepProduksi(22_159_000, 6_500)).toBeCloseTo(3409.0769, 4);
  });

  it('returns null when harga jual is zero', () => {
    expect(computeBepProduksi(22_159_000, 0)).toBeNull();
  });
});

describe('computeBcRatio', () => {
  it('divides keuntungan by total biaya produksi', () => {
    expect(computeBcRatio(23_341_000, 22_159_000)).toBeCloseTo(1.0533, 4);
  });

  it('returns null when total biaya produksi is zero', () => {
    expect(computeBcRatio(23_341_000, 0)).toBeNull();
  });
});

describe('computeKelayakanStatus', () => {
  it('returns rugi when produksi is below BEP', () => {
    expect(computeKelayakanStatus(3000, 3409.08)).toBe('rugi');
  });

  it('returns impas when produksi exactly equals BEP', () => {
    expect(computeKelayakanStatus(3409.08, 3409.08)).toBe('impas');
  });

  it('returns untung when produksi is above BEP', () => {
    expect(computeKelayakanStatus(7000, 3409.08)).toBe('untung');
  });

  it('returns impas when produksi is within tolerance of a repeating-decimal BEP', () => {
    expect(computeKelayakanStatus(3409, 3409.0769)).toBe('impas');
  });
});
