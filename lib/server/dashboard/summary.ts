import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { getBmkgForecast, getBmkgWarnings } from '@/lib/server/weather/bmkgClient';
import { DEFAULT_BMKG_PROVINCE_NAME } from '@/lib/server/weather/bmkgTypes';
import type { NewsArticle } from '@/lib/types/news';
import { mockTransactions } from '@/lib/mockData';
import { DEVELOPMENT_USER_ID } from '@/lib/devAuth';
import { buildLatestRegionAveragePriceKpi } from '@/lib/commodityPriceRegions';
import {
  buildDashboardMetrics,
  buildWeatherSignal,
  getDashboardDateWindow,
  type DashboardPricePoint,
  type DashboardSummary,
  type DashboardSummaryTransaction,
} from '@/lib/dashboard/summary';

const NEWS_LIMIT = 6;
const PRICE_ROWS_LIMIT = 30 * 50;

interface CommodityPriceRow extends DashboardPricePoint {
  location: string;
  created_at: string;
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

export function buildDevDashboardSummary({
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
    price: {
      todayPrice: null,
      yesterdayPrice: null,
      priceDelta: null,
      priceDeltaPct: null,
      isTrendingUp: null,
    },
    weather: {
      currentWeather: null,
      weatherBannerMessage: undefined,
    },
    news: {
      articles: [],
    },
  };
}

async function loadWeather(adm4?: string, locationLabel?: string) {
  if (!adm4) {
    return {
      currentWeather: null,
      weatherBannerMessage: undefined,
    };
  }

  try {
    const [warnings, forecast] = await Promise.all([
      getBmkgWarnings({ provinceName: DEFAULT_BMKG_PROVINCE_NAME }),
      getBmkgForecast({ adm4, locationLabel: locationLabel || adm4 }),
    ]);

    return buildWeatherSignal({
      warnings: warnings.warnings,
      forecast,
      locationLabel: locationLabel || forecast?.locationLabel,
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
  if (userId === DEVELOPMENT_USER_ID) {
    return buildDevDashboardSummary({ locationLabel, now });
  }

  const supabase = getSupabaseAdmin();

  // Auto-sync weather location if it is set in the client request
  if (adm4) {
    const syncLocation = async () => {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('notification_schedules')
          .select('weather_adm4, weather_location_label')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError) {
          console.error('[getDashboardSummary] Error fetching existing schedule for location sync:', fetchError);
          return;
        }

        if (!existing) {
          // Insert a new default schedule row (disabled) with this location
          const { error: insertError } = await supabase
            .from('notification_schedules')
            .insert({
              user_id: userId,
              enabled: false,
              time: '07:00',
              timezone: 'Asia/Jakarta',
              platform: 'telegram',
              weather_adm4: adm4,
              weather_location_label: locationLabel || null,
              updated_at: new Date().toISOString(),
            });
          if (insertError) {
            console.error('[getDashboardSummary] Error inserting default schedule:', insertError);
          } else {
            console.log('[getDashboardSummary] Synced new weather location to DB:', locationLabel);
          }
        } else if (existing.weather_adm4 !== adm4 || existing.weather_location_label !== locationLabel) {
          // Update the existing schedule location
          const { error: updateError } = await supabase
            .from('notification_schedules')
            .update({
              weather_adm4: adm4,
              weather_location_label: locationLabel || null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          if (updateError) {
            console.error('[getDashboardSummary] Error updating weather location:', updateError);
          } else {
            console.log('[getDashboardSummary] Updated weather location in DB:', locationLabel);
          }
        }
      } catch (err: unknown) {
        console.error('[getDashboardSummary] Unexpected location sync error:', err);
      }
    };

    void syncLocation();
  }

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
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(PRICE_ROWS_LIMIT);

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
  const prices = (pricesResult.data || []) as CommodityPriceRow[];
  const metrics = buildDashboardMetrics(transactions, now);

  return {
    generatedAt: now.toISOString(),
    kpi: metrics.kpi,
    trend: metrics.trend,
    category: metrics.category,
    price: buildLatestRegionAveragePriceKpi(prices),
    weather,
    news: {
      articles: (newsResult.data || []) as NewsArticle[],
    },
  };
}
