'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import { formatMonthYear, formatRupiah } from '@/lib/formatters';
import type { ArusKasPascaPembiayaanBulanan } from '@/lib/finance/rabTypes';

import FinanceFinancingMobileCard from './FinanceFinancingMobileCard';

export interface FinanceFinancingViewProps {
  arusKasPascaPembiayaan: readonly ArusKasPascaPembiayaanBulanan[];
  bunga: number | null;
  kasAkhirPascaPembiayaan: number | null;
  kebutuhanModalKerja: number;
  onOpenAssumptions: () => void;
};

export default function FinanceFinancingView({
  arusKasPascaPembiayaan,
  bunga,
  kasAkhirPascaPembiayaan,
  kebutuhanModalKerja,
  onOpenAssumptions,
}: FinanceFinancingViewProps) {
  const hasAssumptions = bunga !== null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" component="div">Kebutuhan Modal Kerja</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{formatRupiah(kebutuhanModalKerja)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" component="div">Bunga</Typography>
              {hasAssumptions ? (
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{formatRupiah(bunga)}</Typography>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">Belum diatur</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" component="div">Kas Akhir Pasca Pembiayaan</Typography>
              {hasAssumptions ? (
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{formatRupiah(kasAkhirPascaPembiayaan ?? 0)}</Typography>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">Belum diatur</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700, mb: 1.5 }}>
            Arus Kas Pasca Pembiayaan Bulanan
          </Typography>
          {!hasAssumptions ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Atur asumsi pembiayaan untuk melihat proyeksi arus kas setelah pembiayaan.
              </Typography>
              <Button variant="contained" onClick={onOpenAssumptions} sx={{ borderRadius: 8 }}>
                Atur Asumsi Pembiayaan
              </Button>
            </Box>
          ) : (
            <ResponsiveDataView
              data={arusKasPascaPembiayaan}
              desktop={
                <TableContainer>
                  <Table aria-label="Tabel arus kas pasca pembiayaan" size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Bulan</TableCell>
                        <TableCell align="right">Kas Setelah Pembiayaan</TableCell>
                        <TableCell align="right">Kas Kumulatif Setelah Pembiayaan</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {arusKasPascaPembiayaan.map((row) => (
                        <TableRow key={row.bulan}>
                          <TableCell>{formatMonthYear(row.bulan)}</TableCell>
                          <TableCell align="right">{formatRupiah(row.kasSetelahPembiayaan)}</TableCell>
                          <TableCell align="right">{formatRupiah(row.kasKumulatifSetelahPembiayaan)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              }
              emptyMessage="Belum ada proyeksi arus kas setelah pembiayaan."
              emptyTitle="Belum ada proyeksi pembiayaan"
              getItemKey={(row) => row.bulan}
              renderMobileItem={(row) => <FinanceFinancingMobileCard row={row} />}
              state={arusKasPascaPembiayaan.length === 0 ? 'empty' : 'ready'}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
