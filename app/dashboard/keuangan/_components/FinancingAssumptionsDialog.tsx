'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { UseFinancingControllerResult } from '@/controllers/keuangan/useFinancingController';

type Props = {
  financing: UseFinancingControllerResult;
};

export default function FinancingAssumptionsDialog({ financing }: Props) {
  const { dialogOpen, draft, updateDraftField, submitDraft, saving, saveError, closeDialog } = financing;

  return (
    <Dialog
      open={dialogOpen}
      onClose={closeDialog}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="span" variant="h6" sx={{ display: 'block', fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
          Atur Asumsi Pembiayaan
        </Typography>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Dipakai untuk menghitung Arus Kas Pasca Pembiayaan pada scenario ini.
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {saveError}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Saldo Kas Awal"
              type="number"
              fullWidth
              value={draft.saldoKasAwal}
              onChange={(e) => updateDraftField('saldoKasAwal', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Modal Sendiri"
              type="number"
              fullWidth
              value={draft.modalSendiri}
              onChange={(e) => updateDraftField('modalSendiri', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nilai Pinjaman"
              type="number"
              fullWidth
              value={draft.nilaiPinjaman}
              onChange={(e) => updateDraftField('nilaiPinjaman', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Bunga per Periode (%)"
              type="number"
              fullWidth
              value={draft.bungaPerPeriode}
              onChange={(e) => updateDraftField('bungaPerPeriode', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tanggal Pencairan"
              type="month"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={draft.tanggalPencairan}
              onChange={(e) => updateDraftField('tanggalPencairan', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tanggal Pembayaran"
              type="month"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={draft.tanggalPembayaran}
              onChange={(e) => updateDraftField('tanggalPembayaran', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Biaya Lain"
              type="number"
              fullWidth
              value={draft.biayaLain}
              onChange={(e) => updateDraftField('biayaLain', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeDialog} sx={{ borderRadius: 8 }}>Batal</Button>
        <Button variant="contained" disabled={saving} onClick={submitDraft} sx={{ borderRadius: 8 }}>
          Simpan
        </Button>
      </DialogActions>
    </Dialog>
  );
}
