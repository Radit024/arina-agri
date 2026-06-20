'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';

import type {
  RabItemFormDraft,
  RabItemFormField,
} from '@/controllers/keuangan/useRabController';
import { formatRupiah } from '@/lib/formatters';

interface Props {
  draft: RabItemFormDraft;
  categoryOptions: string[];
  plannedTotal: number;
  submitting: boolean;
  onFieldChange: (field: RabItemFormField, value: string) => void;
  onOpenCategoryDialog: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function RabItemForm({
  draft,
  categoryOptions,
  plannedTotal,
  submitting,
  onFieldChange,
  onOpenCategoryDialog,
  onCancel,
  onSubmit,
}: Props) {
  const categoryLabelId = 'rab-item-category-label';
  const categorySelectId = 'rab-item-category';

  return (
    <Box
      component="form"
      data-testid="rab-item-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField
            name="type"
            label="Jenis RAB"
            select
            value={draft.type}
            onChange={(event) => onFieldChange('type', event.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="expense">Pengeluaran</MenuItem>
            <MenuItem value="income">Pendapatan</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 7 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <FormControl fullWidth size="small" required>
              <InputLabel id={categoryLabelId}>Kategori RAB</InputLabel>
              <Select
                id={categorySelectId}
                labelId={categoryLabelId}
                name="categoryName"
                label="Kategori RAB"
                value={draft.categoryName}
                onChange={(event) => onFieldChange('categoryName', event.target.value)}
              >
                {categoryOptions.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Pilih kategori yang tersedia atau kelola kategori custom.</FormHelperText>
            </FormControl>
            <IconButton
              size="small"
              onClick={onOpenCategoryDialog}
              title="Kelola Kategori RAB"
              aria-label="Kelola Kategori RAB"
              sx={{ mt: 0.5, flexShrink: 0 }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>
        </Grid>
      </Grid>

      <TextField
        name="name"
        label="Nama Item"
        value={draft.name}
        onChange={(event) => onFieldChange('name', event.target.value)}
        fullWidth
        size="small"
        required
        placeholder="Contoh: Pupuk Urea"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="volume"
            label="Volume"
            value={draft.volume}
            onChange={(event) => onFieldChange('volume', event.target.value)}
            type="number"
            fullWidth
            size="small"
            required
            slotProps={{ input: { inputProps: { min: 0, step: 'any' } } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="unit"
            label="Satuan"
            value={draft.unit}
            onChange={(event) => onFieldChange('unit', event.target.value)}
            fullWidth
            size="small"
            required
            placeholder="kg, karung, HOK"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="unitPrice"
            label="Harga Satuan"
            value={draft.unitPrice}
            onChange={(event) => onFieldChange('unitPrice', event.target.value)}
            type="number"
            fullWidth
            size="small"
            required
            slotProps={{
              input: {
                inputProps: { min: 0, step: 'any' },
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.875rem' }}>
                      Rp
                    </Typography>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            name="plannedCashMonth"
            label="Bulan Kas Rencana"
            value={draft.plannedCashMonth}
            onChange={(event) => onFieldChange('plannedCashMonth', event.target.value)}
            fullWidth
            size="small"
            placeholder="2026-08"
            helperText="Format YYYY-MM"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              height: '100%',
              minHeight: 56,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              px: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Total Rencana
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900, color: 'success.main' }}>
              {formatRupiah(plannedTotal)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <TextField
        name="aliases"
        label="Alias / Kata Kunci"
        value={draft.aliases}
        onChange={(event) => onFieldChange('aliases', event.target.value)}
        fullWidth
        size="small"
        multiline
        rows={2}
        helperText="Pisahkan dengan koma, titik koma, atau baris baru agar transaksi Buku Besar lebih mudah cocok ke item RAB."
        placeholder="Contoh: urea, pupuk nitrogen, pemupukan dasar"
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 0.5 }}>
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
          sx={{
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 800,
            bgcolor: 'success.main',
            '&:hover': { bgcolor: 'success.dark' },
          }}
        >
          {submitting ? 'Menyimpan...' : 'Simpan Item'}
        </Button>
      </Box>
    </Box>
  );
}
