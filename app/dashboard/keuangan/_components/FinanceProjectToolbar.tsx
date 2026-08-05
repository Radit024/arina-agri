'use client';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState, type SyntheticEvent } from 'react';

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
      sx={{ width: 22, height: 22, display: 'block' }}
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
      sx={{ width: 22, height: 22, display: 'block' }}
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

  // Mengikuti pola dirty-state confirmation di TransactionBatchDialog.tsx:
  // draft transaksi dianggap "belum disimpan" ketika dialog terbuka, masih di
  // tahap input, dan minimal satu draft memiliki isi.
  const hasUnsavedTransactionDraft =
    transactionBatch.dialogOpen &&
    transactionBatch.stage === 'input' &&
    transactionBatch.drafts.some((draft) => draft.kategori || draft.nominal || draft.keterangan);

  // RAB belum punya sinyal dirty-state khusus seperti TransactionBatchDialog,
  // jadi dipakai heuristik setara: dialog item RAB terbuka dan field utamanya
  // (nama / harga satuan) sudah diisi.
  const hasUnsavedRabDraft =
    rab.rabItemDialogOpen &&
    (rab.rabItemDraft.name.trim() !== '' || rab.rabItemDraft.unitPrice.trim() !== '');

  const hasUnsavedDraft = hasUnsavedTransactionDraft || hasUnsavedRabDraft;

  const closeOpenDialogs = () => {
    // Dialog transaksi/RAB merujuk ke mode yang sedang ditinggalkan — tutup
    // supaya tidak ada dialog "nyasar" yang tampil di atas mode baru.
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
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {/* Mode Selector — Proyeksi | Realisasi */}
        {financeProject.selectedProject && (
          <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Tabs
                value={activeMode}
                onChange={handleModeChange}
                aria-label="Mode skenario keuangan"
                sx={{
                  '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.9rem' },
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
                />
              )}
              {!scenarioLoading && activeMode === 'REALIZATION' && (
                <Chip
                  label="Mode: Aktual"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 260 } }}>
            <InputLabel>Proyek </InputLabel>
            <Select
              label="Proyek"
              value={financeProject.selectedProjectId ?? ''}
              onChange={(event) => financeProject.setSelectedProjectId(event.target.value || null)}
            >
              {financeProject.projects.length === 0 && <MenuItem value="">Belum ada proyek</MenuItem>}
              {financeProject.projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<AddCircleIcon />}
            onClick={financeProject.openCreateProjectDialog}
            sx={{ borderRadius: 8 }}
          >
            Buat Proyek
          </Button>

          <Tooltip title="Edit proyek">
            <span>
              <IconButton
                aria-label="Edit proyek"
                disabled={!financeProject.selectedProject}
                onClick={financeProject.openEditProjectDialog}
              >
                <EditOutlinedIcon />
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
              >
                <DeleteOutlineIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={!financeProject.selectedProject}
            onClick={() => rab.setImportDialogOpen(true)}
            sx={{ borderRadius: 8 }}
          >
            Import Excel
          </Button>

          <Button
            data-guide-target="finance-export"
            variant="outlined"
            startIcon={<ExcelLogoIcon />}
            disabled={!financeAccess.canExportFinance || financeExport.exportLoading}
            onClick={financeExport.handleExportFinanceWorkbook}
            sx={{ borderRadius: 8 }}
          >
            Export Excel
          </Button>

          <Button
            data-guide-target="finance-export-pdf"
            variant="outlined"
            startIcon={<PdfLogoIcon />}
            disabled={!financeAccess.canExportFinance || reportLoading}
            onClick={onOpenPdfReport}
            sx={{ borderRadius: 8 }}
          >
            Export Laporan
          </Button>
        </Stack>

        {/* Status messages */}
        {!financeProject.backendOnline && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
            Data RAB memakai penyimpanan lokal sampai tabel Supabase tersedia.
          </Typography>
        )}
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

      {/* ─── Konfirmasi Hapus Proyek ─── */}
      <Dialog
        open={financeProject.deleteProjectConfirmOpen}
        onClose={financeProject.cancelDeleteProject}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Hapus proyek ini?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Proyek "${financeProject.selectedProject?.name ?? ''}" beserta seluruh data RAB dan transaksi yang terkait akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={financeProject.cancelDeleteProject}
            disabled={financeProject.deletingProject}
            sx={{ borderRadius: 2 }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={financeProject.confirmDeleteProject}
            disabled={financeProject.deletingProject}
            sx={{ borderRadius: 2 }}
          >
            {financeProject.deletingProject ? 'Menghapus...' : 'Ya, Hapus Proyek'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Konfirmasi Berpindah Mode dengan Draft Belum Tersimpan ─── */}
      <Dialog
        open={modeSwitchConfirmOpen}
        onClose={handleCancelModeSwitch}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Ganti mode?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Data transaksi/RAB yang belum disimpan akan hilang jika Anda berpindah mode.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCancelModeSwitch}
            sx={{ borderRadius: 2 }}
          >
            Lanjut Mengisi
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmModeSwitch}
            sx={{ borderRadius: 2 }}
          >
            Ya, Ganti Mode
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
