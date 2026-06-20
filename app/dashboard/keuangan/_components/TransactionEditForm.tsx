'use client';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
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

import type { DraftErrors, TransactionDraft } from '@/controllers/keuangan/useTransactionBatchController';
import { formatDateInputValue, normalizeDateInputValue } from '@/lib/formatters';

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

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Jenis Transaksi</InputLabel>
            <Select
              value={draft.jenis}
              label="Jenis Transaksi"
              onChange={(event) => onFieldChange('jenis', event.target.value)}
            >
              <MenuItem value="pengeluaran">Pengeluaran</MenuItem>
              <MenuItem value="pendapatan">Pendapatan</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Tanggal"
            value={formatDateInputValue(draft.tanggal)}
            onChange={(event) => onFieldChange('tanggal', normalizeDateInputValue(event.target.value))}
            fullWidth
            size="small"
            required
            error={!!errors.tanggal}
            helperText={errors.tanggal || ''}
            placeholder="05-06-2026"
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <FormControl fullWidth size="small" error={!!errors.kategori} required>
          <InputLabel>Kategori</InputLabel>
          <Select
            value={draft.kategori}
            label="Kategori"
            onChange={(event) => onFieldChange('kategori', event.target.value)}
          >
            {kategoriList.map((kategori) => (
              <MenuItem key={kategori} value={kategori}>{kategori}</MenuItem>
            ))}
          </Select>
          {errors.kategori && <FormHelperText>{errors.kategori}</FormHelperText>}
        </FormControl>
        <IconButton
          size="small"
          onClick={onOpenKategoriDialog}
          title="Kelola Kategori"
          sx={{ mt: 0.5, flexShrink: 0 }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField
            label="Volume (opsional)"
            value={draft.volume}
            onChange={(event) => onFieldChange('volume', event.target.value)}
            fullWidth
            size="small"
            type="number"
            error={!!errors.volume}
            helperText={errors.volume}
            slotProps={{ input: { inputProps: { min: 0, step: 'any' } } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 7 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Autocomplete
              freeSolo
              options={satuanList}
              value={draft.satuan}
              onInputChange={(_, value) => onFieldChange('satuan', value)}
              size="small"
              fullWidth
              renderInput={(params) => (
                <TextField {...params} label="Satuan (opsional)" />
              )}
            />
            <IconButton
              size="small"
              onClick={onOpenSatuanDialog}
              title="Kelola Satuan"
              sx={{ mt: 0.5, flexShrink: 0 }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>
        </Grid>
      </Grid>

      <TextField
        label="Harga Satuan (opsional)"
        value={draft.hargaSatuan}
        onChange={(event) => onFieldChange('hargaSatuan', event.target.value)}
        fullWidth
        size="small"
        placeholder="0"
        error={!!errors.hargaSatuan}
        helperText={errors.hargaSatuan || 'Jika diisi bersama Volume, Nominal dihitung otomatis'}
        slotProps={{
          input: {
            startAdornment: draft.hargaSatuan ? (
              <InputAdornment position="start">
                <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.875rem' }}>
                  Rp
                </Typography>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      <TextField
        label="Nominal"
        value={draft.nominal}
        onChange={(event) => onFieldChange('nominal', event.target.value)}
        fullWidth
        size="small"
        required
        error={!!errors.nominal}
        helperText={errors.nominal || 'Auto-dihitung dari Volume x Harga Satuan'}
        placeholder="250.000"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.875rem' }}>Rp</Typography>
              </InputAdornment>
            ),
          },
        }}
      />

      <TextField
        label="Detail / Catatan (opsional)"
        value={draft.keterangan}
        onChange={(event) => onFieldChange('keterangan', event.target.value)}
        fullWidth
        size="small"
        multiline
        rows={2}
        placeholder={
          draft.jenis === 'pengeluaran'
            ? 'Contoh: Pembelian pupuk urea 50kg'
            : 'Contoh: Penjualan padi grade A'
        }
      />

      {rabSuggestion && (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, py: 0.5 }}>
          Akan dihubungkan ke RAB: <strong>{rabSuggestion}</strong>
        </Alert>
      )}

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
