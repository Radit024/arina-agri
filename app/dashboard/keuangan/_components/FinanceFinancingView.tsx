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

import { formatRupiah } from '@/lib/formatters';
import type { UseFinancingControllerResult } from '@/controllers/keuangan/useFinancingController';

type Props = {
  financing: UseFinancingControllerResult;
};

export default function FinanceFinancingView({ financing }: Props) {
  const { kebutuhanModalKerja, bunga, kasAkhirPascaPembiayaan, arusKasPascaPembiayaan, openDialog } = financing;
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
                <Box sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" onClick={openDialog} sx={{ borderRadius: 8 }}>
                    Atur Asumsi Pembiayaan
                  </Button>
                </Box>
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
                <Box sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" onClick={openDialog} sx={{ borderRadius: 8 }}>
                    Atur Asumsi Pembiayaan
                  </Button>
                </Box>
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
              <Button variant="contained" onClick={openDialog} sx={{ borderRadius: 8 }}>
                Atur Asumsi Pembiayaan
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
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
                      <TableCell>{row.bulan}</TableCell>
                      <TableCell align="right">{formatRupiah(row.kasSetelahPembiayaan)}</TableCell>
                      <TableCell align="right">{formatRupiah(row.kasKumulatifSetelahPembiayaan)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
