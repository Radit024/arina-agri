import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { buildFinanceExportWorkbook, parseRabWorkbook } from '@/lib/finance/rabExcel';
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

  it('builds export workbook with the expected five worksheets', async () => {
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
      'Perbandingan Rencana vs Aktual',
    ]);
    expect(workbook.getWorksheet('Perbandingan Rencana vs Aktual')?.getCell('A1').value).toBe('PERBANDINGAN RENCANA VS AKTUAL');
  });
});
