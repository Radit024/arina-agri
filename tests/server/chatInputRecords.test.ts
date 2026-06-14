import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordFinanceCommand, recordStockOutCommand } from '@/lib/server/chat-input/records';

// ─── Mock Builders ────────────────────────────────────────────────────────────

function makeInsertBuilder(result: unknown) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: result, error: null })),
      })),
    })),
  };
}

function makeMissingCategoryBuilder() {
  return {
    select: vi.fn(() => ({
      or: vi.fn(async () => ({
        data: null,
        error: { message: 'relation finance_categories does not exist' },
      })),
    })),
  };
}

// ─── Finance ──────────────────────────────────────────────────────────────────

describe('recordFinanceCommand', () => {
  it('inserts a transaction and returns a formatted Indonesian summary', async () => {
    const transactions = makeInsertBuilder({ id: 'tx-1' });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'finance_categories') return makeMissingCategoryBuilder();
        if (table === 'transactions') return transactions;
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const result = await recordFinanceCommand(
      supabase,
      'user-1',
      { type: 'finance', jenis: 'pengeluaran', kategori: 'pupuk', nominal: 50000, keterangan: 'beli npk' },
      new Date('2026-06-03T00:00:00.000Z'),
    );

    expect(result.summary).toContain('Pengeluaran');
    expect(result.summary).toMatch(/Rp\s?50\.000/);
    expect(result.summary).toContain('berhasil dicatat');
    expect(transactions.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        jenis: 'pengeluaran',
        kategori: 'Pupuk',
        kategori_snapshot: 'Pupuk',
        nominal: 50000,
        keterangan: 'beli npk',
      }),
    );
  });

  it('labels pemasukan correctly', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'finance_categories') return makeMissingCategoryBuilder();
        if (table === 'transactions') return makeInsertBuilder({ id: 'tx-2' });
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const result = await recordFinanceCommand(
      supabase,
      'user-1',
      { type: 'finance', jenis: 'pendapatan', kategori: 'penjualan', nominal: 750000, keterangan: 'cabai' },
      new Date(),
    );

    expect(result.summary).toContain('Pemasukan');
    expect(result.summary).toMatch(/Rp\s?750\.000/);
  });

  it('stores master category metadata when a matching category alias exists', async () => {
    const transactions = makeInsertBuilder({ id: 'tx-3' });
    const categoryOr = vi.fn(async () => ({
      data: [
        {
          id: 'cat-pupuk',
          user_id: null,
          jenis: 'pengeluaran',
          name: 'Pupuk',
          aliases: ['pupuk', 'pembelian pupuk'],
          color: '#16a34a',
          is_default: true,
        },
      ],
      error: null,
    }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'finance_categories') {
          return {
            select: vi.fn(() => ({
              or: categoryOr,
            })),
          };
        }

        if (table === 'transactions') return transactions;
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    await recordFinanceCommand(
      supabase,
      'user-1',
      { type: 'finance', jenis: 'pengeluaran', kategori: 'pembelian', nominal: 50000, keterangan: 'pupuk' },
      new Date('2026-06-03T00:00:00.000Z'),
    );

    expect(transactions.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        category_id: 'cat-pupuk',
        kategori: 'Pupuk',
        kategori_snapshot: 'Pupuk',
        keterangan: 'pupuk',
      }),
    );
  });

  it('throws when Supabase returns an error', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'finance_categories') return makeMissingCategoryBuilder();
        if (table === 'transactions') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: null, error: { message: 'DB error' } })),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    await expect(
      recordFinanceCommand(
        supabase,
        'user-1',
        { type: 'finance', jenis: 'pengeluaran', kategori: 'pupuk', nominal: 50000, keterangan: '' },
        new Date(),
      ),
    ).rejects.toThrow('DB error');
  });
});

// ─── Stock Out ────────────────────────────────────────────────────────────────

describe('recordStockOutCommand', () => {
  it('rejects stock out when remaining stock is insufficient', async () => {
    const batchSingle = vi.fn(async () => ({
      data: {
        id: 'batch-1',
        batch_code: 'BATCH-001-A',
        berat_masuk: 50,
        stok_tersisa: 10,
        estimasi_kadaluarsa: '2026-06-20',
      },
      error: null,
    }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'harvest_batches') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({ single: batchSingle })),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    await expect(
      recordStockOutCommand(
        supabase,
        'user-1',
        { type: 'stock_out', batchCode: 'BATCH-001-A', berat: 20, tujuan: 'Pasar Lokal', catatan: '' },
        new Date('2026-06-03T00:00:00.000Z'),
      ),
    ).rejects.toThrow('Stok tidak cukup');
  });

  it('throws when batch is not found', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: { message: 'No rows found' } })),
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(
      recordStockOutCommand(
        supabase,
        'user-1',
        { type: 'stock_out', batchCode: 'BATCH-999-Z', berat: 5, tujuan: 'Lainnya', catatan: '' },
        new Date(),
      ),
    ).rejects.toThrow('BATCH-999-Z tidak ditemukan');
  });
});
