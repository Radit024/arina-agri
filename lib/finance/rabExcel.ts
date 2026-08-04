import ExcelJS from 'exceljs';

import { formatDateLong, formatMonthYear } from '@/lib/formatters';
import { buildMonthRange } from './rabCalculations';
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
}

export interface ParsedRabWorkbook {
  project: FinanceProject;
  categories: RabCategory[];
  items: RabItem[];
  transactions: ParsedLedgerTransaction[];
  skippedRows: RabParseSkippedRow[];
  reconciliation: RabCategoryReconciliation[];
}

export interface FinanceExportWorkbookInput {
  project: FinanceProject;
  rabItems: RabItem[];
  transactions: FinanceTransactionForReport[];
  startMonth: string;
  endMonth: string;
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
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
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
          reason: `Section '${description}' dan baris di bawahnya dilewati (bukan item RAB)`,
        });
        skipSection = true;
        return;
      }
      skipSection = false;
      currentCategory = description;
      currentType = /pendapatan|penerimaan/i.test(description) ? 'income' : currentType;
      return;
    }

    if (skipSection) return;
    if (!description) return;
    if (IGNORED_RAB_SUMMARY_ROW_PATTERN.test(normalizedDescription)) {
      captureDeclaredTotal(normalizedDescription, plannedTotal);
      skippedRows.push({
        rowNumber,
        description,
        reason: `Baris '${description}' dilewati (cocok pola ringkasan: total/subtotal/dll)`,
      });
      return;
    }
    // Rows without a planned total are derivation helpers (e.g. "Produksi", "Harga pasar")
    // that feed the real income row rather than standalone transactions.
    if (plannedTotal === 0) {
      skippedRows.push({
        rowNumber,
        description,
        reason: `Baris '${description}' dilewati (Total Rencana kosong — kemungkinan baris bantu)`,
      });
      return;
    }

    const type: RabEntryType = currentType === 'income' || /penerimaan|penjualan/i.test(description) ? 'income' : 'expense';
    const categoryName = type === 'income' ? 'Pendapatan' : currentCategory;
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
      plannedTotal: plannedTotal || volume * unitPrice,
      plannedCashMonth: undefined,
      aliases: [description],
      sortOrder: items.length + 1,
    });
    computedTotals.set(categoryId, (computedTotals.get(categoryId) ?? 0) + (plannedTotal || volume * unitPrice));
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
    transactions: ledgerResult.transactions,
    skippedRows: [...skippedRows, ...ledgerResult.skippedRows],
    reconciliation,
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
        reason: `Baris '${keterangan}' dilewati (format tanggal tidak dikenali)`,
      });
      return;
    }

    const pengeluaran = columns.pengeluaran ? getNumericCellValue(row.getCell(columns.pengeluaran)) : 0;
    const pemasukan = columns.pemasukan ? getNumericCellValue(row.getCell(columns.pemasukan)) : 0;
    if (pengeluaran === 0 && pemasukan === 0) {
      skippedRows.push({
        rowNumber,
        description: keterangan,
        reason: `Baris '${keterangan}' dilewati (tidak ada nominal pengeluaran/pemasukan)`,
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

  return { transactions, skippedRows };
}

export async function parseRabWorkbookFromArrayBuffer(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return parseRabWorkbook(workbook);
}

function writeRabSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, rabItems: RabItem[]) {
  // Layout mirrors the user's reference RAB template: title / project name / season on
  // rows 1-3, header on row 6 (rows 4-5 blank), sections marked with letters (A, B, C...)
  // each ending in a "TOTAL" row, a grand "TOTAL BIAYA PRODUKSI" row, then an "ESTIMASI
  // PENDAPATAN" section ending in "Keuntungan" (pendapatan - biaya produksi).
  applyTitle(sheet, 'RENCANA ANGGARAN BIAYA (RAB)', project.name, project.seasonLabel);
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

function writeLedgerSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, transactions: FinanceTransactionForReport[], rabItems: RabItem[]) {
  applyTitle(sheet, 'CATATAN TRANSAKSI HARIAN', `${project.name} PADA ${project.seasonLabel}`);
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

function writeIncomeStatementSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, rabItems: RabItem[]) {
  applyTitle(sheet, 'LAPORAN LABA RUGI RENCANA', project.name);
  sheet.getRow(4).values = ['Jenis', 'Kategori', 'Item', 'Jumlah Rencana'];
  applyHeader(sheet.getRow(4));

  rabItems.forEach((item, index) => {
    const rowNumber = index + 5;
    sheet.getRow(rowNumber).values = [
      item.type === 'income' ? 'Pendapatan' : 'Pengeluaran',
      item.categoryName ?? item.categoryId,
      item.name,
      item.plannedTotal,
    ];
    applyCurrency(sheet.getCell(rowNumber, 4));
  });

  const totalRow = rabItems.length + 6;
  sheet.getCell(totalRow, 3).value = 'Laba/Rugi Rencana';
  sheet.getCell(totalRow, 4).value = rabItems.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.plannedTotal, 0)
    - rabItems.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.plannedTotal, 0);
  sheet.getRow(totalRow).font = { bold: true };
  applyCurrency(sheet.getCell(totalRow, 4));
  applyTableBorders(sheet, 4, totalRow, 1, 4);
  sheet.columns = [{ width: 16 }, { width: 24 }, { width: 36 }, { width: 18 }];
}

function writeCashFlowSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, rabItems: RabItem[], startMonth: string, endMonth: string) {
  applyTitle(sheet, 'ARUS KAS RENCANA', project.name);
  const months = buildMonthRange(startMonth, endMonth);
  sheet.getRow(4).values = ['Deskripsi', ...months.map(formatMonthYear), 'Total'];
  applyHeader(sheet.getRow(4));

  const rows = [
    { label: 'Kas Masuk Rencana', type: 'income' as const },
    { label: 'Kas Keluar Rencana', type: 'expense' as const },
  ];

  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 5;
    sheet.getCell(rowNumber, 1).value = row.label;
    months.forEach((month, monthIndex) => {
      const value = rabItems
        .filter((item) => item.type === row.type && item.plannedCashMonth === month)
        .reduce((sum, item) => sum + item.plannedTotal, 0);
      sheet.getCell(rowNumber, monthIndex + 2).value = value;
      applyCurrency(sheet.getCell(rowNumber, monthIndex + 2));
    });
    sheet.getCell(rowNumber, months.length + 2).value = { formula: `SUM(B${rowNumber}:${String.fromCharCode(65 + months.length)}${rowNumber})` };
    applyCurrency(sheet.getCell(rowNumber, months.length + 2));
  });

  const netRow = 7;
  sheet.getCell(netRow, 1).value = 'Arus Kas Bersih Rencana';
  months.forEach((_, monthIndex) => {
    const col = String.fromCharCode(66 + monthIndex);
    sheet.getCell(netRow, monthIndex + 2).value = { formula: `${col}5-${col}6` };
    applyCurrency(sheet.getCell(netRow, monthIndex + 2));
  });
  sheet.getCell(netRow, months.length + 2).value = { formula: `SUM(B${netRow}:${String.fromCharCode(65 + months.length)}${netRow})` };
  applyCurrency(sheet.getCell(netRow, months.length + 2));
  sheet.getRow(netRow).font = { bold: true };
  applyTableBorders(sheet, 4, netRow, 1, months.length + 2);
  sheet.columns = [{ width: 28 }, ...months.map(() => ({ width: 16 })), { width: 18 }];
}

export async function buildFinanceExportWorkbook({
  project,
  rabItems,
  transactions,
  startMonth,
  endMonth,
}: FinanceExportWorkbookInput) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arina Agri';
  workbook.created = new Date();

  writeRabSheet(workbook.addWorksheet('RAB'), project, rabItems);
  writeLedgerSheet(workbook.addWorksheet('Catatan Transaksi Harian'), project, transactions, rabItems);
  writeIncomeStatementSheet(workbook.addWorksheet('Laporan Laba Rugi'), project, rabItems);
  writeCashFlowSheet(workbook.addWorksheet('Arus Kas'), project, rabItems, startMonth, endMonth);

  return workbook;
}
