import type {
  FinanceProject,
  FinanceTransactionForReport,
  RabCategory,
  RabItem,
  TransactionJenis,
} from '@/lib/finance/rabTypes';

/**
 * Bentuk hasil baca dan tulis workbook Excel RAB/keuangan.
 *
 * Dipisah dari implementasi agar sisi parse dan sisi export bisa bergerak
 * tanpa saling menyentuh.
 */
export interface ParsedLedgerTransaction {
  tanggal: string;
  jenis: TransactionJenis;
  keterangan: string;
  nominal: number;
  volume?: number;
  satuan?: string;
  hargaSatuan?: number;
}

export interface RabParseSkippedRow {
  rowNumber: number;
  description: string;
  reason: string;
}

export interface RabParseWarning {
  rowNumber: number;
  description: string;
  message: string;
}

export interface RabCategoryReconciliation {
  categoryId: string;
  categoryName: string;
  declaredTotal: number;
  computedTotal: number;
  difference: number;
  /**
   * `false` bila file Excel tidak punya baris TOTAL untuk kategori ini sehingga
   * angkanya tidak pernah dibandingkan. Kategori income sering falls ke kondisi ini
   * karena file menutup bagian pendapatan dengan baris "Keuntungan"/"Laba", bukan
   * "TOTAL PENDAPATAN" — tanpa penanda ini UI terlihat seolah semua sudah cocok.
   */
  checked: boolean;
}

export interface ParsedLedgerResult {
  transactions: ParsedLedgerTransaction[];
  skippedRows: RabParseSkippedRow[];
  referenceYear?: number;
}

export interface ParsedRabWorkbook {
  project: FinanceProject;
  categories: RabCategory[];
  items: RabItem[];
  transactions: ParsedLedgerTransaction[];
  skippedRows: RabParseSkippedRow[];
  reconciliation: RabCategoryReconciliation[];
  warnings: RabParseWarning[];
}

export interface FinanceExportWorkbookInput {
  project: FinanceProject;
  rabItems: RabItem[];
  transactions: FinanceTransactionForReport[];
  startMonth: string;
  endMonth: string;
  /** Human-readable mode label, e.g. 'Proyeksi' or 'Realisasi'. Shown in sheet subtitles. */
  modeLabel?: string;
}
