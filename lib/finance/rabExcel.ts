import ExcelJS from 'exceljs';

import { formatDateLong, formatMonthYear } from '@/lib/formatters';
import {
  buildCashFlowComparison,
  buildIncomeStatementComparison,
  buildMonthRange,
} from './rabCalculations';
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
const COMPARISON_FILL = 'FFDBEAFE';
const BORDER_COLOR = 'FFCBD5E1';
const IGNORED_RAB_SUMMARY_ROW_PATTERN = /total|keuntungan|hpp|bep|ratio|bagi hasil/i;

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

export interface ParsedRabWorkbook {
  project: FinanceProject;
  categories: RabCategory[];
  items: RabItem[];
  transactions: ParsedLedgerTransaction[];
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

function applyTitle(sheet: ExcelJS.Worksheet, title: string, subtitle?: string) {
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

function applyPercent(cell: ExcelJS.Cell) {
  cell.numFmt = '0.0%;[Red]-0.0%;"-"';
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
  let currentCategory = 'RAB';
  let currentType: RabEntryType = 'expense';
  let skipSection = false;

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
        skipSection = true;
        return;
      }
      skipSection = false;
      currentCategory = description;
      currentType = /pendapatan|penerimaan/i.test(description) ? 'income' : currentType;
      return;
    }

    if (skipSection) return;
    if (!description || IGNORED_RAB_SUMMARY_ROW_PATTERN.test(normalizedDescription)) return;
    // Rows without a planned total are derivation helpers (e.g. "Produksi", "Harga pasar")
    // that feed the real income row rather than standalone transactions.
    if (plannedTotal === 0) return;

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
  });

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
    transactions: parseLedgerWorkbook(workbook),
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

export function parseLedgerWorkbook(workbook: ExcelJS.Workbook): ParsedLedgerTransaction[] {
  const sheet = workbook.worksheets.find((worksheet) => /catatan|transaksi harian|buku besar|ledger/i.test(worksheet.name))
    ?? workbook.worksheets[1];
  if (!sheet) return [];

  const header = findLedgerHeaderRow(sheet);
  if (!header) return [];
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

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    const keterangan = getTextCellValue(row.getCell(columns.keterangan));
    if (!keterangan) return;

    const tanggal = getDateCellIso(row.getCell(columns.tanggal), referenceYear);
    if (!tanggal) return;

    const pengeluaran = columns.pengeluaran ? getNumericCellValue(row.getCell(columns.pengeluaran)) : 0;
    const pemasukan = columns.pemasukan ? getNumericCellValue(row.getCell(columns.pemasukan)) : 0;
    if (pengeluaran === 0 && pemasukan === 0) return;

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

  return transactions;
}

export async function parseRabWorkbookFromArrayBuffer(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return parseRabWorkbook(workbook);
}

function writeRabSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, rabItems: RabItem[]) {
  applyTitle(sheet, 'RENCANA ANGGARAN BIAYA (RAB)', `${project.name} - ${project.seasonLabel}`);
  sheet.getRow(4).values = ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN (RP)', 'TOTAL RENCANA', 'BULAN KAS'];
  applyHeader(sheet.getRow(4));

  let rowNumber = 5;
  let currentCategory = '';
  rabItems.forEach((item, index) => {
    if (item.categoryName !== currentCategory) {
      currentCategory = item.categoryName ?? item.categoryId;
      sheet.getCell(rowNumber, 1).value = currentCategory;
      sheet.mergeCells(rowNumber, 1, rowNumber, 7);
      sheet.getRow(rowNumber).font = { bold: true };
      sheet.getRow(rowNumber).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: item.type === 'income' ? INCOME_FILL : EXPENSE_FILL },
      };
      rowNumber += 1;
    }

    sheet.getRow(rowNumber).values = [
      index + 1,
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
  });

  sheet.getCell(rowNumber, 2).value = 'TOTAL PENDAPATAN RENCANA';
  sheet.getCell(rowNumber, 6).value = { formula: `SUMIF(G5:G${rowNumber - 1},"<>",F5:F${rowNumber - 1})`, result: rabItems.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.plannedTotal, 0) };
  sheet.getRow(rowNumber).font = { bold: true };
  applyCurrency(sheet.getCell(rowNumber, 6));
  applyTableBorders(sheet, 4, rowNumber, 1, 7);
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
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

function writeLedgerSheet(sheet: ExcelJS.Worksheet, project: FinanceProject, transactions: FinanceTransactionForReport[]) {
  applyTitle(sheet, 'CATATAN TRANSAKSI HARIAN', project.name);
  sheet.getRow(4).values = ['Tanggal', 'Uraian Transaksi', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Pengeluaran (Rp)', 'Pemasukan (Rp)', 'Item RAB'];
  applyHeader(sheet.getRow(4));

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
      transaction.rabItemId ?? '-',
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

function writeComparisonSheet(
  sheet: ExcelJS.Worksheet,
  project: FinanceProject,
  rabItems: RabItem[],
  transactions: FinanceTransactionForReport[],
  startMonth: string,
  endMonth: string,
) {
  applyTitle(sheet, 'PERBANDINGAN RENCANA VS AKTUAL', project.name);
  const incomeStatement = buildIncomeStatementComparison({ rabItems, transactions });
  const cashFlow = buildCashFlowComparison({ rabItems, transactions, startMonth, endMonth });

  sheet.getRow(4).values = ['Metric', 'Rencana', 'Aktual', 'Selisih'];
  applyHeader(sheet.getRow(4), COMPARISON_FILL);
  const kpis = [
    ['Pendapatan', incomeStatement.summary.plannedIncome, incomeStatement.summary.actualIncome, incomeStatement.summary.actualIncome - incomeStatement.summary.plannedIncome],
    ['Pengeluaran', incomeStatement.summary.plannedExpense, incomeStatement.summary.actualExpense, incomeStatement.summary.actualExpense - incomeStatement.summary.plannedExpense],
    ['Laba/Rugi', incomeStatement.summary.plannedProfit, incomeStatement.summary.actualProfit, incomeStatement.summary.profitVariance],
  ];
  kpis.forEach((row, index) => {
    const rowNumber = index + 5;
    sheet.getRow(rowNumber).values = row;
    [2, 3, 4].forEach((col) => applyCurrency(sheet.getCell(rowNumber, col)));
  });

  const tableStart = 10;
  sheet.getRow(tableStart).values = ['Kategori', 'Item', 'Jenis', 'Rencana', 'Aktual', 'Selisih', '% Selisih', 'Status'];
  applyHeader(sheet.getRow(tableStart), COMPARISON_FILL);
  incomeStatement.rows.forEach((row, index) => {
    const rowNumber = tableStart + index + 1;
    sheet.getRow(rowNumber).values = [
      row.categoryName,
      row.itemName,
      row.type === 'income' ? 'Pendapatan' : 'Pengeluaran',
      row.planned,
      row.actual,
      row.variance,
      row.variancePercent,
      row.status,
    ];
    [4, 5, 6].forEach((col) => applyCurrency(sheet.getCell(rowNumber, col)));
    applyPercent(sheet.getCell(rowNumber, 7));
  });

  const cashStart = tableStart + incomeStatement.rows.length + 4;
  sheet.getRow(cashStart).values = ['Bulan', 'Kas Masuk Rencana', 'Kas Masuk Aktual', 'Kas Keluar Rencana', 'Kas Keluar Aktual', 'Bersih Rencana', 'Bersih Aktual', 'Selisih'];
  applyHeader(sheet.getRow(cashStart), COMPARISON_FILL);
  cashFlow.rows.forEach((row, index) => {
    const rowNumber = cashStart + index + 1;
    sheet.getRow(rowNumber).values = [
      formatMonthYear(row.month),
      row.plannedInflow,
      row.actualInflow,
      row.plannedOutflow,
      row.actualOutflow,
      row.plannedNet,
      row.actualNet,
      row.variance,
    ];
    [2, 3, 4, 5, 6, 7, 8].forEach((col) => applyCurrency(sheet.getCell(rowNumber, col)));
  });

  applyTableBorders(sheet, 4, Math.max(cashStart + cashFlow.rows.length, 7), 1, 8);
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.columns = [
    { width: 22 },
    { width: 28 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 20 },
  ];
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
  writeLedgerSheet(workbook.addWorksheet('Catatan Transaksi Harian'), project, transactions);
  writeIncomeStatementSheet(workbook.addWorksheet('Laporan Laba Rugi'), project, rabItems);
  writeCashFlowSheet(workbook.addWorksheet('Arus Kas'), project, rabItems, startMonth, endMonth);
  writeComparisonSheet(
    workbook.addWorksheet('Perbandingan Rencana vs Aktual'),
    project,
    rabItems,
    transactions,
    startMonth,
    endMonth,
  );

  return workbook;
}
