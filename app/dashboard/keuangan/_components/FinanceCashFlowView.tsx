'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { formatMonthYear, formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeReports'>;

function colorForNet(net: number) {
  if (net > 0) return 'success.main';
  if (net < 0) return 'error.main';
  return 'text.secondary';
}

export default function FinanceCashFlowView({ financeReports }: Props) {
  const { arusKasBulanan, reportStartMonth, reportEndMonth } = financeReports;

  const totalInflow = arusKasBulanan.reduce((sum, row) => sum + row.kasMasuk, 0);
  const totalOutflow = arusKasBulanan.reduce((sum, row) => sum + row.kasKeluar, 0);
  const totalNet = totalInflow - totalOutflow;
  const lastCumulative = arusKasBulanan.at(-1)?.kasKumulatif ?? 0;

  return (
    <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <CardContent sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Arus Kas Bulanan
            </Typography>
            {reportStartMonth && reportEndMonth && (
              <Typography variant="body2" color="text.secondary">
                Periode {formatMonthYear(reportStartMonth)} – {formatMonthYear(reportEndMonth)}
              </Typography>
            )}
          </Box>
          <Chip
            label={totalNet >= 0 ? `Surplus ${formatRupiah(totalNet)}` : `Defisit ${formatRupiah(Math.abs(totalNet))}`}
            color={totalNet >= 0 ? 'success' : 'error'}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        {arusKasBulanan.length === 0 ? (
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
              Belum ada data arus kas
            </Typography>
            <Typography variant="body2">
              Tambahkan transaksi untuk melihat arus kas bulanan.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Bulan</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>Kas Masuk</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>Kas Keluar</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Kas Bersih</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Kumulatif</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {arusKasBulanan.map((row) => {
                  const net = row.kasMasuk - row.kasKeluar;
                  return (
                    <TableRow
                      key={row.bulan}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{formatMonthYear(row.bulan)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: row.kasMasuk > 0 ? 'success.main' : 'text.disabled' }}
                      >
                        {row.kasMasuk > 0 ? `+${formatRupiah(row.kasMasuk)}` : formatRupiah(0)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: row.kasKeluar > 0 ? 'error.main' : 'text.disabled' }}
                      >
                        {row.kasKeluar > 0 ? `−${formatRupiah(row.kasKeluar)}` : formatRupiah(0)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 600, color: colorForNet(net) }}
                      >
                        {net >= 0 ? '+' : '−'}{formatRupiah(Math.abs(net))}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: colorForNet(row.kasKumulatif) }}
                      >
                        {formatRupiah(row.kasKumulatif)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                    +{formatRupiah(totalInflow)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                    −{formatRupiah(totalOutflow)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: colorForNet(totalNet) }}>
                    {totalNet >= 0 ? '+' : '−'}{formatRupiah(Math.abs(totalNet))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: colorForNet(lastCumulative) }}>
                    {formatRupiah(lastCumulative)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
