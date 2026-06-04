'use client';

import React, { memo } from 'react';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { useTheme, alpha } from '@mui/material/styles';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import WbCloudyIcon from '@mui/icons-material/WbCloudy';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Divider from '@mui/material/Divider';
import WeatherBanner from './WeatherBanner';
import { formatRupiah } from '@/lib/formatters';
import Skeleton from '@mui/material/Skeleton';
import { softBg, softText } from '@/lib/themeColors';

interface DashboardKPIProps {
  totalPengeluaran: string;
  expTrend: number;
  labaBersih: string;
  labaBersihRaw: number;
  profitTrend: number;
  weatherTemp: number;
  weatherCond: string;
  weatherHum: number;
  weatherBannerMessage?: string;
  priceLoading: boolean;
  todayPrice: number | null;
  priceDelta: number | null;
  priceDeltaPct: string | null;
  isTrendingUp: boolean | null;
  locale: string;
  t: any; // Translation function
}

export default memo(function DashboardKPI({
  totalPengeluaran,
  expTrend,
  labaBersih,
  labaBersihRaw,
  profitTrend,
  weatherTemp,
  weatherCond,
  weatherHum,
  weatherBannerMessage,
  priceLoading,
  todayPrice,
  priceDelta,
  priceDeltaPct,
  isTrendingUp,
  locale,
  t
}: DashboardKPIProps) {
  const theme = useTheme();
  
  const profitPositive = profitTrend >= 0;
  const expPositive = expTrend <= 0;
  
  const profitColor = profitPositive ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Card sx={{ 
      mb: 4, 
      borderRadius: 4, 
      overflow: 'hidden', 
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.02)'
    }}>
      <Grid container>
        {/* LEFT: Featured KPI (Laba Bersih) */}
        <Grid 
          size={{ xs: 12, md: 5 }} 
          sx={{ 
            p: { xs: 3, md: 4 }, 
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            bgcolor: alpha(profitColor, 0.03),
            borderRight: { xs: 'none', md: '1px solid' },
            borderBottom: { xs: '1px solid', md: 'none' },
            borderColor: 'divider'
          }}
        >
          <Box sx={{ 
            position: 'absolute', 
            top: -40, 
            left: -40, 
            width: 160, 
            height: 160, 
            borderRadius: '50%', 
            background: `radial-gradient(circle, ${alpha(profitColor, 0.15)} 0%, ${alpha(profitColor, 0)} 70%)`,
            zIndex: 0
          }} />
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ 
                width: 40, height: 40, borderRadius: 2, 
                bgcolor: alpha(profitColor, 0.1), 
                color: profitColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {profitPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
              </Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t('kpi.netProfit.title')}
              </Typography>
            </Box>
            
            <Typography variant="h3" sx={{ 
              fontWeight: 800, 
              fontFamily: 'var(--font-sora)', 
              color: profitColor,
              letterSpacing: '-0.02em',
              mb: 1
            }}>
              {labaBersih}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {t('kpi.netProfit.subtitle')}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: profitPositive ? 'success.main' : 'error.main', 
                fontWeight: 700, 
                bgcolor: profitPositive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                px: 1.5, py: 0.5, borderRadius: 2
              }}>
                {profitPositive ? '↑' : '↓'} {t('kpi.trend', { value: `${profitTrend > 0 ? '+' : ''}${profitTrend}` })}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* RIGHT: Secondary KPIs */}
        <Grid size={{ xs: 12, md: 7 }} container sx={{ alignContent: 'flex-start' }}>
          {/* Row 1: Pengeluaran & Panen */}
          <Grid size={{ xs: 12, sm: 6 }} sx={{ p: 3, borderRight: { sm: '1px solid' }, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('kpi.totalExpense.title')}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700, fontFamily: 'var(--font-sora)', color: 'text.primary' }}>
                  {totalPengeluaran}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {`${new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' }).format(new Date())}`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: expPositive ? 'success.main' : 'error.main', fontWeight: 600 }}>
                    {expPositive ? '↓' : '↑'} {t('kpi.trend', { value: `${expTrend > 0 ? '+' : ''}${expTrend}` })}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ color: 'error.main', opacity: 0.8 }}>
                <AccountBalanceWalletIcon />
              </Box>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }} sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Harga Cabai Rawit
                </Typography>
                
                {priceLoading ? (
                  <Box sx={{ mt: 0.5 }}>
                    <Skeleton variant="text" width={120} height={32} />
                    <Skeleton variant="text" width={80} height={20} sx={{ mt: 1 }} />
                  </Box>
                ) : (
                  <>
                    <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700, fontFamily: 'var(--font-sora)', color: 'text.primary' }}>
                      {todayPrice ? formatRupiah(todayPrice) : '—'}
                      <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, ml: 0.5 }}>
                        /kg
                      </Typography>
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">vs kemarin</Typography>
                      {priceDelta !== null && (
                        <Typography variant="caption" sx={{ color: isTrendingUp ? 'success.main' : 'error.main', fontWeight: 600 }}>
                          {isTrendingUp ? '↑' : '↓'} {priceDelta > 0 ? '+' : ''}{formatRupiah(Math.abs(priceDelta))} ({priceDeltaPct ? `${priceDeltaPct}%` : '—'})
                        </Typography>
                      )}
                    </Box>
                  </>
                )}
              </Box>
              <Box sx={{ color: softText(theme, 'success'), opacity: 0.9, bgcolor: softBg(theme, 'success', 0.16), p: 1, borderRadius: 2 }}>
                <StorefrontIcon fontSize="small" />
              </Box>
            </Box>
          </Grid>

          {/* Row 2: Status Cuaca (Full Width) */}
          <Grid size={12} sx={{ p: 3, bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: 3 }}>
              {weatherCond ? (
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('kpi.weather.title')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <WbCloudyIcon sx={{ color: 'warning.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'var(--font-sora)', color: 'text.primary' }}>
                      {t('kpi.weather.value', { temp: weatherTemp, cond: weatherCond })}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {t('kpi.weather.subtitle', { hum: weatherHum })}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('kpi.weather.title')}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      Belum ada data
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Isi lokasi di menu cuaca
                    </Typography>
                  </Box>
                </Box>
              )}
              {weatherBannerMessage && (
                <Box sx={{ flex: 1, width: '100%' }}>
                  <WeatherBanner message={weatherBannerMessage} />
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Grid>
    </Card>
  );
});
