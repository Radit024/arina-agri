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
import { alpha } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
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

const PieChart = dynamic(() => import('@mui/x-charts/PieChart').then((m) => ({ default: m.PieChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" width={300} height={200} sx={{ borderRadius: 2 }} />,
});



const MAX_AI_REPORTS_PER_MONTH = 3;

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
  handleExportExcel,
  aiQuotaRemaining,
  handleGeneratePdfManual,
  handleGeneratePdfAI,
  monthFilteredTransactions,
  totalPendapatan,
  totalPengeluaran,
  labaBersih,
  jumlahProduksi,
  biayaVariabelTotal,
  biayaVariabelPerUnit,
  hppPerUnit,
  marginKontribusiPerUnit,
  bepUnit,
  marginKontribusiRasio,
  bepRupiah,
  formatAngka,
  biayaTetapDisplayValue,
  hargaJualDisplayValue,
  expenseStats,
  finalPieData,
  finalPieColors,
  bulanOptions,
  getBulanLabel,
  displayedTransactions,
}: UseKeuanganControllerResult) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: { md: 'calc(100dvh - 96px)' }, display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
              {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
              {t('subtitle')}
          </Typography>
        </Box>
        <Button
          data-guide-target="finance-export"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportExcel}
          color="success"
          sx={{ borderRadius: 8, bgcolor: 'background.paper', boxShadow: 1, whiteSpace: 'nowrap' }}
        >
          {t('exportCsv')}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, alignItems: 'stretch' }}>
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
              <Box sx={{ display: 'flex', gap: 1, flex: 1, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, flex: { xs: 1, sm: 'none' } }}>
                  <InputLabel>{t('filters.month')}</InputLabel>
                  <Select value={filterBulan} label={t('filters.month')} onChange={(e) => setFilterBulan(e.target.value)}>
                    <MenuItem value="semua">{t('filters.allMonths')}</MenuItem>
                    {bulanOptions.map((bulanKey) => (
                      <MenuItem key={bulanKey} value={bulanKey}>{getBulanLabel(bulanKey)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 }, flex: { xs: 1, sm: 'none' } }}>
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
                {!isMobile && (
                  <Button
                    data-guide-target="finance-add-transaction"
                    id="btn-catat-transaksi"
                    variant="contained"
                    startIcon={<AddCircleIcon />}
                    onClick={openAddDialog}
                    sx={{ borderRadius: 8, whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}
                  >
                    {t('buttons.addTransaction')}
                  </Button>
                )}
              </Box>
            </Box>

            <CardContent sx={{ pt: 0, flex: 1, px: { xs: 1, sm: 2 }, pb: 2, position: 'relative' }}>
              {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: { xs: 500, lg: 700 }, overflow: 'auto', pb: 10 }}>
                  {displayedTransactions.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 6 }}>
                      <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('ledger.empty')}
                      </Typography>
                    </Box>
                  ) : (
                    displayedTransactions.map((tx) => (
                      <Card key={tx._id} variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider' }}>
                        <CardContent sx={{ p: '16px !important', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {tx.kategori}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateShort(tx.tanggal)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 800,
                                  color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                                }}
                              >
                                {tx.jenis === 'pendapatan' ? '+' : '−'}{formatRupiah(tx.nominal)}
                              </Typography>
                              <Chip
                                label={tx.jenis === 'pendapatan' ? t('common.income') : t('common.expense')}
                                size="small"
                                sx={{
                                  backgroundColor: tx.jenis === 'pendapatan' ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.error.main, 0.15),
                                  color: tx.jenis === 'pendapatan' ? 'success.dark' : 'error.dark',
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  height: 20,
                                }}
                              />
                            </Box>
                          </Box>
                          
                          {tx.keterangan && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', bgcolor: alpha(theme.palette.text.primary, 0.02), p: 1, borderRadius: 1 }}>
                              &quot;{tx.keterangan}&quot;
                            </Typography>
                          )}
                          
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 0.5 }}>
                            <Button
                              size="small"
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => handleEdit(tx)}
                              sx={{ color: 'primary.main', bgcolor: 'primary.light', borderRadius: 2, px: 2, py: 0.5, textTransform: 'none', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDelete(tx._id)}
                              sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2, px: 2, py: 0.5, textTransform: 'none', '&:hover': { bgcolor: 'error.main', color: 'white' } }}
                            >
                              Hapus
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  <Fab
                    data-guide-target="finance-add-transaction"
                    color="primary" 
                    aria-label="add" 
                    onClick={openAddDialog}
                    sx={{ position: 'fixed', bottom: 84, right: 24, zIndex: 1000 }}
                  >
                    <AddCircleIcon />
                  </Fab>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: { xs: 500, lg: 700 }, overflow: 'auto' }}>
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
                              <Button data-guide-target="finance-add-transaction" size="small" variant="outlined" onClick={openAddDialog} sx={{ mt: 1, borderRadius: 8 }}>
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
                                  sx={{
                                    borderRadius: 2,
                                    color: 'primary.main',
                                    bgcolor: 'primary.light',
                                    '&:hover': { bgcolor: 'primary.main', color: 'white' },
                                  }}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  aria-label="Hapus Transaksi"
                                  onClick={() => handleDelete(tx._id)}
                                  sx={{
                                    borderRadius: 2,
                                    color: 'error.main',
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                    '&:hover': { bgcolor: 'error.main', color: 'white' },
                                  }}
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
              )}
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
                  onClick={() => setAiDialogOpen(true)}
                  sx={{
                    color: 'primary.dark',
                    bgcolor: 'primary.light',
                    '&:hover': { bgcolor: 'primary.main', color: 'white' },
                  }}
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
                    paddingAngle: expenseStats.length > 0 ? 4 : 0,
                    cornerRadius: 5,
                    highlightScope: { fade: 'global', highlight: 'item' },
                    faded: { innerRadius: 40, additionalRadius: -10, color: 'gray' },
                  },
                ]}
                colors={finalPieColors}
                width={300}
                height={200}
                slotProps={{
                  legend: {
                    direction: 'vertical',
                    position: { vertical: 'middle', horizontal: 'end' },
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
              size="small"
              onClick={() => { setTxDialogOpen(false); setEditingId(null); }}
              sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}
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

      {/* ─── MODAL: Kalkulator HPP & BEP ─── */}
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
            <IconButton size="small" onClick={() => setBepHppDialogOpen(false)} sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: '12px !important' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={t('hppDialog.fields.fixedCost')}
                type="number"
                value={biayaTetapDisplayValue}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('biayaTetap', e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    inputProps: { min: 0 },
                    startAdornment: biayaTetapDisplayValue
                      ? (
                        <InputAdornment position="start">
                          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp</Typography>
                        </InputAdornment>
                      )
                      : undefined,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={t('hppDialog.fields.totalProduction')}
                type="number"
                value={getBepHppInputDisplayValue(bepHppInputs.jumlahProduksi)}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('jumlahProduksi', e.target.value)}
                fullWidth
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
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={t('hppDialog.fields.unitPrice')}
                type="number"
                value={hargaJualDisplayValue}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('hargaJualPerUnit', e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    inputProps: { min: 0 },
                    startAdornment: hargaJualDisplayValue
                      ? (
                        <InputAdornment position="start">
                          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp</Typography>
                        </InputAdornment>
                      )
                      : undefined,
                  },
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, p: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              HPP = Total Biaya Produksi / Jumlah Produksi
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              BEP Unit = Biaya Tetap / (Harga Jual per Unit - Biaya Variabel per Unit)
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              BEP Rupiah = Biaya Tetap / (1 - Biaya Variabel / Penjualan)
            </Typography>
          </Box>

          <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.variableCostTotal')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatRupiah(biayaVariabelTotal)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.variableCostPerUnit')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {jumlahProduksi > 0 ? formatRupiah(biayaVariabelPerUnit) : t('hppDialog.results.inputProduction')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfdf3', border: '1px solid #bbf7d0' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.hppPerUnit')}</Typography>
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 800 }}>
                {jumlahProduksi > 0 ? formatRupiah(hppPerUnit) : t('hppDialog.results.inputProduction')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfeff', border: '1px solid #bae6fd' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.bepUnit')}</Typography>
              <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 800 }}>
                {bepUnit !== null ? `${formatAngka(bepUnit)} kg` : t('hppDialog.results.notCalculatable')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa', gridColumn: { xs: '1 / -1', md: '1 / -1' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.bepValue')}</Typography>
              <Typography variant="body2" sx={{ color: 'warning.dark', fontWeight: 800 }}>
                {bepRupiah !== null ? formatRupiah(bepRupiah) : t('hppDialog.results.notCalculatable')}
              </Typography>
            </Box>
          </Box>

          {marginKontribusiPerUnit <= 0 && jumlahProduksi > 0 && (
            <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'error.main' }}>
              {t('hppDialog.results.invalidBepUnit')}
            </Typography>
          )}
          {(marginKontribusiRasio === null || marginKontribusiRasio <= 0) && (
            <Typography variant="caption" sx={{ mt: 0.8, display: 'block', color: 'error.main' }}>
              {t('hppDialog.results.invalidBepValue')}
            </Typography>
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
              <IconButton size="small" onClick={() => setAiDialogOpen(false)} sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
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
              sx={{ borderRadius: 8, bgcolor: 'text.primary', color: 'background.default', '&:hover': { bgcolor: 'text.secondary' } }}
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

    </Box>
  );
}
