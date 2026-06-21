import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateFinancialAnalysis } from '@/lib/server/ai/gemini';

const generateContentMock = vi.fn(async (prompt: string) => ({
  response: {
    text: () => `ANALYSIS:${prompt}`,
  },
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: generateContentMock,
    })),
  })),
}));

describe('generateFinancialAnalysis finance planning context', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    generateContentMock.mockClear();
  });

  it('injects project, RAB, income statement comparison, and cash flow comparison into the AI prompt', async () => {
    await generateFinancialAnalysis({
      reportData: {
        periode: 'Juni 2026 - September 2026',
        totalPendapatan: 0,
        totalPengeluaran: 750000,
        labaBersih: -750000,
        userName: 'Daffa',
        project: {
          id: 'project-padi',
          name: 'Padi 1 Ha',
          commodity: 'Padi',
          landArea: 1,
          landAreaUnit: 'Ha',
          seasonLabel: 'Musim Tanam 2026',
          startDate: '2026-06-01',
          endDate: '2026-09-30',
          status: 'active',
        },
        rabItems: [
          {
            id: 'rab-pupuk',
            projectId: 'project-padi',
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
        ],
        transactions: [
          {
            id: 'tx-pupuk',
            jenis: 'pengeluaran',
            kategori: 'Pupuk',
            nominal: 750000,
            tanggal: '2026-06-05',
            keterangan: 'Beli pupuk urea',
          },
        ],
        incomeStatementComparison: {
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
        },
        cashFlowComparison: {
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
        },
      },
    });

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const mergedPrompt = String(generateContentMock.mock.calls[0][0]);
    expect(mergedPrompt).toContain('PROYEK USAHA TANI');
    expect(mergedPrompt).toContain('Padi 1 Ha');
    expect(mergedPrompt).toContain('RENCANA ANGGARAN BIAYA (RAB)');
    expect(mergedPrompt).toContain('Pupuk Urea');
    expect(mergedPrompt).toContain('LAPORAN LABA RUGI RENCANA VS AKTUAL');
    expect(mergedPrompt).toContain('Hemat');
    expect(mergedPrompt).toContain('ARUS KAS RENCANA VS AKTUAL');
    expect(mergedPrompt).toContain('Juni 2026');
    expect(mergedPrompt).toContain('rekomendasi wajib mempertimbangkan deviasi RAB vs aktual');
  });
});
