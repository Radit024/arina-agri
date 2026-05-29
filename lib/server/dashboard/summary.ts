import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { getBmkgForecast, getBmkgWarnings } from '@/lib/server/weather/bmkgClient';
import { DEFAULT_BMKG_PROVINCE_NAME } from '@/lib/server/weather/bmkgTypes';
import type { NewsArticle } from '@/lib/types/news';
import { currentWeather, mockTransactions } from '@/lib/mockData';
import {
  buildDashboardMetrics,
  buildPriceKpi,
  buildWeatherSignal,
  getDashboardDateWindow,
  type DashboardPricePoint,
  type DashboardSummary,
  type DashboardSummaryTransaction,
} from '@/lib/dashboard/summary';

const PROVINCE_LOCATIONS = ['Jawa Timur', 'Propinsi Jawa Timur', 'Pasar Induk Malang'];
const NEWS_LIMIT = 6;
const DEV_USER_ID = 'dev-user-id';

interface CommodityPriceRow extends DashboardPricePoint {
  location: string;
  created_at: string;
}

function preferProvincePrice(current: CommodityPriceRow | undefined, candidate: CommodityPriceRow) {
  if (!current) return candidate;
  const currentRank = PROVINCE_LOCATIONS.indexOf(current.location);
  const candidateRank = PROVINCE_LOCATIONS.indexOf(candidate.location);
  return candidateRank !== -1 && (currentRank === -1 || candidateRank < currentRank) ? candidate : current;
}

function dedupeProvincePrices(rows: CommodityPriceRow[], limit: number) {
  const byDate = new Map<string, CommodityPriceRow>();

  for (const row of rows) {
    byDate.set(row.date, preferProvincePrice(byDate.get(row.date), row));
  }

  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDevTransactions(now: Date): DashboardSummaryTransaction[] {
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return mockTransactions.map((transaction) => ({
    jenis: transaction.jenis,
    kategori: transaction.kategori,
    nominal: transaction.nominal,
    tanggal: `${monthPrefix}-${transaction.tanggal.slice(8, 10)}`,
  }));
}

function buildDevPrices(now: Date): DashboardPricePoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new globalThis.Date(globalThis.Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (6 - index)));
    return {
      date: toDateOnly(date),
      price: 38000 + index * 450 + (index % 2 === 0 ? 300 : -150),
    };
  });
}

function buildDevNews(now: Date): NewsArticle[] {
  return [
    {
      id: 'dev-news-1',
      title: 'Pantau harga cabai dan cuaca sebelum jadwal panen',
      snippet: 'Data demo dashboard memakai fallback lokal agar mode development tetap bisa diuji tanpa sesi Supabase asli.',
      link: '#',
      source: 'Arina Agri',
      image_url: null,
      pub_date: now.toISOString(),
      created_at: now.toISOString(),
    },
  ];
}

export function buildDevDashboardSummary({
  locationLabel,
  now = new globalThis.Date(),
}: {
  locationLabel?: string;
  now?: Date;
} = {}): DashboardSummary {
  const metrics = buildDashboardMetrics(buildDevTransactions(now), now);

  return {
    generatedAt: now.toISOString(),
    kpi: metrics.kpi,
    trend: metrics.trend,
    category: metrics.category,
    price: buildPriceKpi(buildDevPrices(now)),
    weather: {
      currentWeather: {
        temperatureC: currentWeather.suhu,
        condition: currentWeather.kondisi,
        humidityPercent: currentWeather.kelembapan,
      },
      weatherBannerMessage: `Mode demo: data cuaca untuk ${locationLabel || currentWeather.lokasi}.`,
    },
    news: {
      articles: buildDevNews(now),
    },
  };
}

async function loadWeather(adm4?: string, locationLabel?: string) {
  try {
    const warningsPromise = getBmkgWarnings({ provinceName: DEFAULT_BMKG_PROVINCE_NAME });
    const forecastPromise = adm4
      ? getBmkgForecast({ adm4, locationLabel: locationLabel || adm4 })
      : Promise.resolve(null);
    const [warnings, forecast] = await Promise.all([warningsPromise, forecastPromise]);

    return buildWeatherSignal({
      warnings: warnings.warnings,
      forecast,
    });
  } catch {
    return {
      currentWeather: null,
      weatherBannerMessage: undefined,
    };
  }
}

export async function getDashboardSummary({
  userId,
  adm4,
  locationLabel,
  now = new globalThis.Date(),
}: {
  userId: string;
  adm4?: string;
  locationLabel?: string;
  now?: Date;
}): Promise<DashboardSummary> {
  if (userId === DEV_USER_ID) {
    return buildDevDashboardSummary({ locationLabel, now });
  }

  const supabase = getSupabaseAdmin();
  const dateWindow = getDashboardDateWindow(now);

  const transactionsPromise = supabase
    .from('transactions')
    .select('jenis,kategori,nominal,tanggal')
    .eq('user_id', userId)
    .gte('tanggal', dateWindow.from)
    .lte('tanggal', dateWindow.to)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });

  const pricesPromise = supabase
    .from('commodity_prices')
    .select('date,location,price,created_at')
    .eq('commodity', 'Cabe Rawit Merah')
    .in('location', PROVINCE_LOCATIONS)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(7 * PROVINCE_LOCATIONS.length);

  const newsPromise = supabase
    .from('news_articles')
    .select('id,title,snippet,link,source,image_url,pub_date,created_at')
    .order('pub_date', { ascending: false })
    .limit(NEWS_LIMIT);

  const [transactionsResult, pricesResult, newsResult, weather] = await Promise.all([
    transactionsPromise,
    pricesPromise,
    newsPromise,
    loadWeather(adm4, locationLabel),
  ]);

  if (transactionsResult.error) throw new Error(transactionsResult.error.message);
  if (pricesResult.error) throw new Error(pricesResult.error.message);
  if (newsResult.error) throw new Error(newsResult.error.message);

  const transactions = (transactionsResult.data || []) as DashboardSummaryTransaction[];
  const prices = dedupeProvincePrices((pricesResult.data || []) as CommodityPriceRow[], 7);
  const metrics = buildDashboardMetrics(transactions, now);

  return {
    generatedAt: now.toISOString(),
    kpi: metrics.kpi,
    trend: metrics.trend,
    category: metrics.category,
    price: buildPriceKpi(prices),
    weather,
    news: {
      articles: (newsResult.data || []) as NewsArticle[],
    },
  };
}
