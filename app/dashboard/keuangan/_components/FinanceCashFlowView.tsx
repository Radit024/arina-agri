import { useState } from 'react';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import MetricCard from '@/components/ui/MetricCard';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import { formatDateShort, formatMonthYear, formatRupiah } from '@/lib/formatters';
import type { ArusKasBulanan, FinanceTransactionForReport } from '@/lib/finance/rabTypes';

import FinanceCashFlowMobileCard from './FinanceCashFlowMobileCard';

export interface FinanceCashFlowReportData {
  arusKasBulanan: readonly ArusKasBulanan[];
  reportTransactions: readonly FinanceTransactionForReport[];
  reportStartMonth: string;
  reportEndMonth: string;
}

export interface FinanceCashFlowViewProps {
  financeReports: FinanceCashFlowReportData;
  canAddTransaction: boolean;
  onAddTransaction: () => void;
  onCreateProject: () => void;
}

function colorForNet(net: number) {
  if (net > 0) return 'success.main';
  if (net < 0) return 'error.main';
  return 'text.secondary';
}

function CashFlowRow({
  row,
  transactions,
}: {
  row: ArusKasBulanan;
  transactions: readonly FinanceTransactionForReport[];
}) {
  const [open, setOpen] = useState(false);
  const monthLabel = formatMonthYear(row.bulan);
  const net = row.kasMasuk - row.kasKeluar;
  const monthTransactions = transactions.filter(
    (transaction) => transaction.tanggal.slice(0, 7) === row.bulan,
  );

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: open ? 'unset' : undefined } }}>
        <TableCell sx={{ padding: '0 4px', width: '40px' }}>
          <IconButton
            aria-label={`${open ? 'Tutup' : 'Buka'} detail transaksi ${monthLabel}`}
            onClick={() => setOpen(!open)}
            size="small"
            sx={{ minHeight: 44, minWidth: 44 }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>{monthLabel}</TableCell>
        <TableCell align="right" sx={{ color: row.kasMasuk > 0 ? 'success.main' : 'text.disabled' }}>
          {row.kasMasuk > 0 ? `+${formatRupiah(row.kasMasuk)}` : formatRupiah(0)}
        </TableCell>
        <TableCell align="right" sx={{ color: row.kasKeluar > 0 ? 'error.main' : 'text.disabled' }}>
          {row.kasKeluar > 0 ? `−${formatRupiah(row.kasKeluar)}` : formatRupiah(0)}
        </TableCell>
        <TableCell align="right" sx={{ color: colorForNet(net), fontWeight: 600 }}>
          {net >= 0 ? '+' : '−'}{formatRupiah(Math.abs(net))}
        </TableCell>
        <TableCell align="right" sx={{ color: colorForNet(row.kasKumulatif), fontWeight: 700 }}>
          {formatRupiah(row.kasKumulatif)}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} style={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, mb: 3 }}>
              <Typography component="div" gutterBottom sx={{ fontWeight: 700 }} variant="subtitle2">
                Detail Transaksi ({monthLabel})
              </Typography>
              {monthTransactions.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  Tidak ada transaksi di bulan ini.
                </Typography>
              ) : (
                <Table aria-label={`Rincian transaksi ${monthLabel}`} size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Tanggal</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Kategori</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Keterangan</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Nominal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDateShort(transaction.tanggal)}</TableCell>
                        <TableCell>
                          <Chip
                            color={transaction.jenis === 'pendapatan' ? 'success' : 'error'}
                            label={transaction.kategori}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{transaction.keterangan || '-'}</TableCell>
                        <TableCell align="right" sx={{ color: transaction.jenis === 'pendapatan' ? 'success.main' : 'error.main' }}>
                          {transaction.jenis === 'pendapatan' ? '+' : '−'}{formatRupiah(transaction.nominal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function FinanceCashFlowView({
  financeReports,
  canAddTransaction,
  onAddTransaction,
  onCreateProject,
}: FinanceCashFlowViewProps) {
  const { arusKasBulanan, reportTransactions, reportStartMonth, reportEndMonth } = financeReports;
  const totalInflow = arusKasBulanan.reduce((sum, row) => sum + row.kasMasuk, 0);
  const totalOutflow = arusKasBulanan.reduce((sum, row) => sum + row.kasKeluar, 0);
  const totalNet = totalInflow - totalOutflow;
  const lastCumulative = arusKasBulanan.at(-1)?.kasKumulatif ?? 0;
  const emptyAction = canAddTransaction ? (
    <Button onClick={onAddTransaction} variant="contained">Catat Transaksi</Button>
  ) : (
    <Button onClick={onCreateProject} variant="contained">Buat Proyek</Button>
  );

  return (
    <Card sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
      <CardContent sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ alignItems: { sm: 'center', xs: 'flex-start' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Box>
            <Typography sx={{ fontWeight: 800 }} variant="h6">
              Arus Kas Bulanan
            </Typography>
            {reportStartMonth && reportEndMonth && (
              <Typography color="text.secondary" variant="body2">
                Periode {formatMonthYear(reportStartMonth)} – {formatMonthYear(reportEndMonth)}
              </Typography>
            )}
          </Box>
          <Chip
            color={totalNet >= 0 ? 'success' : 'error'}
            label={totalNet >= 0 ? `Surplus ${formatRupiah(totalNet)}` : `Defisit ${formatRupiah(Math.abs(totalNet))}`}
            size="small"
            sx={{ fontWeight: 700 }}
            variant="outlined"
          />
        </Stack>

        {arusKasBulanan.length > 0 && (
          <Box
            sx={{
              display: { md: 'none', xs: 'grid' },
              gap: 1,
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              mb: 1.5,
            }}
          >
            <MetricCard intent="success" label="Kas Masuk" value={formatRupiah(totalInflow)} />
            <MetricCard intent="error" label="Kas Keluar" value={formatRupiah(totalOutflow)} />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <MetricCard intent={lastCumulative >= 0 ? 'success' : 'error'} label="Saldo Akhir" value={formatRupiah(lastCumulative)} />
            </Box>
          </Box>
        )}

        <ResponsiveDataView
          data={arusKasBulanan}
          desktop={(
            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <Table aria-label="Arus kas bulanan" size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '40px' }} />
                    <TableCell sx={{ fontWeight: 700 }}>Bulan</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', fontWeight: 700 }}>Kas Masuk</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>Kas Keluar</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Kas Bersih</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Kumulatif</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {arusKasBulanan.map((row) => (
                    <CashFlowRow key={row.bulan} row={row} transactions={reportTransactions} />
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell />
                    <TableCell sx={{ fontSize: '1.1rem', fontWeight: 800 }}>Total</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', fontSize: '1.1rem', fontWeight: 800 }}>
                      +{formatRupiah(totalInflow)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', fontSize: '1.1rem', fontWeight: 800 }}>
                      −{formatRupiah(totalOutflow)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: colorForNet(totalNet), fontSize: '1.1rem', fontWeight: 800 }}>
                      {totalNet >= 0 ? '+' : '−'}{formatRupiah(Math.abs(totalNet))}
                    </TableCell>
                    <TableCell align="right" sx={{ color: colorForNet(lastCumulative), fontSize: '1.1rem', fontWeight: 800 }}>
                      {formatRupiah(lastCumulative)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          )}
          emptyAction={emptyAction}
          emptyMessage={canAddTransaction
            ? 'Catat transaksi pertama untuk melihat arus kas bulanan.'
            : 'Buat proyek terlebih dahulu untuk mulai mencatat arus kas.'}
          emptyTitle="Belum ada data arus kas"
          getItemKey={(row) => row.bulan}
          renderMobileItem={(row) => (
            <FinanceCashFlowMobileCard row={row} transactions={reportTransactions} />
          )}
          state={arusKasBulanan.length === 0 ? 'empty' : 'ready'}
        />
      </CardContent>
    </Card>
  );
}
