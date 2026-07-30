import { describe, expect, it } from 'vitest';
import { computeStockBatchStatus } from '@/lib/stok/computeStatus';

describe('computeStockBatchStatus', () => {
  it('returns habis when stokTersisa is 0', () => {
    expect(computeStockBatchStatus(0, 100, '2099-01-01')).toBe('habis');
  });

  it('returns hampir_kadaluarsa when 3 days or fewer remain', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    expect(computeStockBatchStatus(50, 100, soon.toISOString())).toBe('hampir_kadaluarsa');
  });

  it('returns menipis when remaining stock is below 20% of intake', () => {
    const later = new Date();
    later.setDate(later.getDate() + 30);
    expect(computeStockBatchStatus(10, 100, later.toISOString())).toBe('menipis');
  });

  it('returns aman otherwise', () => {
    const later = new Date();
    later.setDate(later.getDate() + 30);
    expect(computeStockBatchStatus(80, 100, later.toISOString())).toBe('aman');
  });
});
