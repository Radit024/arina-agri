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
import { farmerProfile } from '@/lib/mockData';
import { formatRupiah } from '@/lib/formatters';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCalendar } from '@/hooks/useCalendar';
import { useMemo } from 'react';

export default function DashboardPage() {
  const t = useTranslations('Dashboard.home');
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const firstName = userName.split(' ')[0];

  const { transactions } = useTransactions();
  const { events } = useCalendar();

  // ─── Trend & KPI Calculations ─────────────────────────────────────
  const { totalPengeluaran, labaBersih, expTrend, profitTrend } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const thisMonthTxs = transactions.filter(t => {
      const d = new Date(t.tanggal);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const prevMonthTxs = transactions.filter(t => {
      const d = new Date(t.tanggal);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const getKPI = (txs: typeof transactions) => {
      const exp = txs.filter(t => t.jenis === 'pengeluaran').reduce((acc, t) => acc + t.nominal, 0);
      const inc = txs.filter(t => t.jenis === 'pendapatan').reduce((acc, t) => acc + t.nominal, 0);
      return { exp, profit: inc - exp };
    };

    const currentKPI = getKPI(thisMonthTxs);
    const lastKPI = getKPI(prevMonthTxs);

    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      totalPengeluaran: currentKPI.exp,
      labaBersih: currentKPI.profit,
      expTrend: calcTrend(currentKPI.exp, lastKPI.exp),
      profitTrend: calcTrend(currentKPI.profit, lastKPI.profit),
    };
  }, [transactions]);

  // ─── Harvest Countdown Logic ──────────────────────────────────────
  const harvestInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextHarvest = events
      .filter(e => (e.jenis === 'pemetikan' || e.judul.toLowerCase().includes('panen')) && new Date(e.tanggal) >= today)
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())[0];

    if (nextHarvest) {
      const harvestDate = new Date(nextHarvest.tanggal);
      const diffTime = harvestDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const formattedDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' }).format(harvestDate);
      
      return {
        days: diffDays,
        subtitle: `Pemetikan perdana: ${formattedDate}`,
      };
    }

    return {
      days: farmerProfile.hariMenujuPanen,
      subtitle: t('kpi.harvest.subtitle'),
    };
  }, [events, t]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontFamily: 'var(--font-sora)', color: 'text.primary', fontWeight: 700 }}
        >
          {t('welcome', { name: firstName })}
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
            subtitle={`${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date())}`}
            icon={<AccountBalanceWalletIcon />}
            color="#ef4444"
            trend={{ 
              value: `${expTrend > 0 ? '+' : ''}${expTrend}% dari bulan lalu`, 
              positive: expTrend <= 0 // Lower expense is positive
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title={t('kpi.netProfit.title')}
            value={formatRupiah(labaBersih)}
            subtitle="Pendapatan - Pengeluaran"
            icon={<TrendingUpIcon />}
            color="#16a34a"
            trend={{ 
              value: `${profitTrend > 0 ? '+' : ''}${profitTrend}% dari bulan lalu`, 
              positive: profitTrend >= 0 
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KPICard
            title={t('kpi.harvest.title')}
            value={t('kpi.harvest.value', { days: harvestInfo.days })}
            subtitle={harvestInfo.subtitle}
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
          <TrendChart transactions={transactions} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <KategoriChart transactions={transactions} />
        </Grid>
      </Grid>

      {/* Recent Transactions */}
      <RecentTransactionsTable transactions={transactions} />
    </Box>
  );
}
