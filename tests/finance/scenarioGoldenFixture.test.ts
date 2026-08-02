import { describe, expect, it } from 'vitest';

import {
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
import type { FinanceTransactionForReport, RabItem } from '@/lib/finance/rabTypes';

// Padi 1 Ha golden fixture — corrected per AUDIT_REVISI_MANAJEMEN_KEUANGAN.md §4:
// transportasi Rp200.000 (bukan Rp20.000 typo), dan Sewa Lahan Rp7.000.000 termasuk
// dalam total Lain-lain (bukan hilang dari subtotal seperti pada workbook sumber).
const rabItems: RabItem[] = [
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
    type: 'expense', name: 'Biaya Operasional Lain (termasuk transportasi Rp200.000)',
    volume: 1, unit: 'paket', unitPrice: 14_746_500, plannedTotal: 14_746_500,
    aliases: [], sortOrder: 3,
  },
  {
    id: 'panen', projectId: 'p1', categoryId: 'income', categoryName: 'Pendapatan',
    type: 'income', name: 'Penjualan Gabah', volume: 7_000, unit: 'Kg', unitPrice: 6_500,
    plannedTotal: 45_500_000, aliases: [], sortOrder: 4,
  },
];

// Transaction dates/amounts are split across months to reproduce the exact monthly kas
// bersih figures from audit §15.1: Jul 0, Aug -13.464.000, Sep -1.330.000, Okt -840.000,
// Nov -3.235.000, Des +42.210.000. Benih + Sewa Lahan + a first slice of Lain-lain land in
// Agustus; the remaining Lain-lain (totaling 14.746.500 - 6.051.500 = 8.695.000) is spread
// across Sep/Okt/Nov/Des to match each month's audited deficit; the corrected transportasi
// figure (Rp200.000, not the source workbook's Rp20.000 typo) is folded into these Lain-lain
// amounts rather than tracked as its own line item.
// Sanity check: 6.051.500 + 1.330.000 + 840.000 + 3.235.000 + 3.290.000 = 14.746.500 (matches RAB).
const transactions: FinanceTransactionForReport[] = [
  { id: 'tx-aug-1', jenis: 'pengeluaran', kategori: 'Benih', nominal: 412_500, tanggal: '2026-08-01' },
  { id: 'tx-aug-2', jenis: 'pengeluaran', kategori: 'Sewa Lahan', nominal: 7_000_000, tanggal: '2026-08-05' },
  { id: 'tx-aug-3', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 6_051_500, tanggal: '2026-08-20' },
  { id: 'tx-sep-1', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 1_330_000, tanggal: '2026-09-10' },
  { id: 'tx-okt-1', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 840_000, tanggal: '2026-10-10' },
  { id: 'tx-nov-1', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 3_235_000, tanggal: '2026-11-10' },
  { id: 'tx-des-1', jenis: 'pendapatan', kategori: 'Penjualan', nominal: 45_500_000, tanggal: '2026-12-20' },
  { id: 'tx-des-2', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 3_290_000, tanggal: '2026-12-05' },
];

describe('Golden fixture: Padi 1 Ha (audit-corrected)', () => {
  it('matches every audit §15.1 expected value', () => {
    const { totalBiayaProduksi } = computeRabTotals(rabItems);
    expect(totalBiayaProduksi).toBe(22_159_000);

    const produksi = 7_000;
    const hargaJual = 6_500;
    const penerimaan = computePenerimaan(produksi, hargaJual);
    expect(penerimaan).toBe(45_500_000);

    const keuntungan = computeKeuntungan(penerimaan!, totalBiayaProduksi);
    expect(keuntungan).toBe(23_341_000);

    expect(computeHpp(totalBiayaProduksi, produksi)).toBeCloseTo(3165.5714, 4);
    expect(computeBepProduksi(totalBiayaProduksi, hargaJual)).toBeCloseTo(3409.0769, 4);
    expect(computeBcRatio(keuntungan!, totalBiayaProduksi)).toBeCloseTo(1.0533, 4);
    expect(computeKelayakanStatus(produksi, computeBepProduksi(totalBiayaProduksi, hargaJual)!)).toBe('untung');

    const labaRugi = computeLabaRugi(transactions);
    expect(labaRugi.totalPendapatan).toBe(45_500_000);
    expect(labaRugi.totalPengeluaran).toBe(22_159_000);
    expect(labaRugi.labaRugi).toBe(23_341_000);

    const arusKas = computeArusKasBulanan(transactions, '2026-07', '2026-12');
    expect(arusKas.map((row) => row.kasBersih)).toEqual([
      0, -13_464_000, -1_330_000, -840_000, -3_235_000, 42_210_000,
    ]);
    expect(arusKas[arusKas.length - 1].kasKumulatif).toBe(23_341_000);

    expect(computeKebutuhanModalKerja(arusKas)).toBe(18_869_000);

    const bunga = computeBunga(15_000_000, 3);
    expect(bunga).toBe(450_000);

    const pascaPembiayaan = computeArusKasPascaPembiayaan(arusKas, {
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      biayaLain: 0,
      tanggalPencairan: '2026-08',
      tanggalPembayaran: '2026-12',
    });
    expect(pascaPembiayaan[pascaPembiayaan.length - 1].kasKumulatifSetelahPembiayaan).toBe(22_891_000);
  });
});
