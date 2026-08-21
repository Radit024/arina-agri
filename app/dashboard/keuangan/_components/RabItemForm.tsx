'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import SaveIcon from '@mui/icons-material/Save';

import type {
  RabItemFormDraft,
  RabItemFormField,
} from '@/controllers/keuangan/useRabController';
import { formatRupiah } from '@/lib/formatters';
import AppField from '@/components/ui/AppField';
import FieldWithManageAction from '@/components/shared/forms/FieldWithManageAction';

interface Props {
  draft: RabItemFormDraft;
  categoryOptions: string[];
  plannedTotal: number;
  submitting: boolean;
  submitLabel?: string;
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
  submitLabel,
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
          <AppField
            name="type"
            label="Jenis RAB"
            type="select"
            value={draft.type}
            onChange={(val) => onFieldChange('type', val)}
            options={[
              { label: 'Pengeluaran', value: 'expense' },
              { label: 'Pendapatan', value: 'income' },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 7 }}>
          <FieldWithManageAction
            onManage={onOpenCategoryDialog}
            manageLabel="Kelola Kategori RAB"
          >
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
            </FormControl>
          </FieldWithManageAction>
        </Grid>
      </Grid>

      <AppField
        name="name"
        label="Nama Item"
        value={draft.name}
        onChange={(val) => onFieldChange('name', val)}
        required
        placeholder="Contoh: Pupuk Urea"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <AppField
            name="volume"
            label="Volume"
            type="number"
            value={draft.volume}
            onChange={(val) => onFieldChange('volume', val)}
            required
            min={0}
            step={0.01}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <AppField
            name="unit"
            label="Satuan"
            value={draft.unit}
            onChange={(val) => onFieldChange('unit', val)}
            required
            placeholder="kg, karung, HOK"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <AppField
            name="unitPrice"
            label="Harga Satuan"
            type="number"
            value={draft.unitPrice}
            onChange={(val) => onFieldChange('unitPrice', val)}
            required
            min={0}
            startIcon={<Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.875rem' }}>Rp</Typography>}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AppField
            name="plannedCashMonth"
            label="Bulan Kas Rencana"
            value={draft.plannedCashMonth}
            onChange={(val) => onFieldChange('plannedCashMonth', val)}
            placeholder="2026-08"
            helperText="Format YYYY-MM"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={(theme) => ({
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            })}
          >
            <Typography variant="caption" color="text.secondary">
              Total Rencana
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: draft.type === 'income' ? 'success.main' : 'error.main' }}>
              {formatRupiah(plannedTotal)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <AppField
        name="aliases"
        label="Alias / Kata Kunci Pencocokan"
        value={draft.aliases}
        onChange={(val) => onFieldChange('aliases', val)}
        placeholder="Contoh: urea, pupuk subsidi (pisahkan dengan koma)"
        helperText="Digunakan untuk mendeteksi transaksi Buku Besar yang cocok secara otomatis."
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          disabled={submitting}
          data-touch-target="44"
          sx={{ minHeight: 44, px: 2.5, borderRadius: 2 }}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          data-touch-target="44"
          sx={{ minHeight: 44, px: 3, borderRadius: 2, fontWeight: 700 }}
        >
          {submitting ? 'Menyimpan...' : submitLabel ?? 'Tambah Item'}
        </Button>
      </Box>
    </Box>
  );
}
