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

  it('maps dolomit and herbisida to SAPRODI master category (Directive C)', () => {
    const resolvedDolomit = resolveFinanceCategory({
      jenis: 'pengeluaran',
      kategori: 'Lainnya',
      keterangan: 'Pembelian dolomit',
      categories: DEFAULT_FINANCE_CATEGORIES,
    });
    expect(resolvedDolomit?.label).toBe('SAPRODI');

    const resolvedHerbisida = resolveFinanceCategory({
      jenis: 'pengeluaran',
      kategori: 'Pestisida',
      keterangan: 'Pembelian herbisida persiapan lahan',
      categories: DEFAULT_FINANCE_CATEGORIES,
    });
    expect(resolvedHerbisida?.label).toBe('SAPRODI');
  });

  it('maps upah penyulaman to TENAGA KERJA master category (Directive C)', () => {
    const resolvedUpah = resolveFinanceCategory({
      jenis: 'pengeluaran',
      kategori: 'Tenaga Kerja',
      keterangan: 'Pembayaran upah penyulaman tanaman',
      categories: DEFAULT_FINANCE_CATEGORIES,
    });
    expect(resolvedUpah?.label).toBe('TENAGA KERJA');
  });
});
