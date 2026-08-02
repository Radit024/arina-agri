import { describe, expect, it } from 'vitest';

import {
  compareScenarios,
  computeArusKasBulanan,
  computeArusKasPascaPembiayaan,
  computeBcRatio,
  computeBepProduksi,
  computeBunga,
  computeHpp,
  computeKebutuhanModalKerja,
  computeKelayakanStatus,
  computeKeuntungan,
  computeLabaRugi,
  computePenerimaan,
  computeRabTotals,
} from '@/lib/finance/scenarioCalculations';
import type { FinanceTransactionForReport, RabItem, ScenarioOutput } from '@/lib/finance/rabTypes';

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

  it('returns untung when bepProduksi is zero and produksi is positive', () => {
    expect(computeKelayakanStatus(100, 0)).toBe('untung');
  });

  it('returns rugi when bepProduksi is zero and produksi is negative', () => {
    expect(computeKelayakanStatus(-100, 0)).toBe('rugi');
  });

  it('returns impas when both bepProduksi and produksi are zero', () => {
    expect(computeKelayakanStatus(0, 0)).toBe('impas');
  });
});

const padi1HaTransactions: FinanceTransactionForReport[] = [
  { id: 'tx1', jenis: 'pengeluaran', kategori: 'Benih', nominal: 412_500, tanggal: '2026-07-01' },
  { id: 'tx2', jenis: 'pengeluaran', kategori: 'Sewa Lahan', nominal: 7_000_000, tanggal: '2026-07-01' },
  { id: 'tx3', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 14_746_500, tanggal: '2026-08-15' },
  { id: 'tx4', jenis: 'pendapatan', kategori: 'Penjualan', nominal: 45_500_000, tanggal: '2026-12-20' },
];

describe('computeLabaRugi', () => {
  it('sums income and expense transactions independently for one scenario', () => {
    const result = computeLabaRugi(padi1HaTransactions);

    expect(result.totalPendapatan).toBe(45_500_000);
    expect(result.totalPengeluaran).toBe(22_159_000);
    expect(result.labaRugi).toBe(23_341_000);
  });

  it('returns zeros for an empty transaction list', () => {
    const result = computeLabaRugi([]);

    expect(result).toEqual({ totalPendapatan: 0, totalPengeluaran: 0, labaRugi: 0 });
  });
});

describe('computeArusKasBulanan', () => {
  it('builds monthly kas masuk/keluar/bersih/kumulatif from transaction dates, not RAB plannedCashMonth', () => {
    const result = computeArusKasBulanan(padi1HaTransactions, '2026-07', '2026-12');

    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({ bulan: '2026-07', kasMasuk: 0, kasKeluar: 7_412_500, kasBersih: -7_412_500 });
    expect(result[1]).toMatchObject({ bulan: '2026-08', kasMasuk: 0, kasKeluar: 14_746_500, kasBersih: -14_746_500 });
    expect(result[5]).toMatchObject({ bulan: '2026-12', kasMasuk: 45_500_000, kasKeluar: 0, kasBersih: 45_500_000 });
    expect(result[5].kasKumulatif).toBe(23_341_000);
  });

  it('keeps months with no transactions at zero instead of omitting them', () => {
    const result = computeArusKasBulanan(padi1HaTransactions, '2026-07', '2026-12');

    expect(result[2]).toMatchObject({ bulan: '2026-09', kasMasuk: 0, kasKeluar: 0, kasBersih: 0 });
    expect(result[3]).toMatchObject({ bulan: '2026-10', kasMasuk: 0, kasKeluar: 0, kasBersih: 0 });
    expect(result[4]).toMatchObject({ bulan: '2026-11', kasMasuk: 0, kasKeluar: 0, kasBersih: 0 });
  });
});

describe('computeKebutuhanModalKerja', () => {
  it('returns the absolute value of the maximum cumulative deficit before financing', () => {
    const arusKas = computeArusKasBulanan(padi1HaTransactions, '2026-07', '2026-12');

    expect(computeKebutuhanModalKerja(arusKas)).toBe(22_159_000);
  });

  it('returns 0 when cumulative cash never goes negative', () => {
    const arusKas = computeArusKasBulanan(
      [{ id: 'tx', jenis: 'pendapatan', kategori: 'x', nominal: 1000, tanggal: '2026-07-01' }],
      '2026-07', '2026-07',
    );

    expect(computeKebutuhanModalKerja(arusKas)).toBe(0);
  });
});

describe('computeBunga', () => {
  it('multiplies pokok pinjaman by bunga per periode (percent)', () => {
    expect(computeBunga(15_000_000, 3)).toBe(450_000);
  });
});

describe('computeArusKasPascaPembiayaan', () => {
  it('reduces cumulative cash by the net financing cost (interest) by end of period', () => {
    const arusKas = computeArusKasBulanan(padi1HaTransactions, '2026-07', '2026-12');
    const result = computeArusKasPascaPembiayaan(arusKas, {
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      biayaLain: 0,
      tanggalPencairan: '2026-08',
      tanggalPembayaran: '2026-12',
    });

    expect(result).toHaveLength(6);
    expect(result[result.length - 1].kasKumulatifSetelahPembiayaan).toBe(22_891_000);
  });
});

function makeScenarioOutput(overrides: Partial<ScenarioOutput> = {}): ScenarioOutput {
  return {
    totalPendapatan: 45_500_000,
    totalBiayaProduksi: 22_159_000,
    labaRugi: 23_341_000,
    hpp: 3165.5714,
    bepProduksi: 3409.0769,
    bcRatio: 1.0533,
    kategoriTotals: { 'expense:Benih': 412_500, 'expense:Sewa Lahan': 7_000_000 },
    arusKasBulanan: [],
    kebutuhanModalKerja: 18_869_000,
    bunga: 450_000,
    kasAkhirPascaPembiayaan: 22_891_000,
    ...overrides,
  };
}

describe('compareScenarios', () => {
  it('computes selisih and selisih% for each top-level metric', () => {
    const proyeksi = makeScenarioOutput();
    const realisasi = makeScenarioOutput({ totalPendapatan: 40_000_000, labaRugi: 17_841_000 });

    const result = compareScenarios(proyeksi, realisasi);
    const pendapatanMetric = result.metrics.find((m) => m.label === 'Total Pendapatan');

    expect(pendapatanMetric).toMatchObject({
      proyeksi: 45_500_000,
      realisasi: 40_000_000,
      selisih: -5_500_000,
    });
    expect(pendapatanMetric?.selisihPercent).toBeCloseTo(-0.1209, 4);
  });

  it('shows selisih% as null instead of Infinity when proyeksi is zero', () => {
    const proyeksi = makeScenarioOutput({ totalPendapatan: 0 });
    const realisasi = makeScenarioOutput({ totalPendapatan: 5_000_000 });

    const result = compareScenarios(proyeksi, realisasi);
    const pendapatanMetric = result.metrics.find((m) => m.label === 'Total Pendapatan');

    expect(pendapatanMetric?.selisih).toBe(5_000_000);
    expect(pendapatanMetric?.selisihPercent).toBeNull();
  });

  it('marks category items that only exist in one scenario as unmatched, not omitted', () => {
    const proyeksi = makeScenarioOutput({ kategoriTotals: { 'expense:Benih': 412_500 } });
    const realisasi = makeScenarioOutput({
      kategoriTotals: { 'expense:Benih': 400_000, 'expense:Pestisida': 320_000 },
    });

    const result = compareScenarios(proyeksi, realisasi);
    const pestisida = result.kategoriMetrics.find((m) => m.label === 'expense:Pestisida');

    expect(pestisida).toMatchObject({ proyeksi: 0, realisasi: 320_000, unmatched: true });
  });
});
