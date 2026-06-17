'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    belum_ada_realisasi: 'Belum ada realisasi',
    sesuai_rencana: 'Sesuai rencana',
    hemat: 'Hemat',
    over_budget: 'Over budget',
    di_atas_target: 'Di atas target',
    di_bawah_target: 'Di bawah target',
  };
  return labels[status] ?? status;
}

export default function FinanceIncomeStatementView({ financeReports }: Props) {
  const { summary } = financeReports.incomeStatementComparison;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Laba Rugi Rencana vs Aktual</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rencana laba {formatRupiah(summary.plannedProfit)} dibanding aktual {formatRupiah(summary.actualProfit)}.
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kategori</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Jenis</TableCell>
                <TableCell align="right">Rencana</TableCell>
                <TableCell align="right">Aktual</TableCell>
                <TableCell align="right">Selisih</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {financeReports.incomeStatementComparison.rows.map((row) => (
                <TableRow key={`${row.categoryId}-${row.itemId ?? row.itemName}`}>
                  <TableCell>{row.categoryName}</TableCell>
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>{row.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}</TableCell>
                  <TableCell align="right">{formatRupiah(row.planned)}</TableCell>
                  <TableCell align="right">{formatRupiah(row.actual)}</TableCell>
                  <TableCell align="right">{formatRupiah(row.variance)}</TableCell>
                  <TableCell><Chip size="small" label={statusLabel(row.status)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
