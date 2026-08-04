'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { UseProductionSalesControllerResult } from '@/controllers/keuangan/useProductionSalesController';

type Props = {
  controller: UseProductionSalesControllerResult;
};

export default function ProductionSalesAssumptionsDialog({ controller }: Props) {
  const {
    dialogOpen,
    draft,
    updateDraftField,
    handleSubmit,
    submitting,
    submitError,
    validationError,
    closeDialog,
  } = controller;

  return (
    <Dialog
      open={dialogOpen}
      onClose={closeDialog}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography
          component="span"
          variant="h6"
          sx={{ display: 'block', fontFamily: 'var(--font-sora)', fontWeight: 800, lineHeight: 1.2 }}
        >
          Atur Asumsi Produksi & Penjualan
        </Typography>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Dipakai untuk menghitung Kelayakan Usaha (HPP, BEP Produksi, dan B/C Ratio) pada skenario ini.
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {submitError}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Target / Estimasi Volume Produksi"
              type="number"
              fullWidth
              size="small"
              value={draft.produksi}
              onChange={(e) => updateDraftField('produksi', e.target.value)}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">{draft.satuan || 'kg'}</InputAdornment>,
                },
              }}
              helperText="Volume hasil panen"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Satuan"
              fullWidth
              size="small"
              value={draft.satuan}
              onChange={(e) => updateDraftField('satuan', e.target.value)}
              helperText="Contoh: kg, ton, ikat"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Target / Estimasi Harga Jual per Satuan"
              type="number"
              fullWidth
              size="small"
              value={draft.hargaJual}
              onChange={(e) => updateDraftField('hargaJual', e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/{draft.satuan || 'kg'}</InputAdornment>,
                },
              }}
              helperText="Harga jual satuan komoditas"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={closeDialog} disabled={submitting} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || Boolean(validationError)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
        >
          {submitting ? 'Menyimpan...' : 'Simpan Asumsi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
