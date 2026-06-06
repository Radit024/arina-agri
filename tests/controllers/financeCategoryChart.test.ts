import { describe, expect, it } from 'vitest';
import { buildFinanceExpensePieData } from '@/controllers/keuangan/financeCategoryChart';

const categories = [
  {
    id: 'fertilizer',
    jenis: 'pengeluaran' as const,
    label: 'Pupuk',
    aliases: ['pupuk', 'pembelian pupuk'],
    color: '#16a34a',
  },
  {
    id: 'other',
    jenis: 'pengeluaran' as const,
    label: 'Lainnya',
    aliases: ['lainnya'],
    color: '#64748b',
  },
];

describe('buildFinanceExpensePieData', () => {
  it('counts default aliases and custom categories in the pie chart', () => {
    const result = buildFinanceExpensePieData({
      transactions: [
        {
          jenis: 'pengeluaran',
          kategori: 'pembelian',
          keterangan: 'pupuk',
          nominal: 50_000,
        },
        {
          jenis: 'pengeluaran',
          kategori: 'Transport',
          keterangan: 'bensin kirim cabai',
          nominal: 25_000,
        },
        {
          jenis: 'pendapatan',
          kategori: 'Penjualan Hasil Panen',
          keterangan: 'cabai',
          nominal: 200_000,
        },
      ],
      categories,
      customColors: ['#0f766e'],
    });

    expect(result.data).toEqual([
      { id: 'Pupuk', value: 50_000, label: 'Pupuk', color: '#16a34a' },
      { id: 'Transport', value: 25_000, label: 'Transport', color: '#0f766e' },
    ]);
    expect(result.colors).toEqual(['#16a34a', '#0f766e']);
  });

  it('returns the empty slice when there are no expenses', () => {
    const result = buildFinanceExpensePieData({
      transactions: [],
      categories,
      customColors: ['#0f766e'],
      emptyLabel: 'Kosong',
    });

    expect(result.data).toEqual([{ id: 'Kosong', value: 1, label: 'Kosong', color: '#e2e8f0' }]);
    expect(result.colors).toEqual(['#e2e8f0']);
  });
});
