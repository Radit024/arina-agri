'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeReports'>;

export default function FinanceCashFlowView({ financeReports }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Arus Kas Rencana vs Aktual</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Periode {financeReports.reportStartMonth} sampai {financeReports.reportEndMonth}.
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Bulan</TableCell>
                <TableCell align="right">Masuk Rencana</TableCell>
                <TableCell align="right">Masuk Aktual</TableCell>
                <TableCell align="right">Keluar Rencana</TableCell>
                <TableCell align="right">Keluar Aktual</TableCell>
                <TableCell align="right">Bersih Rencana</TableCell>
                <TableCell align="right">Bersih Aktual</TableCell>
                <TableCell align="right">Kumulatif Aktual</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {financeReports.cashFlowComparison.rows.map((row) => (
                <TableRow key={row.month}>
                  <TableCell>{row.month}</TableCell>
                  <TableCell align="right">{formatRupiah(row.plannedInflow)}</TableCell>
                  <TableCell align="right">{formatRupiah(row.actualInflow)}</TableCell>
                  <TableCell align="right">{formatRupiah(row.plannedOutflow)}</TableCell>
                  <TableCell align="right">{formatRupiah(row.actualOutflow)}</TableCell>
                  <TableCell align="right">{formatRupiah(row.plannedNet)}</TableCell>
                  <TableCell align="right">{formatRupiah(row.actualNet)}</TableCell>
                  <TableCell align="right">{formatRupiah(row.actualCumulative)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
