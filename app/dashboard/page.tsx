'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import DashboardKPI from '@/components/dashboard/DashboardKPI';
import WeatherBanner from '@/components/dashboard/WeatherBanner';
import { TrendChart, KategoriChart } from '@/components/dashboard/DashboardCharts';
import NewsWidget from '@/components/dashboard/NewsWidget';
import { farmerProfile } from '@/lib/mockData';
import { formatRupiah } from '@/lib/formatters';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useCallback, useRef, useState, type TouchEvent } from 'react';
import { useWeatherLocation } from '@/hooks/useWeatherLocation';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

export default function DashboardPage() {
  const t = useTranslations('Dashboard.home');
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const firstName = userName.split(' ')[0];

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const { activeAdm4, activeLocationLabel } = useWeatherLocation();
  const { summary, loading: summaryLoading, reload: reloadSummary } = useDashboardSummary({
    adm4: activeAdm4,
    locationLabel: activeLocationLabel,
  });
  const totalPengeluaran = summary?.kpi.totalPengeluaran ?? 0;
  const labaBersih = summary?.kpi.labaBersih ?? 0;
  const expTrend = summary?.kpi.expTrend ?? 0;
  const profitTrend = summary?.kpi.profitTrend ?? 0;
  const todayPrice = summary?.price.todayPrice ?? null;
  const priceDelta = summary?.price.priceDelta ?? null;
  const priceDeltaPct = summary?.price.priceDeltaPct ?? null;
  const isTrendingUp = summary?.price.isTrendingUp ?? null;
  const currentWeather = summary?.weather.currentWeather ?? null;
  const weatherBannerMessage = summary?.weather.weatherBannerMessage;
  const isLoading = summaryLoading;
  const showSkeleton = isLoading && !isRefreshing;

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await reloadSummary();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, reloadSummary]);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!isMobile || isRefreshing) return;
      const scrollTop = document.scrollingElement?.scrollTop ?? 0;
      if (scrollTop > 0) return;
      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
    },
    [isMobile, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!pullingRef.current || !isMobile || isRefreshing) return;
      const delta = event.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      event.preventDefault();
      setPullDistance(Math.min(delta, 80));
    },
    [isMobile, isRefreshing]
  );

  const handleTouchEnd = useCallback(() => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    const shouldRefresh = pullDistance >= 60;
    setPullDistance(0);
    if (shouldRefresh) {
      void handleRefresh();
    }
  }, [pullDistance, handleRefresh]);

  const contentTransform = pullDistance > 0 ? `translateY(${pullDistance}px)` : 'translateY(0px)';

  // ─── Dynamic Greeting ───────────────────────────────────────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('locale') === 'en' ? 'Good morning' : 'Selamat pagi';
    if (hour < 15) return t('locale') === 'en' ? 'Good afternoon' : 'Selamat siang';
    if (hour < 18) return t('locale') === 'en' ? 'Good afternoon' : 'Selamat sore';
    return t('locale') === 'en' ? 'Good evening' : 'Selamat malam';
  };

  return (
    <Box
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{ position: 'relative' }}
    >
      {(isRefreshing || pullDistance > 0) && (
        <Box sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <LinearProgress
            color="success"
            sx={{
              height: 3,
              borderRadius: 999,
              mx: { xs: 2, md: 4 },
              mb: 1,
            }}
          />
        </Box>
      )}

      <Box
        sx={{
          transform: contentTransform,
          transition: pullDistance > 0 ? 'none' : 'transform 0.2s ease',
        }}
      >
        <Box sx={{ p: { xs: 2, md: 4, lg: 5 }, maxWidth: '1600px', mx: 'auto' }}>
          {showSkeleton ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* Header */}
              <Box
                sx={{
                  mb: 5,
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', md: 'flex-end' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: 'success.main', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1 }}
                  >
                    {getGreeting()}
                  </Typography>
                  <Typography
                    component="h1"
                    variant="h3"
                    sx={{ fontFamily: 'var(--font-sora)', color: 'text.primary', fontWeight: 800, letterSpacing: '-0.03em', mb: 1 }}
                  >
                    {firstName}.
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {new Intl.DateTimeFormat(t('locale') === 'en' ? 'en-US' : 'id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date())}
                  </Typography>
                </Box>
              </Box>

              {/* KPI Cards */}
              {weatherBannerMessage && (
                <Box sx={{ mb: 2.5 }}>
                  <WeatherBanner message={weatherBannerMessage} />
                </Box>
              )}

              <DashboardKPI
                totalPengeluaran={formatRupiah(totalPengeluaran)}
                expTrend={expTrend}
                labaBersih={formatRupiah(labaBersih)}
                labaBersihRaw={labaBersih}
                profitTrend={profitTrend}
                weatherTemp={currentWeather ? currentWeather.temperatureC : 0}
                weatherCond={currentWeather ? currentWeather.condition : ''}
                weatherHum={currentWeather ? currentWeather.humidityPercent : 0}
                priceLoading={false}
                todayPrice={todayPrice}
                priceDelta={priceDelta}
                priceDeltaPct={priceDeltaPct}
                isTrendingUp={isTrendingUp}
                locale={t('locale')}
                t={t}
              />

              {/* Main Content & Sidebar Layout */}
              <Grid container spacing={3} sx={{ mb: 4, alignItems: 'stretch' }}>
                {/* Left Column (Charts) */}
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <TrendChart data={summary?.trend ?? []} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <KategoriChart data={summary?.category ?? []} />
                    </Grid>
                    {/* Table or other content could go here in the future */}
                  </Grid>
                </Grid>

                {/* Right Column (Sidebar) */}
                <Grid size={{ xs: 12, lg: 4 }}>
                  <Box sx={{ height: '100%', position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <NewsWidget layout="vertical" initialArticles={summary?.news.articles ?? []} />
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <Box sx={{ mb: 5 }}>
        <Skeleton variant="text" width={160} height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={220} height={40} />
      </Box>

      <Card sx={{ mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 4, alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Skeleton variant="text" width={180} height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 3 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 3 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Skeleton variant="text" width={140} height={22} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
