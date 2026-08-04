'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
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
import { formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeReports' | 'labaRugiActions'> & {
  productionSales?: UseKeuanganControllerResult['productionSales'];
};

function WorksheetGroupedTable({
  testId,
  title,
  groups,
  totalLabel,
  totalAmount,
  tone,
}: {
  testId: string;
  title: string;
  groups: UseKeuanganControllerResult['financeReports']['incomeStatementWorksheet']['expenseGroups'];
  totalLabel: string;
  totalAmount: number;
  tone: 'income' | 'expense';
}) {
  const isIncome = tone === 'income';
  const headerBg = isIncome ? 'success.50' : 'error.50';
  const titleColor = isIncome ? 'success.dark' : 'error.dark';
  const badgeColor = isIncome ? 'success' : 'error';

  return (
    <Card
      data-testid={testId}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: headerBg,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: titleColor }}>
          {title}
        </Typography>
        <Chip
          label={`Total: ${formatRupiah(totalAmount)}`}
          size="small"
          color={badgeColor}
          variant="outlined"
          sx={{ fontWeight: 700, bgcolor: 'background.paper' }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '70%' }}>Jenis / Kategori</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', width: '30%' }}>
                Jumlah
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.disabled' }}>
                  Belum ada data {title.toLowerCase()}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <React.Fragment key={group.id}>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 800, py: 1, color: 'text.primary' }}>
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {group.items.map((item) => (
                    <TableRow key={item.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ pl: 4, py: 0.75, color: 'text.secondary' }}>{item.label}</TableCell>
                      <TableCell align="right" sx={{ py: 0.75, fontWeight: 600 }}>
                        {formatRupiah(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell
                      align="right"
                      sx={{
                        py: 0.75,
                        pr: 2,
                        fontStyle: 'italic',
                        fontWeight: 700,
                        color: 'text.secondary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      Sub-total
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        py: 0.75,
                        fontWeight: 800,
                        color: titleColor,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {formatRupiah(group.subtotal)}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 800, py: 1.25 }}>{totalLabel}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900, py: 1.25, color: titleColor, fontSize: '0.95rem' }}>
                {formatRupiah(totalAmount)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Card>
  );
}

function SummaryModernCard({
  totalPendapatan,
  totalPengeluaran,
  labaRugi,
}: {
  totalPendapatan: number;
  totalPengeluaran: number;
  labaRugi: number;
}) {
  const isProfit = labaRugi >= 0;
  const profitColor = isProfit ? 'success.main' : 'error.main';
  const badgeText = labaRugi > 0 ? 'SURPLUS (LABA)' : labaRugi < 0 ? 'DEFISIT (RUGI)' : 'IMPAS';

  return (
    <Card
      data-testid="income-statement-summary-panel"
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          Ringkasan Laba / Rugi
        </Typography>
        <Chip
          label={badgeText}
          size="small"
          color={isProfit ? 'success' : 'error'}
          sx={{ fontWeight: 800 }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableBody>
            <TableRow hover>
              <TableCell sx={{ py: 1.25, fontWeight: 700 }}>Total Pendapatan</TableCell>
              <TableCell align="right" sx={{ py: 1.25, fontWeight: 800, color: 'success.main' }}>
                {formatRupiah(totalPendapatan)}
              </TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell sx={{ py: 1.25, fontWeight: 700 }}>Total Pengeluaran</TableCell>
              <TableCell align="right" sx={{ py: 1.25, fontWeight: 800, color: 'error.main' }}>
                {formatRupiah(totalPengeluaran)}
              </TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow sx={{ bgcolor: isProfit ? 'success.50' : 'error.50' }}>
              <TableCell
                sx={{
                  py: 1.5,
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  color: isProfit ? 'success.dark' : 'error.dark',
                  borderBottom: '3px double',
                  borderColor: 'divider',
                }}
              >
                Laba/Rugi
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  py: 1.5,
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  color: profitColor,
                  borderBottom: '3px double',
                  borderColor: 'divider',
                }}
              >
                {formatRupiah(labaRugi)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Card>
  );
}

function KelayakanUsahaStrip({
  kelayakanUsaha,
  productionSales,
}: {
  kelayakanUsaha: NonNullable<UseKeuanganControllerResult['financeReports']['kelayakanUsaha']>;
  productionSales?: UseKeuanganControllerResult['productionSales'];
}) {
  const metrics = [
    {
      label: 'HPP',
      value: kelayakanUsaha.hpp != null ? `${formatRupiah(kelayakanUsaha.hpp)} / ${kelayakanUsaha.satuan}` : '-',
    },
    {
      label: 'BEP Produksi',
      value:
        kelayakanUsaha.bepProduksi != null
          ? `${kelayakanUsaha.bepProduksi.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${kelayakanUsaha.satuan}`
          : '-',
    },
    {
      label: 'B/C Ratio',
      value: kelayakanUsaha.bcRatio != null ? kelayakanUsaha.bcRatio.toFixed(2) : '-',
    },
    {
      label: 'Status',
      value: kelayakanUsaha.kelayakanStatus?.toUpperCase() ?? '-',
    },
  ];

  return (
    <Card
      sx={{
        mt: 3,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        p: 2,
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Kelayakan Usaha
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Asumsi Produksi & Penjualan
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(130px, 1fr))' },
            gap: 1.5,
            flex: 1,
          }}
        >
          {metrics.map((metric) => (
            <Box key={metric.label} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {metric.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.25 }}>
                {metric.value}
              </Typography>
            </Box>
          ))}
        </Box>
        {productionSales && (
          <Button
            variant="outlined"
            size="small"
            onClick={productionSales.openDialog}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Atur Asumsi
          </Button>
        )}
      </Stack>
    </Card>
  );
}

export default function FinanceIncomeStatementView({ financeReports, productionSales }: Props) {
  const { kelayakanUsaha, labaRugi } = financeReports;
  const incomeStatementWorksheet = financeReports.incomeStatementWorksheet ?? {
    incomeGroups: [],
    expenseGroups: [],
    totalPendapatan: labaRugi.totalPendapatan,
    totalPengeluaran: labaRugi.totalPengeluaran,
    labaRugi: labaRugi.labaRugi,
  };

  const hasWorksheetData =
    incomeStatementWorksheet.incomeGroups.length > 0 ||
    incomeStatementWorksheet.expenseGroups.length > 0;

  const isProfit = incomeStatementWorksheet.labaRugi >= 0;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: { xs: 0, md: 0.5 } }}>
      {/* Header Bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2.5 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Laba Rugi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ringkasan pendapatan dan pengeluaran operasional usaha kebun Anda.
          </Typography>
        </Box>
        <Chip
          label={
            isProfit
              ? `Surplus ${formatRupiah(incomeStatementWorksheet.labaRugi)}`
              : `Defisit ${formatRupiah(Math.abs(incomeStatementWorksheet.labaRugi))}`
          }
          color={isProfit ? 'success' : 'error'}
          variant="outlined"
          size="medium"
          sx={{ fontWeight: 800, mt: { xs: 1, sm: 0 } }}
        />
      </Stack>

      {hasWorksheetData ? (
        <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
          {/* Left Column: Pengeluaran Grouped */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <WorksheetGroupedTable
              testId="income-statement-expense-panel"
              title="Pengeluaran"
              groups={incomeStatementWorksheet.expenseGroups}
              totalLabel="Total Pengeluaran"
              totalAmount={incomeStatementWorksheet.totalPengeluaran}
              tone="expense"
            />
          </Grid>

          {/* Right Column: Pendapatan Grouped + Summary */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={3}>
              <WorksheetGroupedTable
                testId="income-statement-income-panel"
                title="Pendapatan"
                groups={incomeStatementWorksheet.incomeGroups}
                totalLabel="Total Pendapatan"
                totalAmount={incomeStatementWorksheet.totalPendapatan}
                tone="income"
              />

              <SummaryModernCard
                totalPendapatan={incomeStatementWorksheet.totalPendapatan}
                totalPengeluaran={incomeStatementWorksheet.totalPengeluaran}
                labaRugi={incomeStatementWorksheet.labaRugi}
              />
            </Stack>
          </Grid>
        </Grid>
      ) : (
        <Card sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8, borderRadius: 2.5 }}>
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Belum ada data transaksi
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Tambahkan transaksi pengeluaran atau pendapatan untuk melihat laporan laba rugi.
            </Typography>
          </Box>
        </Card>
      )}

      {kelayakanUsaha && (
        <KelayakanUsahaStrip kelayakanUsaha={kelayakanUsaha} productionSales={productionSales} />
      )}
    </Box>
  );
}
