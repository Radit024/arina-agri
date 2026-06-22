import { describe, expect, it } from 'vitest';

import { buildPdfReportTables } from '@/lib/pdfReport';
import type {
  CashFlowComparison,
  FinanceProject,
  IncomeStatementComparison,
  RabItem,
} from '@/lib/finance/rabTypes';

const project: FinanceProject = {
  id: 'project-padi',
  name: 'Padi 1 Ha',
  commodity: 'Padi',
  landArea: 1,
  landAreaUnit: 'Ha',
  seasonLabel: 'Musim Tanam 2026',
  startDate: '2026-06-01',
  endDate: '2026-09-30',
  status: 'active',
};

const rabItems: RabItem[] = [
  {
    id: 'rab-pupuk',
    projectId: project.id,
    categoryId: 'saprodi',
    categoryName: 'Saprodi',
    type: 'expense',
    name: 'Pupuk Urea',
    volume: 10,
    unit: 'karung',
    unitPrice: 200000,
    plannedTotal: 2000000,
    plannedCashMonth: '2026-06',
    aliases: ['urea'],
    sortOrder: 1,
  },
];

const incomeStatementComparison: IncomeStatementComparison = {
  rows: [
    {
      categoryId: 'saprodi',
      categoryName: 'Saprodi',
      itemId: 'rab-pupuk',
      itemName: 'Pupuk Urea',
      type: 'expense',
      planned: 2000000,
      actual: 750000,
      variance: -1250000,
      variancePercent: -0.625,
      status: 'hemat',
    },
  ],
  summary: {
    plannedIncome: 0,
    plannedExpense: 2000000,
    plannedProfit: -2000000,
    actualIncome: 0,
    actualExpense: 750000,
    actualProfit: -750000,
    profitVariance: 1250000,
    profitVariancePercent: -0.625,
  },
};

const cashFlowComparison: CashFlowComparison = {
  rows: [
    {
      month: '2026-06',
      plannedInflow: 0,
      actualInflow: 0,
      plannedOutflow: 2000000,
      actualOutflow: 750000,
      plannedNet: -2000000,
      actualNet: -750000,
      plannedCumulative: -2000000,
      actualCumulative: -750000,
      variance: 1250000,
      variancePercent: -0.625,
    },
  ],
  summary: {
    plannedInflow: 0,
    actualInflow: 0,
    plannedOutflow: 2000000,
    actualOutflow: 750000,
    plannedNet: -2000000,
    actualNet: -750000,
    variance: 1250000,
    variancePercent: -0.625,
  },
};

describe('buildPdfReportTables', () => {
  it('builds report sections equivalent to the finance Excel export scope', () => {
    const tables = buildPdfReportTables({
      periode: 'semua',
      periodeLabel: 'Semua Bulan',
      totalPendapatan: 0,
      totalPengeluaran: 750000,
      labaBersih: -750000,
      project,
      rabItems,
      transactions: [
        {
          id: 'tx-1',
          jenis: 'pengeluaran',
          kategori: 'Pupuk',
          nominal: 750000,
          tanggal: '2026-06-05',
          keterangan: 'Beli pupuk urea',
          volume: 3,
          satuan: 'karung',
          hargaSatuan: 250000,
          rabItemId: 'rab-pupuk',
        },
      ],
      incomeStatementComparison,
      cashFlowComparison,
    });

    expect(tables.map((table) => table.title)).toEqual([
      'RENCANA ANGGARAN BIAYA (RAB)',
      'CATATAN TRANSAKSI HARIAN',
      'LAPORAN LABA RUGI',
      'ARUS KAS',
      'PERBANDINGAN RENCANA VS AKTUAL',
    ]);
    expect(tables.find((table) => table.title === 'RENCANA ANGGARAN BIAYA (RAB)')?.body[0]).toContain('Pupuk Urea');
    expect(tables.find((table) => table.title === 'CATATAN TRANSAKSI HARIAN')?.body[0]).toContain('rab-pupuk');
    expect(tables.find((table) => table.title === 'LAPORAN LABA RUGI')?.body[0]).toContain('Hemat');
    expect(tables.find((table) => table.title === 'ARUS KAS')?.body[0]).toContain('Juni 2026');
  });
});
