import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SearchIcon from '@mui/icons-material/Search';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import UnclassifiedTransactionsBanner from './UnclassifiedTransactionsBanner';
import { formatDateLong, formatDateShort, formatRupiah } from '@/lib/formatters';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';

// Chart dimuat di sisi klien saja: MUI x-charts menyentuh canvas yang tidak
// ada saat SSR.
const PieChart = dynamic(() => import('@mui/x-charts/PieChart').then((m) => ({ default: m.PieChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" width={300} height={200} sx={{ borderRadius: 2 }} />,
});

export type FinanceLedgerViewProps = Pick<
  UseKeuanganControllerResult,
    | 'bulanOptions'
  | 'clearSelectionTxs'
  | 'displayedTransactions'
  | 'filterBulan'
  | 'filterJenis'
  | 'filterRabLink'
  | 'finalPieColors'
  | 'finalPieData'
  | 'financeAccess'
  | 'getBulanLabel'
  | 'handleDelete'
  | 'isMobile'
  | 'labaBersih'
  | 'ledgerPage'
  | 'ledgerTotalPages'
  | 'migration'
  | 'pagedTransactions'
  | 'rabTransactionLink'
  | 'searchQuery'
  | 'selectedTransactionsMixed'
  | 'selectedTxIds'
  | 'setBulkDeleteConfirm'
  | 'setFilterBulan'
  | 'setFilterJenis'
  | 'setFilterRabLink'
  | 'setLedgerPage'
  | 'setSearchQuery'
  | 'sortColumn'
  | 'sortDir'
  | 't'
  | 'theme'
  | 'toggleSelectTx'
  | 'toggleSort'
  | 'totalPendapatan'
  | 'totalPengeluaran'
  | 'transactionBatch'
>;

/**
 * Tab "Buku Besar": daftar transaksi terfilter, pemilihan massal, dan panel
 * distribusi pengeluaran. Stateful UI (pencarian, expand baris, panel
 * distribusi) sengaja tinggal di sini, bukan di shell `KeuanganView`,
 * karena tidak ada tab lain yang memakainya.
 */
export default function FinanceLedgerView({
  bulanOptions,
  clearSelectionTxs,
  displayedTransactions,
  filterBulan,
  filterJenis,
  filterRabLink,
  finalPieColors,
  finalPieData,
  financeAccess,
  getBulanLabel,
  handleDelete,
  isMobile,
  labaBersih,
  ledgerPage,
  ledgerTotalPages,
  migration,
  pagedTransactions,
  rabTransactionLink,
  searchQuery,
  selectedTransactionsMixed,
  selectedTxIds,
  setBulkDeleteConfirm,
  setFilterBulan,
  setFilterJenis,
  setFilterRabLink,
  setLedgerPage,
  setSearchQuery,
  sortColumn,
  sortDir,
  t,
  theme,
  toggleSelectTx,
  toggleSort,
  totalPendapatan,
  totalPengeluaran,
  transactionBatch,
}: FinanceLedgerViewProps) {
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


const [searchOpen, setSearchOpen] = useState(false);
const [expandedMobileTxIds, setExpandedMobileTxIds] = useState<Set<string>>(new Set());
const toggleExpandMobileTx = (id: string) => {
  setExpandedMobileTxIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
const [distributionPanelOpen, setDistributionPanelOpen] = useState(true);
const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);
const [distributionHighlightedItem, setDistributionHighlightedItem] =
  useState<{ type?: 'pie'; seriesId: string; dataIndex?: number } | null>(null);
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
      {finalPieData.map((item, index) => {
        const isHighlighted = distributionHighlightedItem?.dataIndex === index;
        return (
          <Box
            key={item.id}
            onClick={() => {
              setDistributionHighlightedItem((prev) =>
                prev?.dataIndex === index
                  ? null
                  : { type: 'pie', seriesId: EXPENSE_DISTRIBUTION_SERIES_ID, dataIndex: index }
              );
            }}
            sx={{
              display: 'grid',
              gridTemplateColumns: '10px minmax(0, 1fr) auto',
              alignItems: 'center',
              columnGap: 1,
              border: '1px solid',
              borderColor: isHighlighted ? 'primary.main' : 'divider',
              borderRadius: 2,
              px: 1,
              py: 0.75,
              bgcolor: isHighlighted ? (theme) => alpha(theme.palette.primary.main, 0.04) : 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              },
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
        );
      })}
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
                <Tooltip title={selectedTransactionsMixed ? 'Pilih transaksi dengan jenis yang sama untuk menghubungkan RAB' : ''}>
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      disabled={selectedTransactionsMixed}
                      onClick={() => rabTransactionLink.openForTransactions(selectedTxIds)}
                      sx={{ borderRadius: 2, textTransform: 'none', bgcolor: 'background.paper' }}
                    >
                      Hubungkan RAB
                    </Button>
                  </span>
                </Tooltip>
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
            {/* Quick filter chips for mobile & tablet */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 0.75, flexWrap: 'wrap', mb: 1.5, px: 0.5 }}>
              <Chip
                label="Semua Jenis"
                size="small"
                clickable
                color={filterJenis === 'semua' ? 'primary' : 'default'}
                variant={filterJenis === 'semua' ? 'filled' : 'outlined'}
                onClick={() => setFilterJenis('semua')}
                sx={{ fontWeight: 600, height: 32 }}
              />
              <Chip
                label="Pemasukan"
                size="small"
                clickable
                color={filterJenis === 'pendapatan' ? 'success' : 'default'}
                variant={filterJenis === 'pendapatan' ? 'filled' : 'outlined'}
                onClick={() => setFilterJenis(filterJenis === 'pendapatan' ? 'semua' : 'pendapatan')}
                sx={{ fontWeight: 600, height: 32 }}
              />
              <Chip
                label="Pengeluaran"
                size="small"
                clickable
                color={filterJenis === 'pengeluaran' ? 'error' : 'default'}
                variant={filterJenis === 'pengeluaran' ? 'filled' : 'outlined'}
                onClick={() => setFilterJenis(filterJenis === 'pengeluaran' ? 'semua' : 'pengeluaran')}
                sx={{ fontWeight: 600, height: 32 }}
              />
              <Chip
                label={filterRabLink === 'linked' ? '✓ Terhubung RAB' : 'RAB Terhubung'}
                size="small"
                clickable
                color={filterRabLink === 'linked' ? 'primary' : 'default'}
                variant={filterRabLink === 'linked' ? 'filled' : 'outlined'}
                onClick={() => setFilterRabLink(filterRabLink === 'linked' ? 'semua' : 'linked')}
                sx={{ fontWeight: 600, height: 32 }}
              />
              <Chip
                label={filterRabLink === 'unlinked' ? '⚠ Belum ke RAB' : 'Belum Terhubung'}
                size="small"
                clickable
                color={filterRabLink === 'unlinked' ? 'warning' : 'default'}
                variant={filterRabLink === 'unlinked' ? 'filled' : 'outlined'}
                onClick={() => setFilterRabLink(filterRabLink === 'unlinked' ? 'semua' : 'unlinked')}
                sx={{ fontWeight: 600, height: 32 }}
              />
            </Box>

            <Box sx={{ display: { xs: 'flex', md: 'none' }, flex: 1, minHeight: 0, flexDirection: 'column', gap: 1, overflowY: 'auto', pr: 0.5, pb: 2 }}>
                {displayedTransactions.length === 0 ? (
                  <EmptyState
                    icon={<AccountBalanceIcon />}
                    message={ledgerEmptyMessage}
                    sx={{ py: 6 }}
                  />
                ) : (
                  pagedTransactions.map((tx) => {
                    const isExpanded = expandedMobileTxIds.has(tx._id);
                    return (
                      <Card
                        key={tx._id}
                        variant="outlined"
                        sx={{
                          flexShrink: 0,
                          borderRadius: 2.5,
                          borderColor: 'divider',
                          transition: 'all 0.15s ease',
                          boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        }}
                      >
                        {/* Compact Row Header (Clickable) */}
                        <Box
                          onClick={() => toggleExpandMobileTx(tx._id)}
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
                            <Checkbox
                              size="small"
                              checked={selectedTxIds.includes(tx._id)}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleSelectTx(tx._id)}
                              slotProps={{ input: { 'aria-label': `Pilih transaksi ${tx.keterangan || tx.kategori}` } }}
                              sx={{ p: 0.5, mr: 0.25, flexShrink: 0 }}
                            />
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                                flexShrink: 0,
                              }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  lineHeight: 1.2,
                                }}
                              >
                                {tx.kategori}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateLong(tx.tanggal)}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 800,
                                color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tx.jenis === 'pendapatan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                            </Typography>
                            <IconButton
                              size="small"
                              aria-label={isExpanded ? `Tutup detail transaksi ${tx.kategori}` : `Buka detail transaksi ${tx.kategori}`}
                              sx={{ width: 44, height: 44 }}
                            >
                              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                        </Box>

                        {/* Expanded Details */}
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Divider />
                          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.015) }}>
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

                            {/* Action Footer Buttons */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 0.5 }}>
                              {(tx.rabItemId || tx.rabCategoryId) && (
                                <IconButton
                                  data-touch-target="44"
                                  size="small"
                                  aria-label={`Putuskan RAB transaksi ${tx.kategori}`}
                                  onClick={() => rabTransactionLink.unlinkFromRab(tx._id)}
                                  sx={(theme) => ({
                                    width: 44,
                                    height: 44,
                                    ...financeActionIconButtonSx(theme, 'error'),
                                  })}
                                >
                                  <LinkOffIcon fontSize="small" />
                                </IconButton>
                              )}
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
                          </Box>
                        </Collapse>
                      </Card>
                    );
                  })
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

            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.75, mb: 1, flexShrink: 0 }}>
              <Chip
                label={filterRabLink === 'linked' ? '✓ Terhubung RAB' : 'RAB Terhubung'}
                size="small"
                clickable
                color={filterRabLink === 'linked' ? 'primary' : 'default'}
                variant={filterRabLink === 'linked' ? 'filled' : 'outlined'}
                onClick={() => setFilterRabLink(filterRabLink === 'linked' ? 'semua' : 'linked')}
                sx={{ fontWeight: 600, height: 32 }}
              />
              <Chip
                label={filterRabLink === 'unlinked' ? '⚠ Belum ke RAB' : 'Belum Terhubung'}
                size="small"
                clickable
                color={filterRabLink === 'unlinked' ? 'warning' : 'default'}
                variant={filterRabLink === 'unlinked' ? 'filled' : 'outlined'}
                onClick={() => setFilterRabLink(filterRabLink === 'unlinked' ? 'semua' : 'unlinked')}
                sx={{ fontWeight: 600, height: 32 }}
              />
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
                    <TableCell sx={{ ...ledgerHeaderCellSx, width: '16%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Box component="span">{t('ledger.columns.quantity')}</Box>
                        <Box component="span">{t('ledger.columns.unitPrice')}</Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ ...ledgerHeaderCellSx, width: '20%' }}>
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
                      <TableCell colSpan={7} align="center">
                        <EmptyState
                          icon={<AccountBalanceIcon />}
                          message={ledgerEmptyMessage}
                          sx={{ py: 2 }}
                        />
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
                            {formatDateShort(tx.tanggal)}
                          </TableCell>
                          <TableCell sx={ledgerRowCellSx}>
                            <Badge
                              label={tx.jenis === 'pendapatan' ? t('common.income') : t('common.expense')}
                              variant="soft"
                              color={tx.jenis === 'pendapatan' ? 'success' : 'error'}
                              sx={{
                                fontSize: '0.75rem',
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
                            title={`${tx.jenis === 'pendapatan' ? '+' : '-'}${formatRupiah(tx.nominal)}`}
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
                                    {(tx.rabItemId || tx.rabCategoryId) && (
                                      <IconButton
                                        size="small"
                                        aria-label={`Putuskan RAB transaksi ${tx.kategori}`}
                                        onClick={() => rabTransactionLink.unlinkFromRab(tx._id)}
                                        sx={(theme) => ({
                                          width: 34,
                                          height: 34,
                                          ...financeActionIconButtonSx(theme, 'error'),
                                        })}
                                      >
                                        <LinkOffIcon fontSize="small" />
                                      </IconButton>
                                    )}
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
                                <Tooltip title={getRabLinkLabel(tx)} arrow placement="top">
                                  <Chip
                                    icon={<LinkIcon />}
                                    label={getRabLinkLabel(tx)}
                                    size="small"
                                    sx={{
                                      alignSelf: 'flex-start',
                                      height: 22,
                                      maxWidth: 240,
                                      borderRadius: 1.5,
                                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      color: 'primary.dark',
                                      fontWeight: 700,
                                      '& .MuiChip-label': {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      },
                                      '& .MuiChip-icon': { color: 'primary.main' },
                                    }}
                                  />
                                </Tooltip>
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
                hideLegend
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
            height={220}
            margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
            hideLegend
          />
          <Box sx={{ width: '100%', maxWidth: 360 }}>
            {renderDistributionBreakdown(240)}
          </Box>
        </DialogContent>
      </Dialog>
      </Box>
  );
}
