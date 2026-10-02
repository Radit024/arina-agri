'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha, type Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MobileTabBar } from '@/components/shared/navigation/MobileTabBar';

import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from '@mui/icons-material/Download';

import { formatRupiah } from '@/lib/formatters';
import { getPeriodeLabel } from '@/lib/pdfReport';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';

import { PageHeader, PageShell } from '@/components/shared/page';
import FinanceCashFlowView from './FinanceCashFlowView';
import FinanceLedgerView from './FinanceLedgerView';
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
import TransactionClassificationDialog from './TransactionClassificationDialog';

const MAX_AI_REPORTS_PER_MONTH = 3;

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

const financePanelSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
  minHeight: { xs: 'auto', md: 'max(520px, calc(100dvh - 220px))' },
} as const;

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
  filterJenis,
  setFilterJenis,
  filterRabLink,
  setFilterRabLink,
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
  rabLinkCountsByItemId,
  realizedByRabItemId,
  realizedRabTotals,
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
  selectedTransactionsMixed,
  toggleSelectTx,
  clearSelectionTxs,
  bulkDeleteConfirm,
  setBulkDeleteConfirm,
  handleBulkDeleteConfirm,
}: UseKeuanganControllerResult) {

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

      <MobileTabBar
        ariaLabel="Navigasi laporan keuangan"
        value={financeTab}
        onChange={(value) => setFinanceTab(value)}
        containerSx={{ mb: 2 }}
        tabs={[
          { id: 'buku-besar', label: 'Buku Besar' },
          { id: 'rab', label: 'RAB' },
          { id: 'laba-rugi', label: 'Laba Rugi' },
          { id: 'arus-kas', label: 'Arus Kas' },
          { id: 'arus-kas-pasca-pembiayaan', label: 'Arus Kas Pasca Pembiayaan' },
          { id: 'perbandingan', label: 'Perbandingan' },
        ]}
      />

      {financeTab === 'buku-besar' && (
        <FinanceLedgerView
          t={t}
          filterBulan={filterBulan}
          setFilterBulan={setFilterBulan}
          filterJenis={filterJenis}
          setFilterJenis={setFilterJenis}
          filterRabLink={filterRabLink}
          setFilterRabLink={setFilterRabLink}
          theme={theme}
          isMobile={isMobile}
          totalPendapatan={totalPendapatan}
          totalPengeluaran={totalPengeluaran}
          labaBersih={labaBersih}
          financeAccess={financeAccess}
          handleDelete={handleDelete}
          finalPieData={finalPieData}
          finalPieColors={finalPieColors}
          bulanOptions={bulanOptions}
          getBulanLabel={getBulanLabel}
          displayedTransactions={displayedTransactions}
          pagedTransactions={pagedTransactions}
          ledgerPage={ledgerPage}
          setLedgerPage={setLedgerPage}
          ledgerTotalPages={ledgerTotalPages}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortColumn={sortColumn}
          sortDir={sortDir}
          toggleSort={toggleSort}
          selectedTxIds={selectedTxIds}
          selectedTransactionsMixed={selectedTransactionsMixed}
          toggleSelectTx={toggleSelectTx}
          clearSelectionTxs={clearSelectionTxs}
          setBulkDeleteConfirm={setBulkDeleteConfirm}
          rabTransactionLink={rabTransactionLink}
          transactionBatch={transactionBatch}
          migration={migration}
        />
      )}

      {financeTab === 'rab' && (
        <Box
          data-testid="finance-panel-rab"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <RabPlanningView
            financeProject={financeProject}
            rab={rab}
            rabLinkCountsByItemId={rabLinkCountsByItemId}
            realizedByRabItemId={realizedByRabItemId}
            realizedRabTotals={realizedRabTotals}
          />
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
          <FinanceCashFlowView
            canAddTransaction={financeAccess.canInputFinance}
            financeReports={financeReports}
            onAddTransaction={transactionBatch.openForCreate}
            onCreateProject={financeProject.openCreateProjectDialog}
          />
        </Box>
      )}
      {financeTab === 'arus-kas-pasca-pembiayaan' && (
        <Box
          data-testid="finance-panel-arus-kas-pasca-pembiayaan"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <FinanceFinancingView
            arusKasPascaPembiayaan={financing.arusKasPascaPembiayaan}
            bunga={financing.bunga}
            kasAkhirPascaPembiayaan={financing.kasAkhirPascaPembiayaan}
            kebutuhanModalKerja={financing.kebutuhanModalKerja}
            onOpenAssumptions={financing.openDialog}
          />
        </Box>
      )}
      {financeTab === 'perbandingan' && (
        <Box
          data-testid="finance-panel-perbandingan"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <FinanceComparisonView
            comparison={financeComparison.comparison}
            error={financeComparison.error}
            hasEnoughData={financeComparison.hasEnoughData}
            loading={financeComparison.loading}
            projectionHasData={financeComparison.projectionHasData}
            realizationHasData={financeComparison.realizationHasData}
            onSwitchMode={financeScenario.setActiveMode}
            onNavigateTab={(tab) => setFinanceTab(tab)}
          />
        </Box>
      )}

      <TransactionBatchDialog
        batch={transactionBatch}
        master={transactionMaster}
        selectedProjectId={financeProject.selectedProject?.id}
      />
      <RabTransactionLinkDialog link={rabTransactionLink} />
      <RabImportDialog
        rab={rab}
        scenarios={financeScenario.scenarios}
        activeScenarioId={financeScenario.activeScenario?.id ?? null}
        onNavigateTab={(tab) => setFinanceTab(tab)}
      />
      <RabItemDialog rab={rab} />
      <FinancingAssumptionsDialog financing={financing} />
      <ProductionSalesAssumptionsDialog controller={productionSales} />

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
