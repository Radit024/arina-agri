import ExcelJS from 'exceljs';

import { formatDateLong, formatMonthYear, formatDateShort } from '@/lib/formatters';
import { buildIncomeStatementWorksheetData } from './incomeStatementWorksheet';
import { computeArusKasBulanan } from './scenarioCalculations';
import { normalizeFinanceCategoryText } from './categories';
import { suggestRabItemsForTransaction } from './rabSuggestionMatcher';
import type {
  FinanceProject,
  FinanceTransactionForReport,
  RabCategory,
  RabEntryType,
  RabItem,
  TransactionJenis,
} from './rabTypes';

const HEADER_FILL = 'FF166534';
const SUBHEADER_FILL = 'FFE2E8F0';
const INCOME_FILL = 'FFDCFCE7';
const EXPENSE_FILL = 'FFFFEDD5';
const BORDER_COLOR = 'FFCBD5E1';
// "jumlah" cukup umum dan berpotensi cocok dengan sebagian nama item asli (mis. "Jumlah
// pupuk per musim") — ini konsisten dengan risiko substring-match yang sudah ada untuk
// kata lain di pola ini (total, ratio, dst), bukan regresi baru.
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

function plannedTotalFormula(rowNumber: number) {
  return `C${rowNumber}*E${rowNumber}`;
}

function applyTitle(sheet: ExcelJS.Worksheet, title: string, subtitle?: string, extraLine?: string) {
  sheet.mergeCells('A1:I1');
  sheet.getCell('A1').value = title;
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 26;

  if (subtitle) {
    sheet.mergeCells('A2:I2');
    sheet.getCell('A2').value = subtitle;
    sheet.getCell('A2').font = { bold: true, color: { argb: 'FF334155' } };
    sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
  }

  if (extraLine) {
    sheet.mergeCells('A3:I3');
    sheet.getCell('A3').value = extraLine;
    sheet.getCell('A3').font = { bold: true, color: { argb: 'FF334155' } };
    sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
  }
}

function letterMarker(index: number) {
  return String.fromCharCode(65 + index);
}

function groupRabItemsByCategory(items: RabItem[]) {
  const order: string[] = [];
  const groups = new Map<string, RabItem[]>();
  for (const item of items) {
    const key = item.categoryName ?? item.categoryId;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }
  return order.map((categoryName) => ({ categoryName, items: groups.get(categoryName)! }));
}

function applyHeader(row: ExcelJS.Row, fill = SUBHEADER_FILL) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
  });
}

function applyCurrency(cell: ExcelJS.Cell) {
  cell.numFmt = '"Rp" #,##0;[Red]-"Rp" #,##0;"-"';
}

function applyTableBorders(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromCol: number, toCol: number) {
  for (let rowIndex = fromRow; rowIndex <= toRow; rowIndex += 1) {
    for (let colIndex = fromCol; colIndex <= toCol; colIndex += 1) {
      sheet.getCell(rowIndex, colIndex).border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } },
      };
    }
  }
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

  const reconciliation: RabCategoryReconciliation[] = [];
  for (const [categoryId, declaredTotal] of declaredTotals) {
    const category = categories.get(categoryId);
    if (!category) continue; // total kategori yang semua itemnya ter-skip (mis. kategori kosong)
    const computedTotal = computedTotals.get(categoryId) ?? 0;
    reconciliation.push({
      categoryId,
      categoryName: category.name,
      declaredTotal,
      computedTotal,
      difference: computedTotal - declaredTotal,
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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return parseRabWorkbook(workbook);
}

function writeRabSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, rabItems: RabItem[], modeLabel?: string) {
  // Layout mirrors the user's reference RAB template: title / project name / season on
  // rows 1-3, header on row 6 (rows 4-5 blank), sections marked with letters (A, B, C...)
  // each ending in a "TOTAL" row, a grand "TOTAL BIAYA PRODUKSI" row, then an "ESTIMASI
  // PENDAPATAN" section ending in "Keuntungan" (pendapatan - biaya produksi).
  const rabSubtitle = modeLabel ? `${project.name} (${modeLabel})` : project.name;
  applyTitle(sheet, 'RENCANA ANGGARAN BIAYA (RAB)', rabSubtitle, project.seasonLabel);
  const headerRow = 6;
  sheet.getRow(headerRow).values = ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN (RP)', 'TOTAL RENCANA', 'BULAN KAS'];
  applyHeader(sheet.getRow(headerRow));

  const expenseGroups = groupRabItemsByCategory(rabItems.filter((item) => item.type === 'expense'));
  const incomeGroups = groupRabItemsByCategory(rabItems.filter((item) => item.type === 'income'));

  let rowNumber = headerRow + 1;
  let markerIndex = 0;

  const writeItemRow = (item: RabItem, itemIndex: number) => {
    sheet.getRow(rowNumber).values = [
      itemIndex + 1,
      item.name,
      item.volume,
      item.unit,
      item.unitPrice,
      { formula: plannedTotalFormula(rowNumber), result: item.plannedTotal },
      item.plannedCashMonth ? formatMonthYear(item.plannedCashMonth) : '-',
    ];
    applyCurrency(sheet.getCell(rowNumber, 5));
    applyCurrency(sheet.getCell(rowNumber, 6));
    rowNumber += 1;
  };

  const writeCategorySection = (categoryName: string, items: RabItem[], type: RabEntryType) => {
    const sectionHeaderRow = rowNumber;
    sheet.getCell(sectionHeaderRow, 1).value = letterMarker(markerIndex);
    markerIndex += 1;
    sheet.getCell(sectionHeaderRow, 2).value = categoryName;
    sheet.mergeCells(sectionHeaderRow, 2, sectionHeaderRow, 7);
    sheet.getRow(sectionHeaderRow).font = { bold: true };
    sheet.getRow(sectionHeaderRow).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: type === 'income' ? INCOME_FILL : EXPENSE_FILL },
    };
    rowNumber += 1;

    const firstItemRow = rowNumber;
    items.forEach((item, itemIndex) => writeItemRow(item, itemIndex));
    const lastItemRow = rowNumber - 1;

    const totalRowNumber = rowNumber;
    sheet.getCell(totalRowNumber, 2).value = 'TOTAL';
    sheet.getCell(totalRowNumber, 6).value = {
      formula: `SUM(F${firstItemRow}:F${lastItemRow})`,
      result: items.reduce((sum, item) => sum + item.plannedTotal, 0),
    };
    sheet.getRow(totalRowNumber).font = { bold: true };
    applyCurrency(sheet.getCell(totalRowNumber, 6));
    rowNumber += 1;

    return totalRowNumber;
  };

  const expenseTotalRows = expenseGroups.map((group) => writeCategorySection(group.categoryName, group.items, 'expense'));

  let totalBiayaProduksiRow: number | null = null;
  if (expenseTotalRows.length > 0) {
    totalBiayaProduksiRow = rowNumber;
    sheet.getCell(totalBiayaProduksiRow, 1).value = letterMarker(markerIndex);
    markerIndex += 1;
    sheet.getCell(totalBiayaProduksiRow, 2).value = 'TOTAL BIAYA PRODUKSI';
    sheet.getCell(totalBiayaProduksiRow, 6).value = {
      formula: expenseTotalRows.map((row) => `F${row}`).join('+'),
      result: expenseGroups.flatMap((group) => group.items).reduce((sum, item) => sum + item.plannedTotal, 0),
    };
    sheet.getRow(totalBiayaProduksiRow).font = { bold: true };
    applyCurrency(sheet.getCell(totalBiayaProduksiRow, 6));
    rowNumber += 1;
  }

  let totalPendapatanRow: number | null = null;
  if (incomeGroups.length > 0) {
    const sectionHeaderRow = rowNumber;
    sheet.getCell(sectionHeaderRow, 1).value = letterMarker(markerIndex);
    markerIndex += 1;
    sheet.getCell(sectionHeaderRow, 2).value = 'ESTIMASI PENDAPATAN';
    sheet.mergeCells(sectionHeaderRow, 2, sectionHeaderRow, 7);
    sheet.getRow(sectionHeaderRow).font = { bold: true };
    sheet.getRow(sectionHeaderRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INCOME_FILL } };
    rowNumber += 1;

    const incomeItemRows: number[] = [];
    incomeGroups.forEach((group) => {
      group.items.forEach((item, itemIndex) => {
        incomeItemRows.push(rowNumber);
        writeItemRow(item, itemIndex);
      });
    });

    totalPendapatanRow = rowNumber;
    sheet.getCell(totalPendapatanRow, 2).value = 'TOTAL PENDAPATAN';
    sheet.getCell(totalPendapatanRow, 6).value = {
      formula: `SUM(${incomeItemRows.map((row) => `F${row}`).join(',')})`,
      result: incomeGroups.flatMap((group) => group.items).reduce((sum, item) => sum + item.plannedTotal, 0),
    };
    sheet.getRow(totalPendapatanRow).font = { bold: true };
    applyCurrency(sheet.getCell(totalPendapatanRow, 6));
    rowNumber += 1;
  }

  if (totalPendapatanRow !== null) {
    const keuntunganRow = rowNumber;
    sheet.getCell(keuntunganRow, 2).value = 'Keuntungan';
    const totalPendapatan = incomeGroups.flatMap((group) => group.items).reduce((sum, item) => sum + item.plannedTotal, 0);
    const totalBiayaProduksi = expenseGroups.flatMap((group) => group.items).reduce((sum, item) => sum + item.plannedTotal, 0);
    sheet.getCell(keuntunganRow, 6).value = totalBiayaProduksiRow !== null
      ? { formula: `F${totalPendapatanRow}-F${totalBiayaProduksiRow}`, result: totalPendapatan - totalBiayaProduksi }
      : { formula: `F${totalPendapatanRow}`, result: totalPendapatan };
    sheet.getRow(keuntunganRow).font = { bold: true };
    applyCurrency(sheet.getCell(keuntunganRow, 6));
    rowNumber += 1;
  }

  applyTableBorders(sheet, headerRow, rowNumber - 1, 1, 7);
  sheet.views = [{ state: 'frozen', ySplit: headerRow }];
  sheet.columns = [
    { width: 8 },
    { width: 36 },
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
  ];
}

function writeLedgerSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, transactions: FinanceTransactionForReport[], rabItems: RabItem[], modeLabel?: string) {
  const ledgerExtraLine = modeLabel ? `${project.name} PADA ${project.seasonLabel} — ${modeLabel}` : `${project.name} PADA ${project.seasonLabel}`;
  applyTitle(sheet, 'CATATAN TRANSAKSI HARIAN', ledgerExtraLine);
  sheet.getRow(4).values = ['Tanggal', 'Uraian Transaksi', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Pengeluaran (Rp)', 'Pemasukan (Rp)', 'Item RAB'];
  applyHeader(sheet.getRow(4));

  const rabItemNameById = new Map(rabItems.map((item) => [item.id, item.name]));

  transactions.forEach((transaction, index) => {
    const rowNumber = index + 5;
    sheet.getRow(rowNumber).values = [
      formatDateLong(transaction.tanggal),
      transaction.keterangan || transaction.kategori,
      transaction.volume ?? '',
      transaction.satuan ?? '',
      transaction.hargaSatuan ?? '',
      transaction.jenis === 'pengeluaran' ? transaction.nominal : 0,
      transaction.jenis === 'pendapatan' ? transaction.nominal : 0,
      (transaction.rabItemId && rabItemNameById.get(transaction.rabItemId)) || '-',
    ];
    applyCurrency(sheet.getCell(rowNumber, 5));
    applyCurrency(sheet.getCell(rowNumber, 6));
    applyCurrency(sheet.getCell(rowNumber, 7));
  });

  applyTableBorders(sheet, 4, Math.max(5, transactions.length + 4), 1, 8);
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.autoFilter = { from: 'A4', to: `H${Math.max(5, transactions.length + 4)}` };
  sheet.columns = [
    { width: 14 },
    { width: 42 },
    { width: 12 },
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
  ];
}

function writeIncomeStatementSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, rabItems: RabItem[], transactions: FinanceTransactionForReport[], modeLabel?: string) {
  const titleLine = modeLabel ? `LAPORAN LABA RUGI — ${modeLabel.toUpperCase()}` : 'LAPORAN LABA RUGI';
  applyTitle(sheet, titleLine, project.name);

  const data = buildIncomeStatementWorksheetData({ transactions, rabItems });

  type RowCell = string | number | { value: string | number; font?: Partial<ExcelJS.Font>; alignment?: Partial<ExcelJS.Alignment>; isCurrency?: boolean };

  const expenseRows: RowCell[][] = [];
  data.expenseGroups.forEach((group) => {
    expenseRows.push([{ value: group.label, font: { bold: true } }, '']);
    group.items.forEach((item) => {
      expenseRows.push([item.label, item.amount]);
    });
    expenseRows.push([
      { value: 'Sub-total', font: { italic: true, bold: true, color: { argb: 'FF475569' } }, alignment: { horizontal: 'right' } },
      { value: group.subtotal, font: { bold: true, color: { argb: 'FFDC2626' } }, isCurrency: true },
    ]);
  });

  const incomeRows: RowCell[][] = [];
  data.incomeGroups.forEach((group) => {
    incomeRows.push([{ value: group.label, font: { bold: true } }, '']);
    group.items.forEach((item) => {
      incomeRows.push([item.label, item.amount]);
    });
    incomeRows.push([
      { value: 'Sub-total', font: { italic: true, bold: true, color: { argb: 'FF475569' } }, alignment: { horizontal: 'right' } },
      { value: group.subtotal, font: { bold: true, color: { argb: 'FF16A34A' } }, isCurrency: true },
    ]);
  });

  const headerRow = 4;
  sheet.getRow(headerRow).values = ['Jenis / Kategori', 'Jumlah', 'Jenis / Kategori', 'Jumlah'];
  applyHeader(sheet.getRow(headerRow));

  let rowNum = 5;
  const maxRows = Math.max(expenseRows.length, incomeRows.length);

  for (let i = 0; i < maxRows; i++) {
    const eRow = expenseRows[i] || ['', ''];
    const iRow = incomeRows[i] || ['', ''];
    const row = sheet.getRow(rowNum);

    const cellA = row.getCell(1);
    cellA.value = typeof eRow[0] === 'object' ? eRow[0].value : eRow[0];
    if (typeof eRow[0] === 'object') {
      if (eRow[0].font) cellA.font = eRow[0].font;
      if (eRow[0].alignment) cellA.alignment = eRow[0].alignment;
    }
    if (eRow[0] && typeof eRow[0] === 'object' && eRow[0].font?.bold && !eRow[0].font?.italic) {
      cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      sheet.mergeCells(`A${rowNum}:B${rowNum}`);
    }

    const cellB = row.getCell(2);
    cellB.value = typeof eRow[1] === 'object' ? eRow[1].value : eRow[1];
    if (typeof eRow[1] === 'object' && eRow[1].font) cellB.font = eRow[1].font;
    if (typeof eRow[1] === 'number' || (typeof eRow[1] === 'object' && eRow[1].isCurrency)) applyCurrency(cellB);

    const cellC = row.getCell(3);
    cellC.value = typeof iRow[0] === 'object' ? iRow[0].value : iRow[0];
    if (typeof iRow[0] === 'object') {
      if (iRow[0].font) cellC.font = iRow[0].font;
      if (iRow[0].alignment) cellC.alignment = iRow[0].alignment;
    }
    if (iRow[0] && typeof iRow[0] === 'object' && iRow[0].font?.bold && !iRow[0].font?.italic) {
      cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      sheet.mergeCells(`C${rowNum}:D${rowNum}`);
    }

    const cellD = row.getCell(4);
    cellD.value = typeof iRow[1] === 'object' ? iRow[1].value : iRow[1];
    if (typeof iRow[1] === 'object' && iRow[1].font) cellD.font = iRow[1].font;
    if (typeof iRow[1] === 'number' || (typeof iRow[1] === 'object' && iRow[1].isCurrency)) applyCurrency(cellD);

    rowNum += 1;
  }

  const totalRow = sheet.getRow(rowNum);
  totalRow.getCell(1).value = 'Total Pengeluaran';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  totalRow.getCell(2).value = data.totalPengeluaran;
  totalRow.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } };
  totalRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  applyCurrency(totalRow.getCell(2));

  totalRow.getCell(3).value = 'Total Pendapatan';
  totalRow.getCell(3).font = { bold: true };
  totalRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  totalRow.getCell(4).value = data.totalPendapatan;
  totalRow.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
  totalRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  applyCurrency(totalRow.getCell(4));
  rowNum += 1;

  rowNum += 1;
  const summaryTitleRow = sheet.getRow(rowNum);
  summaryTitleRow.getCell(3).value = 'Ringkasan Laba / Rugi';
  summaryTitleRow.getCell(3).font = { bold: true };
  summaryTitleRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  const badgeText = data.labaRugi > 0 ? 'SURPLUS (LABA)' : data.labaRugi < 0 ? 'DEFISIT (RUGI)' : 'IMPAS';
  summaryTitleRow.getCell(4).value = badgeText;
  summaryTitleRow.getCell(4).font = { bold: true, color: { argb: data.labaRugi >= 0 ? 'FF16A34A' : 'FFDC2626' } };
  summaryTitleRow.getCell(4).alignment = { horizontal: 'right' };
  summaryTitleRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  rowNum += 1;

  const summaryPendapatan = sheet.getRow(rowNum);
  summaryPendapatan.getCell(3).value = 'Total Pendapatan';
  summaryPendapatan.getCell(4).value = data.totalPendapatan;
  summaryPendapatan.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
  applyCurrency(summaryPendapatan.getCell(4));
  rowNum += 1;

  const summaryPengeluaran = sheet.getRow(rowNum);
  summaryPengeluaran.getCell(3).value = 'Total Pengeluaran';
  summaryPengeluaran.getCell(4).value = data.totalPengeluaran;
  summaryPengeluaran.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } };
  applyCurrency(summaryPengeluaran.getCell(4));
  rowNum += 1;

  const summaryLaba = sheet.getRow(rowNum);
  summaryLaba.getCell(3).value = 'Laba/Rugi';
  summaryLaba.getCell(3).font = { bold: true };
  summaryLaba.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: data.labaRugi >= 0 ? 'FFDCFCE7' : 'FFFEE2E2' } };
  summaryLaba.getCell(4).value = data.labaRugi;
  summaryLaba.getCell(4).font = { bold: true, color: { argb: data.labaRugi >= 0 ? 'FF16A34A' : 'FFDC2626' } };
  summaryLaba.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: data.labaRugi >= 0 ? 'FFDCFCE7' : 'FFFEE2E2' } };
  applyCurrency(summaryLaba.getCell(4));

  applyTableBorders(sheet, 4, rowNum - 4, 1, 2);
  applyTableBorders(sheet, 4, rowNum, 3, 4);
  sheet.columns = [
    { width: 45 },
    { width: 22 },
    { width: 45 },
    { width: 22 },
  ];
}

function writeCashFlowSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, transactions: FinanceTransactionForReport[], startMonth: string, endMonth: string, modeLabel?: string) {
  const titleLine = modeLabel ? `ARUS KAS — ${modeLabel.toUpperCase()}` : 'ARUS KAS';
  applyTitle(sheet, titleLine, project.name, `${formatMonthYear(startMonth)} s.d. ${formatMonthYear(endMonth)}`);
  
  const headerRow = 5;
  sheet.getRow(headerRow).values = ['Bulan', 'Kas Masuk', 'Kas Keluar', 'Kas Bersih', 'Kumulatif'];
  applyHeader(sheet.getRow(headerRow));

  const arusKasBulanan = computeArusKasBulanan(transactions, startMonth, endMonth);
  
  let rowNum = 6;
  arusKasBulanan.forEach((row) => {
    const monthRow = sheet.getRow(rowNum);
    monthRow.values = [formatMonthYear(row.bulan), row.kasMasuk, row.kasKeluar, row.kasBersih, row.kasKumulatif];
    monthRow.font = { bold: true };
    applyCurrency(monthRow.getCell(2));
    if (row.kasMasuk > 0) monthRow.getCell(2).font = { bold: true, color: { argb: 'FF16A34A' } };
    else monthRow.getCell(2).font = { bold: true, color: { argb: 'FF94A3B8' } };
    
    applyCurrency(monthRow.getCell(3));
    if (row.kasKeluar > 0) monthRow.getCell(3).font = { bold: true, color: { argb: 'FFDC2626' } };
    else monthRow.getCell(3).font = { bold: true, color: { argb: 'FF94A3B8' } };
    
    applyCurrency(monthRow.getCell(4));
    if (row.kasBersih > 0) monthRow.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
    else if (row.kasBersih < 0) monthRow.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } };
    else monthRow.getCell(4).font = { bold: true, color: { argb: 'FF94A3B8' } };
    
    applyCurrency(monthRow.getCell(5));
    if (row.kasKumulatif > 0) monthRow.getCell(5).font = { bold: true, color: { argb: 'FF16A34A' } };
    else if (row.kasKumulatif < 0) monthRow.getCell(5).font = { bold: true, color: { argb: 'FFDC2626' } };
    else monthRow.getCell(5).font = { bold: true, color: { argb: 'FF94A3B8' } };
    
    monthRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    rowNum += 1;
    
    const monthTx = transactions.filter((tx) => tx.tanggal.startsWith(row.bulan)).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    if (monthTx.length === 0) {
      const emptyRow = sheet.getRow(rowNum);
      emptyRow.getCell(1).value = 'Tidak ada transaksi di bulan ini.';
      emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF64748B' } };
      sheet.mergeCells(`A${rowNum}:E${rowNum}`);
      rowNum += 1;
    } else {
      const detailHeaderRow = sheet.getRow(rowNum);
      detailHeaderRow.values = ['Tanggal', 'Kategori', 'Keterangan', '', 'Nominal'];
      detailHeaderRow.font = { bold: true, size: 10 };
      rowNum += 1;
      
      monthTx.forEach((tx) => {
        const txRow = sheet.getRow(rowNum);
        txRow.values = [
          formatDateShort(tx.tanggal),
          tx.kategori,
          tx.keterangan || tx.kategori,
          '',
          tx.nominal,
        ];
        applyCurrency(txRow.getCell(5));
        if (tx.jenis === 'pendapatan') {
          txRow.getCell(5).font = { color: { argb: 'FF16A34A' } };
        } else {
          txRow.getCell(5).font = { color: { argb: 'FFDC2626' } };
        }
        rowNum += 1;
      });
    }
    
    rowNum += 1;
  });
  
  const totalRow = sheet.getRow(rowNum);
  const totalMasuk = arusKasBulanan.reduce((sum, r) => sum + r.kasMasuk, 0);
  const totalKeluar = arusKasBulanan.reduce((sum, r) => sum + r.kasKeluar, 0);
  const totalBersih = totalMasuk - totalKeluar;
  
  totalRow.values = ['Total', totalMasuk, totalKeluar, totalBersih, totalBersih];
  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  applyCurrency(totalRow.getCell(2));
  if (totalMasuk > 0) totalRow.getCell(2).font = { bold: true, color: { argb: 'FF16A34A' } };
  
  applyCurrency(totalRow.getCell(3));
  if (totalKeluar > 0) totalRow.getCell(3).font = { bold: true, color: { argb: 'FFDC2626' } };
  
  applyCurrency(totalRow.getCell(4));
  if (totalBersih > 0) {
    totalRow.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
    totalRow.getCell(5).font = { bold: true, color: { argb: 'FF16A34A' } };
  } else if (totalBersih < 0) {
    totalRow.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } };
    totalRow.getCell(5).font = { bold: true, color: { argb: 'FFDC2626' } };
  }
  applyCurrency(totalRow.getCell(5));

  sheet.columns = [
    { width: 22 },
    { width: 28 },
    { width: 48 },
    { width: 20 },
    { width: 20 },
  ];
}

export async function buildFinanceExportWorkbook({
  project,
  rabItems,
  transactions,
  startMonth,
  endMonth,
  modeLabel,
}: FinanceExportWorkbookInput) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arina Agri';
  workbook.created = new Date();

  writeRabSheet(workbook.addWorksheet('RAB'), project, rabItems, modeLabel);
  writeLedgerSheet(workbook.addWorksheet('Catatan Transaksi Harian'), project, transactions, rabItems, modeLabel);
  writeIncomeStatementSheet(workbook.addWorksheet('Laporan Laba Rugi'), project, rabItems, transactions, modeLabel);
  writeCashFlowSheet(workbook.addWorksheet('Arus Kas'), project, transactions, startMonth, endMonth, modeLabel);

  return workbook;
}
