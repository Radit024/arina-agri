import { describe, expect, it } from 'vitest';
import { parsePriceLine } from '@/lib/server/prices/scraper';

describe('parsePriceLine', () => {
  it('parses location and price', () => {
    const parsed = parsePriceLine('Kabupaten Malang: Rp 65.000');
    expect(parsed).toEqual({ location: 'Kabupaten Malang', price: 65000 });
  });

  it('returns null on invalid input', () => {
    expect(parsePriceLine('Tidak ada data')).toBe(null);
  });
});
