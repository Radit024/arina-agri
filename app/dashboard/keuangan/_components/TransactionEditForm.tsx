'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';

import type { DraftErrors, TransactionDraft } from '@/controllers/keuangan/useTransactionBatchController';
import TransactionFormFields from './TransactionFormFields';

interface Props {
  draft: TransactionDraft;
  kategoriList: string[];
  satuanList: string[];
  errors: DraftErrors;
  submitting: boolean;
  onFieldChange: (field: keyof TransactionDraft, value: string) => void;
  onOpenKategoriDialog: () => void;
  onOpenSatuanDialog: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  rabSuggestion: string | null;
}

export default function TransactionEditForm({
  draft,
  kategoriList,
  satuanList,
  errors,
  submitting,
  onFieldChange,
  onOpenKategoriDialog,
  onOpenSatuanDialog,
  onCancel,
  onSubmit,
  rabSuggestion,
}: Props) {
  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <TransactionFormFields
        draft={draft}
        kategoriList={kategoriList}
        satuanList={satuanList}
        errors={errors}
        onFieldChange={onFieldChange}
        onOpenKategoriDialog={onOpenKategoriDialog}
        onOpenSatuanDialog={onOpenSatuanDialog}
        rabSuggestion={rabSuggestion}
        idPrefix={draft.id}
      />

      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', pt: 0.5 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          disabled={submitting}
          sx={{ borderRadius: 8, textTransform: 'none' }}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          disabled={submitting}
          sx={{ borderRadius: 8, textTransform: 'none', fontWeight: 700 }}
        >
          {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </Box>
    </Box>
  );
}
