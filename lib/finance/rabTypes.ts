export type RabEntryType = 'income' | 'expense';

export type TransactionJenis = 'pendapatan' | 'pengeluaran';

export type VarianceStatus =
  | 'belum_ada_realisasi'
  | 'sesuai_rencana'
  | 'hemat'
  | 'over_budget'
  | 'di_atas_target'
  | 'di_bawah_target';

export type ScenarioMode = 'PROJECTION' | 'REALIZATION';

export interface FinanceScenarioEntity {
  id: string;
  projectId: string;
  mode: ScenarioMode;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionSalesAssumptions {
  id: string;
  scenarioId: string;
  produksi: number;
  satuan: string;
  hargaJual: number;
}

export interface FinancingAssumptions {
  id: string;
  scenarioId: string;
  saldoKasAwal: number;
  modalSendiri: number;
  nilaiPinjaman: number;
  bungaPerPeriode: number;
  tanggalPencairan: string;
  tanggalPembayaran: string;
  biayaLain: number;
}

export type KelayakanStatus = 'rugi' | 'impas' | 'untung';

export interface ArusKasBulanan {
  bulan: string;
  kasMasuk: number;
  kasKeluar: number;
  kasBersih: number;
  kasKumulatif: number;
}

export interface ArusKasPascaPembiayaanBulanan {
  bulan: string;
  kasSetelahPembiayaan: number;
  kasKumulatifSetelahPembiayaan: number;
}

export interface ScenarioOutput {
  totalPendapatan: number;
  totalBiayaProduksi: number;
  labaRugi: number;
  hpp: number | null;
  bepProduksi: number | null;
  bcRatio: number | null;
  kategoriTotals: Record<string, number>;
  arusKasBulanan: ArusKasBulanan[];
  kebutuhanModalKerja: number;
  bunga: number;
  kasAkhirPascaPembiayaan: number;
}

export interface ScenarioComparisonMetric {
  label: string;
  proyeksi: number;
  realisasi: number;
  selisih: number;
  selisihPercent: number | null;
  unmatched?: boolean;
}

export interface ScenarioComparisonMonth {
  bulan: string;
  proyeksi: number;
  realisasi: number;
  selisih: number;
  selisihPercent: number | null;
}

export interface ScenarioComparison {
  metrics: ScenarioComparisonMetric[];
  kategoriMetrics: ScenarioComparisonMetric[];
  arusKasBulanan: ScenarioComparisonMonth[];
}

export interface FinanceProject {
  id: string;
  name: string;
  commodity: string;
  landArea: number;
  landAreaUnit: string;
  seasonLabel: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface RabCategory {
  id: string;
  projectId: string;
  name: string;
  type: RabEntryType;
  sortOrder: number;
}

export interface RabItem {
  id: string;
  projectId: string;
  categoryId: string;
  categoryName?: string;
  type: RabEntryType;
  name: string;
  volume: number;
  unit: string;
  unitPrice: number;
  plannedTotal: number;
  plannedCashMonth?: string;
  aliases: string[];
  sortOrder: number;
}

export interface FinanceTransactionForReport {
  id: string;
  jenis: TransactionJenis;
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan?: string;
  projectId?: string | null;
  rabCategoryId?: string | null;
  rabItemId?: string | null;
  volume?: number | null;
  satuan?: string | null;
  hargaSatuan?: number | null;
}

export interface IncomeStatementComparisonRow {
  categoryId: string;
  categoryName: string;
  itemId: string | null;
  itemName: string;
  type: RabEntryType;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number | null;
  status: VarianceStatus;
}

export interface IncomeStatementComparison {
  rows: IncomeStatementComparisonRow[];
  summary: {
    plannedIncome: number;
    plannedExpense: number;
    plannedProfit: number;
    actualIncome: number;
    actualExpense: number;
    actualProfit: number;
    profitVariance: number;
    profitVariancePercent: number | null;
  };
}

export interface CashFlowComparisonRow {
  month: string;
  plannedInflow: number;
  actualInflow: number;
  plannedOutflow: number;
  actualOutflow: number;
  plannedNet: number;
  actualNet: number;
  plannedCumulative: number;
  actualCumulative: number;
  variance: number;
  variancePercent: number | null;
}

export interface CashFlowComparison {
  rows: CashFlowComparisonRow[];
  summary: {
    plannedInflow: number;
    actualInflow: number;
    plannedOutflow: number;
    actualOutflow: number;
    plannedNet: number;
    actualNet: number;
    variance: number;
    variancePercent: number | null;
  };
}
