import type {
  ArusKasBulanan,
  ArusKasPascaPembiayaanBulanan,
  FinanceTransactionForReport,
  KelayakanStatus,
  RabItem,
  ScenarioComparison,
  ScenarioComparisonMetric,
  ScenarioOutput,
} from './rabTypes';
import { buildMonthRange, sumRabItemsByType, sumTransactionsByJenis, toMonthKey } from './rabCalculations';

export function computeRabTotals(rabItems: RabItem[]): {
  totalBiayaProduksi: number;
  totalPendapatanRab: number;
} {
  return {
    totalBiayaProduksi: sumRabItemsByType(rabItems, 'expense'),
    totalPendapatanRab: sumRabItemsByType(rabItems, 'income'),
  };
}

export function computePenerimaan(produksi: number, hargaJual: number): number | null {
  if (!Number.isFinite(produksi) || !Number.isFinite(hargaJual)) return null;
  if (produksi < 0 || hargaJual < 0) return null;
  return produksi * hargaJual;
}

export function computeKeuntungan(penerimaan: number, totalBiayaProduksi: number): number | null {
  if (!Number.isFinite(penerimaan) || !Number.isFinite(totalBiayaProduksi)) return null;
  return penerimaan - totalBiayaProduksi;
}

export function computeHpp(totalBiayaProduksi: number, produksi: number): number | null {
  if (!Number.isFinite(totalBiayaProduksi) || !Number.isFinite(produksi)) return null;
  if (totalBiayaProduksi < 0 || produksi <= 0) return null;
  return totalBiayaProduksi / produksi;
}

export function computeBepProduksi(totalBiayaProduksi: number, hargaJual: number): number | null {
  if (!Number.isFinite(totalBiayaProduksi) || !Number.isFinite(hargaJual)) return null;
  if (totalBiayaProduksi < 0 || hargaJual <= 0) return null;
  return totalBiayaProduksi / hargaJual;
}

export function computeBcRatio(keuntungan: number, totalBiayaProduksi: number): number | null {
  if (!Number.isFinite(keuntungan) || !Number.isFinite(totalBiayaProduksi)) return null;
  if (totalBiayaProduksi <= 0) return null;
  return keuntungan / totalBiayaProduksi;
}

const KELAYAKAN_TOLERANCE = 0.01;

export function computeKelayakanStatus(produksi: number, bepProduksi: number): KelayakanStatus {
  if (bepProduksi === 0) {
    if (produksi === 0) return 'impas';
    return produksi > 0 ? 'untung' : 'rugi';
  }
  if (Math.abs(produksi - bepProduksi) / bepProduksi <= KELAYAKAN_TOLERANCE) {
    return 'impas';
  }
  return produksi > bepProduksi ? 'untung' : 'rugi';
}

export function computeLabaRugi(transactions: FinanceTransactionForReport[]): {
  totalPendapatan: number;
  totalPengeluaran: number;
  labaRugi: number;
} {
  const totalPendapatan = sumTransactionsByJenis(transactions, 'pendapatan');
  const totalPengeluaran = sumTransactionsByJenis(transactions, 'pengeluaran');
  return {
    totalPendapatan,
    totalPengeluaran,
    labaRugi: totalPendapatan - totalPengeluaran,
  };
}

export function computeArusKasBulanan(
  transactions: FinanceTransactionForReport[],
  startMonth: string,
  endMonth: string,
): ArusKasBulanan[] {
  const months = buildMonthRange(startMonth, endMonth);
  let kasKumulatif = 0;

  return months.map((bulan) => {
    const kasMasuk = transactions
      .filter((tx) => tx.jenis === 'pendapatan' && toMonthKey(tx.tanggal) === bulan)
      .reduce((total, tx) => total + tx.nominal, 0);
    const kasKeluar = transactions
      .filter((tx) => tx.jenis === 'pengeluaran' && toMonthKey(tx.tanggal) === bulan)
      .reduce((total, tx) => total + tx.nominal, 0);
    const kasBersih = kasMasuk - kasKeluar;
    kasKumulatif += kasBersih;

    return { bulan, kasMasuk, kasKeluar, kasBersih, kasKumulatif };
  });
}

export function computeKebutuhanModalKerja(arusKasBulanan: ArusKasBulanan[]): number {
  const minKumulatif = Math.min(0, ...arusKasBulanan.map((row) => row.kasKumulatif));
  return Math.abs(minKumulatif);
}

export function computeBunga(pokokPinjaman: number, bungaPerPeriode: number): number {
  return pokokPinjaman * (bungaPerPeriode / 100);
}

export function computeArusKasPascaPembiayaan(
  arusKasBulanan: ArusKasBulanan[],
  financing: {
    nilaiPinjaman: number;
    bungaPerPeriode: number;
    biayaLain: number;
    tanggalPencairan: string;
    tanggalPembayaran: string;
  },
): ArusKasPascaPembiayaanBulanan[] {
  const bunga = computeBunga(financing.nilaiPinjaman, financing.bungaPerPeriode);
  const pelunasan = financing.nilaiPinjaman + bunga + financing.biayaLain;
  let kasKumulatifSetelahPembiayaan = 0;

  return arusKasBulanan.map((row) => {
    const arusMasukPembiayaan = row.bulan === financing.tanggalPencairan ? financing.nilaiPinjaman : 0;
    const arusKeluarPembiayaan = row.bulan === financing.tanggalPembayaran ? pelunasan : 0;
    const kasSetelahPembiayaan = row.kasBersih + arusMasukPembiayaan - arusKeluarPembiayaan;
    kasKumulatifSetelahPembiayaan += kasSetelahPembiayaan;

    return { bulan: row.bulan, kasSetelahPembiayaan, kasKumulatifSetelahPembiayaan };
  });
}

function computeSelisihPercent(proyeksi: number, realisasi: number): number | null {
  if (proyeksi === 0) return null;
  return (realisasi - proyeksi) / proyeksi;
}

function buildComparisonMetric(
  label: string,
  proyeksi: number,
  realisasi: number,
  unmatched?: boolean,
): ScenarioComparisonMetric {
  return {
    label,
    proyeksi,
    realisasi,
    selisih: realisasi - proyeksi,
    selisihPercent: computeSelisihPercent(proyeksi, realisasi),
    ...(unmatched ? { unmatched: true } : {}),
  };
}

export function compareScenarios(proyeksi: ScenarioOutput, realisasi: ScenarioOutput): ScenarioComparison {
  const metrics: ScenarioComparisonMetric[] = [
    buildComparisonMetric('Total Pendapatan', proyeksi.totalPendapatan, realisasi.totalPendapatan),
    buildComparisonMetric('Total Biaya Produksi', proyeksi.totalBiayaProduksi, realisasi.totalBiayaProduksi),
    buildComparisonMetric('Laba/Rugi', proyeksi.labaRugi, realisasi.labaRugi),
    buildComparisonMetric('HPP', proyeksi.hpp ?? 0, realisasi.hpp ?? 0),
    buildComparisonMetric('BEP Produksi', proyeksi.bepProduksi ?? 0, realisasi.bepProduksi ?? 0),
    buildComparisonMetric('B/C Ratio', proyeksi.bcRatio ?? 0, realisasi.bcRatio ?? 0),
    buildComparisonMetric('Kebutuhan Modal Kerja', proyeksi.kebutuhanModalKerja, realisasi.kebutuhanModalKerja),
    buildComparisonMetric('Bunga', proyeksi.bunga, realisasi.bunga),
    buildComparisonMetric('Kas Akhir Pasca Pembiayaan', proyeksi.kasAkhirPascaPembiayaan, realisasi.kasAkhirPascaPembiayaan),
  ];

  const kategoriKeys = new Set([
    ...Object.keys(proyeksi.kategoriTotals),
    ...Object.keys(realisasi.kategoriTotals),
  ]);
  const kategoriMetrics: ScenarioComparisonMetric[] = Array.from(kategoriKeys).map((key) => {
    const proyeksiValue = proyeksi.kategoriTotals[key] ?? 0;
    const realisasiValue = realisasi.kategoriTotals[key] ?? 0;
    const unmatched = !(key in proyeksi.kategoriTotals) || !(key in realisasi.kategoriTotals);
    return buildComparisonMetric(key, proyeksiValue, realisasiValue, unmatched);
  });

  const bulanKeys = new Set([
    ...proyeksi.arusKasBulanan.map((row) => row.bulan),
    ...realisasi.arusKasBulanan.map((row) => row.bulan),
  ]);
  const arusKasBulanan = Array.from(bulanKeys).sort().map((bulan) => {
    const proyeksiRow = proyeksi.arusKasBulanan.find((row) => row.bulan === bulan);
    const realisasiRow = realisasi.arusKasBulanan.find((row) => row.bulan === bulan);
    const proyeksiValue = proyeksiRow?.kasBersih ?? 0;
    const realisasiValue = realisasiRow?.kasBersih ?? 0;
    return {
      bulan,
      proyeksi: proyeksiValue,
      realisasi: realisasiValue,
      selisih: realisasiValue - proyeksiValue,
      selisihPercent: computeSelisihPercent(proyeksiValue, realisasiValue),
    };
  });

  return { metrics, kategoriMetrics, arusKasBulanan };
}
