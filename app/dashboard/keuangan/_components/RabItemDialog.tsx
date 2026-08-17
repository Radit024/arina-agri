'use client';

import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import MasterDataDialog from '@/components/shared/forms/MasterDataDialog';
import RabItemForm from './RabItemForm';

type Props = Pick<UseKeuanganControllerResult, 'rab'>;

export default function RabItemDialog({ rab }: Props) {
  const isEditing = Boolean(rab.editingRabItemId);

  return (
    <>
      <Dialog
        open={rab.rabItemDialogOpen}
        onClose={rab.closeRabItemDialog}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography component="span" variant="h6" sx={{ display: 'block', fontFamily: 'var(--font-sora)', fontWeight: 800, lineHeight: 1.2 }}>
            {isEditing ? 'Edit Item RAB' : 'Tambah Item RAB'}
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Lengkapi rencana supaya transaksi Buku Besar lebih mudah dicocokkan.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {rab.rabItemError && (
            <Alert severity="error" onClose={() => rab.setRabItemError(null)} sx={{ mb: 2, borderRadius: 2 }}>
              {rab.rabItemError}
            </Alert>
          )}
          <RabItemForm
            draft={rab.rabItemDraft}
            categoryOptions={rab.rabCategoryOptions}
            plannedTotal={rab.rabItemPlannedTotal}
            submitting={rab.rabItemSubmitting}
            submitLabel={isEditing ? 'Simpan Perubahan' : undefined}
            onFieldChange={rab.updateRabItemDraftField}
            onOpenCategoryDialog={() => rab.setRabCategoryDialogOpen(true)}
            onCancel={rab.closeRabItemDialog}
            onSubmit={rab.submitRabItemDraft}
          />
        </DialogContent>
      </Dialog>

      <MasterDataDialog
        open={rab.rabCategoryDialogOpen}
        onClose={() => rab.setRabCategoryDialogOpen(false)}
        title={`Kelola Kategori RAB ${rab.rabItemDraft.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}`}
        items={rab.rabCategoryDialogItems}
        onAdd={rab.addRabCategory}
        onRename={rab.renameRabCategory}
        onDelete={rab.deleteRabCategory}
        deleteError={rab.rabCategoryDeleteError}
        onClearDeleteError={() => rab.setRabCategoryDeleteError(null)}
      />
    </>
  );
}
