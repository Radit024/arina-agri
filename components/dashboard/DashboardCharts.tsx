'use client';

import dynamic from 'next/dynamic';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { trendChartData, kategoriChartData } from '@/lib/mockData';
import { formatRupiah } from '@/lib/formatters';

const LineChart = dynamic(() => import('@mui/x-charts').then((m) => ({ default: m.LineChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />,
});

const BarChart = dynamic(() => import('@mui/x-charts').then((m) => ({ default: m.BarChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />,
});

export function TrendChart() {
  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>
            Tren Keuangan
          </Typography>
        }
        subheader="Pengeluaran vs Pendapatan (6 bulan terakhir)"
      />
      <CardContent sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {[{ color: '#16a34a', label: 'Pendapatan' }, { color: '#f59e0b', label: 'Pengeluaran' }].map((item) => (
            <Box key={item.label} className="flex items-center gap-1.5">
              <Box sx={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
              <Typography variant="caption" color="text.secondary" fontWeight={500}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
        <LineChart
          xAxis={[{ data: trendChartData.map((d) => d.bulan), scaleType: 'point' }]}
          series={[
            {
              data: trendChartData.map((d) => d.pendapatan),
              label: 'Pendapatan',
              color: '#16a34a',
              showMark: true,
              curve: 'monotoneX',
              valueFormatter: (v) => formatRupiah(v ?? 0),
            },
            {
              data: trendChartData.map((d) => d.pengeluaran),
              label: 'Pengeluaran',
              color: '#f59e0b',
              showMark: true,
              curve: 'monotoneX',
              valueFormatter: (v) => formatRupiah(v ?? 0),
            },
          ]}
          height={260}
          margin={{ left: 60, right: 16, top: 8, bottom: 40 }}
          hideLegend
          sx={{
            '& .MuiLineElement-root': { strokeWidth: 2.5 },
            '& .MuiMarkElement-root': { strokeWidth: 2 },
          }}
          yAxis={[{ valueFormatter: (v) => `${(v / 1000000).toFixed(1)}Jt` }]}
        />
      </CardContent>
    </Card>
  );
}

export function KategoriChart() {
  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>
            Kategori Pengeluaran
          </Typography>
        }
        subheader="Bulan April 2026"
      />
      <CardContent sx={{ pt: 0 }}>
        <BarChart
          xAxis={[{ data: kategoriChartData.map((d) => d.kategori), scaleType: 'band' }]}
          series={[
            {
              data: kategoriChartData.map((d) => d.jumlah),
              label: 'Pengeluaran',
              color: '#16a34a',
              valueFormatter: (v) => formatRupiah(v ?? 0),
            },
          ]}
          height={260}
          margin={{ left: 60, right: 16, top: 8, bottom: 40 }}
          hideLegend
          yAxis={[{ valueFormatter: (v) => `${(v / 1000).toFixed(0)}rb` }]}
        />
      </CardContent>
    </Card>
  );
}
