'use client';

import { useTheme, alpha, type Theme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import InputAdornment from '@mui/material/InputAdornment';
import useMediaQuery from '@mui/material/useMediaQuery';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import SettingsIcon from '@mui/icons-material/Settings';

import { Controller, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { formatRupiah, formatDateShort } from '@/lib/formatters';
import type { ApiHarvestBatch, ApiStockMutation, StokSummary, ApiBuyer, ApiGrade, ApiLocation, ApiSupplyItem, NewSupplyItem, NewSupplyMutation } from '@/lib/api';
import MasterDataDialog from './MasterDataDialog';
import SupplyItemsView from './SupplyItemsView';
import { useTranslations } from 'next-intl';
import type {
  BatchFormInput,
  BatchFormOutput,
  StockOutFormInput,
  StockOutFormOutput,
} from '../_lib/stockSchemas';
import { PageActionButton, PageHeader, PageShell } from '@/components/shared/page';
import { accentText, softBg, softText, tableHoverBg } from '@/lib/themeColors';
import { computeBatchPerformance } from '@/hooks/useStok';

// ─── Status badge ─────────────────────────────────────────────────
type StockTranslator = ReturnType<typeof useTranslations>;

const StatusChip = ({ status, theme, t }: { status: ApiHarvestBatch['status']; theme: Theme; t: StockTranslator }) => {
  const map = {
    aman: { label: t('status.safe'), color: softBg(theme, 'success', 0.14), text: softText(theme, 'success') },
    menipis: { label: t('status.low'), color: softBg(theme, 'warning', 0.14), text: softText(theme, 'warning') },
    hampir_kadaluarsa: { label: t('status.expiring'), color: softBg(theme, 'error', 0.14), text: softText(theme, 'error') },
    habis: { label: t('status.empty'), color: alpha(theme.palette.grey[500], 0.12), text: theme.palette.text.secondary },
  };
  const s = map[status];
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.color, color: s.text, fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5 }}
    />
  );
};

// ─── Grade badge (free-form strings) ─────────────────────────────
const GRADE_PALETTE = [
  (t: Theme) => ({ bg: t.palette.success.main, text: accentText(t, 'success') }),
  (t: Theme) => ({ bg: t.palette.info.main, text: accentText(t, 'info') }),
  (t: Theme) => ({ bg: t.palette.warning.main, text: accentText(t, 'warning') }),
  (t: Theme) => ({ bg: t.palette.error.main, text: accentText(t, 'error') }),
  (t: Theme) => ({ bg: t.palette.primary.main, text: '#fff' }),
];

function gradeColorIndex(grade: string): number {
  let hash = 0;
  for (let i = 0; i < grade.length; i++) hash += grade.charCodeAt(i);
  return hash % GRADE_PALETTE.length;
}

const GradeChip = ({ grade, theme, t }: { grade: string; theme: Theme; t: StockTranslator }) => {
  const { bg, text } = GRADE_PALETTE[gradeColorIndex(grade)](theme);
  return (
    <Chip
      label={`${t('table.grade')} ${grade}`}
      size="small"
      sx={{ bgcolor: bg, color: text, fontWeight: 800, fontSize: '0.7rem', borderRadius: 1.5 }}
    />
  );
};

// ─── Batch Info Card (Stock Out form) ────────────────────────────
const BatchInfoCard = ({ batch, theme, t }: { batch: ApiHarvestBatch; theme: Theme; t: StockTranslator }) => (
  <Box sx={{
    p: 1.5,
    borderRadius: 2,
    bgcolor: softBg(theme, 'info', 0.08),
    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
    alignItems: 'center',
  }}>
    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'text.primary' }}>
      {batch.batchCode}
    </Typography>
    <GradeChip grade={batch.grade} theme={theme} t={t} />
    <StatusChip status={batch.status} theme={theme} t={t} />
    <Box sx={{ width: '100%', display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
      <Typography variant="caption" color="text.secondary">
        Sisa: <strong>{batch.stokTersisa} kg</strong>
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Expired: <strong>{formatDateShort(batch.estimasiKadaluarsa)}</strong>
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Harga Rencana: <strong>{formatRupiah(batch.hargaJual)}/kg</strong>
      </Typography>
    </Box>
  </Box>
);

interface StokViewProps {
  activeBatches: ApiHarvestBatch[];
  alertBatches: ApiHarvestBatch[];
  backendOnline: boolean;
  batchDialogOpen: boolean;
  batchForm: UseFormReturn<BatchFormInput, unknown, BatchFormOutput>;
  closeConfirmId: string | null;
  filteredMutations: ApiStockMutation[];
  loading: boolean;
  mutFilter: string;
  mutFromDate: string;
  mutToDate: string;
  onBatchSubmit: SubmitHandler<BatchFormOutput>;
  onStockOutSubmit: SubmitHandler<StockOutFormOutput>;
  openAddBatch: () => void;
  onCloseBatch: (id: string) => void;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  onApplyDateFilter: () => void;
  onResetDateFilter: () => void;
  setBatchDialogOpen: (open: boolean) => void;
  setMutFilter: (value: string) => void;
  setMutFromDate: (value: string) => void;
  setMutToDate: (value: string) => void;
  setStockOutDialogOpen: (open: boolean) => void;
  setTab: (tab: number) => void;
  stockOutDialogOpen: boolean;
  stockOutForm: UseFormReturn<StockOutFormInput, unknown, StockOutFormOutput>;
  summary: StokSummary;
  tab: number;
  weatherRiskNote: string;
  buyers: ApiBuyer[];
  stockOutSelectedBatch: ApiHarvestBatch | null;
  batchEstimatedValue: number;
  stockOutTotal: number;
  stockOutHargaDiff: number | null;
  grades: ApiGrade[];
  locations: ApiLocation[];
  gradeDialogOpen: boolean;
  locationDialogOpen: boolean;
  gradeDeleteError: string | null;
  locationDeleteError: string | null;
  setGradeDialogOpen: (open: boolean) => void;
  setLocationDialogOpen: (open: boolean) => void;
  onAddGrade: (nama: string) => Promise<ApiGrade>;
  onRenameGrade: (id: string, nama: string) => Promise<void>;
  onRemoveGrade: (id: string) => Promise<void>;
  onAddLocation: (nama: string) => Promise<ApiLocation>;
  onRenameLocation: (id: string, nama: string) => Promise<void>;
  onRemoveLocation: (id: string) => Promise<void>;
  onClearGradeDeleteError: () => void;
  onClearLocationDeleteError: () => void;
  supplyItems: ApiSupplyItem[];
  supplyLoading: boolean;
  onAddSupplyItem: (payload: NewSupplyItem) => Promise<boolean>;
  onAddSupplyMutation: (payload: NewSupplyMutation) => Promise<boolean>;
}

export default function StokView({
  activeBatches,
  alertBatches,
  backendOnline,
  batchDialogOpen,
  batchForm,
  closeConfirmId,
  filteredMutations,
  loading,
  mutFilter,
  mutFromDate,
  mutToDate,
  onBatchSubmit,
  onStockOutSubmit,
  openAddBatch,
  onCloseBatch,
  onConfirmClose,
  onCancelClose,
  onApplyDateFilter,
  onResetDateFilter,
  setBatchDialogOpen,
  setMutFilter,
  setMutFromDate,
  setMutToDate,
  setStockOutDialogOpen,
  setTab,
  stockOutDialogOpen,
  stockOutForm,
  summary,
  tab,
  weatherRiskNote,
  buyers,
  stockOutSelectedBatch,
  batchEstimatedValue,
  stockOutTotal,
  stockOutHargaDiff,
  grades,
  locations,
  gradeDialogOpen,
  locationDialogOpen,
  gradeDeleteError,
  locationDeleteError,
  setGradeDialogOpen,
  setLocationDialogOpen,
  onAddGrade,
  onRenameGrade,
  onRemoveGrade,
  onAddLocation,
  onRenameLocation,
  onRemoveLocation,
  onClearGradeDeleteError,
  onClearLocationDeleteError,
  supplyItems,
  supplyLoading,
  onAddSupplyItem,
  onAddSupplyMutation,
}: StokViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const t = useTranslations('Stock');

  return (
    <PageShell sx={{ minHeight: '100dvh' }}>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { commodity: t('commodity'), location: t('location') })}
        meta={!backendOnline ? (
          <Chip
            label={t('offlineMode')}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.warning.main, 0.12), color: theme.palette.warning.main, fontWeight: 600, fontSize: '0.65rem' }}
          />
        ) : undefined}
        actions={(
          <>
            <PageActionButton data-guide-target="stock-stock-out" variant="outlined" startIcon={<LocalShippingIcon />} onClick={() => setStockOutDialogOpen(true)}>
              {t('buttons.stockOut')}
            </PageActionButton>
            <PageActionButton data-guide-target="stock-add-batch" variant="contained" startIcon={<AddIcon />} onClick={openAddBatch}>
              {t('buttons.addBatch')}
            </PageActionButton>
          </>
        )}
      />

      {/* Alert kadaluarsa */}
      {alertBatches.length > 0 && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3, borderRadius: 3 }}>
          {t.rich('alerts.expired', { 
            count: alertBatches.length, 
            list: alertBatches.map((b) => b.batchCode).join(', '),
            strong: (chunks) => <strong>{chunks}</strong> 
          })}
        </Alert>
      )}

      {weatherRiskNote && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          {weatherRiskNote}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid data-guide-target="stock-summary" container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: t('kpi.ready'), value: `${summary.totalStokSiapJual.toLocaleString()} kg`, icon: <InventoryIcon />, color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.12) },
          { label: t('kpi.sold'), value: `${summary.stokTerjualMingguIni.toLocaleString()} kg`, icon: <LocalShippingIcon />, color: theme.palette.info.main, bg: alpha(theme.palette.info.main, 0.12) },
          { label: t('kpi.value'), value: formatRupiah(summary.estimasiNilaiStok), icon: <MonetizationOnIcon />, color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.12) },
          { label: t('kpi.alert'), value: `${summary.batchHampirKadaluarsa} batch`, icon: <WarningAmberIcon />, color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.12) },
        ].map((kpi) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.label}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                  {kpi.icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>{kpi.label}</Typography>
                  <Typography variant="h6" sx={{ lineHeight: 1.2, color: kpi.color, fontWeight: 800 }}>{loading ? '...' : kpi.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card data-guide-target="stock-tabs" sx={{ borderRadius: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label={t('tabs.batches')} />
          <Tab label={t('tabs.mutations')} />
          <Tab label={t('tabs.supply')} />
        </Tabs>

        {/* Tab 1: Batch List */}
        {tab === 0 && (
          <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {isMobile ? (
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading ? (
                  <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 6 }}>
                    {t('table.loading')}
                  </Typography>
                ) : activeBatches.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">{t('table.empty')}</Typography>
                    <Button size="small" onClick={openAddBatch} sx={{ mt: 1 }}>+ {t('table.addFirst')}</Button>
                  </Box>
                ) : (
                  activeBatches.map((b) => (
                    <Card key={b._id} variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                            {b.batchCode}
                          </Typography>
                          <StatusChip status={b.status} theme={theme} t={t} />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1.25, mb: 1.5, alignItems: 'center' }}>
                          <GradeChip grade={b.grade} theme={theme} t={t} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {b.stokTersisa} kg / {b.beratMasuk} kg
                          </Typography>
                        </Box>

                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {t('table.price')}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatRupiah(b.hargaJual)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {t('table.expiry')}
                            </Typography>
                            <Typography variant="body2">
                              {formatDateShort(b.estimasiKadaluarsa)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {t('table.harvestDate')}
                            </Typography>
                            <Typography variant="body2">
                              {formatDateShort(b.tanggalPanen)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {t('table.location')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {b.lokasiPenyimpanan}
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* BEP Performance Panel */}
                        {(() => {
                          const perf = computeBatchPerformance({ hargaModal: b.hargaModal, beratMasuk: b.beratMasuk, stokTersisa: b.stokTersisa, hargaJual: b.hargaJual });
                          if (perf.bepKg === null) return (
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
                              {t('batchPerformance.hargaJualBelumDiisi')}
                            </Typography>
                          );
                          return (
                            <Box sx={{ mb: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {t('batchPerformance.bepProgress')}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: perf.sudahBalikModal ? 'success.main' : 'text.secondary' }}>
                                  {perf.sudahBalikModal
                                    ? t('batchPerformance.sudahBalikModal')
                                    : t('batchPerformance.sisaBep', { kg: perf.sisaBepKg.toFixed(1) })}
                                </Typography>
                              </Box>
                              <Tooltip title={`${t('batchPerformance.sudahTerjual')}: ${perf.sudahTerjual} kg / ${t('batchPerformance.bepKg')}: ${perf.bepKg.toFixed(1)} kg`}>
                                <LinearProgress
                                  variant="determinate"
                                  value={perf.bepProgress * 100}
                                  color={perf.sudahBalikModal ? 'success' : 'primary'}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Tooltip>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {t('batchPerformance.estimasiLaba')}: <strong>{formatRupiah(perf.estimasiLabaJikaHabis)}</strong>
                              </Typography>
                            </Box>
                          );
                        })()}

                        <Divider sx={{ mb: 1.5 }} />

                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            startIcon={<LocalShippingIcon />}
                            onClick={() => { stockOutForm.setValue('batchId', b._id); setStockOutDialogOpen(true); }}
                            sx={{ borderRadius: 2, height: 40, textTransform: 'none', fontWeight: 600 }}
                          >
                            {t('buttons.stockOut')}
                          </Button>
                          <Button
                            color="warning"
                            variant="outlined"
                            size="small"
                            onClick={() => onCloseBatch(b._id)}
                            sx={{ borderRadius: 2, minWidth: 44, width: 44, height: 40 }}
                            aria-label="Tutup batch"
                          >
                            <InventoryIcon fontSize="small" />
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {[t('table.batchId'), t('table.harvestDate'), t('table.grade'), t('table.initialWeight'), t('table.remainingWeight'), t('table.price'), t('batchPerformance.bepProgress'), t('table.location'), t('table.expiry'), t('table.status'), t('table.action')].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', bgcolor: 'background.paper' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6 }}>{t('table.loading')}</TableCell></TableRow>
                    ) : activeBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 8 }}>
                          <Typography variant="body2" color="text.secondary">{t('table.empty')}</Typography>
                          <Button size="small" onClick={openAddBatch} sx={{ mt: 1 }}>+ {t('table.addFirst')}</Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeBatches.map((b) => (
                        <TableRow key={b._id} sx={{ '&:hover': { bgcolor: tableHoverBg(theme) } }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>{b.batchCode}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateShort(b.tanggalPanen)}</TableCell>
                          <TableCell><GradeChip grade={b.grade} theme={theme} t={t} /></TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{b.beratMasuk} kg</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: b.stokTersisa < b.beratMasuk * 0.2 ? softText(theme, 'error') : softText(theme, 'success') }}>
                            {b.stokTersisa} kg
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatRupiah(b.hargaJual)}</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            {(() => {
                              const perf = computeBatchPerformance({ hargaModal: b.hargaModal, beratMasuk: b.beratMasuk, stokTersisa: b.stokTersisa, hargaJual: b.hargaJual });
                              if (perf.bepKg === null) return <Typography variant="caption" color="text.disabled">—</Typography>;
                              return (
                                <Tooltip title={`${t('batchPerformance.sudahTerjual')}: ${perf.sudahTerjual} kg / BEP: ${perf.bepKg.toFixed(1)} kg`}>
                                  <Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={perf.bepProgress * 100}
                                      color={perf.sudahBalikModal ? 'success' : 'primary'}
                                      sx={{ height: 5, borderRadius: 3, mb: 0.5 }}
                                    />
                                    <Typography variant="caption" color={perf.sudahBalikModal ? 'success.main' : 'text.secondary'}>
                                      {perf.sudahBalikModal ? '✓' : `${perf.sisaBepKg.toFixed(1)} kg`}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })()}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{b.lokasiPenyimpanan}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{formatDateShort(b.estimasiKadaluarsa)}</TableCell>
                          <TableCell><StatusChip status={b.status} theme={theme} t={t} /></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size="small" aria-label="Ship batch" onClick={() => { stockOutForm.setValue('batchId', b._id); setStockOutDialogOpen(true); }}
                                sx={{ color: softText(theme, 'info'), bgcolor: softBg(theme, 'info', 0.14), borderRadius: 1.5, '&:hover': { bgcolor: theme.palette.info.main, color: accentText(theme, 'info') } }}>
                                <LocalShippingIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" aria-label="Tutup batch" onClick={() => onCloseBatch(b._id)}
                                sx={{ color: softText(theme, 'warning'), bgcolor: softBg(theme, 'warning', 0.14), borderRadius: 1.5, '&:hover': { bgcolor: theme.palette.warning.main, color: accentText(theme, 'warning') } }}>
                                <InventoryIcon fontSize="small" />
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
        )}

        {/* Tab 2: Mutasi */}
        {tab === 1 && (
          <CardContent sx={{ p: isMobile ? 2 : 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>{t('mutationTable.filterGrade')}</InputLabel>
                <Select value={mutFilter} label={t('mutationTable.filterGrade')} onChange={(e) => setMutFilter(e.target.value)}>
                  <MenuItem value="semua">{t('mutationTable.allGrades')}</MenuItem>
                  {grades.map((g) => (
                    <MenuItem key={g.id} value={g.nama}>{g.nama}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                type="date"
                label="Dari Tanggal"
                size="small"
                value={mutFromDate}
                onChange={(e) => setMutFromDate(e.target.value)}
                sx={{ minWidth: 150 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                type="date"
                label="Sampai Tanggal"
                size="small"
                value={mutToDate}
                onChange={(e) => setMutToDate(e.target.value)}
                sx={{ minWidth: 150 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Button variant="contained" size="small" onClick={onApplyDateFilter} sx={{ height: 40, borderRadius: 2, px: 2 }}>
                Terapkan
              </Button>
              {(mutFromDate || mutToDate) && (
                <Button variant="text" size="small" onClick={onResetDateFilter} sx={{ height: 40, borderRadius: 2, color: 'text.secondary' }}>
                  Reset
                </Button>
              )}
            </Box>

            {isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                {filteredMutations.length === 0 ? (
                  <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 6 }}>
                    Belum ada data mutasi.
                  </Typography>
                ) : (
                  filteredMutations.map((m) => (
                    <Card key={m._id} variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateShort(m.tanggal)}
                          </Typography>
                          <Chip
                            label={m.tipe === 'masuk' ? t('mutationTable.in') : t('mutationTable.out')}
                            size="small"
                            sx={{
                              bgcolor: m.tipe === 'masuk' ? softBg(theme, 'success', 0.14) : softBg(theme, 'error', 0.14),
                              color: m.tipe === 'masuk' ? softText(theme, 'success') : softText(theme, 'error'),
                              fontWeight: 700,
                              borderRadius: 1.5,
                              fontSize: '0.72rem'
                            }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                            {m.batchCode}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {m.berat} kg
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                          {m.tujuan && (
                            <Typography variant="caption" color="text.secondary">
                              <strong>Tujuan:</strong> {m.tujuan}
                            </Typography>
                          )}
                          {m.catatan && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              <strong>Catatan:</strong> {m.catatan}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {[t('mutationTable.date'), t('mutationTable.batch'), t('mutationTable.type'), t('mutationTable.weight'), t('mutationTable.target'), t('mutationTable.note')].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', bgcolor: 'background.paper' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMutations.map((m) => (
                      <TableRow key={m._id} sx={{ '&:hover': { bgcolor: tableHoverBg(theme) } }}>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateShort(m.tanggal)}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>{m.batchCode}</TableCell>
                        <TableCell>
                          <Chip
                            label={m.tipe === 'masuk' ? t('mutationTable.in') : t('mutationTable.out')}
                            size="small"
                            sx={{ bgcolor: m.tipe === 'masuk' ? softBg(theme, 'success', 0.14) : softBg(theme, 'error', 0.14), color: m.tipe === 'masuk' ? softText(theme, 'success') : softText(theme, 'error'), fontWeight: 700, borderRadius: 1.5 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.berat} kg</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{m.tujuan || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 200 }}>
                          <Typography variant="caption" noWrap sx={{ display: 'block' }}>{m.catatan || '—'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        )}

        {/* Tab 3: Bahan Pendukung */}
        {tab === 2 && (
          <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <SupplyItemsView
              items={supplyItems}
              loading={supplyLoading}
              onAddItem={onAddSupplyItem}
              onAddMutation={onAddSupplyMutation}
              t={(key, values) => {
                const result = t(key as Parameters<typeof t>[0]);
                if (!values || typeof result !== 'string') return result as string;
                return Object.entries(values).reduce(
                  (text, [k, v]) => text.replace(`{${k}}`, String(v)),
                  result,
                );
              }}
            />
          </CardContent>
        )}
      </Card>

      {/* ─── Dialog / Bottom Sheet: Tambah Batch ─── */}
      {isMobile ? (
        <SwipeableDrawer
          anchor="bottom"
          open={batchDialogOpen}
          onClose={() => setBatchDialogOpen(false)}
          onOpen={() => {}}
          disableDiscovery={false}
          swipeAreaWidth={24}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '85vh',
                minHeight: '50vh',
                height: 'auto',
                backgroundColor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', p: 2.5 }}>
            {/* Drag Handle */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pb: 2, flexShrink: 0 }}>
              <Box aria-hidden sx={{ width: 40, height: 4, borderRadius: 999, backgroundColor: 'divider' }} />
            </Box>

            {/* Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
                {t('dialogs.addTitle')}
              </Typography>
              <IconButton size="small" onClick={() => setBatchDialogOpen(false)}><CloseIcon /></IconButton>
            </Box>

            {/* Scrollable Form Body */}
            <Box sx={{ overflowY: 'auto', flex: 1, pr: 0.5 }}>
              <Box component="form" onSubmit={batchForm.handleSubmit(onBatchSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller name="tanggalPanen" control={batchForm.control} render={({ field }) => (
                      <TextField {...field} type="date" label={t('dialogs.fields.date')} fullWidth error={!!batchForm.formState.errors.tanggalPanen} slotProps={{ inputLabel: { shrink: true } }} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <Controller name="grade" control={batchForm.control} render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>{t('dialogs.fields.grade')}</InputLabel>
                          <Select {...field} label={t('dialogs.fields.grade')}>
                            {grades.map((g) => (
                              <MenuItem key={g.id} value={g.nama}>{g.nama}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )} />
                      <IconButton size="small" onClick={() => setGradeDialogOpen(true)} sx={{ mt: 1, flexShrink: 0 }}>
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller name="beratMasuk" control={batchForm.control} render={({ field }) => (
                      <TextField {...field} type="number" label={t('dialogs.fields.weight')} fullWidth error={!!batchForm.formState.errors.beratMasuk} helperText={batchForm.formState.errors.beratMasuk?.message} slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <Controller name="lokasiPenyimpanan" control={batchForm.control} render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>{t('dialogs.fields.location')}</InputLabel>
                          <Select {...field} label={t('dialogs.fields.location')}>
                            {locations.map((l) => (
                              <MenuItem key={l.id} value={l.nama}>{l.nama}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )} />
                      <IconButton size="small" onClick={() => setLocationDialogOpen(true)} sx={{ mt: 1, flexShrink: 0 }}>
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller name="hargaModal" control={batchForm.control} render={({ field }) => (
                      <TextField {...field} type="number" label={t('dialogs.fields.cost')} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> }, htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller name="hargaJual" control={batchForm.control} render={({ field }) => (
                      <TextField {...field} type="number" label={t('dialogs.fields.price')} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> }, htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} />
                    )} />
                  </Grid>
                  {batchEstimatedValue > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ px: 1.5, py: 1, bgcolor: softBg(theme, 'success', 0.08), borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                        <Typography variant="caption" color="text.secondary">
                          📦 Estimasi Nilai: <strong style={{ color: softText(theme, 'success') }}>{formatRupiah(batchEstimatedValue)}</strong>
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <Controller name="estimasiKadaluarsa" control={batchForm.control} render={({ field }) => (
                      <TextField {...field} type="date" label={t('dialogs.fields.expiry')} fullWidth error={!!batchForm.formState.errors.estimasiKadaluarsa} helperText="Terisi otomatis +14 hari dari tanggal masuk" slotProps={{ inputLabel: { shrink: true } }} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller name="catatan" control={batchForm.control} render={({ field }) => (
                      <TextField {...field} label={t('dialogs.fields.note')} multiline rows={2} fullWidth />
                    )} />
                  </Grid>
                </Grid>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', gap: 2, pb: 2 }}>
                  <Button variant="outlined" color="inherit" onClick={() => setBatchDialogOpen(false)} sx={{ flex: 1, borderRadius: 2, height: 44, textTransform: 'none', fontWeight: 600 }}>{t('dialogs.buttons.cancel')}</Button>
                  <Button type="submit" variant="contained" sx={{ flex: 2, borderRadius: 2, height: 44, textTransform: 'none', fontWeight: 700 }}>{t('dialogs.buttons.save')}</Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </SwipeableDrawer>
      ) : (
        <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>{t('dialogs.addTitle')}</Typography>
              <IconButton size="small" onClick={() => setBatchDialogOpen(false)}><CloseIcon /></IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: '12px !important' }}>
            <Box component="form" onSubmit={batchForm.handleSubmit(onBatchSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="tanggalPanen" control={batchForm.control} render={({ field }) => (
                    <TextField {...field} type="date" label={t('dialogs.fields.date')} fullWidth error={!!batchForm.formState.errors.tanggalPanen} slotProps={{ inputLabel: { shrink: true } }} />
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <Controller name="grade" control={batchForm.control} render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>{t('dialogs.fields.grade')}</InputLabel>
                        <Select {...field} label={t('dialogs.fields.grade')}>
                          {grades.map((g) => (
                            <MenuItem key={g.id} value={g.nama}>{g.nama}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )} />
                    <IconButton size="small" onClick={() => setGradeDialogOpen(true)} sx={{ mt: 1, flexShrink: 0 }}>
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="beratMasuk" control={batchForm.control} render={({ field }) => (
                    <TextField {...field} type="number" label={t('dialogs.fields.weight')} fullWidth error={!!batchForm.formState.errors.beratMasuk} helperText={batchForm.formState.errors.beratMasuk?.message} />
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <Controller name="lokasiPenyimpanan" control={batchForm.control} render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>{t('dialogs.fields.location')}</InputLabel>
                        <Select {...field} label={t('dialogs.fields.location')}>
                          {locations.map((l) => (
                            <MenuItem key={l.id} value={l.nama}>{l.nama}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )} />
                    <IconButton size="small" onClick={() => setLocationDialogOpen(true)} sx={{ mt: 1, flexShrink: 0 }}>
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="hargaModal" control={batchForm.control} render={({ field }) => (
                    <TextField {...field} type="number" label={t('dialogs.fields.cost')} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> } }} />
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller name="hargaJual" control={batchForm.control} render={({ field }) => (
                    <TextField {...field} type="number" label={t('dialogs.fields.price')} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> } }} />
                  )} />
                </Grid>
                {batchEstimatedValue > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ px: 1.5, py: 1, bgcolor: softBg(theme, 'success', 0.08), borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                      <Typography variant="caption" color="text.secondary">
                        📦 Estimasi Nilai: <strong style={{ color: softText(theme, 'success') }}>{formatRupiah(batchEstimatedValue)}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                )}
                <Grid size={{ xs: 12 }}>
                  <Controller name="estimasiKadaluarsa" control={batchForm.control} render={({ field }) => (
                    <TextField {...field} type="date" label={t('dialogs.fields.expiry')} fullWidth error={!!batchForm.formState.errors.estimasiKadaluarsa} helperText="Terisi otomatis +14 hari dari tanggal masuk" slotProps={{ inputLabel: { shrink: true } }} />
                  )} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller name="catatan" control={batchForm.control} render={({ field }) => (
                    <TextField {...field} label={t('dialogs.fields.note')} multiline rows={2} fullWidth />
                  )} />
                </Grid>
              </Grid>
              <Divider />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" color="inherit" onClick={() => setBatchDialogOpen(false)} sx={{ flex: 1, borderRadius: 8 }}>{t('dialogs.buttons.cancel')}</Button>
                <Button type="submit" variant="contained" sx={{ flex: 2, borderRadius: 8 }}>{t('dialogs.buttons.save')}</Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Dialog / Bottom Sheet: Catat Keluar Stok ─── */}
      {isMobile ? (
        <SwipeableDrawer
          anchor="bottom"
          open={stockOutDialogOpen}
          onClose={() => setStockOutDialogOpen(false)}
          onOpen={() => {}}
          disableDiscovery={false}
          swipeAreaWidth={24}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '85vh',
                minHeight: '40vh',
                height: 'auto',
                backgroundColor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', p: 2.5 }}>
            {/* Drag Handle */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pb: 2, flexShrink: 0 }}>
              <Box aria-hidden sx={{ width: 40, height: 4, borderRadius: 999, backgroundColor: 'divider' }} />
            </Box>

            {/* Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
                {t('dialogs.outTitle')}
              </Typography>
              <IconButton size="small" onClick={() => setStockOutDialogOpen(false)}><CloseIcon /></IconButton>
            </Box>

            {/* Scrollable Form Body */}
            <Box sx={{ overflowY: 'auto', flex: 1, pr: 0.5 }}>
              <Box component="form" onSubmit={stockOutForm.handleSubmit(onStockOutSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                <Controller name="batchId" control={stockOutForm.control} render={({ field }) => (
                  <FormControl fullWidth error={!!stockOutForm.formState.errors.batchId}>
                    <InputLabel>{t('dialogs.fields.batch')}</InputLabel>
                    <Select {...field} label={t('dialogs.fields.batch')}>
                      {activeBatches.map((b) => (
                        <MenuItem key={b._id} value={b._id}>{b.batchCode} — {b.stokTersisa} kg</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )} />
                {stockOutSelectedBatch && (
                  <BatchInfoCard batch={stockOutSelectedBatch} theme={theme} t={t} />
                )}
                <Controller name="berat" control={stockOutForm.control} render={({ field }) => (
                  <TextField {...field} type="number" label={t('dialogs.fields.outWeight')} fullWidth error={!!stockOutForm.formState.errors.berat} helperText={stockOutForm.formState.errors.berat?.message} slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} />
                )} />
                <Controller name="hargaRealisasi" control={stockOutForm.control} render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Harga Realisasi (opsional)"
                    fullWidth
                    slotProps={{
                      input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> },
                      htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                      formHelperText: { sx: { color: stockOutHargaDiff === null || stockOutHargaDiff === 0 ? 'text.secondary' : stockOutHargaDiff < 0 ? softText(theme, 'warning') : softText(theme, 'success') } },
                    }}
                    helperText={
                      stockOutHargaDiff !== null && stockOutHargaDiff !== 0
                        ? stockOutHargaDiff < 0
                          ? `↓ ${formatRupiah(Math.abs(stockOutHargaDiff))}/kg di bawah harga rencana`
                          : `↑ ${formatRupiah(stockOutHargaDiff)}/kg di atas harga rencana`
                        : 'Terisi otomatis dari harga rencana batch'
                    }
                  />
                )} />
                <Controller name="tujuan" control={stockOutForm.control} render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>{t('dialogs.fields.target')}</InputLabel>
                    <Select {...field} label={t('dialogs.fields.target')}>
                      <MenuItem value="Pasar Lokal">{t('dialogs.options.market')}</MenuItem>
                      <MenuItem value="Distributor">{t('dialogs.options.distributor')}</MenuItem>
                      <MenuItem value="Restoran">{t('dialogs.options.restaurant')}</MenuItem>
                      <MenuItem value="Lainnya">{t('dialogs.options.other')}</MenuItem>
                    </Select>
                  </FormControl>
                )} />
                <Controller name="namaPembeli" control={stockOutForm.control} render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    options={buyers.map((b) => b.nama)}
                    value={field.value ?? ''}
                    onChange={(_, newValue) => field.onChange(typeof newValue === 'string' ? newValue : (newValue ?? ''))}
                    onInputChange={(_, newValue) => field.onChange(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Nama Pembeli (opsional)" helperText="Pilih dari daftar atau ketik nama baru" />
                    )}
                  />
                )} />
                <Controller name="tanggal" control={stockOutForm.control} render={({ field }) => (
                  <TextField {...field} type="date" label={t('dialogs.fields.transDate')} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                )} />
                <Controller name="catatan" control={stockOutForm.control} render={({ field }) => (
                  <TextField {...field} label={t('dialogs.fields.note')} multiline rows={2} fullWidth />
                )} />
                {stockOutTotal > 0 && (
                  <Box sx={{ px: 1.5, py: 1, bgcolor: softBg(theme, 'warning', 0.08), borderRadius: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                    <Typography variant="caption" color="text.secondary">
                      💰 Total Transaksi: <strong style={{ color: softText(theme, 'warning') }}>{formatRupiah(stockOutTotal)}</strong>
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 2, pb: 2, mt: 1 }}>
                  <Button variant="outlined" color="inherit" onClick={() => setStockOutDialogOpen(false)} sx={{ flex: 1, borderRadius: 2, height: 44, textTransform: 'none', fontWeight: 600 }}>{t('dialogs.buttons.cancel')}</Button>
                  <Button type="submit" variant="contained" color="error" sx={{ flex: 2, borderRadius: 2, height: 44, textTransform: 'none', fontWeight: 700 }}>{t('dialogs.buttons.submit')}</Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </SwipeableDrawer>
      ) : (
        <Dialog open={stockOutDialogOpen} onClose={() => setStockOutDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>{t('dialogs.outTitle')}</Typography>
              <IconButton size="small" onClick={() => setStockOutDialogOpen(false)}><CloseIcon /></IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: '12px !important' }}>
            <Box component="form" onSubmit={stockOutForm.handleSubmit(onStockOutSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Controller name="batchId" control={stockOutForm.control} render={({ field }) => (
                <FormControl fullWidth error={!!stockOutForm.formState.errors.batchId}>
                  <InputLabel>{t('dialogs.fields.batch')}</InputLabel>
                  <Select {...field} label={t('dialogs.fields.batch')}>
                    {activeBatches.map((b) => (
                      <MenuItem key={b._id} value={b._id}>{b.batchCode} — {b.stokTersisa} kg</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )} />
              {stockOutSelectedBatch && (
                <BatchInfoCard batch={stockOutSelectedBatch} theme={theme} t={t} />
              )}
              <Controller name="berat" control={stockOutForm.control} render={({ field }) => (
                <TextField {...field} type="number" label={t('dialogs.fields.outWeight')} fullWidth error={!!stockOutForm.formState.errors.berat} helperText={stockOutForm.formState.errors.berat?.message} />
              )} />
              <Controller name="hargaRealisasi" control={stockOutForm.control} render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Harga Realisasi (opsional)"
                  fullWidth
                  slotProps={{
                    input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> },
                    formHelperText: { sx: { color: stockOutHargaDiff === null || stockOutHargaDiff === 0 ? 'text.secondary' : stockOutHargaDiff < 0 ? softText(theme, 'warning') : softText(theme, 'success') } },
                  }}
                  helperText={
                    stockOutHargaDiff !== null && stockOutHargaDiff !== 0
                      ? stockOutHargaDiff < 0
                        ? `↓ ${formatRupiah(Math.abs(stockOutHargaDiff))}/kg di bawah harga rencana`
                        : `↑ ${formatRupiah(stockOutHargaDiff)}/kg di atas harga rencana`
                      : 'Terisi otomatis dari harga rencana batch'
                  }
                />
              )} />
              <Controller name="tujuan" control={stockOutForm.control} render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>{t('dialogs.fields.target')}</InputLabel>
                  <Select {...field} label={t('dialogs.fields.target')}>
                    <MenuItem value="Pasar Lokal">{t('dialogs.options.market')}</MenuItem>
                    <MenuItem value="Distributor">{t('dialogs.options.distributor')}</MenuItem>
                    <MenuItem value="Restoran">{t('dialogs.options.restaurant')}</MenuItem>
                    <MenuItem value="Lainnya">{t('dialogs.options.other')}</MenuItem>
                  </Select>
                </FormControl>
              )} />
              <Controller name="namaPembeli" control={stockOutForm.control} render={({ field }) => (
                <Autocomplete
                  freeSolo
                  options={buyers.map((b) => b.nama)}
                  value={field.value ?? ''}
                  onChange={(_, newValue) => field.onChange(typeof newValue === 'string' ? newValue : (newValue ?? ''))}
                  onInputChange={(_, newValue) => field.onChange(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Nama Pembeli (opsional)" helperText="Pilih dari daftar atau ketik nama baru" />
                  )}
                />
              )} />
              <Controller name="tanggal" control={stockOutForm.control} render={({ field }) => (
                <TextField {...field} type="date" label={t('dialogs.fields.transDate')} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              )} />
              <Controller name="catatan" control={stockOutForm.control} render={({ field }) => (
                <TextField {...field} label={t('dialogs.fields.note')} multiline rows={2} fullWidth />
              )} />
              {stockOutTotal > 0 && (
                <Box sx={{ px: 1.5, py: 1, bgcolor: softBg(theme, 'warning', 0.08), borderRadius: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                  <Typography variant="caption" color="text.secondary">
                    💰 Total Transaksi: <strong style={{ color: softText(theme, 'warning') }}>{formatRupiah(stockOutTotal)}</strong>
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" color="inherit" onClick={() => setStockOutDialogOpen(false)} sx={{ flex: 1, borderRadius: 8 }}>{t('dialogs.buttons.cancel')}</Button>
                <Button type="submit" variant="contained" color="error" sx={{ flex: 2, borderRadius: 8 }}>{t('dialogs.buttons.submit')}</Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Dialog Konfirmasi Tutup Batch ─── */}
      <Dialog
        open={closeConfirmId !== null}
        onClose={onCancelClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
              Tutup Batch?
            </Typography>
            <IconButton size="small" onClick={onCancelClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Typography variant="body2" color="text.secondary">
            Batch akan ditandai sebagai <strong>Habis</strong> dan tidak dapat diaktifkan kembali.
            Seluruh riwayat mutasi tetap tersimpan untuk keperluan traceability.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={onCancelClose}
              sx={{ flex: 1, borderRadius: 8 }}
            >
              Batal
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={onConfirmClose}
              sx={{ flex: 1, borderRadius: 8 }}
            >
              Ya, Tutup Batch
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ─── Grade Master Data Dialog ─── */}
      <MasterDataDialog
        open={gradeDialogOpen}
        onClose={() => setGradeDialogOpen(false)}
        title="Kelola Grade"
        items={grades}
        onAdd={onAddGrade}
        onRename={onRenameGrade}
        onDelete={onRemoveGrade}
        deleteError={gradeDeleteError}
        onClearDeleteError={onClearGradeDeleteError}
      />

      {/* ─── Location Master Data Dialog ─── */}
      <MasterDataDialog
        open={locationDialogOpen}
        onClose={() => setLocationDialogOpen(false)}
        title="Kelola Lokasi Penyimpanan"
        items={locations}
        onAdd={onAddLocation}
        onRename={onRenameLocation}
        onDelete={onRemoveLocation}
        deleteError={locationDeleteError}
        onClearDeleteError={onClearLocationDeleteError}
      />
    </PageShell>
  );
}
