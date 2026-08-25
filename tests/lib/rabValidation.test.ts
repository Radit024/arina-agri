import { describe, expect, it } from 'vitest';

import { validateRabItemDraft } from '@/controllers/keuangan/useRabController';

function draft(overrides: Record<string, unknown> = {}) {
  return {
    categoryName: 'Saprodi',
    type: 'expense' as const,
    name: 'Pupuk NPK',
    volume: 10,
    unit: 'karung',
    unitPrice: 850000,
    plannedCashMonth: '',
    aliases: [],
    ...overrides,
  };
}

describe('validateRabItemDraft', () => {
  it('returns null for a complete draft', () => {
    expect(validateRabItemDraft(draft())).toBeNull();
  });

  it('returns Indonesian messages for empty required fields', () => {
    expect(validateRabItemDraft(draft({ categoryName: '' }))).toBe('Pilihan kategori tidak boleh kosong');
    expect(validateRabItemDraft(draft({ name: '' }))).toBe('Nama barang/jasa tidak boleh kosong');
    expect(validateRabItemDraft(draft({ volume: 0 }))).toBe('Jumlah/volume harus lebih dari 0');
    expect(validateRabItemDraft(draft({ unit: '' }))).toBe('Satuan (misal: kg, liter, dll) tidak boleh kosong');
    expect(validateRabItemDraft(draft({ unitPrice: 0 }))).toBe('Harga satuan harus lebih dari 0');
  });

  it('rejects an invalid planned cash month format', () => {
    expect(validateRabItemDraft(draft({ plannedCashMonth: '26-08' }))).toBe(
      'Format bulan kurang tepat (harus Tahun-Bulan, misal 2026-08)',
    );
    expect(validateRabItemDraft(draft({ plannedCashMonth: '2026-13' }))).toBe(
      'Format bulan kurang tepat (harus Tahun-Bulan, misal 2026-08)',
    );
    expect(validateRabItemDraft(draft({ plannedCashMonth: '2026-08' }))).toBeNull();
  });
});
