'use client';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
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

import { formatDateInputValue, normalizeDateInputValue } from '@/lib/formatters';

export type TransactionFormDraft = {
  id: string;
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  volume: string;
  satuan: string;
  hargaSatuan: string;
  nominal: string;
  tanggal: string;
  keterangan: string;
  applyRabSuggestion: boolean;
};

export type TransactionFormFieldName = keyof TransactionFormDraft;
export type TransactionFormErrors = Record<string, string>;

interface Props {
  draft: TransactionFormDraft;
  kategoriList: string[];
  satuanList: string[];
  errors: TransactionFormErrors;
  onFieldChange: (field: TransactionFormFieldName, value: string) => void;
  onOpenKategoriDialog: () => void;
  onOpenSatuanDialog: () => void;
  rabSuggestion: string | null;
  showRabSuggestionAction?: boolean;
  idPrefix?: string;
}

export default function TransactionFormFields({
  draft,
  kategoriList,
  satuanList,
  errors,
  onFieldChange,
  onOpenKategoriDialog,
  onOpenSatuanDialog,
  rabSuggestion,
  showRabSuggestionAction = false,
  idPrefix,
}: Props) {
  const fieldIdPrefix = `transaction-${(idPrefix ?? draft.id).replace(/\s+/g, '-')}`;
  const ids = {
    jenis: `${fieldIdPrefix}-jenis`,
    jenisLabel: `${fieldIdPrefix}-jenis-label`,
    tanggal: `${fieldIdPrefix}-tanggal`,
    kategori: `${fieldIdPrefix}-kategori`,
    kategoriLabel: `${fieldIdPrefix}-kategori-label`,
    volume: `${fieldIdPrefix}-volume`,
    satuan: `${fieldIdPrefix}-satuan`,
    hargaSatuan: `${fieldIdPrefix}-harga-satuan`,
    nominal: `${fieldIdPrefix}-nominal`,
    keterangan: `${fieldIdPrefix}-keterangan`,
    applyRabSuggestion: `${fieldIdPrefix}-apply-rab-suggestion`,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel id={ids.jenisLabel}>Jenis Transaksi</InputLabel>
            <Select
              id={ids.jenis}
              labelId={ids.jenisLabel}
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
            id={ids.tanggal}
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
          <InputLabel id={ids.kategoriLabel}>Kategori</InputLabel>
          <Select
            id={ids.kategori}
            labelId={ids.kategoriLabel}
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
          aria-label="Kelola Kategori"
          sx={{ mt: 0.5, flexShrink: 0, width: 40, height: 40 }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField
            id={ids.volume}
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
              id={ids.satuan}
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
              aria-label="Kelola Satuan"
              sx={{ mt: 0.5, flexShrink: 0, width: 40, height: 40 }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>
        </Grid>
      </Grid>

      <TextField
        id={ids.hargaSatuan}
        label="Harga Satuan (opsional)"
        value={draft.hargaSatuan}
        onChange={(event) => onFieldChange('hargaSatuan', event.target.value)}
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

      <TextField
        id={ids.nominal}
        label="Nominal"
        value={draft.nominal}
        onChange={(event) => onFieldChange('nominal', event.target.value)}
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

      <TextField
        id={ids.keterangan}
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
        <Alert
          severity="info"
          variant="outlined"
          sx={{
            borderRadius: 2,
            py: 0.5,
            ...(showRabSuggestionAction && { display: 'flex', alignItems: 'center' }),
          }}
          action={showRabSuggestionAction ? (
            <FormControlLabel
              control={
                <Checkbox
                  id={ids.applyRabSuggestion}
                  size="small"
                  checked={draft.applyRabSuggestion}
                  onChange={(event) => onFieldChange('applyRabSuggestion', String(event.target.checked))}
                  sx={{ py: 0 }}
                />
              }
              label={<Typography variant="caption" sx={{ fontWeight: 700 }}>Hubungkan Otomatis</Typography>}
              sx={{ m: 0 }}
            />
          ) : undefined}
        >
          {showRabSuggestionAction ? 'Saran RAB:' : 'Akan dihubungkan ke RAB:'} <strong>{rabSuggestion}</strong>
        </Alert>
      )}
    </Box>
  );
}
