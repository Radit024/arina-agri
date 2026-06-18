import type { TouchEvent } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import DashboardKPI from '@/components/dashboard/DashboardKPI';
import { TrendChart, KategoriChart } from '@/components/dashboard/DashboardCharts';
import NewsWidget from '@/components/dashboard/NewsWidget';
import { PageShell } from '@/components/shared/page';
import { formatRupiah } from '@/lib/formatters';
import type {
  DashboardCategoryPoint,
  DashboardFinanceProjectOption,
  DashboardProjectPerformancePoint,
  DashboardTrendPoint,
} from '@/lib/dashboard/summary';
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
  financeScope: {
    selectedProjectId: string | null;
    selectedProjectName: string;
    projects: DashboardFinanceProjectOption[];
    projectPerformance: DashboardProjectPerformancePoint[];
    setSelectedProjectId: (projectId: string | null) => void;
  };
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
  financeScope,
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
                  <FormControl size="small" sx={{ mt: 1.5, minWidth: { xs: '100%', sm: 260 } }}>
                    <InputLabel id="dashboard-finance-scope-label">{t('financeScope.label')}</InputLabel>
                    <Select
                      labelId="dashboard-finance-scope-label"
                      label={t('financeScope.label')}
                      value={financeScope.selectedProjectId ?? ''}
                      onChange={(event) => financeScope.setSelectedProjectId(event.target.value || null)}
                      sx={{ textAlign: 'left', borderRadius: 2 }}
                    >
                      <MenuItem value="">{t('financeScope.allProjects')}</MenuItem>
                      {financeScope.projects.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <DashboardKPI
                totalPengeluaran={kpi.totalPengeluaran}
                expTrend={kpi.expTrend}
                labaBersih={kpi.labaBersih}
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

              {!financeScope.selectedProjectId && financeScope.projectPerformance.length > 0 && (
                <ProjectPerformancePanel rows={financeScope.projectPerformance} t={t} />
              )}

              <Grid container spacing={3} sx={{ mb: 4, alignItems: 'stretch' }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <TrendChart data={trendData} scopeLabel={financeScope.selectedProjectName} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <KategoriChart data={categoryData} scopeLabel={financeScope.selectedProjectName} />
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

function ProjectPerformancePanel({
  rows,
  t,
}: {
  rows: DashboardProjectPerformancePoint[];
  t: DashboardHomeTranslator;
}) {
  return (
    <Card
      sx={{
        mb: 4,
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
            {t('financeScope.performance.title')}
          </Typography>
        }
        subheader={t('financeScope.performance.subheader')}
        sx={{ pb: 0 }}
      />
      <CardContent>
        <Grid container spacing={2}>
          {rows.slice(0, 4).map((row, index) => (
            <Grid key={`${row.projectId ?? 'unassigned'}-${row.projectName}`} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Box
                sx={{
                  height: '100%',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  {t('financeScope.performance.rank', { rank: index + 1 })}
                </Typography>
                <Typography variant="subtitle2" noWrap sx={{ mt: 0.5, fontWeight: 700 }}>
                  {row.projectName}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    mt: 1.5,
                    color: row.profit >= 0 ? 'success.main' : 'error.main',
                    fontFamily: 'var(--font-sora)',
                    fontWeight: 800,
                  }}
                >
                  {formatRupiah(row.profit)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  {t('financeScope.performance.flow', {
                    income: formatRupiah(row.income),
                    expense: formatRupiah(row.expense),
                  })}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  {t('financeScope.performance.transactions', { count: row.transactionCount })}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
