import { describe, expect, it } from 'vitest';
import {
  buildLatestRegionAveragePriceKpi,
  buildLatestRegionPrices,
  isProvincePriceLocation,
  normalizeRegionName,
} from '@/lib/commodityPriceRegions';

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

  it('builds the dashboard KPI from the same regional average used by the news map', () => {
    const result = buildLatestRegionAveragePriceKpi([
      { date: '2026-06-02', location: 'Jawa Timur', price: 99_000, created_at: '2026-06-02T00:00:05Z' },
      { date: '2026-06-02', location: 'Kabupaten Malang', price: 40_000, created_at: '2026-06-02T00:00:04Z' },
      { date: '2026-06-02', location: 'Kabupaten Jember', price: 50_000, created_at: '2026-06-02T00:00:03Z' },
      { date: '2026-06-01', location: 'Kabupaten Malang', price: 35_000, created_at: '2026-06-01T00:00:04Z' },
      { date: '2026-06-01', location: 'Kabupaten Jember', price: 45_000, created_at: '2026-06-01T00:00:03Z' },
    ]);

    expect(result).toEqual({
      todayPrice: 45_000,
      yesterdayPrice: 40_000,
      priceDelta: 5_000,
      priceDeltaPct: '12.5',
      isTrendingUp: true,
    });
  });
});
