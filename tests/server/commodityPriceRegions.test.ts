import { describe, expect, it } from 'vitest';
import { buildLatestRegionPrices, isProvincePriceLocation, normalizeRegionName } from '@/lib/commodityPriceRegions';

describe('commodity price region helpers', () => {
  it('normalizes regency names without collapsing city names', () => {
    expect(normalizeRegionName('Kabupaten Malang')).toBe('malang');
    expect(normalizeRegionName('Malang')).toBe('malang');
    expect(normalizeRegionName('Kota Malang')).toBe('kota malang');
    expect(normalizeRegionName('Kota Batu')).toBe('batu');
  });

  it('detects province average rows', () => {
    expect(isProvincePriceLocation('Jawa Timur')).toBe(true);
    expect(isProvincePriceLocation('Propinsi Jawa Timur')).toBe(true);
    expect(isProvincePriceLocation('Kabupaten Jember')).toBe(false);
  });

  it('keeps the latest available row per region across partial dates', () => {
    const result = buildLatestRegionPrices([
      { date: '2026-05-31', location: 'Jawa Timur', price: 42_000, created_at: '2026-05-31T00:00:03Z' },
      { date: '2026-05-31', location: 'Kabupaten Malang', price: 41_000, created_at: '2026-05-31T00:00:02Z' },
      { date: '2026-05-30', location: 'Kabupaten Malang', price: 40_000, created_at: '2026-05-30T00:00:02Z' },
      { date: '2026-05-30', location: 'Kota Malang', price: 43_000, created_at: '2026-05-30T00:00:02Z' },
      { date: '2026-05-29', location: 'Kabupaten Jember', price: 39_000, created_at: '2026-05-29T00:00:02Z' },
    ]);

    expect(result).toEqual([
      { name: 'Kabupaten Malang', price: 41_000, date: '2026-05-31' },
      { name: 'Kota Malang', price: 43_000, date: '2026-05-30' },
      { name: 'Kabupaten Jember', price: 39_000, date: '2026-05-29' },
    ]);
  });
});
