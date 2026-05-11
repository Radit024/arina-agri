'use client';

import dynamic from 'next/dynamic';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import { useCommodityPrices } from '@/hooks/useCommodityPrices';
import { formatRupiah } from '@/lib/formatters';
import { useMemo } from 'react';

const LineChart = dynamic(
  () => import('@mui/x-charts/LineChart').then((m) => ({ default: m.LineChart })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />,
  }
);

const BarChart = dynamic(
  () => import('@mui/x-charts/BarChart').then((m) => ({ default: m.BarChart })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />,
  }
);

// ─── Price Trend Chart (used on Kabar Pasar page) ─────────────────
export function PriceTrendChart() {
  const theme = useTheme();
  const { prices, regionPrices, loading, error, isTrendingUp } = useCommodityPrices(30);

  const lineChartData = useMemo(() => {
    return prices.map((p) => ({
      label: p.date,
      price: p.price,
    }));
  }, [prices]);

  const barChartData = useMemo(() => {
    return regionPrices.map(r => ({
      ...r,
      name: r.name.length > 12 ? r.name.substring(0, 10) + '...' : r.name
    }));
  }, [regionPrices]);

  const averagePrice = useMemo(() => {
    if (regionPrices.length === 0) return 0;
    const total = regionPrices.reduce((sum, r) => sum + r.price, 0);
    return total / regionPrices.length;
  }, [regionPrices]);

  const trendColor = isTrendingUp === true
    ? theme.palette.success.main
    : isTrendingUp === false
      ? theme.palette.error.main
      : theme.palette.primary.main;

  return (
    <Card
      sx={{
        mb: 3,
        borderRadius: 4,
        border: 'none',
        boxShadow: 'none',
        overflow: 'visible',
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600, fontSize: '1rem' }}>
            Grafik harga rata-rata : <strong>Cabe Rawit Merah / kg</strong>
          </Typography>
        }
      />
      <Divider sx={{ mx: 2 }} />
      <CardContent sx={{ pt: 3 }}>
        {loading ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={4}>
            {/* Chart 1: Average per regency (Bar Chart) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 2, textAlign: 'center' }}>
                Grafik harga rata-rata berdasarkan Kabupaten/Kota
              </Typography>
              <Box sx={{ width: '100%', height: 350 }}>
                <BarChart
                  dataset={barChartData as any}
                  xAxis={[{
                    scaleType: 'band',
                    dataKey: 'name',
                    tickLabelStyle: {
                      angle: 45,
                      textAnchor: 'start',
                      fontSize: 10,
                      fill: theme.palette.text.primary,
                    }
                  }]}
                  series={[
                    {
                      dataKey: 'price',
                      label: 'Harga (Rp/kg)',
                      color: '#1976d2',
                      valueFormatter: (v) => formatRupiah(v ?? 0),
                    },
                  ]}
                  grid={{ horizontal: true }}
                  hideLegend
                  margin={{ left: 90, right: 20, top: 40, bottom: 120 }}
                  height={350}
                  yAxis={[{
                    valueFormatter: (v: number | null) => new Intl.NumberFormat('id-ID').format(Math.round(v ?? 0)),
                    tickLabelStyle: { fontSize: 11, fill: theme.palette.text.primary }
                  }]}
                  sx={{
                    '& .MuiBarElement-root': { rx: 0 },
                  }}
                />
              </Box>
            </Grid>

            {/* Chart 2: 30 days trend (Line Chart) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 2, textAlign: 'left', pl: 2, fontSize: '1rem' }}>
                Harga rata-rata <strong>Cabe Rawit Merah / kg</strong> Jawa Timur<br/>30 hari terakhir
              </Typography>
              <Box sx={{ width: '100%', height: 350 }}>
                <LineChart
                  xAxis={[{
                    data: lineChartData.map((d) => d.label),
                    scaleType: 'band',
                    label: 'Bulan',
                    labelStyle: { fontSize: 12, fontStyle: 'italic', fill: theme.palette.text.primary, transform: 'translate(0, 30)' },
                    tickLabelStyle: {
                      fontSize: 10,
                      fill: theme.palette.text.primary,
                    }
                  }]}
                  series={[
                    {
                      data: lineChartData.map((d) => d.price),
                      label: 'Harga (Rp/kg)',
                      color: '#1976d2',
                      area: false,
                      showMark: false,
                      curve: 'linear',
                      valueFormatter: (v) => formatRupiah(v ?? 0),
                    },
                  ]}
                  grid={{ horizontal: true }}
                  hideLegend
                  margin={{ left: 90, right: 20, top: 40, bottom: 120 }}
                  height={350}
                  axisHighlight={{ x: 'line', y: 'none' }}
                  yAxis={[{
                    label: 'Harga Cabe Rawit Merah / kg',
                    labelStyle: { fontSize: 12, fontStyle: 'italic', fill: theme.palette.text.primary, transform: 'translate(-30, 0)' },
                    valueFormatter: (v: number | null) => new Intl.NumberFormat('id-ID').format(Math.round(v ?? 0)),
                    tickLabelStyle: { fontSize: 11, fill: theme.palette.text.primary }
                  }]}
                  sx={{
                    '& .MuiLineElement-root': { strokeWidth: 2.5 },
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Price KPI Widget (compact, used on Dashboard) ─────────────────
export function PriceKpiWidget() {
  const { todayPrice, priceDelta, priceDeltaPct, isTrendingUp, loading } = useCommodityPrices(7);

  if (loading) {
    return (
      <Card sx={{ borderRadius: 4, border: 'none', boxShadow: 'none', height: '100%' }}>
        <CardContent>
          <Skeleton variant="text" width={120} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width={160} height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={80} />
        </CardContent>
      </Card>
    );
  }

  const DeltaIcon = isTrendingUp === null
    ? TrendingFlatIcon
    : isTrendingUp
      ? TrendingUpIcon
      : TrendingDownIcon;

  const deltaColor = isTrendingUp === null
    ? 'text.secondary'
    : isTrendingUp
      ? 'success.main'
      : 'error.main';

  const deltaBg = isTrendingUp === null
    ? 'action.hover'
    : isTrendingUp
      ? 'success.light'
      : 'error.light';

  return (
    <Card sx={{ borderRadius: 4, border: 'none', boxShadow: 'none', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: '0.7rem',
            }}
          >
            Harga Cabai Rawit
          </Typography>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: 'success.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StorefrontIcon sx={{ color: 'primary.main', fontSize: 18 }} />
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontFamily: 'var(--font-sora)',
            fontWeight: 800,
            color: 'text.primary',
            lineHeight: 1.1,
            mb: 1,
          }}
        >
          {todayPrice ? formatRupiah(todayPrice) : '—'}
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, ml: 0.5 }}>
            /kg
          </Typography>
        </Typography>

        {priceDelta !== null ? (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: 1.5,
              bgcolor: deltaBg,
            }}
          >
            <DeltaIcon sx={{ fontSize: 14, color: deltaColor }} />
            <Typography variant="caption" sx={{ color: deltaColor, fontWeight: 700, fontSize: '0.72rem' }}>
              {priceDelta > 0 ? '+' : ''}{formatRupiah(Math.abs(priceDelta))} ({priceDeltaPct}%)
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled">vs hari kemarin</Typography>
        )}

        <Box sx={{ mt: 1.5 }}>
          <Button
            component={Link}
            href="/dashboard/kabar-pasar"
            size="small"
            sx={{
              p: 0,
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'primary.main',
              textTransform: 'none',
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            Lihat grafik tren →
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
