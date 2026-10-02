import type ExcelJS from 'exceljs';

import { normalizeFinanceCategoryText } from '@/lib/finance/categories';
import { suggestRabItemsForTransaction } from '@/lib/finance/rabSuggestionMatcher';
import type {
  RabCategory,
  RabEntryType,
  RabItem,
  TransactionJenis,
} from '@/lib/finance/rabTypes';
import type {
  ParsedLedgerResult,
  ParsedLedgerTransaction,
  ParsedRabWorkbook,
  RabCategoryReconciliation,
  RabParseSkippedRow,
  RabParseWarning,
} from './rabExcelTypes';

/**
 * Sisi baca: mengubah workbook Excel menjadi data domain.
 *
 * Tidak ada penulisan sel di sini, dan tidak ada formatting — kalau butuh
 * mengubah tampilan hasil ekspor, lihat `rabExcelExport.ts`.
 */
const IGNORED_RAB_SUMMARY_ROW_PATTERN =
  /total|subtotal|jumlah|grand total|keuntungan|laba bersih|margin|hpp|bep|ratio|bagi hasil/i;
// Pola khusus baris "TOTAL ..." yang dipakai untuk rekonsiliasi numerik — lebih sempit
// dari IGNORED_RAB_SUMMARY_ROW_PATTERN supaya tidak ikut menangkap baris non-penjumlahan
// seperti "Keuntungan"/"HPP"/"BEP".
const RAB_CATEGORY_TOTAL_ROW_PATTERN = /^(total|subtotal|jumlah)\b/i;

const INDONESIAN_MONTH_ABBREVIATIONS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  mei: '05',
  may: '05',
  jun: '06',
  jul: '07',
  ags: '08',
  agu: '08',
  agt: '08',
  aug: '08',
  sep: '09',
  sept: '09',
  okt: '10',
  oct: '10',
  nov: '11',
  des: '12',
  dec: '12',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function getNumericCellValue(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'result' in value && typeof value.result === 'number') {
    return value.result;
  }
  if (typeof value === 'string') {
    let cleaned = value.replace(/[^\d.,-]/g, '');
    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes('.')) {
      if (/\.\d{3}(?!\d)/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getTextCellValue(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('').trim();
  }
  return String(value).trim();
}

export function parseRabWorkbook(workbook: ExcelJS.Workbook): ParsedRabWorkbook {
  const sheet = workbook.worksheets.find((worksheet) => /rab/i.test(worksheet.name)) ?? workbook.worksheets[0];
  if (!sheet) throw new Error('Sheet RAB tidak ditemukan.');

  const projectName = getTextCellValue(sheet.getCell('A2')) || 'RAB Usaha Tani';
  const seasonLabel = getTextCellValue(sheet.getCell('A3')) || 'Periode RAB';
  const projectId = slugify(`${projectName}-${seasonLabel}`);
  const categories = new Map<string, RabCategory>();
  const items: RabItem[] = [];
  const skippedRows: RabParseSkippedRow[] = [];
  const warnings: RabParseWarning[] = [];
  const declaredTotals = new Map<string, number>();
  const computedTotals = new Map<string, number>();
  let currentCategory = 'RAB';
  let currentType: RabEntryType = 'expense';
  let skipSection = false;

  const captureDeclaredTotal = (description: string, plannedTotal: number) => {
    if (!RAB_CATEGORY_TOTAL_ROW_PATTERN.test(description) || plannedTotal === 0) return;
    const key = slugify(currentCategory);
    // First-wins: the first "TOTAL ..." row seen for a category is its immediate
    // subsection total (e.g. row 16 "TOTAL" = 2.449.000 for Saprodi). Rows like "TOTAL
    // BIAYA VARIABEL" or "TOTAL BIAYA PRODUKSI" are rollups across multiple categories
    // that appear later under the same still-unchanged currentCategory — overwriting here
    // would corrupt the real subsection total with a much larger rollup figure.
    if (!declaredTotals.has(key)) {
      declaredTotals.set(key, plannedTotal);
    }
  };

  sheet.eachRow((row, rowNumber) => {
    const marker = getTextCellValue(row.getCell(1));
    const description = getTextCellValue(row.getCell(2));
    const volume = getNumericCellValue(row.getCell(3));
    const unit = getTextCellValue(row.getCell(4));
    const unitPrice = getNumericCellValue(row.getCell(5));
    const plannedTotal = getNumericCellValue(row.getCell(6));
    const normalizedDescription = description.toLowerCase();

    if (/estimasi pendapatan|pendapatan|penerimaan/i.test(description) && volume === 0 && unitPrice === 0) {
      // Baris penutup "TOTAL PENDAPATAN"/"TOTAL PENERIMAAN" juga lolos ke cabang ini
      // karena namanya mengandung kata "pendapatan"/"penerimaan" dan tidak punya
      // volume/harga. Tanpa penangkapan di sini, total pendapatan yang ditulis di file
      // akan hilang diam-diam sehingga sisi pendapatan tidak pernah direkonsiliasi.
      if (currentType === 'income') captureDeclaredTotal(normalizedDescription, plannedTotal);
      currentCategory = 'Pendapatan';
      currentType = 'income';
      skipSection = false;
      return;
    }

    if (description && marker && Number.isNaN(Number(marker))) {
      if (IGNORED_RAB_SUMMARY_ROW_PATTERN.test(description)) {
        // Section markers such as "BAGI HASIL" or "TOTAL BIAYA PRODUKSI" only summarize
        // other sections; their child rows (e.g. profit-sharing splits) aren't RAB items.
        captureDeclaredTotal(normalizedDescription, plannedTotal);
        skippedRows.push({
          rowNumber,
          description,
          reason: `Bagian '${description}' beserta isinya dilewati karena bukan merupakan data anggaran/pengeluaran`,
        });
        skipSection = true;
        return;
      }
      skipSection = false;
      currentCategory = description;
      currentType = /pendapatan|penerimaan|penjualan/i.test(description) && !/biaya|pengeluaran/i.test(description) ? 'income' : 'expense';
      return;
    }

    if (skipSection) return;
    if (!description) return;
    if (IGNORED_RAB_SUMMARY_ROW_PATTERN.test(normalizedDescription)) {
      captureDeclaredTotal(normalizedDescription, plannedTotal);
      skippedRows.push({
        rowNumber,
        description,
        reason: `Baris '${description}' dilewati karena merupakan baris jumlah/total (bukan data item tunggal)`,
      });
      return;
    }
    // Rows without a planned total are derivation helpers (e.g. "Produksi", "Harga pasar")
    // that feed the real income row rather than standalone transactions.
    if (plannedTotal === 0) {
      skippedRows.push({
        rowNumber,
        description,
        reason: `Baris '${description}' dilewati karena total biayanya kosong (kemungkinan hanya sekadar baris keterangan)`,
      });
      return;
    }

    const type: RabEntryType = currentType;
    const categoryName = currentCategory;
    const categoryId = slugify(categoryName);

    if (!categories.has(categoryId)) {
      categories.set(categoryId, {
        id: categoryId,
        projectId,
        name: categoryName,
        type,
        sortOrder: categories.size + 1,
      });
    }

    const finalPlannedTotal = plannedTotal || volume * unitPrice;

    if (volume > 0 && unitPrice > 0 && plannedTotal > 0) {
      const calc = volume * unitPrice;
      if (Math.abs(calc - plannedTotal) > 100) {
        warnings.push({
          rowNumber,
          description,
          message: `Total biaya di excel (Rp${plannedTotal}) berbeda dengan hasil perkalian jumlah × harga (Rp${calc})`,
        });
      }
    }

    items.push({
      id: `${categoryId}-${slugify(description)}-${rowNumber}`,
      projectId,
      categoryId,
      categoryName,
      type,
      name: description,
      volume,
      unit,
      unitPrice,
      plannedTotal: finalPlannedTotal,
      plannedCashMonth: undefined,
      aliases: [description],
      sortOrder: items.length + 1,
    });
    computedTotals.set(categoryId, (computedTotals.get(categoryId) ?? 0) + finalPlannedTotal);
  });

  // Semua kategori yang punya item selalu dilaporkan, termasuk yang tidak punya baris
  // TOTAL di file. Kategori tanpa penanda `checked` akan disembunyikan oleh UI sebagai
  // "tidak diperiksa" supaya pengguna tidak salah menyimpulkan sudah tervalidasi.
  const reconciliation: RabCategoryReconciliation[] = [];
  for (const [categoryId, computedTotal] of computedTotals) {
    const category = categories.get(categoryId);
    if (!category) continue; // kategori yang itemnya ter-skip semua
    const declaredTotal = declaredTotals.get(categoryId);
    const checked = declaredTotal !== undefined;
    reconciliation.push({
      categoryId,
      categoryName: category.name,
      declaredTotal: declaredTotal ?? computedTotal,
      computedTotal,
      difference: checked ? computedTotal - declaredTotal : 0,
      checked,
    });
  }

  const ledgerResult = parseLedgerWorkbook(workbook);
  const enrichedTransactions: ParsedLedgerTransaction[] = [...ledgerResult.transactions];
  const referenceYear = ledgerResult.referenceYear ?? new Date().getFullYear();

  // Directive A: Implicit Data Enrichment (Cross-Sheet Validation)
  // Directive A: Implicit Data Enrichment (Cross-Sheet Validation)
  // Determine which RAB items have corresponding transactions in the daily ledger.
  // RAB items with no matching ledger transaction (e.g. Fixed Cost "Sewa Lahan")
  // are automatically injected so total expenditure matches Laporan Laba Rugi.
  const matchedRabItemIds = new Set<string>();

  for (const item of items) {
    const targetJenis: TransactionJenis = item.type === 'income' ? 'pendapatan' : 'pengeluaran';
    const normItem = normalizeFinanceCategoryText(item.name);

    const isMatched = ledgerResult.transactions.some((tx) => {
      if (tx.jenis !== targetJenis) return false;
      const normTx = normalizeFinanceCategoryText(tx.keterangan);
      if (!normTx) return false;

      // Special case for land rent: MUST contain 'sewa'
      if (normItem.includes('sewa')) {
        return normTx.includes('sewa');
      }

      // Direct match or alias match
      if (normTx === normItem || normTx.includes(normItem) || normItem.includes(normTx)) return true;

      // Suggestion matcher match
      const suggestions = suggestRabItemsForTransaction({
        items: [item],
        transaction: { jenis: tx.jenis, keterangan: tx.keterangan },
      });
      if (suggestions.length > 0 && suggestions[0].score >= 2) return true;

      // Core word match (e.g. 'dolomit' in 'pembelian dolomit', 'herbisida' in 'pembelian herbisida...')
      const coreTokens = normItem
        .replace(/[^\w\s]/g, ' ')
        .split(' ')
        .filter((t) => t.length >= 4 && !/^\d+$/.test(t) && t !== 'jam' && t !== 'kontak' && t !== '40kg');
      if (coreTokens.some((token) => normTx.includes(token))) return true;

      return false;
    });

    if (isMatched) {
      matchedRabItemIds.add(item.id);
    }
  }

  for (const item of items) {
    if (!item.plannedTotal || item.plannedTotal <= 0) continue;
    if (matchedRabItemIds.has(item.id)) continue;

    const targetJenis: TransactionJenis = item.type === 'income' ? 'pendapatan' : 'pengeluaran';
    const defaultDate = enrichedTransactions[0]?.tanggal || `${referenceYear}-01-01`;

    enrichedTransactions.push({
      tanggal: defaultDate,
      jenis: targetJenis,
      keterangan: item.name,
      nominal: item.plannedTotal,
      volume: item.volume > 0 ? item.volume : undefined,
      satuan: item.unit || undefined,
      hargaSatuan: item.unitPrice > 0 ? item.unitPrice : undefined,
    });
  }

  return {
    project: {
      id: projectId,
      name: projectName,
      commodity: projectName,
      landArea: 1,
      landAreaUnit: 'Ha',
      seasonLabel,
      startDate: '',
      endDate: '',
      status: 'draft',
    },
    categories: Array.from(categories.values()),
    items,
    transactions: enrichedTransactions,
    skippedRows: [...skippedRows, ...ledgerResult.skippedRows],
    reconciliation,
    warnings,
  };
}

function parseIndonesianShortDate(text: string, referenceYear: number): string | null {
  const match = /^(\d{1,2})\s*([A-Za-z]+)\.?$/.exec(text.trim());
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const monthText = match[2].toLowerCase();
  const month = INDONESIAN_MONTH_ABBREVIATIONS[monthText] ?? INDONESIAN_MONTH_ABBREVIATIONS[monthText.slice(0, 3)];
  if (!month) return null;
  return `${referenceYear}-${month}-${day}`;
}

function getDateCellIso(cell: ExcelJS.Cell, referenceYear: number): string | null {
  const value = cell.value;
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const text = getTextCellValue(cell);
  if (!text) return null;
  return parseIndonesianShortDate(text, referenceYear);
}

interface LedgerColumnMap {
  tanggal: number;
  keterangan: number;
  volume?: number;
  satuan?: number;
  hargaSatuan?: number;
  pengeluaran?: number;
  pemasukan?: number;
}

function findLedgerHeaderRow(sheet: ExcelJS.Worksheet): { headerRowNumber: number; columns: LedgerColumnMap } | null {
  let result: { headerRowNumber: number; columns: LedgerColumnMap } | null = null;

  sheet.eachRow((row, rowNumber) => {
    if (result) return;
    const candidate: Partial<LedgerColumnMap> = {};
    row.eachCell((cell, colNumber) => {
      const text = getTextCellValue(cell).toLowerCase();
      if (/tanggal/.test(text)) candidate.tanggal = colNumber;
      else if (/uraian|keterangan/.test(text)) candidate.keterangan = colNumber;
      else if (/volume/.test(text)) candidate.volume = colNumber;
      // "Harga Satuan" also contains the word "satuan", so it must be checked
      // before the plain /satuan/ match or the unit-price column gets mistaken
      // for the unit column (and the real unit-price column is never detected).
      else if (/harga/.test(text)) candidate.hargaSatuan = colNumber;
      else if (/satuan/.test(text)) candidate.satuan = colNumber;
      else if (/pengeluaran/.test(text)) candidate.pengeluaran = colNumber;
      else if (/pemasukan|penerimaan/.test(text)) candidate.pemasukan = colNumber;
    });
    if (candidate.tanggal && candidate.keterangan) {
      result = { headerRowNumber: rowNumber, columns: candidate as LedgerColumnMap };
    }
  });

  return result;
}

export function parseLedgerWorkbook(workbook: ExcelJS.Workbook): ParsedLedgerResult {
  const sheet = workbook.worksheets.find((worksheet) => /catatan|transaksi harian|buku besar|ledger/i.test(worksheet.name))
    ?? workbook.worksheets[1];
  if (!sheet) return { transactions: [], skippedRows: [] };

  const header = findLedgerHeaderRow(sheet);
  if (!header) return { transactions: [], skippedRows: [] };
  const { headerRowNumber, columns } = header;

  let referenceYear = new Date().getFullYear();
  for (let rowNumber = 1; rowNumber < headerRowNumber; rowNumber += 1) {
    const text = getTextCellValue(sheet.getRow(rowNumber).getCell(1));
    const yearMatch = /\b(20\d{2})\b/.exec(text);
    if (yearMatch) {
      referenceYear = Number(yearMatch[1]);
      break;
    }
  }

  const transactions: ParsedLedgerTransaction[] = [];
  const skippedRows: RabParseSkippedRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    const keterangan = getTextCellValue(row.getCell(columns.keterangan));
    if (!keterangan) return;

    const tanggal = getDateCellIso(row.getCell(columns.tanggal), referenceYear);
    if (!tanggal) {
      skippedRows.push({
        rowNumber,
        description: keterangan,
        reason: `Baris '${keterangan}' dilewati karena penulisan tanggalnya tidak dikenali`,
      });
      return;
    }

    const pengeluaran = columns.pengeluaran ? getNumericCellValue(row.getCell(columns.pengeluaran)) : 0;
    const pemasukan = columns.pemasukan ? getNumericCellValue(row.getCell(columns.pemasukan)) : 0;
    if (pengeluaran === 0 && pemasukan === 0) {
      skippedRows.push({
        rowNumber,
        description: keterangan,
        reason: `Baris '${keterangan}' dilewati karena tidak ada nilai rupiah pengeluaran maupun pemasukan`,
      });
      return;
    }

    const jenis: TransactionJenis = pemasukan > 0 ? 'pendapatan' : 'pengeluaran';
    const nominal = jenis === 'pendapatan' ? pemasukan : pengeluaran;
    const volume = columns.volume ? getNumericCellValue(row.getCell(columns.volume)) : 0;
    const satuan = columns.satuan ? getTextCellValue(row.getCell(columns.satuan)) : '';
    const hargaSatuan = columns.hargaSatuan ? getNumericCellValue(row.getCell(columns.hargaSatuan)) : 0;

    transactions.push({
      tanggal,
      jenis,
      keterangan,
      nominal,
      volume: volume || undefined,
      satuan: satuan || undefined,
      hargaSatuan: hargaSatuan || undefined,
    });
  });

  return { transactions, skippedRows, referenceYear };
}

export async function parseRabWorkbookFromArrayBuffer(buffer: ArrayBuffer) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return parseRabWorkbook(workbook);
}
