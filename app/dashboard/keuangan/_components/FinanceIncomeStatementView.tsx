'use client';

import React, { useMemo } from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeReports' | 'labaRugiActions'>;

function SummaryCard({
  title,
  amount,
  subtitle,
  color,
  icon,
}: {
  title: string;
  amount: number;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        borderTop: '4px solid',
        borderColor: color ?? 'divider',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 },
      }}
    >
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: color ?? 'text.primary', mt: 0.5, lineHeight: 1.2 }}
            >
              {formatRupiah(Math.abs(amount))}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: `${color ?? 'primary'}.50`,
                color: color ?? 'text.secondary',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function FinanceIncomeStatementView({ financeReports }: Props) {
  const { labaRugi, reportTransactions } = financeReports;

  const profitColor = labaRugi.labaRugi >= 0 ? 'success.main' : 'error.main';
  const ProfitIcon =
    labaRugi.labaRugi > 0
      ? ArrowUpwardIcon
      : labaRugi.labaRugi < 0
        ? ArrowDownwardIcon
        : TrendingFlatIcon;

  const byKategori = useMemo(() => {
    const map = new Map<string, { jenis: 'pendapatan' | 'pengeluaran'; kategori: string; jumlah: number; total: number }>();
    for (const tx of reportTransactions) {
      const key = `${tx.jenis}:${tx.kategori || 'Lainnya'}`;
      const existing = map.get(key);
      if (existing) {
        existing.jumlah += 1;
        existing.total += tx.nominal;
      } else {
        map.set(key, {
          jenis: tx.jenis,
          kategori: tx.kategori || 'Lainnya',
          jumlah: 1,
          total: tx.nominal,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [reportTransactions]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: { xs: 0, md: 1 } }}>
      {/* Header */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Laba Rugi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ringkasan posisi keuangan dari data yang terdaftar dalam skenario ini.
          </Typography>
        </Box>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            title="Total Pendapatan"
            amount={labaRugi.totalPendapatan}
            subtitle="Seluruh kas masuk"
            color="success.main"
            icon={<ArrowUpwardIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            title="Total Pengeluaran"
            amount={labaRugi.totalPengeluaran}
            subtitle="Seluruh kas keluar"
            color="error.main"
            icon={<ArrowDownwardIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            title={labaRugi.labaRugi >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
            amount={labaRugi.labaRugi}
            subtitle="Pendapatan − Pengeluaran"
            color={profitColor}
            icon={<ProfitIcon />}
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* Category Breakdown */}
      {byKategori.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700 }}>
            Rincian per Kategori
          </Typography>
          <Stack spacing={1}>
            {byKategori.map((entry) => (
              <Stack
                key={`${entry.jenis}-${entry.kategori}`}
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 0.75,
                  px: 1.5,
                  borderRadius: 1.5,
                  bgcolor: entry.jenis === 'pendapatan' ? 'success.50' : 'error.50',
                  border: '1px solid',
                  borderColor: entry.jenis === 'pendapatan' ? 'success.100' : 'error.100',
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {entry.kategori}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {entry.jenis === 'pendapatan' ? 'Pendapatan' : 'Pengeluaran'} • {entry.jumlah} transaksi
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: entry.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                  }}
                >
                  {entry.jenis === 'pendapatan' ? '+' : '−'}{formatRupiah(entry.total)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            py: 6,
            color: 'text.disabled',
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Belum ada data transaksi
          </Typography>
          <Typography variant="body2">
            Tambahkan transaksi ke skenario ini untuk melihat laporan laba rugi.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
