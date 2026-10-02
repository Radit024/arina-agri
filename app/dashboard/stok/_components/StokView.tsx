'use client';

import { useTheme, alpha, type Theme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
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
import InputAdornment from '@mui/material/InputAdornment';
import useMediaQuery from '@mui/material/useMediaQuery';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Autocomplete from '@mui/material/Autocomplete';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import SettingsIcon from '@mui/icons-material/Settings';

import { Controller, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { formatDateInputValue, formatDateShort, formatRupiah, normalizeDateInputValue } from '@/lib/formatters';
import type { ApiHarvestBatch, ApiStockMutation, StokSummary, ApiBuyer, ApiGrade, ApiLocation, ApiSupplyItem, NewSupplyItem, NewSupplyMutation } from '@/lib/api';
import MasterDataDialog from '@/components/shared/forms/MasterDataDialog';
import StokBatchListView from './StokBatchListView';
import StokMutationsView from './StokMutationsView';
import SupplyItemsView from './SupplyItemsView';
import { GradeChip, StatusChip, type StockTranslator } from './stockChips';
import { useTranslations } from 'next-intl';
import type {
  BatchFormInput,
  BatchFormOutput,
  StockOutFormInput,
  StockOutFormOutput,
} from '@/lib/validators/stockSchemas';
import { PageActionButton, PageHeader, PageShell } from '@/components/shared/page';
import { softBg, softText } from '@/lib/themeColors';

import MetricCard, { type MetricCardIntent } from '@/components/ui/MetricCard';
import { MobileTabBar } from '@/components/shared/navigation/MobileTabBar';

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
    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
      <GradeChip grade={batch.grade} t={t} />
      <StatusChip status={batch.status} t={t} />
    </Box>
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

export interface StokViewProps {
  activeBatches: ApiHarvestBatch[];
  alertBatches: ApiHarvestBatch[];
  batchDialogOpen: boolean;
  batchForm: UseFormReturn<BatchFormInput, unknown, BatchFormOutput>;
  closeConfirmId: string | null;
  filteredMutations: ApiStockMutation[];
  loading: boolean;
  mutFilter: string;
  mutFromDate: string;
  mutFromDateInvalid: boolean;
  mutToDate: string;
  mutToDateInvalid: boolean;
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
  batchDialogOpen,
  batchForm,
  closeConfirmId,
  filteredMutations,
  loading,
  mutFilter,
  mutFromDate,
  mutFromDateInvalid,
  mutToDate,
  mutToDateInvalid,
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
        subtitle={t('subtitle')}

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

      {/* Mobile: `PageHeader` disembunyikan penuh di layar kecil sehingga aksi di
          `actions` ikut hilang. Tanpa fallback ini, modul Stok tidak punya cara
          mencatat panen sama sekali dari ponsel. */}
      {isMobile && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LocalShippingIcon />}
            onClick={() => setStockOutDialogOpen(true)}
            sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            {t('buttons.stockOut')}
          </Button>
          <Button
            data-guide-target="stock-add-batch-mobile"
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddBatch}
            sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            {t('buttons.addBatch')}
          </Button>
        </Stack>
      )}

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

      {/* KPI Cards */}
      <Grid data-guide-target="stock-summary" container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: t('kpi.ready'), value: `${summary.totalStokSiapJual.toLocaleString()} kg`, icon: <InventoryIcon />, intent: 'success' },
          { label: t('kpi.sold'), value: `${summary.stokTerjualMingguIni.toLocaleString()} kg`, icon: <LocalShippingIcon />, intent: 'info' },
          { label: t('kpi.value'), value: formatRupiah(summary.estimasiNilaiStok), icon: <MonetizationOnIcon />, intent: 'warning' },
          { label: t('kpi.alert'), value: `${summary.batchHampirKadaluarsa} batch`, icon: <WarningAmberIcon />, intent: 'error' },
        ].map((kpi) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.label}>
            <MetricCard
              icon={kpi.icon}
              intent={kpi.intent as MetricCardIntent}
              label={kpi.label}
              loading={loading}
              value={kpi.value}
            />
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card data-guide-target="stock-tabs" sx={{ borderRadius: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MobileTabBar
          ariaLabel="Navigasi stok"
          value={tab}
          onChange={(v) => setTab(Number(v))}
          sx={{ px: 2 }}
          tabs={[
            { id: 0, label: t('tabs.batches') },
            { id: 1, label: t('tabs.mutations') },
            { id: 2, label: t('tabs.supply') },
          ]}
        />

        {/* Tab 1: Batch List */}
        {tab === 0 && (
          <StokBatchListView
            activeBatches={activeBatches}
            isMobile={isMobile}
            loading={loading}
            onCloseBatch={onCloseBatch}
            openAddBatch={openAddBatch}
            setStockOutDialogOpen={setStockOutDialogOpen}
            stockOutForm={stockOutForm}
            t={t}
          />
        )}

        {/* Tab 2: Mutasi */}
        {tab === 1 && (
          <StokMutationsView
            filteredMutations={filteredMutations}
            grades={grades}
            isMobile={isMobile}
            mutFilter={mutFilter}
            mutFromDate={mutFromDate}
            mutFromDateInvalid={mutFromDateInvalid}
            mutToDate={mutToDate}
            mutToDateInvalid={mutToDateInvalid}
            onApplyDateFilter={onApplyDateFilter}
            onResetDateFilter={onResetDateFilter}
            setMutFilter={setMutFilter}
            setMutFromDate={setMutFromDate}
            setMutToDate={setMutToDate}
            t={t}
          />
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
                      <TextField
                        {...field}
                        label={t('dialogs.fields.date')}
                        value={formatDateInputValue(field.value ?? '')}
                        onChange={(event) => field.onChange(normalizeDateInputValue(event.target.value))}
                        fullWidth
                        error={!!batchForm.formState.errors.tanggalPanen}
                        helperText={batchForm.formState.errors.tanggalPanen?.message || ''}
                        placeholder="05-06-2026"
                      />
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
                      <TextField
                        {...field}
                        label={t('dialogs.fields.expiry')}
                        value={formatDateInputValue(field.value ?? '')}
                        onChange={(event) => field.onChange(normalizeDateInputValue(event.target.value))}
                        fullWidth
                        error={!!batchForm.formState.errors.estimasiKadaluarsa}
                        helperText={batchForm.formState.errors.estimasiKadaluarsa?.message || 'Terisi otomatis +14 hari dari tanggal masuk. '}
                        placeholder="05-06-2026"
                      />
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
                    <TextField
                      {...field}
                      label={t('dialogs.fields.date')}
                      value={formatDateInputValue(field.value ?? '')}
                      onChange={(event) => field.onChange(normalizeDateInputValue(event.target.value))}
                      fullWidth
                      error={!!batchForm.formState.errors.tanggalPanen}
                      helperText={batchForm.formState.errors.tanggalPanen?.message || ''}
                      placeholder="05-06-2026"
                    />
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
                    <TextField
                      {...field}
                      label={t('dialogs.fields.expiry')}
                      value={formatDateInputValue(field.value ?? '')}
                      onChange={(event) => field.onChange(normalizeDateInputValue(event.target.value))}
                      fullWidth
                      error={!!batchForm.formState.errors.estimasiKadaluarsa}
                      helperText={batchForm.formState.errors.estimasiKadaluarsa?.message || 'Terisi otomatis +14 hari dari tanggal masuk. '}
                      placeholder="05-06-2026"
                    />
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
                    <Select
                      {...field}
                      label={t('dialogs.fields.batch')}
                      value={activeBatches.some((batch) => batch._id === field.value) ? field.value : ''}
                    >
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
                  <TextField
                    {...field}
                    label={t('dialogs.fields.transDate')}
                    value={formatDateInputValue(field.value ?? '')}
                    onChange={(event) => field.onChange(normalizeDateInputValue(event.target.value))}
                    fullWidth
                    error={!!stockOutForm.formState.errors.tanggal}
                    helperText={stockOutForm.formState.errors.tanggal?.message || ''}
                    placeholder="05-06-2026"
                  />
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
                  <Select
                    {...field}
                    label={t('dialogs.fields.batch')}
                    value={activeBatches.some((batch) => batch._id === field.value) ? field.value : ''}
                  >
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
                <TextField
                  {...field}
                  label={t('dialogs.fields.transDate')}
                  value={formatDateInputValue(field.value ?? '')}
                  onChange={(event) => field.onChange(normalizeDateInputValue(event.target.value))}
                  fullWidth
                  error={!!stockOutForm.formState.errors.tanggal}
                  helperText={stockOutForm.formState.errors.tanggal?.message || ''}
                  placeholder="05-06-2026"
                />
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
