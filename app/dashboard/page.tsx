'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import WbCloudyIcon from '@mui/icons-material/WbCloudy';
import KPICard from '@/components/dashboard/KPICard';
import WeatherBanner from '@/components/dashboard/WeatherBanner';
import RecentTransactionsTable from '@/components/dashboard/RecentTransactionsTable';
import { TrendChart, KategoriChart } from '@/components/dashboard/DashboardCharts';
import { farmerProfile, mockTransactions } from '@/lib/mockData';
import { formatRupiah } from '@/lib/formatters';

export default function DashboardPage() {
  const totalPengeluaran = mockTransactions
    .filter((t) => t.jenis === 'pengeluaran')
    .reduce((acc, t) => acc + t.nominal, 0);

  const totalPendapatan = mockTransactions
    .filter((t) => t.jenis === 'pendapatan')
    .reduce((acc, t) => acc + t.nominal, 0);

  const labaBersih = totalPendapatan - totalPengeluaran;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ fontFamily: 'var(--font-sora)', color: 'text.primary' }}
        >
          Selamat datang, Pak {farmerProfile.nama.split(' ')[0]} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {farmerProfile.lokasi} · {farmerProfile.komoditas} · {farmerProfile.luasLahan}
        </Typography>
      </Box>

      {/* Weather Alert */}
      <Box sx={{ mb: 3 }}>
        <WeatherBanner />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title="Total Pengeluaran Bulan Ini"
            value={formatRupiah(totalPengeluaran)}
            subtitle="April 2026"
            icon={<AccountBalanceWalletIcon />}
            color="#ef4444"
            trend={{ value: '12% dari bulan lalu', positive: false }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title="Estimasi Laba Bersih"
            value={formatRupiah(labaBersih)}
            subtitle="Pendapatan - Pengeluaran"
            icon={<TrendingUpIcon />}
            color="#16a34a"
            trend={{ value: '18% dari bulan lalu', positive: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title="Hari Menuju Panen"
            value={`${farmerProfile.hariMenujuPanen} Hari`}
            subtitle="Pemetikan perdana: 25 April"
            icon={<AgricultureIcon />}
            color="#16a34a"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title="Status Cuaca Hari Ini"
            value="24°C · Gerimis"
            subtitle="Kelembapan 78%"
            icon={<WbCloudyIcon />}
            color="#3b82f6"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <TrendChart />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <KategoriChart />
        </Grid>
      </Grid>

      {/* Recent Transactions */}
      <RecentTransactionsTable />
    </Box>
  );
}
