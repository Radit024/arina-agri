'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { alpha, type Theme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import dynamic from 'next/dynamic';
import { Controller } from 'react-hook-form';

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { formatDateShort,formatRupiah } from '@/lib/formatters';
import { getPeriodeLabel } from '@/lib/pdfReport';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import DialogActions from '@mui/material/DialogActions';
import Fab from '@mui/material/Fab';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';

import { PageHeader, PageShell } from '@/components/shared/page';
import FinanceCashFlowView from './FinanceCashFlowView';
import FinanceIncomeStatementView from './FinanceIncomeStatementView';
import FinanceProjectToolbar from './FinanceProjectToolbar';
import RabPlanningView from './RabPlanningView';

const PieChart = dynamic(() => import('@mui/x-charts/PieChart').then((m) => ({ default: m.PieChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" width={300} height={200} sx={{ borderRadius: 2 }} />,
});



const MAX_AI_REPORTS_PER_MONTH = 3;

type FinanceActionIntent = 'primary' | 'error';

function financeActionIconButtonSx(theme: Theme, intent: FinanceActionIntent = 'primary') {
  const palette = theme.palette[intent];
  const isDarkMode = theme.palette.mode === 'dark';
  const isPrimaryAction = intent === 'primary';
  const foreground = isDarkMode && isPrimaryAction
    ? theme.palette.common.white
    : isDarkMode
      ? palette.main
      : palette.dark;
  const backgroundOpacity = isDarkMode
    ? isPrimaryAction ? 0.28 : 0.24
    : 0.12;

  return {
    borderRadius: 2,
    color: foreground,
    bgcolor: alpha(palette.main, backgroundOpacity),
    border: '1px solid',
    borderColor: alpha(foreground, isDarkMode ? 0.42 : 0.24),
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'color'], {
      duration: theme.transitions.duration.shortest,
    }),
    '&:hover': {
      bgcolor: palette.main,
      color: palette.contrastText,
      borderColor: palette.main,
      boxShadow: `0 0 0 3px ${alpha(palette.main, isDarkMode ? 0.18 : 0.12)}`,
    },
  };
}

function closeIconButtonSx(theme: Theme) {
  const isDarkMode = theme.palette.mode === 'dark';

  return {
    color: 'text.secondary',
    bgcolor: alpha(theme.palette.text.primary, isDarkMode ? 0.08 : 0.06),
    '&:hover': {
      color: 'text.primary',
      bgcolor: alpha(theme.palette.text.primary, isDarkMode ? 0.14 : 0.1),
    },
  };
}

export default function KeuanganView({
  t,
  bepHppInputs,
  aiDialogOpen,
  setAiDialogOpen,
  reportLoading,
  reportError,
  setReportError,
  bepHppDialogOpen,
  setBepHppDialogOpen,
  txDialogOpen,
  setTxDialogOpen,
  editingId,
  setEditingId,
  deleteConfirmId,
  setDeleteConfirmId,
  snackbar,
  setSnackbar,
  filterBulan,
  setFilterBulan,
  filterJenis,
  setFilterJenis,
  theme,
  isMobile,
  control,
  handleSubmit,
  errors,
  selectedJenis,
  kategoriFiltered,
  openAddDialog,
  handleEdit,
  onSubmit,
  txSubmitting,
  handleDelete,
  handleConfirmDelete,
  handleNominalChange,
  handleBepHppInputChange,
  getBepHppInputDisplayValue,
  aiQuotaRemaining,
  handleGeneratePdfManual,
  handleGeneratePdfAI,
  monthFilteredTransactions,
  totalPendapatan,
  totalPengeluaran,
  labaBersih,
  bfaHpp,
  bfaBepKg,
  bfaBepRupiah,
  bfaProyeksiLaba,
  bfaLayak,
  finalPieData,
  finalPieColors,
  bulanOptions,
  getBulanLabel,
  displayedTransactions,
  financeTab,
  setFinanceTab,
  financeProject,
  rab,
  financeLedger,
  financeReports,
  financeExport,
}: UseKeuanganControllerResult) {
  const bestRabSuggestion = financeLedger.rabSuggestions[0];

  return (
    <PageShell>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <FinanceProjectToolbar financeProject={financeProject} rab={rab} financeExport={financeExport} />

      <Tabs
        value={financeTab}
        onChange={(_, value) => setFinanceTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Navigasi laporan keuangan"
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 700,
          },
        }}
      >
        <Tab value="buku-besar" label="Buku Besar" />
        <Tab value="rab" label="RAB" />
        <Tab value="laba-rugi" label="Laba Rugi" />
        <Tab value="arus-kas" label="Arus Kas" />
      </Tabs>

      {financeTab === 'buku-besar' && (
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ flex: 1, alignItems: 'stretch' }}>
        {/* ─── KIRI: Buku Besar Transaksi (BESAR) ─── */}
        <Grid size={{ xs: 12, lg: 8 }} sx={{ display: 'flex' }}>
          <Card data-guide-target="finance-ledger" sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  {t('ledger.title')}
                </Typography>
              }
              subheader={t('ledger.subheader', { count: displayedTransactions.length })}
              sx={{ pb: 1 }}
            />

            {/* Responsive Toolbar Row */}
            <Box
              sx={{
                px: 2,
                pb: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1.5, sm: 1 },
                alignItems: { xs: 'stretch', sm: 'center' },
                flexWrap: 'wrap',
              }}
            >
              {/* Filters row */}
              <Box sx={{ display: 'flex', gap: 1, flex: 1, flexWrap: 'nowrap' }}>
                <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 150 }, flex: 1 }}>
                  <InputLabel>{t('filters.month')}</InputLabel>
                  <Select value={filterBulan} label={t('filters.month')} onChange={(e) => setFilterBulan(e.target.value)}>
                    <MenuItem value="semua">{t('filters.allMonths')}</MenuItem>
                    {bulanOptions.map((bulanKey) => (
                      <MenuItem key={bulanKey} value={bulanKey}>{getBulanLabel(bulanKey)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 140 }, flex: 1 }}>
                  <InputLabel>{t('filters.type')}</InputLabel>
                  <Select value={filterJenis} label={t('filters.type')} onChange={(e) => setFilterJenis(e.target.value as typeof filterJenis)}>
                    <MenuItem value="semua">{t('filters.allTypes')}</MenuItem>
                    <MenuItem value="pendapatan">{t('common.income')}</MenuItem>
                    <MenuItem value="pengeluaran">{t('common.expense')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Actions row */}
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <Button
                  data-guide-target="finance-hpp-bep"
                  id="btn-hpp-bep"
                  variant="outlined"
                  startIcon={<AccountBalanceIcon />}
                  onClick={() => setBepHppDialogOpen(true)}
                  sx={{ borderRadius: 8, whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}
                >
                  {t('buttons.hppBep')}
                </Button>
                <Button
                  data-guide-target="finance-add-transaction"
                  id="btn-catat-transaksi"
                  variant="contained"
                  startIcon={<AddCircleIcon />}
                  onClick={openAddDialog}
                  sx={{ display: { xs: 'none', md: 'inline-flex' }, borderRadius: 8, whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}
                >
                  {t('buttons.addTransaction')}
                </Button>
              </Box>
            </Box>

            <CardContent sx={{ pt: 0, flex: 1, px: { xs: 1, sm: 2 }, pb: 2, position: 'relative' }}>
              <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, maxHeight: { xs: 450, md: 500, lg: 700 }, overflowY: 'auto', pr: 0.5, pb: 2 }}>
                  {displayedTransactions.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 6 }}>
                      <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('ledger.empty')}
                      </Typography>
                    </Box>
                  ) : (
                    displayedTransactions.map((tx) => (
                      <Card key={tx._id} variant="outlined" sx={{ flexShrink: 0, borderRadius: 3, borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <CardContent sx={{ p: '16px !important', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {/* Row 1: Kategori & Status Badge */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                              {tx.kategori}
                            </Typography>
                            <Chip
                              label={tx.jenis === 'pendapatan' ? t('common.income') : t('common.expense')}
                              size="small"
                              sx={{
                                backgroundColor: tx.jenis === 'pendapatan' ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.error.main, 0.12),
                                color: tx.jenis === 'pendapatan' ? 'success.dark' : 'error.dark',
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                height: 20,
                              }}
                            />
                          </Box>

                          {/* Row 2: Tanggal & Nominal */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateShort(tx.tanggal)}
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 800,
                                color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tx.jenis === 'pendapatan' ? '+' : '−'}{formatRupiah(tx.nominal)}
                            </Typography>
                          </Box>
                          
                          {/* Row 3: Keterangan (optional) */}
                          {tx.keterangan && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', bgcolor: alpha(theme.palette.text.primary, 0.02), p: 1, borderRadius: 1.5 }}>
                              &quot;{tx.keterangan}&quot;
                            </Typography>
                          )}

                          {/* Row 4: Action Footer Buttons */}
                          <Divider sx={{ my: 0.5 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <IconButton
                              data-touch-target="44"
                              size="small"
                              aria-label={`Edit transaksi ${tx.kategori}`}
                              onClick={() => handleEdit(tx)}
                              sx={(theme) => ({
                                width: 44,
                                height: 44,
                                ...financeActionIconButtonSx(theme, 'primary'),
                              })}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              data-touch-target="44"
                              size="small"
                              aria-label={`Hapus transaksi ${tx.kategori}`}
                              onClick={() => handleDelete(tx._id)}
                              sx={(theme) => ({
                                width: 44,
                                height: 44,
                                ...financeActionIconButtonSx(theme, 'error'),
                              })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  <Fab
                    data-guide-target="finance-add-transaction-mobile"
                    color="primary" 
                    aria-label="add" 
                    onClick={openAddDialog}
                    sx={{ position: 'fixed', bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 84 }, right: 24, zIndex: 1000 }}
                  >
                    <AddCircleIcon />
                  </Fab>
              </Box>

              <TableContainer sx={{ display: { xs: 'none', md: 'block' }, maxHeight: { xs: 500, lg: 700 }, overflow: 'auto' }}>
                  <Table size="medium" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {[t('ledger.columns.date'), t('ledger.columns.category'), t('ledger.columns.note'), t('ledger.columns.type'), t('ledger.columns.value'), t('ledger.columns.action')].map((h) => (
                          <TableCell
                            key={h}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              color: 'text.secondary',
                              backgroundColor: 'background.paper',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                              <Typography variant="body2" color="text.secondary">
                                {t('ledger.empty')}
                              </Typography>
                              <Button data-guide-target="finance-add-transaction-empty" size="small" variant="outlined" onClick={openAddDialog} sx={{ mt: 1, borderRadius: 8 }}>
                                {t('ledger.addFirst')}
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedTransactions.map((tx) => (
                          <TableRow key={tx._id} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.018)' } }}>
                            <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary', minWidth: 90 }}>
                              {formatDateShort(tx.tanggal)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', minWidth: 120 }}>
                              {tx.kategori}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary', maxWidth: 240 }}>
                              <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                                {tx.keterangan || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={tx.jenis === 'pendapatan' ? t('common.income') : t('common.expense')}
                                size="small"
                                sx={{
                                  backgroundColor: tx.jenis === 'pendapatan' ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.error.main, 0.15),
                                  color: tx.jenis === 'pendapatan' ? 'success.dark' : 'error.dark',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  borderRadius: 1.5,
                                }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                                minWidth: 120,
                              }}
                            >
                              {tx.jenis === 'pendapatan' ? '+' : '−'}{formatRupiah(tx.nominal)}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  aria-label="Edit Transaksi"
                                  onClick={() => handleEdit(tx)}
                                  sx={(theme) => financeActionIconButtonSx(theme, 'primary')}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  aria-label="Hapus Transaksi"
                                  onClick={() => handleDelete(tx._id)}
                                  sx={(theme) => financeActionIconButtonSx(theme, 'error')}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── KANAN: Ringkasan & Grafik ─── */}
        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* Kartu Ringkasan */}
          <Card data-guide-target="finance-summary" sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  {t('summary.title')}
                </Typography>
              }
              action={
                <IconButton
                  data-guide-target="finance-report"
                  aria-label={t('reportDialog.title')}
                  onClick={() => setAiDialogOpen(true)}
                  sx={(theme) => ({
                    width: 44,
                    height: 44,
                    ...financeActionIconButtonSx(theme, 'primary'),
                  })}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {/* Pemasukan */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  borderRadius: 3,
                  mb: 2,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}
              >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{t('summary.totalIncome')}</Typography>
                  <Typography variant="h6" color="success.main" sx={{ lineHeight: 1.2, fontWeight: 800 }}>
                    {formatRupiah(totalPendapatan)}
                  </Typography>
                </Box>
              </Box>

              {/* Pengeluaran */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  borderRadius: 3,
                  mb: 2,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDownIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{t('summary.totalExpense')}</Typography>
                  <Typography variant="h6" color="error.main" sx={{ lineHeight: 1.2, fontWeight: 800 }}>
                    {formatRupiah(totalPengeluaran)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Laba bersih */}
              <Box
                sx={{
                  p: 2.5,
                  bgcolor: labaBersih >= 0 ? alpha(theme.palette.success.main, 0.07) : alpha(theme.palette.error.main, 0.07),
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: labaBersih >= 0 ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.error.main, 0.2),
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {labaBersih >= 0 ? t('summary.netProfit') : t('summary.deficit')}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: 'var(--font-sora)',
                    color: labaBersih >= 0 ? 'success.main' : 'error.main',
                    lineHeight: 1.1,
                    mt: 0.5,
                    fontWeight: 900,
                  }}
                >
                  {formatRupiah(Math.abs(labaBersih))}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Grafik Distribusi Pengeluaran */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  {t('distribution.title')}
                </Typography>
              }
            />
            <CardContent sx={{ pt: 0, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <PieChart
                series={[
                  {
                    data: finalPieData,
                    innerRadius: 48,
                    outerRadius: 88,
                    paddingAngle: finalPieData.some((item) => item.id !== t('distribution.empty')) ? 4 : 0,
                    cornerRadius: 5,
                    highlightScope: { fade: 'global', highlight: 'item' },
                    faded: { innerRadius: 40, additionalRadius: -10, color: 'gray' },
                  },
                ]}
                colors={finalPieColors}
                width={isMobile ? 290 : 300}
                height={isMobile ? 240 : 200}
                slotProps={{
                  legend: {
                    direction: isMobile ? 'horizontal' : 'vertical',
                    position: isMobile
                      ? { vertical: 'bottom', horizontal: 'center' }
                      : { vertical: 'middle', horizontal: 'end' },
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {financeTab === 'rab' && <RabPlanningView financeProject={financeProject} rab={rab} />}
      {financeTab === 'laba-rugi' && <FinanceIncomeStatementView financeReports={financeReports} />}
      {financeTab === 'arus-kas' && <FinanceCashFlowView financeReports={financeReports} />}

      {/* ─── MODAL: Catat / Edit Transaksi ─── */}
      <Dialog
        open={txDialogOpen}
        onClose={() => { setTxDialogOpen(false); setEditingId(null); }}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  bgcolor: editingId ? 'primary.light' : '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {editingId
                  ? <EditOutlinedIcon sx={{ color: 'primary.dark', fontSize: 20 }} />
                  : <AddCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', lineHeight: 1.2, fontWeight: 800 }}>
                  {editingId ? t('transactionDialog.editTitle') : t('transactionDialog.addTitle')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {editingId ? t('transactionDialog.editSubtitle') : t('transactionDialog.addSubtitle')}
                </Typography>
              </Box>
            </Box>
            <IconButton
              aria-label={t('common.cancel')}
              size="small"
              onClick={() => { setTxDialogOpen(false); setEditingId(null); }}
              sx={(theme) => closeIconButtonSx(theme)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: '12px !important' }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Jenis & Tanggal */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="jenis"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.jenis} required>
                      <InputLabel>{t('transactionDialog.fields.type')}</InputLabel>
                      <Select {...field} label={t('transactionDialog.fields.type')}>
                        <MenuItem value="pendapatan">{t('transactionDialog.options.income')}</MenuItem>
                        <MenuItem value="pengeluaran">{t('transactionDialog.options.expense')}</MenuItem>
                      </Select>
                      {errors.jenis && <FormHelperText>{errors.jenis.message}</FormHelperText>}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="tanggal"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label={t('transactionDialog.fields.date')}
                      fullWidth
                      required
                      error={!!errors.tanggal}
                      helperText={errors.tanggal?.message}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  )}
                />
              </Grid>
            </Grid>

            {/* Kategori */}
            <Controller
              name="kategori"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.kategori} required>
                  <InputLabel>{t('transactionDialog.fields.category')}</InputLabel>
                  <Select {...field} label={t('transactionDialog.fields.category')}>
                    {kategoriFiltered.map((k) => (
                      <MenuItem key={k} value={k}>{k}</MenuItem>
                    ))}
                  </Select>
                  {errors.kategori && <FormHelperText>{errors.kategori.message}</FormHelperText>}
                </FormControl>
              )}
            />

            {/* Nominal */}
            <Controller
              name="nominal"
              control={control}
              render={({ field: { value, onChange, ...rest } }) => (
                <TextField
                  {...rest}
                  value={value}
                  onChange={(e) => handleNominalChange(e.target.value, onChange)}
                  label={t('transactionDialog.fields.amount')}
                  placeholder="250.000"
                  required
                  error={!!errors.nominal}
                  helperText={errors.nominal?.message}
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp</Typography>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />

            {/* Keterangan */}
            <Controller
              name="keterangan"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('transactionDialog.fields.noteOptional')}
                  multiline
                  rows={2}
                  fullWidth
                  placeholder={
                    selectedJenis === 'pengeluaran'
                      ? t('transactionDialog.placeholders.expense')
                      : t('transactionDialog.placeholders.income')
                  }
                />
              )}
            />

            {bestRabSuggestion && (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                Transaksi ini akan dihubungkan ke RAB: <strong>{bestRabSuggestion.item.categoryName ?? 'Kategori RAB'} - {bestRabSuggestion.item.name}</strong>.
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => { setTxDialogOpen(false); setEditingId(null); }}
                sx={{ flex: 1, borderRadius: 8 }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={txSubmitting}
                sx={{
                  flex: 2,
                  borderRadius: 8,
                  bgcolor: 'success.main',
                  '&:hover': { bgcolor: 'success.dark' },
                }}
              >
                {txSubmitting
                  ? <CircularProgress size={20} color="inherit" />
                  : (editingId ? t('transactionDialog.update') : t('transactionDialog.save'))}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Analisis Kelayakan Usaha (BFA) ─── */}
      <Dialog
        open={bepHppDialogOpen}
        onClose={() => setBepHppDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800, lineHeight: 1.2 }}>
                {t('hppDialog.title')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('hppDialog.subtitle')}
              </Typography>
            </Box>
            <IconButton aria-label={t('common.cancel')} size="small" onClick={() => setBepHppDialogOpen(false)} sx={(theme) => closeIconButtonSx(theme)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: '12px !important' }}>
          {/* Input Section */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('hppDialog.fields.totalBiaya')}
                type="number"
                value={getBepHppInputDisplayValue(bepHppInputs.totalBiaya)}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('totalBiaya', e.target.value)}
                fullWidth
                helperText={t('hppDialog.fields.totalBiayaHelper')}
                slotProps={{
                  input: {
                    inputProps: { min: 0 },
                    startAdornment: getBepHppInputDisplayValue(bepHppInputs.totalBiaya) ? (
                      <InputAdornment position="start">
                        <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp</Typography>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('hppDialog.fields.proyeksiPanen')}
                type="number"
                value={getBepHppInputDisplayValue(bepHppInputs.proyeksiPanen)}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('proyeksiPanen', e.target.value)}
                fullWidth
                helperText={t('hppDialog.fields.proyeksiPanenHelper')}
                slotProps={{
                  input: {
                    inputProps: { min: 0 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>kg</Typography>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('hppDialog.fields.targetHargaJual')}
                type="number"
                value={getBepHppInputDisplayValue(bepHppInputs.targetHargaJual)}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('targetHargaJual', e.target.value)}
                fullWidth
                helperText={t('hppDialog.fields.targetHargaJualHelper')}
                slotProps={{
                  input: {
                    inputProps: { min: 0 },
                    startAdornment: getBepHppInputDisplayValue(bepHppInputs.targetHargaJual) ? (
                      <InputAdornment position="start">
                        <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp</Typography>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('hppDialog.fields.targetMargin')}
                type="number"
                value={getBepHppInputDisplayValue(bepHppInputs.targetMargin ?? 0)}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('targetMargin', e.target.value)}
                fullWidth
                helperText={t('hppDialog.fields.targetMarginHelper')}
                slotProps={{
                  input: {
                    inputProps: { step: 'any' },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>%</Typography>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
          </Grid>

          {/* Formula Info Box */}
          <Box sx={{ mt: 2, p: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              HPP = Total Biaya / Proyeksi Panen
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              BEP (kg) = Total Biaya / Target Harga Jual
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              BEP (Rp) = Total Biaya / (1 − HPP / Target Harga Jual)
            </Typography>
          </Box>

          {/* Results Grid */}
          <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfdf3', border: '1px solid #bbf7d0' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.hpp')}</Typography>
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 800 }}>
                {bfaHpp !== null ? formatRupiah(bfaHpp) : t('hppDialog.results.inputRequired')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfeff', border: '1px solid #bae6fd' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.bepKg')}</Typography>
              <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 800 }}>
                {bfaBepKg !== null
                  ? `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(bfaBepKg)} kg`
                  : t('hppDialog.results.inputRequired')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.bepRupiah')}</Typography>
              <Typography variant="body2" sx={{ color: 'warning.dark', fontWeight: 800 }}>
                {bfaBepRupiah !== null ? formatRupiah(bfaBepRupiah) : t('hppDialog.results.inputRequired')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: bfaProyeksiLaba !== null && bfaProyeksiLaba >= 0 ? '#ecfdf3' : '#fef2f2', border: '1px solid', borderColor: bfaProyeksiLaba !== null && bfaProyeksiLaba >= 0 ? '#bbf7d0' : '#fecaca' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.proyeksiLaba')}</Typography>
              <Typography variant="body2" sx={{ color: bfaProyeksiLaba !== null && bfaProyeksiLaba >= 0 ? 'success.main' : 'error.main', fontWeight: 800 }}>
                {bfaProyeksiLaba !== null ? formatRupiah(bfaProyeksiLaba) : t('hppDialog.results.inputRequired')}
              </Typography>
            </Box>
          </Box>

          {/* Feasibility verdict */}
          {bfaBepKg !== null && bepHppInputs.proyeksiPanen > 0 && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: bfaLayak ? '#ecfdf3' : '#fef2f2', border: '1px solid', borderColor: bfaLayak ? '#bbf7d0' : '#fecaca' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: bfaLayak ? 'success.main' : 'error.main' }}>
                {bfaLayak ? t('hppDialog.results.layak') : t('hppDialog.results.tidakLayak')}
              </Typography>
              {!bfaLayak && bfaBepKg !== null && (
                <Typography variant="caption" color="text.secondary">
                  {t('hppDialog.results.kurangPanen', { kg: (bfaBepKg - bepHppInputs.proyeksiPanen).toFixed(1) })}
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={() => setBepHppDialogOpen(false)} sx={{ borderRadius: 8 }}>
              {t('hppDialog.close')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Laporan Keuangan PDF ─── */}
      <Dialog
        open={aiDialogOpen}
        onClose={() => { if (!reportLoading) setAiDialogOpen(false); }}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 44, height: 44, bgcolor: 'primary.light', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AutoFixHighIcon sx={{ color: 'primary.dark' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', lineHeight: 1.2, fontWeight: 800 }}>
                  {t('reportDialog.title')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('reportDialog.period')}: {filterBulan === 'semua' ? t('filters.allMonths') : getPeriodeLabel(filterBulan)}
                </Typography>
              </Box>
            </Box>
            {!reportLoading && (
              <IconButton aria-label={t('common.cancel')} size="small" onClick={() => setAiDialogOpen(false)} sx={(theme) => closeIconButtonSx(theme)}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {reportLoading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress color="success" />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                {t('reportDialog.loading')}
              </Typography>
            </Box>
          )}

          {reportError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setReportError(null)}>
              {reportError}
            </Alert>
          )}

          {/* Ringkasan data */}
          <Box sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('reportDialog.summary.title')}
            </Typography>
            <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('summary.totalIncome')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>{formatRupiah(totalPendapatan)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('summary.totalExpense')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>{formatRupiah(totalPengeluaran)}</Typography>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="caption" color="text.secondary">{labaBersih >= 0 ? t('summary.netProfit') : t('summary.deficit')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: labaBersih >= 0 ? 'success.main' : 'error.main' }}>
                  {formatRupiah(Math.abs(labaBersih))}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="caption" color="text.secondary">{t('reportDialog.summary.transactionCount')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{monthFilteredTransactions.length} {t('reportDialog.summary.transactions')}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Opsi 1: Manual PDF */}
          <Box
            sx={{
              p: 2.5,
              border: '2px solid',
              borderColor: 'divider',
              borderRadius: 3,
              mb: 2,
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <DownloadIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('reportDialog.manual.title')}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t('reportDialog.manual.desc')}
            </Typography>
            <Button
              variant="outlined"
              color="success"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={handleGeneratePdfManual}
              disabled={reportLoading || monthFilteredTransactions.length === 0}
              sx={{ borderRadius: 8 }}
            >
              {t('reportDialog.manual.button')}
            </Button>
          </Box>

          {/* Opsi 2: AI PDF */}
          <Box
            sx={{
              p: 2.5,
              border: '2px solid',
              borderColor: aiQuotaRemaining > 0 ? 'primary.light' : 'divider',
              borderRadius: 3,
              bgcolor: aiQuotaRemaining > 0 ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.text.primary, 0.03),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AutoFixHighIcon sx={{ color: aiQuotaRemaining > 0 ? 'primary.dark' : 'text.disabled' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: aiQuotaRemaining > 0 ? 'text.primary' : 'text.disabled' }}>
                  {t('reportDialog.ai.title')}
                </Typography>
              </Box>
              <Chip
                label={`${aiQuotaRemaining}/${MAX_AI_REPORTS_PER_MONTH} ${t('reportDialog.ai.quotaRemaining')}`}
                size="small"
                sx={{
                  bgcolor: aiQuotaRemaining > 0 ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.error.main, 0.15),
                  color: aiQuotaRemaining > 0 ? 'success.main' : 'error.main',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {aiQuotaRemaining > 0
                ? t('reportDialog.ai.descActive')
                : t('reportDialog.ai.descEmpty')}
            </Typography>
            <Button
              variant="contained"
              fullWidth
              startIcon={<AutoFixHighIcon />}
              onClick={handleGeneratePdfAI}
              disabled={reportLoading || aiQuotaRemaining <= 0 || monthFilteredTransactions.length === 0}
              sx={(theme) => ({
                borderRadius: 8,
                bgcolor: theme.palette.mode === 'dark' ? 'primary.main' : 'text.primary',
                color: theme.palette.mode === 'dark' ? theme.palette.common.white : 'background.default',
                border: '1px solid',
                borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.light, 0.35) : 'transparent',
                boxShadow: theme.palette.mode === 'dark' ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}` : 'none',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'primary.light' : 'text.secondary',
                  color: theme.palette.mode === 'dark' ? theme.palette.common.white : 'background.default',
                },
              })}
            >
              {t('reportDialog.ai.button')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    {/* Confirm Delete Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
          Hapus Transaksi?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Tindakan ini tidak dapat dibatalkan. Transaksi akan dihapus secara permanen.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmId(null)}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Ya, Hapus
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: '84px', md: 0 } }}
      >
        <Alert
          elevation={6}
          variant="filled"
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          role="status"
          aria-live="polite"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </PageShell>
  );
}
