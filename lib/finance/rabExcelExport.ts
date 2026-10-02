import type ExcelJS from 'exceljs';

import { formatDateLong, formatDateShort, formatMonthYear } from '@/lib/formatters';
import { buildIncomeStatementWorksheetData } from '@/lib/finance/incomeStatementWorksheet';
import { computeArusKasBulanan } from '@/lib/finance/scenarioCalculations';
import type {
  FinanceProject,
  FinanceTransactionForReport,
  RabEntryType,
  RabItem,
} from '@/lib/finance/rabTypes';
import type { FinanceExportWorkbookInput } from './rabExcelTypes';

/**
 * Sisi tulis: merakit workbook Excel dari data domain.
 *
 * Token warna dan helper format ada di sini, bukan di `rabExcelParse.ts`,
 * supaya perubahan tampilan ekspor tidak menyentuh logika baca.
 */
const HEADER_FILL = 'FF166534';
const SUBHEADER_FILL = 'FFE2E8F0';
const INCOME_FILL = 'FFDCFCE7';
const EXPENSE_FILL = 'FFFFEDD5';
const BORDER_COLOR = 'FFCBD5E1';

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

  const isExpense = (type: string) => type === 'expense' || type === 'pengeluaran';
  const isIncome = (type: string) => type === 'income' || type === 'pendapatan';

  const expenseGroups = groupRabItemsByCategory(rabItems.filter((item) => isExpense(item.type)));
  const incomeGroups = groupRabItemsByCategory(rabItems.filter((item) => isIncome(item.type)));

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
  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeA = new Date(a.tanggal).getTime();
    const timeB = new Date(b.tanggal).getTime();
    if (isNaN(timeA) || isNaN(timeB)) {
      return a.tanggal.localeCompare(b.tanggal);
    }
    return timeA - timeB;
  });

  sortedTransactions.forEach((transaction, index) => {
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
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arina Agri';
  workbook.created = new Date();

  writeRabSheet(workbook.addWorksheet('RAB'), project, rabItems, modeLabel);
  writeLedgerSheet(workbook.addWorksheet('Catatan Transaksi Harian'), project, transactions, rabItems, modeLabel);
  writeIncomeStatementSheet(workbook.addWorksheet('Laporan Laba Rugi'), project, rabItems, transactions, modeLabel);
  writeCashFlowSheet(workbook.addWorksheet('Arus Kas'), project, transactions, startMonth, endMonth, modeLabel);

  return workbook;
}
