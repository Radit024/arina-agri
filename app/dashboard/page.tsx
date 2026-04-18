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
import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  const t = useTranslations('Dashboard.home');
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
          sx={{ fontFamily: 'var(--font-sora)', color: 'text.primary', fontWeight: 700 }}
        >
          {t('welcome', { name: farmerProfile.nama.split(' ')[0] })}
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
            title={t('kpi.totalExpense.title')}
            value={formatRupiah(totalPengeluaran)}
            subtitle={t('kpi.totalExpense.subtitle')}
            icon={<AccountBalanceWalletIcon />}
            color="#ef4444"
            trend={{ value: t('kpi.totalExpense.trend'), positive: false }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title={t('kpi.netProfit.title')}
            value={formatRupiah(labaBersih)}
            subtitle={t('kpi.netProfit.subtitle')}
            icon={<TrendingUpIcon />}
            color="#16a34a"
            trend={{ value: t('kpi.netProfit.trend'), positive: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title={t('kpi.harvest.title')}
            value={t('kpi.harvest.value', { days: farmerProfile.hariMenujuPanen })}
            subtitle={t('kpi.harvest.subtitle')}
            icon={<AgricultureIcon />}
            color="#16a34a"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title={t('kpi.weather.title')}
            value={t('kpi.weather.value')}
            subtitle={t('kpi.weather.subtitle')}
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
