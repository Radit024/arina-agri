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

const PieChart = dynamic(() => import('@mui/x-charts/PieChart').then((m) => ({ default: m.PieChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />,
});

export function TrendChart() {
  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
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
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{item.label}</Typography>
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
          yAxis={[{ valueFormatter: (v: number | null) => `${((v ?? 0) / 1000000).toFixed(1)}Jt` }]}
        />
      </CardContent>
    </Card>
  );
}

export function KategoriChart() {
  const totalPengeluaran = pieDataTotal(kategoriChartData);
  const pieData = kategoriChartData.map((item, index) => ({
    id: index,
    value: item.jumlah,
    label: item.kategori,
  }));

  const pieColors = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#8b5cf6', '#64748b'];

  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
            Kategori Pengeluaran
          </Typography>
        }
        subheader="Bulan April 2026"
      />
      <CardContent sx={{ pt: 0 }}>
        <PieChart
          series={[
            {
              data: pieData,
              arcLabel: (item) => `${Math.round((item.value / totalPengeluaran) * 100)}%`,
              arcLabelMinAngle: 14,
              innerRadius: 46,
              outerRadius: 100,
              paddingAngle: 2,
              cornerRadius: 4,
            },
          ]}
          colors={pieColors}
          height={260}
          margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
          sx={{
            '& .MuiPieArcLabel-root': {
              fill: '#0f172a',
              fontSize: 11,
              fontWeight: 600,
            },
          }}
        />

        <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
          {kategoriChartData.map((item, index) => (
            <Box key={item.kategori} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: pieColors[index % pieColors.length] }} />
                <Typography variant="caption" color="text.secondary">
                  {item.kategori}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {formatRupiah(item.jumlah)}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function pieDataTotal(data: typeof kategoriChartData) {
  const total = data.reduce((sum, item) => sum + item.jumlah, 0);
  return total > 0 ? total : 1;
}
