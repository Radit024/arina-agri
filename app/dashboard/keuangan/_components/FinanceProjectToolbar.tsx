'use client';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState, type MouseEvent, type SyntheticEvent } from 'react';

import AppDialog from '@/components/ui/AppDialog';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import type { ScenarioMode } from '@/lib/finance/rabTypes';
import { MODE_LABELS } from '@/lib/finance/scenarioLabels';
import FinanceProjectDialog from './FinanceProjectDialog';

type Props = Pick<
  UseKeuanganControllerResult,
  'financeAccess' | 'financeProject' | 'rab' | 'financeExport' | 'reportLoading' | 'financeScenario' | 'transactionBatch'
> & {
  onOpenPdfReport: () => void;
};

function ExcelLogoIcon() {
  return (
    <Box
      component="img"
      src="/icons/excel-logo.svg"
      alt=""
      aria-hidden="true"
      data-testid="finance-export-excel-logo"
      sx={{ width: 20, height: 20, display: 'block' }}
    />
  );
}

function PdfLogoIcon() {
  return (
    <Box
      component="img"
      src="/icons/pdf-logo.svg"
      alt=""
      aria-hidden="true"
      data-testid="finance-export-pdf-logo"
      sx={{ width: 20, height: 20, display: 'block' }}
    />
  );
}

export default function FinanceProjectToolbar({
  financeAccess,
  financeProject,
  rab,
  financeExport,
  reportLoading,
  financeScenario,
  transactionBatch,
  onOpenPdfReport,
}: Props) {
  const { activeMode, setActiveMode, loading: scenarioLoading } = financeScenario;
  const [modeSwitchConfirmOpen, setModeSwitchConfirmOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<ScenarioMode | null>(null);
  const [overflowAnchorEl, setOverflowAnchorEl] = useState<null | HTMLElement>(null);
  const overflowOpen = Boolean(overflowAnchorEl);

  const handleOpenOverflow = (event: MouseEvent<HTMLElement>) => {
    setOverflowAnchorEl(event.currentTarget);
  };

  const handleCloseOverflow = () => {
    setOverflowAnchorEl(null);
  };

  const hasUnsavedTransactionDraft =
    transactionBatch.dialogOpen &&
    transactionBatch.stage === 'input' &&
    transactionBatch.drafts.some((draft) => draft.kategori || draft.nominal || draft.keterangan);

  const hasUnsavedRabDraft =
    rab.rabItemDialogOpen &&
    (rab.rabItemDraft.name.trim() !== '' || rab.rabItemDraft.unitPrice.trim() !== '');

  const hasUnsavedDraft = hasUnsavedTransactionDraft || hasUnsavedRabDraft;

  const closeOpenDialogs = () => {
    if (transactionBatch.dialogOpen) {
      transactionBatch.closeDialog();
    }
    if (rab.rabItemDialogOpen) {
      rab.closeRabItemDialog();
    }
  };

  const handleModeChange = (_: SyntheticEvent, newMode: ScenarioMode) => {
    if (newMode === activeMode) return;
    if (hasUnsavedDraft) {
      setPendingMode(newMode);
      setModeSwitchConfirmOpen(true);
      return;
    }
    closeOpenDialogs();
    setActiveMode(newMode);
  };

  const handleCancelModeSwitch = () => {
    setModeSwitchConfirmOpen(false);
    setPendingMode(null);
  };

  const handleConfirmModeSwitch = () => {
    closeOpenDialogs();
    if (pendingMode) {
      setActiveMode(pendingMode);
    }
    setModeSwitchConfirmOpen(false);
    setPendingMode(null);
  };

  return (
    <>
      <Box
        sx={{
          mb: 2,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {/* Mode Selector — Proyeksi | Realisasi */}
        {financeProject.selectedProject && (
          <Box sx={{ mb: 1.5, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Tabs
                value={activeMode}
                onChange={handleModeChange}
                aria-label="Mode skenario keuangan"
                sx={{
                  minHeight: 44,
                  '& .MuiTab-root': {
                    minHeight: 44,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    px: { xs: 1.5, sm: 2 },
                  },
                  '& .Mui-selected': { color: 'primary.main' },
                }}
              >
                <Tab
                  id="finance-scenario-tab-projection"
                  aria-controls="finance-scenario-tabpanel-projection"
                  label={MODE_LABELS.PROJECTION}
                  value="PROJECTION"
                  disabled={scenarioLoading}
                />
                <Tab
                  id="finance-scenario-tab-realization"
                  aria-controls="finance-scenario-tabpanel-realization"
                  label={MODE_LABELS.REALIZATION}
                  value="REALIZATION"
                  disabled={scenarioLoading}
                />
              </Tabs>
              {scenarioLoading && (
                <Chip label="Memuat skenario…" size="small" variant="outlined" color="default" />
              )}
              {!scenarioLoading && activeMode === 'PROJECTION' && (
                <Chip
                  label="Mode: Rencana"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ fontWeight: 700, height: 26 }}
                />
              )}
              {!scenarioLoading && activeMode === 'REALIZATION' && (
                <Chip
                  label="Mode: Aktual"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700, height: 26 }}
                />
              )}
            </Stack>
          </Box>
        )}

        {/* Project Selector & Actions */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' }, flexGrow: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ flexGrow: 1, minWidth: { md: 280 } }}>
              <InputLabel>Pilih Proyek</InputLabel>
              <Select
                label="Pilih Proyek"
                value={financeProject.selectedProjectId ?? ''}
                onChange={(event) => financeProject.setSelectedProjectId(event.target.value || null)}
                sx={{ minHeight: 44, borderRadius: 2 }}
              >
                {financeProject.projects.length === 0 && <MenuItem value="">Belum ada proyek</MenuItem>}
                {financeProject.projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Edit proyek">
              <span>
                <IconButton
                  aria-label="Edit proyek"
                  disabled={!financeProject.selectedProject}
                  onClick={financeProject.openEditProjectDialog}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Hapus proyek">
              <span>
                <IconButton
                  aria-label="Hapus proyek"
                  disabled={!financeProject.selectedProject}
                  onClick={financeProject.requestDeleteProject}
                  color="error"
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          {/* Desktop Actions */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<AddCircleIcon />}
              onClick={financeProject.openCreateProjectDialog}
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Buat Proyek
            </Button>

            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={!financeProject.selectedProject}
              onClick={() => rab.setImportDialogOpen(true)}
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Import Excel
            </Button>

            <Button
              data-guide-target="finance-export"
              variant="outlined"
              startIcon={<ExcelLogoIcon />}
              disabled={!financeAccess.canExportFinance || financeExport.exportLoading}
              onClick={financeExport.handleExportFinanceWorkbook}
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Export Excel
            </Button>

            <Button
              data-guide-target="finance-export-pdf"
              variant="outlined"
              startIcon={<PdfLogoIcon />}
              disabled={!financeAccess.canExportFinance || reportLoading}
              onClick={onOpenPdfReport}
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Export Laporan
            </Button>
          </Stack>

          {/* Mobile & Tablet Compact Action Row */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              display: { xs: 'flex', lg: 'none' },
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<AddCircleIcon />}
              onClick={financeProject.openCreateProjectDialog}
              sx={{ minHeight: 44, flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Buat Proyek
            </Button>

            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              disabled={!financeProject.selectedProject}
              onClick={() => rab.setImportDialogOpen(true)}
              sx={{
                minHeight: 44,
                flex: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' },
              }}
            >
              Import Excel
            </Button>

            <IconButton
              aria-label="Aksi lainnya"
              onClick={handleOpenOverflow}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <MoreVertIcon />
            </IconButton>

            <Menu
              anchorEl={overflowAnchorEl}
              open={overflowOpen}
              onClose={handleCloseOverflow}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 180, mt: 0.5 } } }}
            >
              <MenuItem
                onClick={() => {
                  handleCloseOverflow();
                  financeExport.handleExportFinanceWorkbook();
                }}
                disabled={!financeAccess.canExportFinance || financeExport.exportLoading}
                sx={{ minHeight: 44 }}
              >
                <ListItemIcon>
                  <ExcelLogoIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Export Excel
                    </Typography>
                  }
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleCloseOverflow();
                  onOpenPdfReport();
                }}
                disabled={!financeAccess.canExportFinance || reportLoading}
                sx={{ minHeight: 44 }}
              >
                <ListItemIcon>
                  <PdfLogoIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Export Laporan PDF
                    </Typography>
                  }
                />
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        {/* Status messages */}
        {rab.importError && (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>
            {rab.importError}
          </Typography>
        )}
        {financeExport.exportError && (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>
            {financeExport.exportError}
          </Typography>
        )}
      </Box>

      <FinanceProjectDialog financeProject={financeProject} />

      {/* Delete Project Confirm Dialog */}
      <AppDialog
        open={financeProject.deleteProjectConfirmOpen}
        onClose={financeProject.cancelDeleteProject}
        title="Hapus proyek ini?"
        maxWidth="xs"
        fullWidth
        actions={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, width: '100%' }}>
            <Button
              variant="outlined"
              onClick={financeProject.cancelDeleteProject}
              disabled={financeProject.deletingProject}
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none' }}
            >
              Batal
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={financeProject.confirmDeleteProject}
              disabled={financeProject.deletingProject}
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              {financeProject.deletingProject ? 'Menghapus...' : 'Ya, Hapus Proyek'}
            </Button>
          </Box>
        }
      >
        <Typography variant="body2" color="text.secondary">
          {`Proyek "${financeProject.selectedProject?.name ?? ''}" beserta seluruh data RAB dan transaksi yang terkait akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        </Typography>
      </AppDialog>

      {/* Mode Switch Confirm Dialog */}
      <AppDialog
        open={modeSwitchConfirmOpen}
        onClose={handleCancelModeSwitch}
        title="Ganti mode?"
        maxWidth="xs"
        fullWidth
        actions={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, width: '100%' }}>
            <Button
              variant="outlined"
              onClick={handleCancelModeSwitch}
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none' }}
            >
              Lanjut Mengisi
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmModeSwitch}
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Ya, Ganti Mode
            </Button>
          </Box>
        }
      >
        <Typography variant="body2" color="text.secondary">
          Data transaksi/RAB yang belum disimpan akan hilang jika Anda berpindah mode.
        </Typography>
      </AppDialog>
    </>
  );
}
