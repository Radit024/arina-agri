'use client';

import dynamic from 'next/dynamic';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartOutlinedIcon from '@mui/icons-material/PieChartOutlined';
import Link from 'next/link';
import { alpha, useTheme } from '@mui/material/styles';
import { formatRupiah } from '@/lib/formatters';
import { useTranslations, useLocale } from 'next-intl';
import type { DashboardCategoryPoint, DashboardTrendPoint } from '@/lib/dashboard/summary';

interface TrendChartProps {
  data: DashboardTrendPoint[];
}

interface KategoriChartProps {
  data: DashboardCategoryPoint[];
}

const LineChart = dynamic(() => import('@mui/x-charts/LineChart').then((m) => ({ default: m.LineChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />,
});

const PieChart = dynamic(() => import('@mui/x-charts/PieChart').then((m) => ({ default: m.PieChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />,
});

export function TrendChart({ data }: TrendChartProps) {
  const theme = useTheme();
  const t = useTranslations('Dashboard.charts');
  const hasData = data.some((item) => item.pendapatan > 0 || item.pengeluaran > 0);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, border: 'none', boxShadow: 'none' }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
            {t('trend.title')}
          </Typography>
        }
        subheader={t('trend.subheader')}
      />
      <CardContent sx={{ pt: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', gap: 2.5, mb: 3, mt: 1 }}>
          {[{ color: theme.palette.success.main, label: t('common.income') }, { color: theme.palette.warning.main, label: t('common.expense') }].map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
        
        <Box sx={{ flex: 1, width: '100%', minHeight: 260, position: 'relative' }}>
          {!hasData ? (
            <Box sx={{ 
              height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'divider', gap: 2
            }}>
              <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'background.paper', color: 'text.disabled', display: 'flex', boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.24 : 0.05)}` }}>
                <ShowChartIcon fontSize="medium" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{t('common.noData')}</Typography>
              <Button component={Link} href="/dashboard/keuangan" variant="outlined" size="small" sx={{ mt: 1, borderRadius: 8, textTransform: 'none', fontWeight: 600 }}>
                Tambah Transaksi
              </Button>
            </Box>
          ) : (
            <LineChart
              xAxis={[{ data: data.map((d) => d.bulan), scaleType: 'point' }]}
              series={[
                {
                  data: data.map((d) => d.pendapatan),
                  label: t('common.income'),
                  color: theme.palette.success.main,
                  showMark: true,
                  curve: 'monotoneX',
                  valueFormatter: (v) => formatRupiah(v ?? 0),
                },
                {
                  data: data.map((d) => d.pengeluaran),
                  label: t('common.expense'),
                  color: theme.palette.warning.main,
                  showMark: true,
                  curve: 'monotoneX',
                  valueFormatter: (v) => formatRupiah(v ?? 0),
                },
              ]}
              height={260}
              margin={{ left: 60, right: 20, top: 20, bottom: 40 }}
              hideLegend
              disableLineItemHighlight={false}
              axisHighlight={{ x: 'line', y: 'none' }}
              sx={{
                '& .MuiLineElement-root': { strokeWidth: 3 },
                '& .MuiMarkElement-root': { strokeWidth: 2 },
              }}
              yAxis={[{ valueFormatter: (v: number | null) => `${((v ?? 0) / 1000000).toFixed(1)}Jt` }]}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export function KategoriChart({ data }: KategoriChartProps) {
  const theme = useTheme();
  const t = useTranslations('Dashboard.charts');
  const locale = useLocale();
  
  const getCategoryColor = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('pestisida') || c.includes('pesticide')) return theme.palette.error.main;
    if (c.includes('pupuk') || c.includes('fertilizer')) return theme.palette.success.main;
    if (c.includes('tenaga') || c.includes('labor')) return theme.palette.info.main;
    if (c.includes('irigasi') || c.includes('irrigation')) return theme.palette.primary.main;
    if (c.includes('alat') || c.includes('tools')) return theme.palette.warning.main;
    return theme.palette.text.secondary;
  };

  const totalPengeluaran = pieDataTotal(data);
  const pieData = data.map((item, index) => ({
    id: index,
    value: item.jumlah,
    label: item.kategori,
    color: getCategoryColor(item.kategori),
  }));

  const pieColors = pieData.map(d => d.color);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, border: 'none', boxShadow: 'none' }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
            {t('category.title')}
          </Typography>
        }
        subheader={t('category.subheader', { 
          month: new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', { month: 'long' }).format(new Date()), 
          year: new Date().getFullYear() 
        })}
      />
      <CardContent sx={{ pt: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 300 }}>
        {data.length === 0 ? (
          <Box sx={{ 
            height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'divider', gap: 2
          }}>
            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'background.paper', color: 'text.disabled', display: 'flex', boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.24 : 0.05)}` }}>
              <PieChartOutlinedIcon fontSize="medium" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{t('common.noData')}</Typography>
            <Button component={Link} href="/dashboard/keuangan" variant="outlined" size="small" sx={{ mt: 1, borderRadius: 8, textTransform: 'none', fontWeight: 600 }}>
              Tambah Transaksi
            </Button>
          </Box>
        ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                width: '100%',
              }}
            >
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <PieChart
                series={[
                  {
                    data: pieData,
                    arcLabel: (item) => `${Math.round((item.value / totalPengeluaran) * 100)}%`,
                    arcLabelMinAngle: 14,
                    innerRadius: 50,
                    outerRadius: 90,
                    paddingAngle: 3,
                    cornerRadius: 6,
                  },
                ]}
                colors={pieColors}
                hideLegend
                width={200}
                height={200}
                margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                sx={{
                  '& .MuiPieArcLabel-root': {
                    fill: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', px: 1 }}>
              {data.map((item, index) => (
                <Box key={item.kategori} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: pieColors[index % pieColors.length], flexShrink: 0 }} />
                    <Typography 
                      variant="body2" 
                      noWrap
                      sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}
                    >
                      {item.kategori}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                    {item.jumlah >= 1000000 
                      ? `Rp ${(item.jumlah / 1000000).toFixed(1)}Jt` 
                      : formatRupiah(item.jumlah)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function pieDataTotal(data: DashboardCategoryPoint[]) {
  const total = data.reduce((sum, item) => sum + item.jumlah, 0);
  return total > 0 ? total : 1;
}
