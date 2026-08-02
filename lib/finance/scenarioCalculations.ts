import type { FinanceTransactionForReport, KelayakanStatus, RabItem } from './rabTypes';
import { sumRabItemsByType, sumTransactionsByJenis } from './rabCalculations';

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
