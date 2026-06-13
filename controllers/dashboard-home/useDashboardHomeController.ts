'use client';

import { useTranslations } from 'next-intl';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/context/AuthContext';
import { useWeatherLocation } from '@/hooks/useWeatherLocation';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useCommodityPrices } from '@/hooks/useCommodityPrices';
import { farmerProfile } from '@/lib/mockData';
import { formatRupiah } from '@/lib/formatters';
import { usePullToRefresh } from './usePullToRefresh';

function getGreeting(locale: string) {
  const hour = new Date().getHours();
  if (hour < 12) return locale === 'en' ? 'Good morning' : 'Selamat pagi';
  if (hour < 15) return locale === 'en' ? 'Good afternoon' : 'Selamat siang';
  if (hour < 18) return locale === 'en' ? 'Good afternoon' : 'Selamat sore';
  return locale === 'en' ? 'Good evening' : 'Selamat malam';
}

function getFormattedToday(locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function useDashboardHomeController() {
  const t = useTranslations('Dashboard.home');
  const locale = t('locale');
  const { user, session, loading: authLoading } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;

  const { activeAdm4, activeLocationLabel } = useWeatherLocation();
  const { summary, loading: summaryLoading, reload: reloadSummary } = useDashboardSummary({
    accessToken: session?.access_token,
    adm4: activeAdm4,
    enabled: Boolean(session?.access_token),
    locationLabel: activeLocationLabel,
  });
  const {
    loading: priceLoading,
    reload: reloadPrices,
    todayPrice,
    priceDelta,
    priceDeltaPct,
    isTrendingUp,
  } = useCommodityPrices(30);

  const pullToRefresh = usePullToRefresh({
    enabled: isMobile,
    onRefresh: async () => {
      await Promise.all([reloadSummary(), reloadPrices()]);
    },
  });

  const totalPengeluaran = summary?.kpi.totalPengeluaran ?? 0;
  const labaBersih = summary?.kpi.labaBersih ?? 0;
  const currentWeather = summary?.weather.currentWeather ?? null;

  return {
    categoryData: summary?.category ?? [],
    contentTransform: pullToRefresh.contentTransform,
    currentWeather,
    firstName: userName.split(' ')[0],
    formattedToday: getFormattedToday(locale),
    greeting: getGreeting(locale),
    isRefreshing: pullToRefresh.isRefreshing,
    kpi: {
      expTrend: summary?.kpi.expTrend ?? 0,
      isTrendingUp,
      labaBersih: formatRupiah(labaBersih),
      labaBersihRaw: labaBersih,
      priceDelta,
      priceDeltaPct,
      priceLoading,
      profitTrend: summary?.kpi.profitTrend ?? 0,
      todayPrice,
      totalPengeluaran: formatRupiah(totalPengeluaran),
    },
    locale,
    newsArticles: summary?.news.articles ?? [],
    pullDistance: pullToRefresh.pullDistance,
    showSkeleton: (authLoading || summaryLoading) && !pullToRefresh.isRefreshing,
    t,
    touchHandlers: pullToRefresh.touchHandlers,
    trendData: summary?.trend ?? [],
    weatherBannerMessage: summary?.weather.weatherBannerMessage,
  };
}
