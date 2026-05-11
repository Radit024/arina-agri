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
import DashboardKPI from '@/components/dashboard/DashboardKPI';
import WeatherBanner from '@/components/dashboard/WeatherBanner';
import QuickActions from '@/components/dashboard/QuickActions';
import { TrendChart, KategoriChart } from '@/components/dashboard/DashboardCharts';
import NewsWidget from '@/components/dashboard/NewsWidget';
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
      const formattedDate = new Intl.DateTimeFormat(t('locale') === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long' }).format(harvestDate);
      
      return {
        days: diffDays,
        subtitle: t('kpi.harvest.subtitle', { date: formattedDate }),
      };
    }

    return {
      days: farmerProfile.hariMenujuPanen,
      subtitle: t('kpi.harvest.subtitle', { date: '—' }),
    };
  }, [events, t]);

  // ─── Dynamic Greeting ───────────────────────────────────────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('locale') === 'en' ? 'Good morning' : 'Selamat pagi';
    if (hour < 15) return t('locale') === 'en' ? 'Good afternoon' : 'Selamat siang';
    if (hour < 18) return t('locale') === 'en' ? 'Good afternoon' : 'Selamat sore';
    return t('locale') === 'en' ? 'Good evening' : 'Selamat malam';
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4, lg: 5 }, maxWidth: '1600px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ 
        mb: 5, 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', md: 'flex-end' },
        gap: 2
      }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'success.main', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1 }}>
            {getGreeting()}
          </Typography>
          <Typography
            component="h1"
            variant="h3"
            sx={{ fontFamily: 'var(--font-sora)', color: 'text.primary', fontWeight: 800, letterSpacing: '-0.03em', mb: 1 }}
          >
            {firstName}.
          </Typography>

        </Box>
        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
           <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
             {new Intl.DateTimeFormat(t('locale') === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
           </Typography>
        </Box>
      </Box>

      {/* KPI Cards */}
      <DashboardKPI 
        totalPengeluaran={formatRupiah(totalPengeluaran)}
        expTrend={expTrend}
        labaBersih={formatRupiah(labaBersih)}
        labaBersihRaw={labaBersih}
        profitTrend={profitTrend}
        weatherTemp={28}
        weatherCond={t('locale') === 'en' ? 'Sunny' : 'Cerah'}
        weatherHum={75}
        locale={t('locale')}
        t={t}
      />

      {/* Main Content & Sidebar Layout */}
      <Grid container spacing={3} sx={{ mb: 4, alignItems: 'stretch' }}>
        {/* Left Column (Charts) */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <TrendChart transactions={transactions} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <KategoriChart transactions={transactions} />
            </Grid>
            {/* Table or other content could go here in the future */}
          </Grid>
        </Grid>

        {/* Right Column (Sidebar) */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ height: '100%', position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <QuickActions />
            <NewsWidget layout="vertical" />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
