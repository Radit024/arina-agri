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

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

import { Controller, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { formatRupiah, formatDateShort } from '@/lib/formatters';
import type { ApiHarvestBatch, ApiStockMutation, StokSummary } from '@/lib/api';
import { useTranslations } from 'next-intl';
import type {
  BatchFormInput,
  BatchFormOutput,
  StockOutFormInput,
  StockOutFormOutput,
} from '../_lib/stockSchemas';

// ─── Schemas ──────────────────────────────────────────────────────
// ─── Status badge ─────────────────────────────────────────────────
type StockTranslator = ReturnType<typeof useTranslations>;

const StatusChip = ({ status, theme, t }: { status: ApiHarvestBatch['status']; theme: Theme; t: StockTranslator }) => {
  const map = {
    aman: { label: t('status.safe'), color: alpha(theme.palette.success.main, 0.12), text: theme.palette.success.main },
    menipis: { label: t('status.low'), color: alpha(theme.palette.warning.main, 0.12), text: theme.palette.warning.dark },
    hampir_kadaluarsa: { label: t('status.expiring'), color: alpha(theme.palette.error.main, 0.12), text: theme.palette.error.main },
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

// ─── Grade badge ──────────────────────────────────────────────────
const GradeChip = ({ grade, theme, t }: { grade: 'A' | 'B' | 'C'; theme: Theme; t: StockTranslator }) => {
  const map = { A: theme.palette.success.main, B: theme.palette.info.main, C: theme.palette.warning.main };
  return (
    <Chip
      label={`${t('table.grade')} ${grade}`}
      size="small"
      sx={{ bgcolor: map[grade], color: 'white', fontWeight: 800, fontSize: '0.7rem', borderRadius: 1.5 }}
    />
  );
};

interface StokViewProps {
  activeBatches: ApiHarvestBatch[];
  alertBatches: ApiHarvestBatch[];
  backendOnline: boolean;
  batchDialogOpen: boolean;
  batchForm: UseFormReturn<BatchFormInput, unknown, BatchFormOutput>;
  deleteBatch: (id: string) => Promise<void>;
  filteredMutations: ApiStockMutation[];
  loading: boolean;
  mutFilter: string;
  onBatchSubmit: SubmitHandler<BatchFormOutput>;
  onStockOutSubmit: SubmitHandler<StockOutFormOutput>;
  openAddBatch: () => void;
  setBatchDialogOpen: (open: boolean) => void;
  setMutFilter: (value: string) => void;
  setStockOutDialogOpen: (open: boolean) => void;
  setTab: (tab: number) => void;
  stockOutDialogOpen: boolean;
  stockOutForm: UseFormReturn<StockOutFormInput, unknown, StockOutFormOutput>;
  summary: StokSummary;
  tab: number;
  weatherRiskNote: string;
}

export default function StokView({
  activeBatches,
  alertBatches,
  backendOnline,
  batchDialogOpen,
  batchForm,
  deleteBatch,
  filteredMutations,
  loading,
  mutFilter,
  onBatchSubmit,
  onStockOutSubmit,
  openAddBatch,
  setBatchDialogOpen,
  setMutFilter,
  setStockOutDialogOpen,
  setTab,
  stockOutDialogOpen,
  stockOutForm,
  summary,
  tab,
  weatherRiskNote,
}: StokViewProps) {
  const theme = useTheme();
  const t = useTranslations('Stock');

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
            {t('title')}
          </Typography>
          <Box sx={{ typography: 'body2', color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
            {t('subtitle', { commodity: t('commodity'), location: t('location') })}
            {!backendOnline && (
              <Chip label={t('offlineMode')} size="small" sx={{ ml: 1.5, bgcolor: '#fef9c3', color: '#ca8a04', fontWeight: 600, fontSize: '0.65rem' }} />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<LocalShippingIcon />} onClick={() => setStockOutDialogOpen(true)} sx={{ borderRadius: 8 }}>
            {t('buttons.stockOut')}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddBatch} sx={{ borderRadius: 8 }}>
            {t('buttons.addBatch')}
          </Button>
        </Box>
      </Box>

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
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: t('kpi.ready'), value: `${summary.totalStokSiapJual.toLocaleString()} kg`, icon: <InventoryIcon />, color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.12) },
          { label: t('kpi.sold'), value: `${summary.stokTerjualMingguIni.toLocaleString()} kg`, icon: <LocalShippingIcon />, color: theme.palette.info.main, bg: alpha(theme.palette.info.main, 0.12) },
          { label: t('kpi.value'), value: formatRupiah(summary.estimasiNilaiStok), icon: <MonetizationOnIcon />, color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.12) },
          { label: t('kpi.alert'), value: `${summary.batchHampirKadaluarsa} batch`, icon: <WarningAmberIcon />, color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.12) },
        ].map((kpi) => (
          <Grid size={{ xs: 6, md: 3 }} key={kpi.label}>
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
      <Card sx={{ borderRadius: 4 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label={t('tabs.batches')} />
          <Tab label={t('tabs.mutations')} />
        </Tabs>

        {/* Tab 1: Batch List */}
        {tab === 0 && (
          <CardContent sx={{ p: 0 }}>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[t('table.batchId'), t('table.harvestDate'), t('table.grade'), t('table.initialWeight'), t('table.remainingWeight'), t('table.price'), t('table.location'), t('table.expiry'), t('table.status'), t('table.action')].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', bgcolor: 'background.paper' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6 }}>{t('table.loading')}</TableCell></TableRow>
                  ) : activeBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                        <Typography variant="body2" color="text.secondary">{t('table.empty')}</Typography>
                        <Button size="small" onClick={openAddBatch} sx={{ mt: 1 }}>+ {t('table.addFirst')}</Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeBatches.map((b) => (
                      <TableRow key={b._id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>{b.batchCode}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateShort(b.tanggalPanen)}</TableCell>
                        <TableCell><GradeChip grade={b.grade} theme={theme} t={t} /></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{b.beratMasuk} kg</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: b.stokTersisa < b.beratMasuk * 0.2 ? '#dc2626' : '#16a34a' }}>
                          {b.stokTersisa} kg
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatRupiah(b.hargaJual)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{b.lokasiPenyimpanan}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{formatDateShort(b.estimasiKadaluarsa)}</TableCell>
                        <TableCell><StatusChip status={b.status} theme={theme} t={t} /></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" aria-label="Ship batch" onClick={() => { stockOutForm.setValue('batchId', b._id); setStockOutDialogOpen(true); }}
                              sx={{ color: theme.palette.info.main, bgcolor: alpha(theme.palette.info.main, 0.12), borderRadius: 1.5, '&:hover': { bgcolor: theme.palette.info.main, color: 'white' } }}>
                              <LocalShippingIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" aria-label="Delete batch" onClick={() => deleteBatch(b._id)}
                              sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.12), borderRadius: 1.5, '&:hover': { bgcolor: theme.palette.error.main, color: 'white' } }}>
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
        )}

        {/* Tab 2: Mutasi */}
        {tab === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('mutationTable.filterGrade')}</InputLabel>
                <Select value={mutFilter} label={t('mutationTable.filterGrade')} onChange={(e) => setMutFilter(e.target.value)}>
                  <MenuItem value="semua">{t('mutationTable.allGrades')}</MenuItem>
                  <MenuItem value="A">Grade A</MenuItem>
                  <MenuItem value="B">Grade B</MenuItem>
                  <MenuItem value="C">Grade C</MenuItem>
                </Select>
              </FormControl>
            </Box>
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
                    <TableRow key={m._id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateShort(m.tanggal)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>{m.batchCode}</TableCell>
                      <TableCell>
                        <Chip
                          label={m.tipe === 'masuk' ? t('mutationTable.in') : t('mutationTable.out')}
                          size="small"
                          sx={{ bgcolor: m.tipe === 'masuk' ? '#dcfce7' : '#fee2e2', color: m.tipe === 'masuk' ? '#16a34a' : '#dc2626', fontWeight: 700, borderRadius: 1.5 }}
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
          </CardContent>
        )}
      </Card>

      {/* ─── Dialog: Input Batch Panen ─── */}
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
                <Controller name="grade" control={batchForm.control} render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>{t('dialogs.fields.grade')}</InputLabel>
                    <Select {...field} label={t('dialogs.fields.grade')}>
                      <MenuItem value="A">{t('dialogs.options.gradeA')}</MenuItem>
                      <MenuItem value="B">{t('dialogs.options.gradeB')}</MenuItem>
                      <MenuItem value="C">{t('dialogs.options.gradeC')}</MenuItem>
                    </Select>
                  </FormControl>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="beratMasuk" control={batchForm.control} render={({ field }) => (
                  <TextField {...field} type="number" label={t('dialogs.fields.weight')} fullWidth error={!!batchForm.formState.errors.beratMasuk} helperText={batchForm.formState.errors.beratMasuk?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="lokasiPenyimpanan" control={batchForm.control} render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>{t('dialogs.fields.location')}</InputLabel>
                    <Select {...field} label={t('dialogs.fields.location')}>
                      <MenuItem value="Gudang Utama">{t('dialogs.options.store1')}</MenuItem>
                      <MenuItem value="Gudang Cadangan">{t('dialogs.options.store2')}</MenuItem>
                    </Select>
                  </FormControl>
                )} />
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
              <Grid size={{ xs: 12 }}>
                <Controller name="estimasiKadaluarsa" control={batchForm.control} render={({ field }) => (
                  <TextField {...field} type="date" label={t('dialogs.fields.expiry')} fullWidth error={!!batchForm.formState.errors.estimasiKadaluarsa} slotProps={{ inputLabel: { shrink: true } }} />
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

      {/* ─── Dialog: Catat Keluar Stok ─── */}
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
            <Controller name="berat" control={stockOutForm.control} render={({ field }) => (
              <TextField {...field} type="number" label={t('dialogs.fields.outWeight')} fullWidth error={!!stockOutForm.formState.errors.berat} helperText={stockOutForm.formState.errors.berat?.message} />
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
            <Controller name="tanggal" control={stockOutForm.control} render={({ field }) => (
              <TextField {...field} type="date" label={t('dialogs.fields.transDate')} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            )} />
            <Controller name="catatan" control={stockOutForm.control} render={({ field }) => (
              <TextField {...field} label={t('dialogs.fields.note')} multiline rows={2} fullWidth />
            )} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" color="inherit" onClick={() => setStockOutDialogOpen(false)} sx={{ flex: 1, borderRadius: 8 }}>{t('dialogs.buttons.cancel')}</Button>
              <Button type="submit" variant="contained" color="error" sx={{ flex: 2, borderRadius: 8 }}>{t('dialogs.buttons.submit')}</Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
