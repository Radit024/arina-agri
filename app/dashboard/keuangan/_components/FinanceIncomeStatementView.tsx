'use client';

import React, { useMemo } from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeReports' | 'labaRugiActions'> & {
  productionSales?: UseKeuanganControllerResult['productionSales'];
};

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

export default function FinanceIncomeStatementView({ financeReports, productionSales }: Props) {
  const { labaRugi, reportTransactions, kelayakanUsaha } = financeReports;

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

      {/* Section Kelayakan Usaha */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
              Kelayakan Usaha (Asumsi Produksi & Penjualan)
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {kelayakanUsaha?.produksi && kelayakanUsaha?.hargaJual
                ? `Asumsi skenario: Volume ${kelayakanUsaha.produksi.toLocaleString('id-ID')} ${kelayakanUsaha.satuan} • Harga Jual ${formatRupiah(kelayakanUsaha.hargaJual)}/${kelayakanUsaha.satuan}`
                : 'Asumsi volume produksi dan harga jual belum diatur untuk skenario ini.'}
            </Typography>
          </Box>
          {productionSales && (
            <Button
              variant="outlined"
              size="small"
              onClick={productionSales.openDialog}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Atur Asumsi
            </Button>
          )}
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%', borderTop: '3px solid', borderColor: 'primary.main' }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  HPP (Harga Pokok Produksi)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {kelayakanUsaha?.hpp != null
                    ? `${formatRupiah(kelayakanUsaha.hpp)} / ${kelayakanUsaha.satuan}`
                    : '—'}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  Total Biaya ÷ Volume Produksi
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%', borderTop: '3px solid', borderColor: 'info.main' }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  BEP Produksi (Batas Impas)
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {kelayakanUsaha?.bepProduksi != null
                    ? `${kelayakanUsaha.bepProduksi.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${kelayakanUsaha.satuan}`
                    : '—'}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  Total Biaya ÷ Harga Jual
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%', borderTop: '3px solid', borderColor: 'warning.main' }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  B/C Ratio
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {kelayakanUsaha?.bcRatio != null ? kelayakanUsaha.bcRatio.toFixed(2) : '—'}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  Keuntungan ÷ Total Biaya
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                height: '100%',
                borderTop: '3px solid',
                borderColor:
                  kelayakanUsaha?.kelayakanStatus === 'untung'
                    ? 'success.main'
                    : kelayakanUsaha?.kelayakanStatus === 'impas'
                      ? 'info.main'
                      : kelayakanUsaha?.kelayakanStatus === 'rugi'
                        ? 'error.main'
                        : 'divider',
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  Status Kelayakan
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {kelayakanUsaha?.kelayakanStatus ? (
                    <Chip
                      label={kelayakanUsaha.kelayakanStatus.toUpperCase()}
                      size="small"
                      color={
                        kelayakanUsaha.kelayakanStatus === 'untung'
                          ? 'success'
                          : kelayakanUsaha.kelayakanStatus === 'impas'
                            ? 'info'
                            : 'error'
                      }
                      sx={{ fontWeight: 800 }}
                    />
                  ) : (
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      —
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  Evaluasi volume vs BEP
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

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
