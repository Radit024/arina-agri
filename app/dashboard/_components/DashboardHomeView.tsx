import type { TouchEvent } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import DashboardKPI from '@/components/dashboard/DashboardKPI';
import { TrendChart, KategoriChart } from '@/components/dashboard/DashboardCharts';
import NewsWidget from '@/components/dashboard/NewsWidget';
import { PageShell } from '@/components/shared/page';
import type { DashboardCategoryPoint, DashboardTrendPoint } from '@/lib/dashboard/summary';
import type { NewsArticle } from '@/lib/types/news';
import DashboardSkeleton from './DashboardSkeleton';

type DashboardHomeTranslator = (key: string, values?: Record<string, string | number>) => string;

interface DashboardHomeViewProps {
  categoryData: DashboardCategoryPoint[];
  contentTransform: string;
  currentWeather: {
    temperatureC: number;
    condition: string;
    humidityPercent: number;
  } | null;
  firstName: string;
  formattedToday: string;
  greeting: string;
  isRefreshing: boolean;
  kpi: {
    expTrend: number;
    isTrendingUp: boolean | null;
    labaBersih: string;
    labaBersihRaw: number;
    priceDelta: number | null;
    priceDeltaPct: string | null;
    priceLoading: boolean;
    profitTrend: number;
    todayPrice: number | null;
    totalPengeluaran: string;
  };
  locale: string;
  newsArticles: NewsArticle[];
  pullDistance: number;
  showSkeleton: boolean;
  t: DashboardHomeTranslator;
  touchHandlers: {
    onTouchEnd: () => void;
    onTouchMove: (event: TouchEvent<HTMLDivElement>) => void;
    onTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
  };
  trendData: DashboardTrendPoint[];
  weatherBannerMessage?: string;
}

export default function DashboardHomeView({
  categoryData,
  contentTransform,
  currentWeather,
  firstName,
  formattedToday,
  greeting,
  isRefreshing,
  kpi,
  locale,
  newsArticles,
  pullDistance,
  showSkeleton,
  t,
  touchHandlers,
  trendData,
  weatherBannerMessage,
}: DashboardHomeViewProps) {
  return (
    <Box
      onTouchStart={touchHandlers.onTouchStart}
      onTouchMove={touchHandlers.onTouchMove}
      onTouchEnd={touchHandlers.onTouchEnd}
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
        <PageShell sx={{ p: { xs: 2, md: 4, lg: 5 }, maxWidth: '1600px', mx: 'auto' }}>
          {showSkeleton ? (
            <DashboardSkeleton />
          ) : (
            <>
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
                    {greeting}
                  </Typography>
                  <Typography
                    component="h1"
                    variant="h3"
                    sx={{ fontFamily: 'var(--font-sora)', color: 'text.primary', fontWeight: 800, letterSpacing: 0, mb: 1 }}
                  >
                    {firstName}.
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {formattedToday}
                  </Typography>
                </Box>
              </Box>

              <DashboardKPI
                totalPengeluaran={kpi.totalPengeluaran}
                expTrend={kpi.expTrend}
                labaBersih={kpi.labaBersih}
                labaBersihRaw={kpi.labaBersihRaw}
                profitTrend={kpi.profitTrend}
                weatherTemp={currentWeather ? currentWeather.temperatureC : 0}
                weatherCond={currentWeather ? currentWeather.condition : ''}
                weatherHum={currentWeather ? currentWeather.humidityPercent : 0}
                weatherBannerMessage={weatherBannerMessage}
                priceLoading={kpi.priceLoading}
                todayPrice={kpi.todayPrice}
                priceDelta={kpi.priceDelta}
                priceDeltaPct={kpi.priceDeltaPct}
                isTrendingUp={kpi.isTrendingUp}
                locale={locale}
                t={t}
              />

              <Grid container spacing={3} sx={{ mb: 4, alignItems: 'stretch' }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <TrendChart data={trendData} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <KategoriChart data={categoryData} />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                  <Box sx={{ height: '100%', position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <NewsWidget layout="vertical" initialArticles={newsArticles.length > 0 ? newsArticles : undefined} />
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </PageShell>
      </Box>
    </Box>
  );
}
