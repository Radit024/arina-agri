'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { useFinanceProjectDialogController } from '@/controllers/keuangan/useFinanceProjectDialogController';
import type { ApiFinanceProject } from '@/lib/api';

type Props = Pick<UseKeuanganControllerResult, 'financeProject'>;

export default function FinanceProjectDialog({ financeProject }: Props) {
  const dialog = useFinanceProjectDialogController(financeProject);
  const { form } = dialog;

  return (
    <Dialog
      open={financeProject.projectDialogOpen}
      onClose={dialog.close}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontFamily: 'var(--font-sora)' }}>
        Buat Proyek Baru
      </DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              label="Nama Proyek"
              value={form.name}
              onChange={(e) => dialog.setField('name', e.target.value)}
              fullWidth
              required
              size="small"
              placeholder="Cabai Rawit Blok A Musim Hujan 2026"
              helperText="Pakai nama singkat yang mudah dicari di Buku Besar dan RAB."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Lokasi / Blok Lahan"
              value={form.landBlock}
              onChange={(e) => dialog.setField('landBlock', e.target.value)}
              fullWidth
              size="small"
              placeholder="Blok A, Greenhouse 2, atau Dusun Krajan"
              helperText="Opsional. Akan ditambahkan ke nama proyek saat disimpan."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Komoditas Utama"
              value={form.commodity}
              onChange={(e) => dialog.setField('commodity', e.target.value)}
              fullWidth
              required
              size="small"
              placeholder="Cabai Rawit, Padi, Jagung"
              helperText="Isi tanaman utama tanpa format tabel."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Varietas / Tipe"
              value={form.variety}
              onChange={(e) => dialog.setField('variety', e.target.value)}
              fullWidth
              size="small"
              placeholder="Dewata F1, Inpari 32, atau lokal"
              helperText="Opsional. Akan disimpan bersama komoditas."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Luas Lahan"
              type="number"
              value={form.landArea}
              onChange={(e) => dialog.setField('landArea', e.target.value)}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              helperText="Masukkan angka luas lahan."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Satuan"
              value={form.landAreaUnit}
              onChange={(e) => dialog.setField('landAreaUnit', e.target.value)}
              fullWidth
              size="small"
              placeholder="Ha"
              helperText="Contoh: Ha, m2, bedeng, polybag."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Label Musim Tanam"
              value={form.seasonLabel}
              onChange={(e) => dialog.setField('seasonLabel', e.target.value)}
              fullWidth
              size="small"
              placeholder="MT 1 2026 atau Musim Hujan 2026"
              helperText="Penanda periode yang muncul di laporan."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Metode Budidaya"
              value={form.cultivationMethod}
              onChange={(e) => dialog.setField('cultivationMethod', e.target.value)}
              fullWidth
              size="small"
              placeholder="Open field, greenhouse, polybag"
              helperText="Opsional. Akan ditambahkan ke label musim."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => dialog.setStatus(e.target.value as ApiFinanceProject['status'])}
              >
                <MenuItem value="active">Aktif</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Arsip</MenuItem>
              </Select>
              <FormHelperText>Pilih aktif untuk proyek yang sedang berjalan.</FormHelperText>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tanggal Mulai"
              value={dialog.dateDisplayValues.startDate}
              onChange={(e) => dialog.setDateField('startDate', e.target.value)}
              fullWidth
              size="small"
              placeholder="05-06-2026"
              error={!dialog.startDateValid}
              helperText={!dialog.startDateValid ? 'Format tanggal harus dd-MM-yyyy' : 'Format: dd-MM-yyyy, contoh 05-06-2026.'}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tanggal Selesai"
              value={dialog.dateDisplayValues.endDate}
              onChange={(e) => dialog.setDateField('endDate', e.target.value)}
              fullWidth
              size="small"
              placeholder="05-06-2026"
              error={!dialog.endDateValid}
              helperText={!dialog.endDateValid ? 'Format tanggal harus dd-MM-yyyy' : 'Tanggal target panen atau akhir periode biaya.'}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={dialog.close}
          disabled={dialog.submitting}
          sx={{ borderRadius: 2 }}
        >
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={dialog.submit}
          disabled={dialog.submitting || !dialog.canSubmit}
          sx={{ borderRadius: 2 }}
        >
          {dialog.submitting ? 'Menyimpan...' : 'Buat Proyek'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
