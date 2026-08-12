

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { buildFinanceExportWorkbook, parseLedgerWorkbook, parseRabWorkbook } from '@/lib/finance/rabExcel';
import type { FinanceProject, FinanceTransactionForReport, RabItem } from '@/lib/finance/rabTypes';


async function buildSampleRabWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('1. RAB PADI 1 Ha');
  sheet.getCell('A1').value = 'RENCANA ANGGARAN BIAYA (RAB)';
  sheet.getCell('A2').value = 'USAHATANI PADI 1 HA';
  sheet.getCell('A3').value = 'MUSIM TANAM 3 (AGUSTUS - DESEMBER 2026)';
  sheet.getRow(6).values = ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN (RP)', 'MT 3 (Gadu)'];
  sheet.getCell('A7').value = 'A';
  sheet.getCell('B7').value = 'BIAYA VARIABEL';
  sheet.getCell('A8').value = 'I';
  sheet.getCell('B8').value = 'SAPRODI';
  sheet.getRow(9).values = [1, 'Benih', 25, 'Kg', 16_500, { formula: 'C9*E9', result: 412_500 }];
  sheet.getCell('B16').value = 'TOTAL';
  sheet.getCell('F16').value = { formula: 'SUM(F9:F15)', result: 412_500 };
  sheet.getCell('A49').value = 'E';
  sheet.getCell('B49').value = 'ESTIMASI PENDAPATAN';
  sheet.getCell('B52').value = 'Penerimaan';
  sheet.getCell('C52').value = 7_000;
  sheet.getCell('D52').value = 'kg';
  sheet.getCell('E52').value = 6_500;
  sheet.getCell('F52').value = { formula: 'C52*E52', result: 45_500_000 };
  sheet.getCell('B58').value = 'Bagi Hasil';
  sheet.getCell('F58').value = { formula: 'F52*40%', result: 18_200_000 };
  return workbook;
}

const project: FinanceProject = {
  id: 'p1',
  name: 'Padi 1 Ha MT 3',
  commodity: 'Padi',
  landArea: 1,
  landAreaUnit: 'Ha',
  seasonLabel: 'MT 3',
  startDate: '2026-08-01',
  endDate: '2026-12-31',
  status: 'active',
};

const rabItems: RabItem[] = [
  {
    id: 'seed',
    projectId: 'p1',
    categoryId: 'saprodi',
    categoryName: 'Saprodi',
    type: 'expense',
    name: 'Benih',
    volume: 25,
    unit: 'Kg',
    unitPrice: 16_500,
    plannedTotal: 412_500,
    plannedCashMonth: '2026-08',
    aliases: ['benih'],
    sortOrder: 1,
  },
];

const transactions: FinanceTransactionForReport[] = [
  {
    id: 'tx1',
    jenis: 'pengeluaran',
    kategori: 'Benih',
    nominal: 412_500,
    tanggal: '2026-08-01',
    keterangan: 'Pembelian benih',
    rabItemId: 'seed',
  },
];

describe('RAB Excel helpers', () => {
  it('parses RAB workbook rows into project and item data', async () => {
    const workbook = await buildSampleRabWorkbook();
    const parsed = parseRabWorkbook(workbook);

    expect(parsed.project.name).toBe('USAHATANI PADI 1 HA');
    expect(parsed.project.seasonLabel).toBe('MUSIM TANAM 3 (AGUSTUS - DESEMBER 2026)');
    expect(parsed.items).toEqual([
      expect.objectContaining({
        name: 'Benih',
        type: 'expense',
        volume: 25,
        unit: 'Kg',
        unitPrice: 16_500,
        plannedTotal: 412_500,
      }),
      expect.objectContaining({
        name: 'Penerimaan',
        type: 'income',
        volume: 7_000,
        unit: 'kg',
        unitPrice: 6_500,
        plannedTotal: 45_500_000,
      }),
    ]);
  });

  it('does not import profit-sharing rows as RAB items', async () => {
    const workbook = await buildSampleRabWorkbook();
    const parsed = parseRabWorkbook(workbook);

    expect(parsed.items.map((item) => item.name.toLowerCase())).not.toContain('bagi hasil');
  });

  it('does not confuse the "Harga Satuan" column header with the "Satuan" column', async () => {
    const workbook = await buildSampleRabWorkbook();
    const ledgerSheet = workbook.addWorksheet('2. Catatan Transaksi Harian');
    ledgerSheet.getRow(4).values = ['Tanggal', 'Uraian Transaksi', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Pengeluaran (Rp)', 'Pemasukan (Rp)'];
    ledgerSheet.getRow(5).values = ['01 Ags', 'Pembelian benih padi', 25, 'Kg', 16_500, 412_500, '-'];

    const parsed = parseRabWorkbook(workbook);

    expect(parsed.transactions).toEqual([
      expect.objectContaining({
        satuan: 'Kg',
        hargaSatuan: 16_500,
      }),
    ]);
  });

  it('builds export workbook with the expected four worksheets', async () => {
    const workbook = await buildFinanceExportWorkbook({
      project,
      rabItems,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'RAB',
      'Catatan Transaksi Harian',
      'Laporan Laba Rugi',
      'Arus Kas',
    ]);
  });

  it('resolves the linked RAB item name (not its raw id) in the ledger sheet', async () => {
    const workbook = await buildFinanceExportWorkbook({
      project,
      rabItems,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    const ledgerSheet = workbook.getWorksheet('Catatan Transaksi Harian');
    expect(ledgerSheet?.getCell('H5').value).toBe('Benih');
  });
});

describe('RAB Excel writer — layout mirrors the reference RAB template', () => {
  const rabItemsWithIncome: RabItem[] = [
    ...rabItems,
    {
      id: 'harvest',
      projectId: 'p1',
      categoryId: 'pendapatan',
      categoryName: 'Pendapatan',
      type: 'income',
      name: 'Penerimaan',
      volume: 7_000,
      unit: 'kg',
      unitPrice: 6_500,
      plannedTotal: 45_500_000,
      aliases: ['penerimaan'],
      sortOrder: 2,
    },
  ];

  it('places the title, project name, and season on rows 1-3 and the header on row 6', async () => {
    const workbook = await buildFinanceExportWorkbook({
      project,
      rabItems: rabItemsWithIncome,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    const rabSheet = workbook.getWorksheet('RAB')!;
    expect(rabSheet.getCell('A1').value).toBe('RENCANA ANGGARAN BIAYA (RAB)');
    expect(rabSheet.getCell('A2').value).toBe(project.name);
    expect(rabSheet.getCell('A3').value).toBe(project.seasonLabel);
    expect(rabSheet.getCell('A6').value).toBe('NO');
    expect(rabSheet.getCell('B6').value).toBe('URAIAN');
  });

  it('marks each category with a letter, resets item numbering, and writes a TOTAL row per category', async () => {
    const workbook = await buildFinanceExportWorkbook({
      project,
      rabItems: rabItemsWithIncome,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    const rabSheet = workbook.getWorksheet('RAB')!;
    expect(rabSheet.getCell('A7').value).toBe('A');
    expect(rabSheet.getCell('B7').value).toBe('Saprodi');
    expect(rabSheet.getCell('A8').value).toBe(1);
    expect(rabSheet.getCell('B8').value).toBe('Benih');
    expect(rabSheet.getCell('B9').value).toBe('TOTAL');
    expect(rabSheet.getCell('F9').value).toEqual(expect.objectContaining({ result: 412_500 }));
  });

  it('writes a grand TOTAL BIAYA PRODUKSI row after all expense categories', async () => {
    const workbook = await buildFinanceExportWorkbook({
      project,
      rabItems: rabItemsWithIncome,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    const rabSheet = workbook.getWorksheet('RAB')!;
    expect(rabSheet.getCell('A10').value).toBe('B');
    expect(rabSheet.getCell('B10').value).toBe('TOTAL BIAYA PRODUKSI');
    expect(rabSheet.getCell('F10').value).toEqual(expect.objectContaining({ result: 412_500 }));
  });

  it('writes an ESTIMASI PENDAPATAN section ending in a Keuntungan row', async () => {
    const workbook = await buildFinanceExportWorkbook({
      project,
      rabItems: rabItemsWithIncome,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    const rabSheet = workbook.getWorksheet('RAB')!;
    expect(rabSheet.getCell('A11').value).toBe('C');
    expect(rabSheet.getCell('B11').value).toBe('ESTIMASI PENDAPATAN');
    expect(rabSheet.getCell('A12').value).toBe(1);
    expect(rabSheet.getCell('B12').value).toBe('Penerimaan');
    expect(rabSheet.getCell('B13').value).toBe('TOTAL PENDAPATAN');
    expect(rabSheet.getCell('F13').value).toEqual(expect.objectContaining({ result: 45_500_000 }));
    expect(rabSheet.getCell('B14').value).toBe('Keuntungan');
    expect(rabSheet.getCell('F14').value).toEqual(expect.objectContaining({ result: 45_500_000 - 412_500 }));
  });

  it('does not write an ESTIMASI PENDAPATAN section or Keuntungan row when there is no income item', async () => {
    const workbook = await buildFinanceExportWorkbook({
      project,
      rabItems,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    const rabSheet = workbook.getWorksheet('RAB')!;
    expect(rabSheet.getCell('B11').value).toBeNull();
  });

  it('combines project name and season into a single subtitle row on the ledger sheet', async () => {
    const workbook = await buildFinanceExportWorkbook({
      project,
      rabItems,
      transactions,
      startMonth: '2026-08',
      endMonth: '2026-12',
    });

    const ledgerSheet = workbook.getWorksheet('Catatan Transaksi Harian')!;
    expect(ledgerSheet.getCell('A2').value).toBe(`${project.name} PADA ${project.seasonLabel}`);
  });
});


describe('RAB Excel parser — reconciliation & skip reporting (P0)', () => {
  it('flags a reconciliation difference when the sheet TOTAL disagrees with the sum of its items', async () => {
    const workbook = await buildSampleRabWorkbook();
    // Sabotage the item's own planned total (as if it were computed with a typo'd unit
    // price) without touching the "TOTAL" row at B16/F16 — this is exactly the scenario
    // reconciliation exists to catch.
    workbook.getWorksheet('1. RAB PADI 1 Ha')!.getCell('F9').value = { formula: 'C9*E9', result: 425_000 };

    const parsed = parseRabWorkbook(workbook);
    const saprodi = parsed.reconciliation.find((entry) => entry.categoryId === 'saprodi');

    expect(saprodi).toBeDefined();
    expect(saprodi!.declaredTotal).toBe(412_500);
    expect(saprodi!.computedTotal).toBe(425_000);
    expect(saprodi!.difference).toBe(12_500);
  });

  it('does not let a cross-category rollup TOTAL row overwrite the immediate subsection TOTAL', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('1. RAB PADI 1 Ha');
    sheet.getCell('A2').value = 'Proyek Uji';
    sheet.getCell('A3').value = 'MT Uji';
    sheet.getCell('A7').value = 'I';
    sheet.getCell('B7').value = 'SAPRODI';
    sheet.getRow(8).values = [1, 'Benih', 25, 'Kg', 16_500, 412_500];
    // Subsection TOTAL comes first — this is the declared total that must win.
    sheet.getCell('B9').value = 'TOTAL';
    sheet.getCell('F9').value = 412_500;
    // A rollup total for a larger scope appears later, still under the same
    // currentCategory ('SAPRODI') because no new category header row has appeared yet.
    sheet.getCell('B10').value = 'TOTAL BIAYA VARIABEL';
    sheet.getCell('F10').value = 99_999_999;

    const parsed = parseRabWorkbook(workbook);
    const saprodi = parsed.reconciliation.find((entry) => entry.categoryId === 'saprodi');

    expect(saprodi).toBeDefined();
    expect(saprodi!.declaredTotal).toBe(412_500);
    expect(saprodi!.difference).toBe(0);
  });

  it('does not produce a reconciliation entry for a category with no TOTAL row in the sheet', async () => {
    const workbook = await buildSampleRabWorkbook();
    const parsed = parseRabWorkbook(workbook);

    expect(parsed.reconciliation.some((entry) => entry.categoryId === 'pendapatan')).toBe(false);
  });

  it('reports a skip reason for helper rows with an empty planned total', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('1. RAB PADI 1 Ha');
    sheet.getCell('A2').value = 'Proyek Uji';
    sheet.getCell('A3').value = 'MT Uji';
    sheet.getCell('A49').value = 'E';
    sheet.getCell('B49').value = 'ESTIMASI PENDAPATAN';
    sheet.getCell('B50').value = 'Produksi';
    sheet.getCell('C50').value = 7_000;
    sheet.getCell('D50').value = 'kg';

    const parsed = parseRabWorkbook(workbook);

    expect(parsed.skippedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'Produksi',
          reason: expect.stringContaining('total biayanya kosong'),
        }),
      ]),
    );
  });

  it('reports a skip reason for ledger rows with an unrecognized date format', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('2. Catatan Transaksi Harian');
    sheet.getRow(4).values = ['Tanggal', 'Uraian Transaksi', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Pengeluaran (Rp)', 'Pemasukan (Rp)'];
    sheet.getRow(5).values = ['15/03/2026', 'Pembelian benih padi', 25, 'Kg', 16_500, 412_500, '-'];

    const parsed = parseLedgerWorkbook(workbook);

    expect(parsed.transactions).toHaveLength(0);
    expect(parsed.skippedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'Pembelian benih padi',
          reason: expect.stringContaining('penulisan tanggalnya tidak dikenali'),
        }),
      ]),
    );
  });

  it.each(['Subtotal Produksi', 'Grand Total Biaya', 'Laba Bersih', 'Margin Usaha'])(
    'excludes "%s" rows from parsed items via the extended ignore pattern',
    async (description) => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('1. RAB PADI 1 Ha');
      sheet.getCell('A2').value = 'Proyek Uji';
      sheet.getCell('A3').value = 'MT Uji';
      sheet.getCell('A7').value = 'I';
      sheet.getCell('B7').value = 'SAPRODI';
      sheet.getRow(8).values = [1, 'Benih', 25, 'Kg', 16_500, 412_500];
      sheet.getCell('B9').value = description;
      sheet.getCell('F9').value = 999_999;

      const parsed = parseRabWorkbook(workbook);

      expect(parsed.items.map((item) => item.name.toLowerCase())).not.toContain(description.toLowerCase());
    },
  );
});
