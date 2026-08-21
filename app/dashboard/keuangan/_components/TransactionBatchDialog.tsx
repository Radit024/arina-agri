'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import MasterDataDialog from '@/components/shared/forms/MasterDataDialog';
import AppDialog from '@/components/ui/AppDialog';
import type { UseTransactionBatchControllerResult } from '@/controllers/keuangan/useTransactionBatchController';
import type { UseTransactionMasterControllerResult } from '@/controllers/keuangan/useTransactionMasterController';
import TransactionConfirmView from './TransactionConfirmView';
import TransactionDraftCard from './TransactionDraftCard';
import TransactionEditForm from './TransactionEditForm';

interface Props {
  batch: UseTransactionBatchControllerResult;
  master: UseTransactionMasterControllerResult;
  selectedProjectId?: string;
}

const STEPS = ['Input Transaksi', 'Konfirmasi'];

export default function TransactionBatchDialog({ batch, master, selectedProjectId }: Props) {
  const {
    dialogOpen,
    drafts,
    expandedDraftId,
    stage,
    submitting,
    editingTransactionId,
    draftErrors,
    closeConfirmOpen,
    submitResults,
    requestClose,
    closeDialog,
    setCloseConfirmOpen,
    updateDraftField,
    expandDraft,
    addDraft,
    removeDraft,
    goToConfirm,
    goBackToInput,
    submitAll,
    submitEdit,
    rabSuggestion,
  } = batch;

  const {
    customKategori,
    customSatuan,
    kategoriDialogOpen,
    setKategoriDialogOpen,
    satuanDialogOpen,
    setSatuanDialogOpen,
    deleteKategoriError,
    setDeleteKategoriError,
    deleteSatuanError,
    setDeleteSatuanError,
    allKategori,
    allSatuan,
    addKategori,
    renameKategori,
    deleteKategori,
    addSatuan,
    renameSatuan,
    deleteSatuan,
  } = master;

  const activeStepIndex = stage === 'input' ? 0 : 1;
  const isEditing = Boolean(editingTransactionId);
  const editDraft = drafts[0];

  const handleSubmit = () => {
    submitAll(() => selectedProjectId);
  };

  const handleEditSubmit = () => {
    submitEdit(() => selectedProjectId);
  };

  return (
    <>
      <AppDialog
        open={dialogOpen}
        onClose={() => requestClose()}
        title={isEditing ? 'Edit Transaksi' : 'Catat Transaksi'}
        subtitle={isEditing ? 'Perbarui data transaksi terpilih' : 'Bisa tambah lebih dari satu sekaligus'}
        leading={
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 3,
              bgcolor: editingTransactionId ? 'primary.light' : '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {editingTransactionId
              ? <EditOutlinedIcon sx={{ color: 'primary.dark', fontSize: 20 }} />
              : <AddCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />}
          </Box>
        }
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, maxHeight: '90vh' } } }}
      >
        {!isEditing && (
          <Stepper activeStep={activeStepIndex} sx={{ mb: 2 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        <Box>
          {submitResults && submitResults.failed > 0 && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              {submitResults.success} transaksi berhasil, {submitResults.failed} gagal disimpan.
            </Alert>
          )}

          {isEditing && editDraft && (
            <TransactionEditForm
              draft={editDraft}
              kategoriList={allKategori(editDraft.jenis)}
              satuanList={allSatuan}
              errors={draftErrors[editDraft.id] ?? {}}
              submitting={submitting}
              onFieldChange={(field, value) => updateDraftField(editDraft.id, field, value)}
              onOpenKategoriDialog={() => setKategoriDialogOpen(true)}
              onOpenSatuanDialog={() => setSatuanDialogOpen(true)}
              onCancel={requestClose}
              onSubmit={handleEditSubmit}
              rabSuggestion={rabSuggestion}
            />
          )}

          {!isEditing && stage === 'input' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {drafts.map((draft, index) => {
                const isExpanded = draft.id === expandedDraftId;
                return (
                  <TransactionDraftCard
                    key={draft.id}
                    draft={draft}
                    index={index}
                    isExpanded={isExpanded}
                    hasError={
                      !!draftErrors[draft.id] && Object.keys(draftErrors[draft.id]).length > 0
                    }
                    errors={draftErrors[draft.id] ?? {}}
                    onExpand={() => expandDraft(draft.id)}
                    onRemove={() => removeDraft(draft.id)}
                    canRemove={drafts.length > 1}
                    kategoriList={allKategori(draft.jenis)}
                    satuanList={allSatuan}
                    onFieldChange={(field, value) => updateDraftField(draft.id, field, value)}
                    onOpenKategoriDialog={() => setKategoriDialogOpen(true)}
                    onOpenSatuanDialog={() => setSatuanDialogOpen(true)}
                    rabSuggestion={isExpanded ? rabSuggestion : null}
                  />
                );
              })}

              <Box sx={{ display: 'flex', gap: 1.5, pt: 0.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddCircleIcon />}
                  onClick={addDraft}
                  sx={{ flex: 1, borderRadius: 8, textTransform: 'none' }}
                >
                  + Tambah Transaksi Lagi
                </Button>
                <Button
                  variant="contained"
                  onClick={goToConfirm}
                  disabled={drafts.length === 0}
                  sx={{
                    flex: 1,
                    borderRadius: 8,
                    bgcolor: 'success.main',
                    '&:hover': { bgcolor: 'success.dark' },
                  }}
                >
                  Konfirmasi →
                </Button>
              </Box>
            </Box>
          )}

          {!isEditing && stage === 'confirm' && (
            <TransactionConfirmView
              drafts={drafts}
              submitting={submitting}
              editingTransactionId={editingTransactionId}
              onBack={goBackToInput}
              onConfirm={handleSubmit}
            />
          )}
        </Box>
      </AppDialog>

      <Dialog
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Keluar dari form?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Data transaksi yang belum disimpan akan hilang.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setCloseConfirmOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Lanjut Mengisi
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={closeDialog}
            sx={{ borderRadius: 2 }}
          >
            Ya, Keluar
          </Button>
        </DialogActions>
      </Dialog>

      <MasterDataDialog
        open={kategoriDialogOpen}
        onClose={() => setKategoriDialogOpen(false)}
        title="Kelola Kategori Transaksi"
        items={customKategori}
        onAdd={addKategori}
        onRename={renameKategori}
        onDelete={deleteKategori}
        deleteError={deleteKategoriError}
        onClearDeleteError={() => setDeleteKategoriError(null)}
      />

      <MasterDataDialog
        open={satuanDialogOpen}
        onClose={() => setSatuanDialogOpen(false)}
        title="Kelola Satuan"
        items={customSatuan}
        onAdd={addSatuan}
        onRename={renameSatuan}
        onDelete={deleteSatuan}
        deleteError={deleteSatuanError}
        onClearDeleteError={() => setDeleteSatuanError(null)}
      />
    </>
  );
}
