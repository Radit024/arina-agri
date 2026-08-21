'use client';

import React, { useState } from 'react';
import CalculateIcon from '@mui/icons-material/Calculate';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
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

function WorksheetGroupedSection({
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
    <Box data-testid={testId} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

      <TableContainer sx={{ flex: 1 }}>
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
    </Box>
  );
}

function SummaryModernSection({
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
    <Box
      data-testid="income-statement-summary-panel"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
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
                  fontWeight: 800,
                  py: 1.5,
                  color: isProfit ? 'success.main' : 'error.main',
                }}
              >
                {formatRupiah(labaRugi)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Box>
  );
}

function KelayakanUsahaSection({
  kelayakanUsaha,
  productionSales,
}: {
  kelayakanUsaha: NonNullable<UseKeuanganControllerResult['financeReports']['kelayakanUsaha']>;
  productionSales?: UseKeuanganControllerResult['productionSales'];
}) {
  const [expanded, setExpanded] = useState(true);
  const isUnconfigured =
    kelayakanUsaha.hpp == null &&
    kelayakanUsaha.bepProduksi == null &&
    kelayakanUsaha.bcRatio == null;

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
      label: 'Status Kelayakan',
      value:
        kelayakanUsaha.kelayakanStatus === 'untung' ? (
          <Chip label="UNTUNG" color="success" size="small" sx={{ fontWeight: 800, height: 24 }} />
        ) : kelayakanUsaha.kelayakanStatus === 'impas' ? (
          <Chip label="IMPAS" color="warning" size="small" sx={{ fontWeight: 800, height: 24 }} />
        ) : kelayakanUsaha.kelayakanStatus === 'rugi' ? (
          <Chip label="RUGI" color="error" size="small" sx={{ fontWeight: 800, height: 24 }} />
        ) : (
          '-'
        ),
    },
  ];

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Kelayakan Usaha
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Asumsi Produksi & Penjualan (HPP, BEP, B/C Ratio)
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button
            variant="text"
            size="small"
            endIcon={expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {expanded ? 'Sembunyikan' : 'Tampilkan'}
          </Button>
        </Stack>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2.5, pt: 0 }}>
          {isUnconfigured ? (
            <Card
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                border: '1px dashed',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CalculateIcon />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Asumsi Produksi Belum Dikonfigurasi
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 460, mt: 0.25 }}>
                    Masukkan proyeksi volume panen dan harga jual untuk menghitung HPP, BEP, dan rasio kelayakan usaha secara otomatis.
                  </Typography>
                </Box>
              </Box>

              {productionSales && (
                <Button
                  variant="contained"
                  onClick={(e) => {
                    e.stopPropagation();
                    productionSales.openDialog();
                  }}
                  sx={{
                    minHeight: 44,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    bgcolor: 'primary.main',
                  }}
                >
                  Atur Asumsi Sekarang
                </Button>
              )}
            </Card>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, minmax(110px, 1fr))' },
                gap: 1.5,
                alignItems: 'center',
              }}
            >
              {metrics.map((metric) => (
                <Box key={metric.label} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {metric.label}
                  </Typography>
                  <Typography component="div" variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {metric.value}
                  </Typography>
                </Box>
              ))}
              {productionSales && (
                <Box sx={{ pl: { xs: 0, md: 1.5 } }}>
                  <Button
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      productionSales.openDialog();
                    }}
                    fullWidth
                    sx={{
                      minHeight: 44,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                    }}
                  >
                    Atur Ulang Asumsi
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
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

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {hasWorksheetData ? (
        <Card
          data-testid="income-statement-card"
          sx={{
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 1,
            overflow: 'hidden',
          }}
        >
          {kelayakanUsaha && (
            <KelayakanUsahaSection kelayakanUsaha={kelayakanUsaha} productionSales={productionSales} />
          )}

          <SummaryModernSection
            totalPendapatan={incomeStatementWorksheet.totalPendapatan}
            totalPengeluaran={incomeStatementWorksheet.totalPengeluaran}
            labaRugi={incomeStatementWorksheet.labaRugi}
          />

          <Grid container>
            {/* Left Column: Pengeluaran Grouped */}
            <Grid size={{ xs: 12, md: 6 }}>
              <WorksheetGroupedSection
                testId="income-statement-expense-panel"
                title="Pengeluaran"
                groups={incomeStatementWorksheet.expenseGroups}
                totalLabel="Total Pengeluaran"
                totalAmount={incomeStatementWorksheet.totalPengeluaran}
                tone="expense"
              />
            </Grid>

            {/* Right Column: Pendapatan Grouped */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' } }}>
              <Box sx={{ flex: 1 }}>
                <WorksheetGroupedSection
                  testId="income-statement-income-panel"
                  title="Pendapatan"
                  groups={incomeStatementWorksheet.incomeGroups}
                  totalLabel="Total Pendapatan"
                  totalAmount={incomeStatementWorksheet.totalPendapatan}
                  tone="income"
                />
              </Box>
            </Grid>
          </Grid>
        </Card>
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
    </Box>
  );
}
