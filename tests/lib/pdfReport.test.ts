import { describe, expect, it } from 'vitest';

import { buildPdfReportTables } from '@/lib/pdfReport';
import type { FinanceProject, RabItem } from '@/lib/finance/rabTypes';

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

describe('buildPdfReportTables', () => {
  it('builds report sections for RAB and daily transaction ledger', () => {
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
    });

    expect(tables.map((table) => table.title)).toEqual([
      'RENCANA ANGGARAN BIAYA (RAB)',
      'CATATAN TRANSAKSI HARIAN',
    ]);
    expect(tables.find((table) => table.title === 'RENCANA ANGGARAN BIAYA (RAB)')?.body[0]).toContain('Pupuk Urea');
    expect(tables.find((table) => table.title === 'CATATAN TRANSAKSI HARIAN')?.body[0]).toContain('rab-pupuk');
  });
});
