import { describe, expect, it } from 'vitest';
import {
  buildDashboardProjectPerformance,
  buildDashboardMetrics,
  buildPriceKpi,
  buildWeatherSignal,
  getDashboardDateWindow,
  type DashboardFinanceProjectOption,
  type DashboardSummaryTransaction,
} from '@/lib/dashboard/summary';
import { buildDevDashboardSummary } from '@/lib/server/dashboard/summary';

const now = new Date('2026-05-15T08:00:00.000Z');

describe('getDashboardDateWindow', () => {
  it('covers the six dashboard trend months through the current month', () => {
    expect(getDashboardDateWindow(now)).toEqual({
      from: '2025-12-01',
      to: '2026-05-31',
    });
  });
});

describe('buildDashboardMetrics', () => {
  it('builds KPI, six month trend, and current month category data from transactions', () => {
    const transactions: DashboardSummaryTransaction[] = [
      { jenis: 'pendapatan', kategori: 'Panen', nominal: 5_000_000, tanggal: '2026-05-03' },
      { jenis: 'pengeluaran', kategori: 'Pupuk', nominal: 1_000_000, tanggal: '2026-05-05' },
      { jenis: 'pengeluaran', kategori: 'Pestisida', nominal: 500_000, tanggal: '2026-05-06' },
      { jenis: 'pendapatan', kategori: 'Panen', nominal: 3_000_000, tanggal: '2026-04-03' },
      { jenis: 'pengeluaran', kategori: 'Pupuk', nominal: 2_000_000, tanggal: '2026-04-04' },
    ];

    const metrics = buildDashboardMetrics(transactions, now);

    expect(metrics.kpi).toEqual({
      totalPengeluaran: 1_500_000,
      labaBersih: 3_500_000,
      expTrend: -25,
      profitTrend: 250,
    });
    expect(metrics.trend).toHaveLength(6);
    expect(metrics.trend.at(-1)).toEqual({ bulan: 'Mei', pendapatan: 5_000_000, pengeluaran: 1_500_000 });
    expect(metrics.category).toEqual([
      { kategori: 'Pupuk', jumlah: 1_000_000 },
      { kategori: 'Pestisida', jumlah: 500_000 },
    ]);
  });
});

describe('buildDashboardProjectPerformance', () => {
  it('groups current month finance activity by project and keeps unlinked transactions visible', () => {
    const projects: DashboardFinanceProjectOption[] = [
      { id: 'project-padi', name: 'Padi MT 1', commodity: 'Padi', seasonLabel: 'MT 1', status: 'active' },
      { id: 'project-cabai', name: 'Cabai Greenhouse', commodity: 'Cabai', seasonLabel: '2026', status: 'draft' },
    ];
    const transactions: DashboardSummaryTransaction[] = [
      { jenis: 'pendapatan', kategori: 'Panen', nominal: 8_000_000, tanggal: '2026-05-03', projectId: 'project-padi' },
      { jenis: 'pengeluaran', kategori: 'Pupuk', nominal: 1_000_000, tanggal: '2026-05-05', projectId: 'project-padi' },
      { jenis: 'pengeluaran', kategori: 'Benih', nominal: 2_500_000, tanggal: '2026-05-06', projectId: 'project-cabai' },
      { jenis: 'pengeluaran', kategori: 'Solar', nominal: 300_000, tanggal: '2026-05-07', projectId: null },
      { jenis: 'pendapatan', kategori: 'Panen Lama', nominal: 2_000_000, tanggal: '2026-04-03', projectId: 'project-padi' },
    ];

    expect(buildDashboardProjectPerformance({ transactions, projects, now })).toEqual([
      {
        projectId: 'project-padi',
        projectName: 'Padi MT 1',
        income: 8_000_000,
        expense: 1_000_000,
        profit: 7_000_000,
        transactionCount: 2,
      },
      {
        projectId: null,
        projectName: 'Tanpa Project',
        income: 0,
        expense: 300_000,
        profit: -300_000,
        transactionCount: 1,
      },
      {
        projectId: 'project-cabai',
        projectName: 'Cabai Greenhouse',
        income: 0,
        expense: 2_500_000,
        profit: -2_500_000,
        transactionCount: 1,
      },
    ]);
  });
});

describe('buildPriceKpi', () => {
  it('derives today price and daily delta from sorted price rows', () => {
    expect(buildPriceKpi([
      { date: '2026-05-13', price: 41_000 },
      { date: '2026-05-14', price: 40_000 },
      { date: '2026-05-15', price: 42_000 },
    ])).toEqual({
      todayPrice: 42_000,
      yesterdayPrice: 40_000,
      priceDelta: 2_000,
      priceDeltaPct: '5.0',
      isTrendingUp: true,
    });
  });
});

describe('buildWeatherSignal', () => {
  it('prefers a BMKG warning message over rainy forecast text', () => {
    expect(buildWeatherSignal({
      warnings: [{ event: 'Hujan Lebat', headline: 'Waspada hujan sore ini', description: 'Detail', affectedAreas: ['Dau'] }],
      forecast: {
        current: { temperatureC: 29, condition: 'hujan', humidityPercent: 80 },
        days: [{ date: '2026-05-15', totalRainfallMm: 35 }],
      },
      locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
    })).toEqual({
      currentWeather: { temperatureC: 29, condition: 'hujan', humidityPercent: 80 },
      weatherBannerMessage: 'Hujan Lebat: Waspada hujan sore ini',
    });
  });

  it('does not show a BMKG warning without a selected weather location', () => {
    expect(buildWeatherSignal({
      warnings: [{ event: 'Hujan Lebat', headline: 'Waspada Jawa Timur', description: 'Detail', affectedAreas: ['Dau'] }],
      forecast: null,
    })).toEqual({
      currentWeather: null,
      weatherBannerMessage: undefined,
    });
  });

  it('does not show province-only BMKG warnings for a specific selected location', () => {
    expect(buildWeatherSignal({
      warnings: [
        {
          event: 'Hujan Lebat dan Petir',
          headline: 'Hujan Lebat disertai Petir di Jawa Timur',
          description: 'Detail provinsi',
          affectedAreas: ['Jawa Timur'],
        },
      ],
      forecast: {
        current: { temperatureC: 20, condition: 'cerah', humidityPercent: 90 },
        days: [{ date: '2026-06-23', totalRainfallMm: 0 }],
      },
      locationLabel: 'Merjosari, Kec. Lowokwaru, Kota Malang, Jawa Timur',
    })).toEqual({
      currentWeather: { temperatureC: 20, condition: 'cerah', humidityPercent: 90 },
      weatherBannerMessage: undefined,
    });
  });

  it('uses the BMKG warning that matches the selected weather location', () => {
    expect(buildWeatherSignal({
      warnings: [
        { event: 'Hujan Lebat', headline: 'Waspada Batu', description: 'Detail Batu', affectedAreas: ['Batu'] },
        { event: 'Angin Kencang', headline: 'Waspada Dau', description: 'Detail Dau', affectedAreas: ['Dau', 'Lowokwaru'] },
      ],
      forecast: {
        current: { temperatureC: 29, condition: 'berawan', humidityPercent: 80 },
        days: [{ date: '2026-05-15', totalRainfallMm: 0 }],
      },
      locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
    })).toEqual({
      currentWeather: { temperatureC: 29, condition: 'berawan', humidityPercent: 80 },
      weatherBannerMessage: 'Angin Kencang: Waspada Dau',
    });
  });

  it('does not show unrelated BMKG warnings for another selected location', () => {
    expect(buildWeatherSignal({
      warnings: [
        { event: 'Hujan Lebat', headline: 'Waspada Batu', description: 'Detail Batu', affectedAreas: ['Batu'] },
      ],
      forecast: {
        current: { temperatureC: 29, condition: 'berawan', humidityPercent: 80 },
        days: [{ date: '2026-05-15', totalRainfallMm: 0 }],
      },
      locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
    })).toEqual({
      currentWeather: { temperatureC: 29, condition: 'berawan', humidityPercent: 80 },
      weatherBannerMessage: undefined,
    });
  });
});

describe('buildDevDashboardSummary', () => {
  it('does not include demo weather, market price, news, or warning placeholders in the development fallback', () => {
    const summary = buildDevDashboardSummary({
      locationLabel: 'Malang',
      now,
    });

    expect(summary.kpi.totalPengeluaran).toBeGreaterThan(0);
    expect(summary.category.length).toBeGreaterThan(0);
    expect(summary.price).toEqual({
      todayPrice: null,
      yesterdayPrice: null,
      priceDelta: null,
      priceDeltaPct: null,
      isTrendingUp: null,
    });
    expect(summary.weather.currentWeather).toBeNull();
    expect(summary.weather.weatherBannerMessage).toBeUndefined();
    expect(summary.news.articles).toEqual([]);
  });
});
