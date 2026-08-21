'use client';

import dynamic from 'next/dynamic';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import { useCommodityPrices } from '@/hooks/useCommodityPrices';
import { formatRupiah } from '@/lib/formatters';
import { useTranslations } from 'next-intl';
import { softBg, softText } from '@/lib/themeColors';



const EastJavaMap = dynamic(
  () => import('@/components/dashboard/EastJavaMap'),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />,
  }
);

export function PriceTrendChart() {
  const t = useTranslations('KabarPasar.priceChart');
  const { regionPrices, averagePrice, loading } = useCommodityPrices(30);

  return (
    <Grid container spacing={3}>
      {/* Card 1: Average per regency (Map) */}
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            height: '100%',
            borderRadius: 4,
            border: 'none',
            boxShadow: 'none',
            overflow: 'hidden',
          }}
        >
          <CardHeader
            title={
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 400, fontSize: '1rem' }}>
                {t('mapTitle')} <strong>{t('commodity')}</strong>
              </Typography>
            }
            sx={{ pb: 1, pt: 1.5 }}
          />
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {loading ? (
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            ) : (
              <Box sx={{ width: '100%' }}>
                <EastJavaMap data={regionPrices} averagePrice={averagePrice} />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export function PriceKpiWidget() {
  const t = useTranslations('KabarPasar.priceChart');
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

  const deltaIntent = isTrendingUp ? 'success' : 'error';

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
            {t('kpiTitle')}
          </Typography>
          <Box
            sx={(theme) => ({
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: softBg(theme, 'success', 0.16),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })}
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
            {t('perKg')}
          </Typography>
        </Typography>

        {priceDelta !== null ? (
          <Box
            sx={(theme) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: 1.5,
              bgcolor: isTrendingUp === null ? theme.palette.action.hover : softBg(theme, deltaIntent, 0.16),
            })}
          >
            <DeltaIcon sx={(theme) => ({ fontSize: 14, color: isTrendingUp === null ? theme.palette.text.secondary : softText(theme, deltaIntent) })} />
            <Typography variant="caption" sx={(theme) => ({ color: isTrendingUp === null ? theme.palette.text.secondary : softText(theme, deltaIntent), fontWeight: 700, fontSize: '0.72rem' })}>
              {priceDelta > 0 ? '+' : ''}{formatRupiah(Math.abs(priceDelta))} ({priceDeltaPct}%)
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.disabled">{t('vsYesterday')}</Typography>
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
            {t('viewTrend')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
