import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FINANCE_CATEGORIES,
  resolveFinanceCategory,
} from '@/lib/finance/categories';

describe('finance category resolution', () => {
  it('maps Telegram expense wording to the default fertilizer master category', () => {
    const resolved = resolveFinanceCategory({
      jenis: 'pengeluaran',
      kategori: 'pembelian',
      keterangan: 'pupuk',
      categories: DEFAULT_FINANCE_CATEGORIES,
    });

    expect(resolved?.label).toBe('Pupuk');
  });

  it('maps custom aliases to custom categories', () => {
    const resolved = resolveFinanceCategory({
      jenis: 'pengeluaran',
      kategori: 'bensin',
      keterangan: 'kirim cabai',
      categories: [
        ...DEFAULT_FINANCE_CATEGORIES,
        {
          id: 'custom-transport',
          jenis: 'pengeluaran',
          label: 'Transport',
          aliases: ['transport', 'bensin', 'ongkir'],
          source: 'custom',
        },
      ],
    });

    expect(resolved?.label).toBe('Transport');
  });
});
