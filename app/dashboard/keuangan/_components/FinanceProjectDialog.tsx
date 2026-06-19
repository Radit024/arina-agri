'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useState, useEffect } from 'react';

import { formatDateInputValue, isValidDateInputValue, normalizeDateInputValue } from '@/lib/formatters';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';

type Props = Pick<UseKeuanganControllerResult, 'financeProject'>;

const defaultForm = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString().slice(0, 10);
  return {
    name: '',
    commodity: '',
    landArea: '1',
    landAreaUnit: 'Ha',
    seasonLabel: '',
    startDate,
    endDate,
    status: 'active' as const,
  };
};

export default function FinanceProjectDialog({ financeProject }: Props) {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (financeProject.projectDialogOpen) {
      setForm(defaultForm());
    }
  }, [financeProject.projectDialogOpen]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const startDateValid = isValidDateInputValue(form.startDate);
  const endDateValid = isValidDateInputValue(form.endDate);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.commodity.trim() || !startDateValid || !endDateValid) return;
    const startDate = normalizeDateInputValue(form.startDate);
    const endDate = normalizeDateInputValue(form.endDate);
    setSubmitting(true);
    try {
      await financeProject.createProject({
        name: form.name.trim(),
        commodity: form.commodity.trim(),
        landArea: Number(form.landArea) || 1,
        landAreaUnit: form.landAreaUnit.trim() || 'Ha',
        seasonLabel: form.seasonLabel.trim(),
        startDate,
        endDate,
        status: form.status,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={financeProject.projectDialogOpen}
      onClose={() => financeProject.setProjectDialogOpen(false)}
      maxWidth="sm"
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
              onChange={(e) => set('name', e.target.value)}
              fullWidth
              required
              size="small"
              placeholder="cth: Padi 1 Ha MT 1"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Komoditas"
              value={form.commodity}
              onChange={(e) => set('commodity', e.target.value)}
              fullWidth
              required
              size="small"
              placeholder="cth: Padi, Jagung, Cabai"
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Luas Lahan"
              type="number"
              value={form.landArea}
              onChange={(e) => set('landArea', e.target.value)}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
            />
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Satuan"
              value={form.landAreaUnit}
              onChange={(e) => set('landAreaUnit', e.target.value)}
              fullWidth
              size="small"
              placeholder="Ha"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Label Musim Tanam"
              value={form.seasonLabel}
              onChange={(e) => set('seasonLabel', e.target.value)}
              fullWidth
              size="small"
              placeholder="cth: MT 1, MT 2, Gadu"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <MenuItem value="active">Aktif</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Arsip</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tanggal Mulai"
              value={formatDateInputValue(form.startDate)}
              onChange={(e) => set('startDate', normalizeDateInputValue(e.target.value))}
              fullWidth
              size="small"
              placeholder="05-06-2026"
              error={!startDateValid}
              helperText={!startDateValid ? 'Format tanggal harus dd-MM-yyyy' : ''}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tanggal Selesai"
              value={formatDateInputValue(form.endDate)}
              onChange={(e) => set('endDate', normalizeDateInputValue(e.target.value))}
              fullWidth
              size="small"
              placeholder="05-06-2026"
              error={!endDateValid}
              helperText={!endDateValid ? 'Format tanggal harus dd-MM-yyyy' : ''}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={() => financeProject.setProjectDialogOpen(false)}
          disabled={submitting}
          sx={{ borderRadius: 2 }}
        >
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !form.name.trim() || !form.commodity.trim() || !startDateValid || !endDateValid}
          sx={{ borderRadius: 2 }}
        >
          {submitting ? 'Menyimpan...' : 'Buat Proyek'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
