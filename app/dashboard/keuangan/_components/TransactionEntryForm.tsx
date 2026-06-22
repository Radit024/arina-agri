'use client';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
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
import SettingsIcon from '@mui/icons-material/Settings';

import type { TransactionDraft, DraftErrors } from '@/controllers/keuangan/useTransactionBatchController';
import { formatDateInputValue, normalizeDateInputValue } from '@/lib/formatters';

interface Props {
  draft: TransactionDraft;
  kategoriList: string[];
  satuanList: string[];
  errors: DraftErrors;
  onFieldChange: (field: keyof TransactionDraft, value: string) => void;
  onOpenKategoriDialog: () => void;
  onOpenSatuanDialog: () => void;
  rabSuggestion: string | null;
}

export default function TransactionEntryForm({
  draft,
  kategoriList,
  satuanList,
  errors,
  onFieldChange,
  onOpenKategoriDialog,
  onOpenSatuanDialog,
  rabSuggestion,
}: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Jenis & Tanggal */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Jenis Transaksi</InputLabel>
            <Select
              value={draft.jenis}
              label="Jenis Transaksi"
              onChange={(e) => onFieldChange('jenis', e.target.value)}
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
            onChange={(e) => onFieldChange('tanggal', normalizeDateInputValue(e.target.value))}
            fullWidth
            size="small"
            required
            error={!!errors.tanggal}
            helperText={errors.tanggal || ''}
            placeholder="05-06-2026"
          />
        </Grid>
      </Grid>

      {/* Kategori */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <FormControl fullWidth size="small" error={!!errors.kategori} required>
          <InputLabel>Kategori</InputLabel>
          <Select
            value={draft.kategori}
            label="Kategori"
            onChange={(e) => onFieldChange('kategori', e.target.value)}
          >
            {kategoriList.map((k) => (
              <MenuItem key={k} value={k}>{k}</MenuItem>
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

      {/* Volume & Satuan */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField
            label="Volume (opsional)"
            value={draft.volume}
            onChange={(e) => onFieldChange('volume', e.target.value)}
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

      {/* Harga Satuan */}
      <TextField
        label="Harga Satuan (opsional)"
        value={draft.hargaSatuan}
        onChange={(e) => onFieldChange('hargaSatuan', e.target.value)}
        fullWidth
        size="small"
        placeholder="0"
        error={!!errors.hargaSatuan}
        slotProps={{
          input: {
            startAdornment: draft.hargaSatuan ? (
              <InputAdornment position="start">
                <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.875rem' }}>Rp</Typography>
              </InputAdornment>
            ) : undefined,
          },
        }}
        helperText={errors.hargaSatuan || 'Jika diisi bersama Volume, Nominal dihitung otomatis'}
      />

      {/* Nominal */}
      <TextField
        label="Nominal"
        value={draft.nominal}
        onChange={(e) => onFieldChange('nominal', e.target.value)}
        fullWidth
        size="small"
        required
        error={!!errors.nominal}
        helperText={errors.nominal || 'Auto-dihitung dari Volume × Harga Satuan'}
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

      {/* Detail / Catatan */}
      <TextField
        label="Detail / Catatan (opsional)"
        value={draft.keterangan}
        onChange={(e) => onFieldChange('keterangan', e.target.value)}
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

      {/* RAB Suggestion */}
      {rabSuggestion && (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, py: 0.5 }}>
          Akan dihubungkan ke RAB: <strong>{rabSuggestion}</strong>
        </Alert>
      )}
    </Box>
  );
}
