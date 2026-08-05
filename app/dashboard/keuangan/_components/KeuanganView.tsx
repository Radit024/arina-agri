'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
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

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Checkbox from '@mui/material/Checkbox';
import TableSortLabel from '@mui/material/TableSortLabel';


import { formatDateLong, formatRupiah } from '@/lib/formatters';
import { getPeriodeLabel } from '@/lib/pdfReport';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import DialogActions from '@mui/material/DialogActions';
import Fab from '@mui/material/Fab';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import type { HighlightItemIdentifierWithType } from '@mui/x-charts/models';

import { PageHeader, PageShell } from '@/components/shared/page';
import FinanceCashFlowView from './FinanceCashFlowView';
import { FinanceComparisonView } from './FinanceComparisonView';
import FinanceFinancingView from './FinanceFinancingView';
import FinanceIncomeStatementView from './FinanceIncomeStatementView';
import FinanceProjectToolbar from './FinanceProjectToolbar';
import FinancingAssumptionsDialog from './FinancingAssumptionsDialog';
import ProductionSalesAssumptionsDialog from './ProductionSalesAssumptionsDialog';
import RabImportDialog from './RabImportDialog';
import RabItemDialog from './RabItemDialog';
import RabTransactionLinkDialog from './RabTransactionLinkDialog';
import RabPlanningView from './RabPlanningView';
import TransactionBatchDialog from './TransactionBatchDialog';
import UnclassifiedTransactionsBanner from './UnclassifiedTransactionsBanner';
import TransactionClassificationDialog from './TransactionClassificationDialog';

const PieChart = dynamic(() => import('@mui/x-charts/PieChart').then((m) => ({ default: m.PieChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" width={300} height={200} sx={{ borderRadius: 2 }} />,
});



const MAX_AI_REPORTS_PER_MONTH = 3;
const EXPENSE_DISTRIBUTION_SERIES_ID = 'expense-distribution';

type FinanceActionIntent = 'primary' | 'error';
type LedgerTransaction = UseKeuanganControllerResult['displayedTransactions'][number];

const ledgerQuantityFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
});

const distributionPercentageFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatLedgerQuantity(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '-';
  return ledgerQuantityFormatter.format(value);
}

function formatDistributionPercentage(value: number) {
  if (!Number.isFinite(value)) return '0,0%';
  return `${distributionPercentageFormatter.format(value)}%`;
}

function hasLedgerInputDetails(tx: LedgerTransaction) {
  return tx.volume != null || Boolean(tx.satuan) || tx.hargaSatuan != null;
}

function formatLedgerQuantityWithUnit(tx: LedgerTransaction) {
  const quantity = formatLedgerQuantity(tx.volume);
  if (quantity === '-' && !tx.satuan) return '-';
  return `${quantity}${tx.satuan ? ` ${tx.satuan}` : ''}`;
}

function financeActionIconButtonSx(theme: Theme, intent: FinanceActionIntent = 'primary') {
  const palette = theme.palette[intent];
  const isDarkMode = theme.palette.mode === 'dark';
  const foreground = isDarkMode ? palette.contrastText : palette.dark;
  const backgroundOpacity = 0.12;

  return {
    borderRadius: 2,
    color: foreground,
    bgcolor: isDarkMode ? palette.main : alpha(palette.main, backgroundOpacity),
    border: '1px solid',
    borderColor: alpha(isDarkMode ? palette.main : foreground, isDarkMode ? 0.6 : 0.24),
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
  deleteConfirmId,
  setDeleteConfirmId,
  snackbar,
  setSnackbar,
  filterBulan,
  setFilterBulan,
  theme,
  isMobile,
  handleDelete,
  handleConfirmDelete,
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
  pagedTransactions,
  ledgerPage,
  setLedgerPage,
  ledgerTotalPages,
  financeAccess,
  financeTab,
  setFinanceTab,
  financeProject,
  financeScenario,
  rab,
  rabTransactionLink,
  financeReports,
  financing,
  financeComparison,
  productionSales,
  labaRugiActions,
  financeExport,
  handleOpenFinanceReportDialog,
  transactionBatch,
  transactionMaster,
  migration,
  searchQuery,
  setSearchQuery,
  sortColumn,
  sortDir,
  toggleSort,
  selectedTxIds,
  toggleSelectTx,
  clearSelectionTxs,
  bulkDeleteConfirm,
  setBulkDeleteConfirm,
  handleBulkDeleteConfirm,
}: UseKeuanganControllerResult) {

  const [searchOpen, setSearchOpen] = useState(false);
  const [distributionPanelOpen, setDistributionPanelOpen] = useState(true);
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);
  const [distributionHighlightedItem, setDistributionHighlightedItem] =
    useState<HighlightItemIdentifierWithType<'pie'> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  const allVisibleSelected =
    pagedTransactions.length > 0 &&
    pagedTransactions.every((tx) => selectedTxIds.includes(tx._id));
  const someSelected =
    selectedTxIds.length > 0 && !allVisibleSelected;
  const hasDistributionData = finalPieData.some((item) => item.id !== t('distribution.empty'));
  const renderDistributionBreakdown = (maxHeight?: number) => {
    if (!hasDistributionData) return null;

    return (
      <Box
        data-finance-distribution-breakdown={maxHeight ? 'compact' : 'fill'}
        sx={{
          width: '100%',
          flex: maxHeight ? '0 0 auto' : 1,
          minHeight: 0,
          maxHeight,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          pr: 0.5,
        }}
      >
        {finalPieData.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '10px minmax(0, 1fr) auto',
              alignItems: 'center',
              columnGap: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              px: 1,
              py: 0.75,
              bgcolor: 'background.paper',
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: item.color,
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 800, color: 'text.primary' }}>
                {item.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatRupiah(item.value)}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.primary' }}>
              {formatDistributionPercentage(item.percentage)}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };
  const financeInputDisabled = !financeAccess.canInputFinance;
  const ledgerEmptyMessage = financeAccess.hasSelectedProject
    ? t('ledger.empty')
    : 'Buat proyek terlebih dahulu untuk mulai mencatat transaksi.';
  const ledgerHeaderCellSx = {
    backgroundColor: 'background.paper',
    fontWeight: 800,
    fontSize: '0.76rem',
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: 0,
    whiteSpace: 'nowrap',
  };
  const ledgerSortLabelSx = {
    fontWeight: 800,
    fontSize: '0.76rem',
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: 0,
    gap: 0.5,
    '& .MuiTableSortLabel-icon': {
      marginLeft: 0,
      marginRight: 0,
    },
  };
  const ledgerNumericSortLabelSx = {
    ...ledgerSortLabelSx,
    width: '100%',
    justifyContent: 'flex-end',
  };
  const ledgerRowCellSx = { py: 2.5 };
  const ledgerValueColumnLabel = t('ledger.columns.value');
  const ledgerValueLabelMatch = ledgerValueColumnLabel.match(/^(.*?)\s*(\([^)]*\))$/);
  const ledgerValueLabel = ledgerValueLabelMatch?.[1] ?? ledgerValueColumnLabel;
  const ledgerValueUnit = ledgerValueLabelMatch?.[2] ?? '';
  const getRabLinkLabel = (tx: LedgerTransaction) => {
    const linkedRabItem = rabTransactionLink.getLinkedRabItem(tx);
    if (linkedRabItem) return `RAB: ${linkedRabItem.name}`;
    return tx.rabItemId ? 'RAB tersambung' : null;
  };
  const financePanelSx = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
    minHeight: { xs: 'auto', md: 'max(520px, calc(100dvh - 220px))' },
  } as const;

  return (
    <PageShell>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <FinanceProjectToolbar
        financeAccess={financeAccess}
        financeProject={financeProject}
        financeScenario={financeScenario}
        rab={rab}
        financeExport={financeExport}
        reportLoading={reportLoading}
        transactionBatch={transactionBatch}
        onOpenPdfReport={handleOpenFinanceReportDialog}
      />

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
        <Tab value="arus-kas-pasca-pembiayaan" label="Arus Kas Pasca Pembiayaan" />
        <Tab value="perbandingan" label="Perbandingan" />
      </Tabs>

      {financeTab === 'buku-besar' && (
      <Box
        data-testid="finance-panel-buku-besar"
        data-finance-fill-height="true"
        sx={financePanelSx}
      >
        <UnclassifiedTransactionsBanner
          unclassifiedCount={migration.unclassifiedCount}
          onOpenDialog={migration.openDialog}
        />
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card data-guide-target="finance-summary" sx={{ height: '100%' }}>
              <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUpIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {t('summary.totalIncome')}
                  </Typography>
                  <Typography variant="h6" color="success.main" sx={{ lineHeight: 1.2, fontWeight: 900, fontFamily: 'var(--font-sora)' }}>
                    {formatRupiah(totalPendapatan)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingDownIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {t('summary.totalExpense')}
                  </Typography>
                  <Typography variant="h6" color="error.main" sx={{ lineHeight: 1.2, fontWeight: 900, fontFamily: 'var(--font-sora)' }}>
                    {formatRupiah(totalPengeluaran)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: labaBersih >= 0 ? 'success.main' : 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AccountBalanceIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {labaBersih >= 0 ? t('summary.netProfit') : t('summary.deficit')}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: labaBersih >= 0 ? 'success.main' : 'error.main',
                      lineHeight: 1.2,
                      fontWeight: 900,
                      fontFamily: 'var(--font-sora)',
                    }}
                  >
                    {formatRupiah(Math.abs(labaBersih))}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ flex: 1, display: 'flex', gap: 2, alignItems: 'stretch', minHeight: 0 }}>
        {/* ─── Buku Besar Transaksi ─── */}
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
          <Card
            data-guide-target="finance-ledger"
            data-testid="finance-ledger-card"
            data-finance-card-align="ledger"
            sx={{ height: '100%', minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  {t('ledger.title')}
                </Typography>
              }
              subheader={t('ledger.subheader', { count: displayedTransactions.length })}
              sx={{ pb: 1 }}
            />

            {/* Toolbar */}
            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Row 1: Filter + Search + Actions */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Filter Bulan */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>{t('filters.month')}</InputLabel>
                  <Select value={filterBulan} label={t('filters.month')} onChange={(e) => setFilterBulan(e.target.value)}>
                    <MenuItem value="semua">{t('filters.allMonths')}</MenuItem>
                    {bulanOptions.map((bulanKey) => (
                      <MenuItem key={bulanKey} value={bulanKey}>{getBulanLabel(bulanKey)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Expandable Search — always rendered, no unmount */}
                <Box
                  sx={{
                    position: 'relative',
                    width: searchOpen ? 280 : 40,
                    height: 40,
                    flexShrink: 0,
                    transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'width',
                  }}
                >
                  {/* Icon button (fades out when open) */}
                  <IconButton
                    size="small"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Buka pencarian"
                    sx={(t) => ({
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: searchQuery ? 'primary.light' : 'divider',
                      color: searchQuery ? 'primary.main' : 'text.secondary',
                      bgcolor: searchQuery ? alpha(t.palette.primary.main, 0.08) : 'transparent',
                      opacity: searchOpen ? 0 : 1,
                      pointerEvents: searchOpen ? 'none' : 'auto',
                      transition: 'opacity 0.15s ease',
                      zIndex: 1,
                    })}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>

                  {/* TextField (fades in when open) */}
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Cari kategori atau catatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); } }}
                    slotProps={{
                      htmlInput: { ref: searchInputRef },
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchQuery ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSearchQuery('');
                                setSearchOpen(false);
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : undefined,
                      },
                    }}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      opacity: searchOpen ? 1 : 0,
                      pointerEvents: searchOpen ? 'auto' : 'none',
                      transition: 'opacity 0.15s ease',
                      '& .MuiOutlinedInput-root': { borderRadius: 3, height: '100%' },
                      '& .MuiInputBase-input': { py: 0 },
                    }}
                  />
                </Box>

                {/* Push actions to the right */}
                <Box sx={{ ml: 'auto' }} />

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DonutLargeIcon />}
                    onClick={() => {
                      if (isMobile) {
                        setDistributionDialogOpen(true);
                      } else {
                        setDistributionPanelOpen((open) => !open);
                      }
                    }}
                    sx={{ borderRadius: 8, whiteSpace: 'nowrap' }}
                  >
                    {t('distribution.title')}
                  </Button>
                  <Button
                    data-guide-target="finance-add-transaction"
                    id="btn-catat-transaksi"
                    variant="contained"
                    startIcon={<AddCircleIcon />}
                    disabled={financeInputDisabled}
                    onClick={() => {
                      if (!financeInputDisabled) transactionBatch.openForCreate();
                    }}
                    sx={{ display: { xs: 'none', md: 'inline-flex' }, borderRadius: 8, whiteSpace: 'nowrap' }}
                  >
                    {t('buttons.addTransaction')}
                  </Button>
                </Box>
              </Box>

              {/* Row 3: Bulk action bar (conditional) */}
              {selectedTxIds.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                    border: '1px solid',
                    borderColor: 'primary.light',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, color: 'primary.dark' }}>
                    {selectedTxIds.length} transaksi dipilih
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={clearSelectionTxs}
                    sx={{ borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}
                  >
                    Batalkan
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    onClick={() => rabTransactionLink.openForTransactions(selectedTxIds)}
                    sx={{ borderRadius: 2, textTransform: 'none', bgcolor: 'background.paper' }}
                  >
                    Hubungkan RAB
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<DeleteSweepIcon />}
                    onClick={() => setBulkDeleteConfirm(true)}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Hapus {selectedTxIds.length} data
                  </Button>
                </Box>
              )}
            </Box>

            <CardContent sx={{ pt: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', px: { xs: 1, sm: 2 }, pb: 2, position: 'relative' }}>
              <Box sx={{ display: { xs: 'flex', md: 'none' }, flex: 1, minHeight: 0, flexDirection: 'column', gap: 1.5, overflowY: 'auto', pr: 0.5, pb: 2 }}>
                  {displayedTransactions.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 6 }}>
                      <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary">
                        {ledgerEmptyMessage}
                      </Typography>
                    </Box>
                  ) : (
                    pagedTransactions.map((tx) => (
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
                              {formatDateLong(tx.tanggal)}
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 800,
                                color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tx.jenis === 'pendapatan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                            </Typography>
                          </Box>

                          {hasLedgerInputDetails(tx) && (
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: 'auto minmax(0, 1fr)',
                                columnGap: 1,
                                rowGap: 0.5,
                                bgcolor: alpha(theme.palette.text.primary, 0.025),
                                borderRadius: 1.5,
                                p: 1,
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                {t('ledger.columns.quantity')}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right' }}>
                                {formatLedgerQuantity(tx.volume)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('ledger.columns.unit')}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right', overflowWrap: 'anywhere' }}>
                                {tx.satuan || '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('ledger.columns.unitPrice')}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right' }}>
                                {tx.hargaSatuan == null ? '-' : formatRupiah(tx.hargaSatuan)}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* Row 3: Keterangan (optional) */}
                          {tx.keterangan && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', bgcolor: alpha(theme.palette.text.primary, 0.02), p: 1, borderRadius: 1.5 }}>
                              &quot;{tx.keterangan}&quot;
                            </Typography>
                          )}
                          {getRabLinkLabel(tx) && (
                            <Chip
                              icon={<LinkIcon />}
                              label={getRabLinkLabel(tx)}
                              size="small"
                              sx={{
                                alignSelf: 'flex-start',
                                borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.dark',
                                fontWeight: 700,
                                '& .MuiChip-icon': { color: 'primary.main' },
                              }}
                            />
                          )}

                          {/* Row 4: Action Footer Buttons */}
                          <Divider sx={{ my: 0.5 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <IconButton
                              data-touch-target="44"
                              size="small"
                              aria-label={`Hubungkan RAB transaksi ${tx.kategori}`}
                              onClick={() => rabTransactionLink.openForTransactions([tx._id])}
                              sx={(theme) => ({
                                width: 44,
                                height: 44,
                                ...financeActionIconButtonSx(theme, 'primary'),
                              })}
                            >
                              <LinkIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              data-touch-target="44"
                              size="small"
                              aria-label={`Edit transaksi ${tx.kategori}`}
                              onClick={() => transactionBatch.openForEdit(tx)}
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
                  {displayedTransactions.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', flexShrink: 0, py: 1 }}>
                      <Pagination
                        count={ledgerTotalPages}
                        page={ledgerPage}
                        onChange={(_, value) => setLedgerPage(value)}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  )}
                  <Fab
                    data-guide-target="finance-add-transaction-mobile"
                    color="primary" 
                    aria-label="add" 
                    disabled={financeInputDisabled}
                    onClick={() => {
                      if (!financeInputDisabled) transactionBatch.openForCreate();
                    }}
                    sx={{ position: 'fixed', bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 84 }, right: 24, zIndex: 1000 }}
                  >
                    <AddCircleIcon />
                  </Fab>
              </Box>

              <TableContainer sx={{ display: { xs: 'none', md: 'block' }, flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto' }}>
                <Table size="medium" stickyHeader sx={{ width: '100%', tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      {/* Select all checkbox */}
                      <TableCell padding="checkbox" sx={{ backgroundColor: 'background.paper', width: 44 }}>
                        <Checkbox
                          size="small"
                          checked={allVisibleSelected}
                          indeterminate={someSelected}
                          onChange={() => {
                            if (allVisibleSelected) {
                              clearSelectionTxs();
                            } else {
                              pagedTransactions.forEach((tx) => {
                                if (!selectedTxIds.includes(tx._id)) toggleSelectTx(tx._id);
                              });
                            }
                          }}
                          disabled={pagedTransactions.length === 0}
                        />
                      </TableCell>
                      <TableCell sx={{ ...ledgerHeaderCellSx, width: '12%' }}>
                        <TableSortLabel
                          active={sortColumn === 'tanggal'}
                          direction={sortColumn === 'tanggal' && sortDir ? sortDir : 'asc'}
                          onClick={() => toggleSort('tanggal')}
                          sx={ledgerSortLabelSx}
                        >
                          {t('ledger.columns.date')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...ledgerHeaderCellSx, width: '10%' }}>
                        <TableSortLabel
                          active={sortColumn === 'jenis'}
                          direction={sortColumn === 'jenis' && sortDir ? sortDir : 'asc'}
                          onClick={() => toggleSort('jenis')}
                          sx={ledgerSortLabelSx}
                        >
                          {t('ledger.columns.type')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...ledgerHeaderCellSx, width: '15%' }}>
                        <TableSortLabel
                          active={sortColumn === 'kategori'}
                          direction={sortColumn === 'kategori' && sortDir ? sortDir : 'asc'}
                          onClick={() => toggleSort('kategori')}
                          sx={ledgerSortLabelSx}
                        >
                          {t('ledger.columns.category')}
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...ledgerHeaderCellSx, width: '18%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Box component="span">{t('ledger.columns.quantity')}</Box>
                          <Box component="span">{t('ledger.columns.unitPrice')}</Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ ...ledgerHeaderCellSx, width: '18%' }}>
                        <TableSortLabel
                          active={sortColumn === 'nominal'}
                          direction={sortColumn === 'nominal' && sortDir ? sortDir : 'asc'}
                          onClick={() => toggleSort('nominal')}
                          sx={ledgerNumericSortLabelSx}
                        >
                          <Box
                            component="span"
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              lineHeight: 1.1,
                            }}
                          >
                            <Box component="span">{ledgerValueLabel}</Box>
                            {ledgerValueUnit && (
                              <Box component="span" sx={{ fontSize: '0.68rem', fontWeight: 800 }}>
                                {ledgerValueUnit}
                              </Box>
                            )}
                          </Box>
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...ledgerHeaderCellSx }}>
                        Detail / Catatan
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                            <Typography variant="body2" color="text.secondary">
                              {ledgerEmptyMessage}
                            </Typography>
                            <Button
                              data-guide-target="finance-add-transaction-empty"
                              size="small"
                              variant="outlined"
                              disabled={financeInputDisabled}
                              onClick={() => {
                                if (!financeInputDisabled) transactionBatch.openForCreate();
                              }}
                              sx={{ mt: 1, borderRadius: 8 }}
                            >
                              {t('ledger.addFirst')}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedTransactions.map((tx) => {
                        const isSelected = selectedTxIds.includes(tx._id);
                        return (
                          <TableRow
                            key={tx._id}
                            selected={isSelected}
                            onClick={() => toggleSelectTx(tx._id)}
                            sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.018)' }, '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.primary.main, 0.07) } }}
                          >
                            <TableCell padding="checkbox" sx={ledgerRowCellSx} onClick={(e) => e.stopPropagation()}>
                              <Checkbox size="small" checked={isSelected} onChange={() => toggleSelectTx(tx._id)} />
                            </TableCell>
                            <TableCell sx={{ ...ledgerRowCellSx, fontSize: '0.82rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                              {formatDateLong(tx.tanggal)}
                            </TableCell>
                            <TableCell sx={ledgerRowCellSx}>
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
                            <TableCell sx={{ ...ledgerRowCellSx, fontWeight: 700, fontSize: '0.875rem', minWidth: 0 }}>
                              <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                                {tx.kategori}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ ...ledgerRowCellSx, fontSize: '0.82rem', color: 'text.secondary', minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
                                <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                                  {formatLedgerQuantityWithUnit(tx)}
                                </Typography>
                                {tx.hargaSatuan != null && (
                                  <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 700, color: 'text.primary', flexShrink: 0 }}>
                                    {formatRupiah(tx.hargaSatuan)}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                ...ledgerRowCellSx,
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {tx.jenis === 'pendapatan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                            </TableCell>
                            <TableCell sx={{ ...ledgerRowCellSx, fontSize: '0.82rem', color: 'text.secondary', minWidth: 0, overflow: 'hidden' }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                  <Typography variant="caption" noWrap sx={{ display: 'block', flex: 1, minWidth: 0 }}>
                                    {tx.keterangan || '-'}
                                  </Typography>
                                  {isSelected && (
                                    <Box
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{ display: 'inline-flex', gap: 0.5, flexShrink: 0 }}
                                    >
                                      <IconButton
                                        size="small"
                                        aria-label={`Hubungkan RAB transaksi ${tx.kategori}`}
                                        onClick={() => rabTransactionLink.openForTransactions([tx._id])}
                                        sx={(theme) => ({
                                          width: 34,
                                          height: 34,
                                          ...financeActionIconButtonSx(theme, 'primary'),
                                        })}
                                      >
                                        <LinkIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        aria-label={`Edit transaksi ${tx.kategori}`}
                                        onClick={() => transactionBatch.openForEdit(tx)}
                                        sx={(theme) => ({
                                          width: 34,
                                          height: 34,
                                          ...financeActionIconButtonSx(theme, 'primary'),
                                        })}
                                      >
                                        <EditOutlinedIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        aria-label={`Hapus transaksi ${tx.kategori}`}
                                        onClick={() => handleDelete(tx._id)}
                                        sx={(theme) => ({
                                          width: 34,
                                          height: 34,
                                          ...financeActionIconButtonSx(theme, 'error'),
                                        })}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  )}
                                </Box>
                                {getRabLinkLabel(tx) && (
                                  <Chip
                                    icon={<LinkIcon />}
                                    label={getRabLinkLabel(tx)}
                                    size="small"
                                    sx={{
                                      alignSelf: 'flex-start',
                                      height: 22,
                                      borderRadius: 1.5,
                                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      color: 'primary.dark',
                                      fontWeight: 700,
                                      '& .MuiChip-icon': { color: 'primary.main' },
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {displayedTransactions.length > 0 && (
                <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', flexShrink: 0, pt: 1.5 }}>
                  <Pagination
                    count={ledgerTotalPages}
                    page={ledgerPage}
                    onChange={(_, value) => setLedgerPage(value)}
                    size="small"
                    color="primary"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

          <Collapse
            orientation="horizontal"
            in={distributionPanelOpen}
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiCollapse-wrapper': { height: '100%' },
              '& .MuiCollapse-wrapperInner': { height: '100%' },
            }}
          >
            <Card
              data-testid="finance-distribution-card"
              data-finance-card-align="ledger"
              data-finance-card-fill-bottom="true"
              sx={{
                width: { md: 300, lg: 330 },
                flexShrink: 0,
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  {t('distribution.title')}
                </Typography>
              }
              action={
                <IconButton
                  aria-label={t('common.cancel')}
                  size="small"
                  onClick={() => setDistributionPanelOpen(false)}
                  sx={(theme) => closeIconButtonSx(theme)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0, px: 2, pb: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1.5 }}>
              <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <PieChart
                  series={[
                    {
                      id: EXPENSE_DISTRIBUTION_SERIES_ID,
                      data: finalPieData,
                      innerRadius: 48,
                      outerRadius: 84,
                      paddingAngle: hasDistributionData ? 4 : 0,
                      cornerRadius: 5,
                      highlightScope: { fade: 'global', highlight: 'item' },
                      faded: { innerRadius: 40, additionalRadius: -10, color: 'gray' },
                    },
                  ]}
                  colors={finalPieColors}
                  highlightedItem={distributionHighlightedItem}
                  onHighlightChange={(item) => setDistributionHighlightedItem(item)}
                  width={300}
                  height={210}
                  slotProps={{
                    legend: {
                      direction: 'horizontal',
                      position: { vertical: 'bottom', horizontal: 'center' },
                    },
                  }}
                />
              </Box>
              {renderDistributionBreakdown()}
            </CardContent>
          </Card>
          </Collapse>
        </Box>

        <Dialog
          open={distributionDialogOpen}
          onClose={() => setDistributionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 4 } } }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
                {t('distribution.title')}
              </Typography>
              <IconButton aria-label={t('common.cancel')} size="small" onClick={() => setDistributionDialogOpen(false)} sx={(theme) => closeIconButtonSx(theme)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: '8px !important', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <PieChart
              series={[
                {
                  id: EXPENSE_DISTRIBUTION_SERIES_ID,
                  data: finalPieData,
                  innerRadius: 52,
                  outerRadius: 96,
                  paddingAngle: hasDistributionData ? 4 : 0,
                  cornerRadius: 5,
                  highlightScope: { fade: 'global', highlight: 'item' },
                  faded: { innerRadius: 44, additionalRadius: -10, color: 'gray' },
                },
              ]}
              colors={finalPieColors}
              highlightedItem={distributionHighlightedItem}
              onHighlightChange={(item) => setDistributionHighlightedItem(item)}
              width={320}
              height={280}
              slotProps={{
                legend: {
                  direction: 'horizontal',
                  position: { vertical: 'bottom', horizontal: 'center' },
                },
              }}
            />
            <Box sx={{ width: '100%', maxWidth: 360 }}>
              {renderDistributionBreakdown(240)}
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
      )}

      {financeTab === 'rab' && (
        <Box
          data-testid="finance-panel-rab"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <RabPlanningView financeProject={financeProject} rab={rab} />
        </Box>
      )}
      {financeTab === 'laba-rugi' && (
        <Box
          data-testid="finance-panel-laba-rugi"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <FinanceIncomeStatementView
            financeReports={financeReports}
            labaRugiActions={labaRugiActions}
            productionSales={productionSales}
          />
        </Box>
      )}
      {financeTab === 'arus-kas' && (
        <Box
          data-testid="finance-panel-arus-kas"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <FinanceCashFlowView financeReports={financeReports} />
        </Box>
      )}
      {financeTab === 'arus-kas-pasca-pembiayaan' && (
        <Box
          data-testid="finance-panel-arus-kas-pasca-pembiayaan"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <FinanceFinancingView financing={financing} />
        </Box>
      )}
      {financeTab === 'perbandingan' && (
        <Box
          data-testid="finance-panel-perbandingan"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <FinanceComparisonView {...financeComparison} />
        </Box>
      )}

      {/* ─── MODAL: Catat / Edit Transaksi (Batch) ─── */}
      <TransactionBatchDialog
        batch={transactionBatch}
        master={transactionMaster}
        selectedProjectId={financeProject.selectedProject?.id}
      />
      <RabTransactionLinkDialog link={rabTransactionLink} />
      <RabImportDialog rab={rab} />
      <RabItemDialog rab={rab} />
      <FinancingAssumptionsDialog financing={financing} />
      <ProductionSalesAssumptionsDialog controller={productionSales} />

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
              disabled={reportLoading || !financeAccess.canExportFinance}
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
              disabled={reportLoading || aiQuotaRemaining <= 0 || !financeAccess.canExportFinance}
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
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>Hapus Transaksi?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Tindakan ini tidak dapat dibatalkan. Transaksi akan dihapus secara permanen.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDeleteConfirmId(null)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Batal
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Ya, Hapus
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Bulk Delete Dialog */}
      <Dialog open={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
          Hapus {selectedTxIds.length} Transaksi?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Semua transaksi yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setBulkDeleteConfirm(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Batal
          </Button>
          <Button variant="contained" color="error" startIcon={<DeleteSweepIcon />} onClick={handleBulkDeleteConfirm} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Ya, Hapus Semua
          </Button>
        </DialogActions>
      </Dialog>

      <TransactionClassificationDialog
        open={migration.dialogOpen}
        onClose={migration.closeDialog}
        unclassifiedTransactions={migration.unclassifiedTransactions}
        projectionScenarioId={
          financeScenario.scenarios.find((s) => s.mode === 'PROJECTION')?.id ?? null
        }
        realizationScenarioId={
          financeScenario.scenarios.find((s) => s.mode === 'REALIZATION')?.id ?? null
        }
        onClassify={migration.handleClassifyTransactions}
        isSubmitting={migration.isSubmitting}
        submitError={migration.submitError}
      />

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
