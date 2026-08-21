'use client';

import React from 'react';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import { formatRupiah } from '@/lib/formatters';
import type { ScenarioComparison } from '@/lib/finance/rabTypes';

import FinanceComparisonCashFlowMobileCard from './FinanceComparisonCashFlowMobileCard';

export interface FinanceComparisonViewProps {
  comparison: ScenarioComparison | null;
  loading: boolean;
  error: string | null;
  hasEnoughData: boolean;
  projectionHasData: boolean;
  realizationHasData: boolean;
  onSwitchMode?: (mode: 'PROJECTION' | 'REALIZATION') => void;
  onNavigateTab?: (tab: 'buku-besar' | 'rab') => void;
}

function formatMetricValue(label: string, val: number): string {
  if (label === 'HPP') {
    return `${formatRupiah(val)}/kg`;
  }
  if (label === 'BEP Produksi') {
    return `${val.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;
  }
  if (label === 'B/C Ratio') {
    return val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return formatRupiah(val);
}

function formatSelisihPercent(percent: number | null): React.ReactNode {
  if (percent === null) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ fontWeight: 600 }}>
        —
      </Typography>
    );
  }

  const isPositive = percent > 0;
  const isNegative = percent < 0;
  const color = isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.primary';
  const prefix = isPositive ? '+' : '';

  return (
    <Typography variant="body2" sx={{ fontWeight: 700, color }}>
      {prefix}
      {percent.toFixed(2)}%
    </Typography>
  );
}

export default function FinanceComparisonView({
  comparison,
  loading,
  error,
  hasEnoughData,
  projectionHasData,
  realizationHasData,
  onSwitchMode,
  onNavigateTab,
}: FinanceComparisonViewProps) {
  if (loading) {
    return (
      <Stack spacing={3} sx={{ py: 2 }}>
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Card sx={{ borderLeft: '4px solid', borderColor: 'error.main', bgcolor: 'error.50', my: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" color="error.main" sx={{ fontWeight: 700 }}>
            Gagal Memuat Perbandingan Skenario
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!hasEnoughData || !comparison) {
    let gatingMessage =
      'Kedua skenario (Proyeksi & Realisasi) belum memiliki data RAB atau Transaksi. Silakan isi rencana anggaran di Proyeksi dan catat transaksi di Realisasi untuk melihat perbandingan.';
    if (projectionHasData && !realizationHasData) {
      gatingMessage =
        'Skenario Realisasi belum memiliki data. Catat transaksi atau realisasi di lapangan pada mode Realisasi terlebih dahulu.';
    } else if (!projectionHasData && realizationHasData) {
      gatingMessage =
        'Skenario Proyeksi belum memiliki data. Lengkapi rencana anggaran atau asumsi pada mode Proyeksi terlebih dahulu.';
    }

    return (
      <Card
        sx={{
          my: 3,
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, alignItems: 'center', textAlign: 'center' }}>
          <Box
            sx={{
              p: 2,
              borderRadius: '50%',
              bgcolor: 'primary.50',
              color: 'primary.main',
              display: 'inline-flex',
            }}
          >
            <CompareArrowsIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box>
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 800 }}>
              Perbandingan Proyeksi vs Realisasi
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 540, mt: 0.5 }}>
              {gatingMessage}
            </Typography>
          </Box>

          {/* Status scenario cards */}
          <Grid container spacing={2} sx={{ width: '100%', maxWidth: 640, mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'left',
                  borderRadius: 2,
                  borderColor: projectionHasData ? 'success.200' : 'divider',
                  bgcolor: projectionHasData ? 'success.50' : 'background.paper',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {projectionHasData ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Mode Rencana (Proyeksi)
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {projectionHasData
                      ? '✓ Data RAB / anggaran rencana telah terisi.'
                      : 'Belum ada data rencana anggaran.'}
                  </Typography>
                </Box>

                {!projectionHasData && onSwitchMode && (
                  <Button
                    variant="outlined"
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => {
                      onSwitchMode('PROJECTION');
                      onNavigateTab?.('rab');
                    }}
                    sx={{ minHeight: 44, mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Isi Rencana Anggaran
                  </Button>
                )}
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'left',
                  borderRadius: 2,
                  borderColor: realizationHasData ? 'success.200' : 'divider',
                  bgcolor: realizationHasData ? 'success.50' : 'background.paper',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {realizationHasData ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Mode Aktual (Realisasi)
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {realizationHasData
                      ? '✓ Data transaksi riil di lapangan telah tercatat.'
                      : 'Belum ada catatan transaksi aktual.'}
                  </Typography>
                </Box>

                {!realizationHasData && onSwitchMode && (
                  <Button
                    variant="contained"
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => {
                      onSwitchMode('REALIZATION');
                      onNavigateTab?.('buku-besar');
                    }}
                    sx={{
                      minHeight: 44,
                      mt: 2,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      bgcolor: 'success.main',
                      '&:hover': { bgcolor: 'success.dark' },
                    }}
                  >
                    Catat Transaksi Aktual
                  </Button>
                )}
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Card>
    );
  }

  const { metrics, kategoriMetrics, arusKasBulanan } = comparison;

  return (
    <Stack spacing={4} sx={{ pb: 6 }}>
      {/* Banner Analisis Lintas Mode */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: 'common.white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)',
        }}
      >
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                  p: 0.75,
                  borderRadius: 1.5,
                  display: 'flex',
                }}
              >
                <CompareArrowsIcon sx={{ color: '#38BDF8' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                Perbandingan Proyeksi vs Realisasi
              </Typography>
              <Chip
                label="Lintas Mode • Read-Only"
                size="small"
                sx={{
                  bgcolor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38BDF8',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', maxWidth: 640 }}>
              Laporan komparasi komprehensif yang membandingkan rencana awal (Proyeksi) dengan eksekusi
              nyata di lapangan (Realisasi) secara langsung.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <InfoOutlinedIcon sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Perbandingan tidak dipengaruhi oleh mode pada toolbar atas.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabel Metrik Utama */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Metrik Finansial Utama
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Perbandingan KPI pendapatan, biaya, profitabilitas, serta indikator kelayakan usaha.
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontWeight: 700 }}>Metrik</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Proyeksi
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Realisasi
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Selisih (Realisasi - Proyeksi)
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Selisih (%)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics.map((m) => (
                <TableRow
                  key={m.label}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{m.label}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    {formatMetricValue(m.label, m.proyeksi)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {formatMetricValue(m.label, m.realisasi)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: m.selisih > 0 ? 'success.main' : m.selisih < 0 ? 'error.main' : 'text.primary',
                    }}
                  >
                    {m.selisih > 0 ? `+${formatMetricValue(m.label, m.selisih)}` : formatMetricValue(m.label, m.selisih)}
                  </TableCell>
                  <TableCell align="center">{formatSelisihPercent(m.selisihPercent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Tabel Rincian per Kategori */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Perbandingan Rincian per Kategori Transaksi
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Kategori yang hanya muncul di salah satu skenario ditandai dengan badge khusus.
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontWeight: 700 }}>Kategori</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Proyeksi
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Realisasi
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Selisih
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Selisih (%)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kategoriMetrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Belum ada rincian kategori transaksi pada kedua skenario.
                  </TableCell>
                </TableRow>
              ) : (
                kategoriMetrics.map((k) => {
                  const labelClean = k.label.replace(/^(income|expense):/, '');
                  const typeLabel = k.label.startsWith('income:') ? 'Pendapatan' : 'Pengeluaran';

                  return (
                    <TableRow key={k.label} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {labelClean}
                          </Typography>
                          <Chip
                            label={typeLabel}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                          {k.unmatched && (
                            <Chip
                              label={
                                k.proyeksi > 0
                                  ? 'Hanya di Proyeksi'
                                  : k.realisasi > 0
                                    ? 'Hanya di Realisasi'
                                    : 'Unmatched'
                              }
                              size="small"
                              color={k.proyeksi > 0 ? 'info' : 'secondary'}
                              sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                        {formatRupiah(k.proyeksi)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatRupiah(k.realisasi)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color:
                            k.selisih > 0
                              ? 'success.main'
                              : k.selisih < 0
                                ? 'error.main'
                                : 'text.primary',
                        }}
                      >
                        {k.selisih > 0 ? `+${formatRupiah(k.selisih)}` : formatRupiah(k.selisih)}
                      </TableCell>
                      <TableCell align="center">{formatSelisihPercent(k.selisihPercent)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Tabel Arus Kas Bulanan */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Perbandingan Arus Kas Bersih Bulanan
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Perbandingan surplus/defisit kas tiap bulan antara Proyeksi dan Realisasi.
          </Typography>
        </Box>
        <ResponsiveDataView
          data={arusKasBulanan}
          desktop={(
            <TableContainer>
              <Table aria-label="Tabel perbandingan arus kas bulanan">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Bulan</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Proyeksi (Kas Bersih)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Realisasi (Kas Bersih)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Selisih
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Selisih (%)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {arusKasBulanan.map((row) => (
                    <TableRow key={row.bulan} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{row.bulan}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                        {formatRupiah(row.proyeksi)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatRupiah(row.realisasi)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color:
                            row.selisih > 0
                              ? 'success.main'
                              : row.selisih < 0
                                ? 'error.main'
                                : 'text.primary',
                        }}
                      >
                        {row.selisih > 0 ? `+${formatRupiah(row.selisih)}` : formatRupiah(row.selisih)}
                      </TableCell>
                      <TableCell align="center">{formatSelisihPercent(row.selisihPercent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          emptyMessage="Belum ada data arus kas bulanan yang dapat dibandingkan."
          emptyTitle="Belum ada arus kas bulanan"
          getItemKey={(row) => row.bulan}
          renderMobileItem={(row) => <FinanceComparisonCashFlowMobileCard row={row} />}
          state={arusKasBulanan.length === 0 ? 'empty' : 'ready'}
        />
      </Card>
    </Stack>
  );
}

export { FinanceComparisonView };
