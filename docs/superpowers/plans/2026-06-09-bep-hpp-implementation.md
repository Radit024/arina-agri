# BEP/HPP Modal Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign modal BEP/HPP di halaman Keuangan agar mendukung dua mode (Per Batch & Per Periode) dengan auto-fill data dari modul Stok.

**Architecture:** Hook kalkulasi murni `useBepHppCalculator` menerima angka-angka siap pakai dan mengembalikan hasil; controller mengambil data dari `useStok` & `useTransactions`, menyiapkan angka tersebut sesuai mode yang dipilih user, lalu meneruskannya ke hook. UI `BepHppDialog` hanya menerima props dan tidak menyentuh logika.

**Tech Stack:** TypeScript, React hooks, MUI v6 (`@mui/material`, `@mui/icons-material`), Zod (untuk validasi tipe), Vitest + jsdom (unit tests).

---

> ⚠️ **Prasyarat:** Fitur Stok harus sudah difinalisasi dan `useStok` mengekspos:
> - `batches[].beratMasuk` (number, kg)
> - `batches[].hargaJual` (number, Rp/kg)
> - `batches[].tanggalPanen` (string, format YYYY-MM-DD)
> - `batches[]._id` (string)
> - `batches[].batchCode` (string, label display)
>
> Jika shape data batch berubah, sesuaikan Task 3 bagian data mapping.

---

## File Map

| File | Aksi | Tanggung Jawab |
|---|---|---|
| `hooks/useBepHppCalculator.ts` | **Buat baru** | Pure kalkulasi: terima angka → kembalikan hasil |
| `tests/hooks/useBepHppCalculator.test.ts` | **Buat baru** | Unit tests untuk semua rumus kalkulasi |
| `app/dashboard/keuangan/_components/BepHppDialog.tsx` | **Buat baru** | Pure UI modal: mode toggle, inputs, result cards |
| `controllers/keuangan/useKeuanganController.tsx` | **Modifikasi** | Tambah state mode/batch/periode, hapus kalkulasi inline, panggil useBepHppCalculator |
| `app/dashboard/keuangan/_components/KeuanganView.tsx` | **Modifikasi** | Ganti inline Dialog BEP/HPP dengan `<BepHppDialog />` |

---

## Task 1: Buat `useBepHppCalculator` hook (pure kalkulasi)

**Files:**
- Create: `hooks/useBepHppCalculator.ts`
- Test: `tests/hooks/useBepHppCalculator.test.ts`

- [ ] **Step 1.1: Buat file test dengan semua kasus**

```ts
// tests/hooks/useBepHppCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateBepHpp } from '@/hooks/useBepHppCalculator';

describe('calculateBepHpp', () => {
  it('menghitung HPP per unit dengan benar', () => {
    const result = calculateBepHpp({
      totalBiayaProduksi: 3_000_000,
      biayaTetap: 1_000_000,
      jumlahProduksi: 150,
      hargaJualPerUnit: 30_000,
      totalPendapatan: 4_500_000,
    });
    expect(result.hppPerUnit).toBeCloseTo(20_000);
  });

  it('menghitung biaya variabel total dan per unit dengan benar', () => {
    const result = calculateBepHpp({
      totalBiayaProduksi: 3_000_000,
      biayaTetap: 1_000_000,
      jumlahProduksi: 150,
      hargaJualPerUnit: 30_000,
      totalPendapatan: 4_500_000,
    });
    expect(result.biayaVariabelTotal).toBe(2_000_000);
    expect(result.biayaVariabelPerUnit).toBeCloseTo(13_333.33);
  });

  it('menghitung BEP unit dengan benar', () => {
    const result = calculateBepHpp({
      totalBiayaProduksi: 3_000_000,
      biayaTetap: 1_000_000,
      jumlahProduksi: 150,
      hargaJualPerUnit: 30_000,
      totalPendapatan: 4_500_000,
    });
    // marginKontribusiPerUnit = 30000 - 13333.33 = 16666.67
    // bepUnit = 1000000 / 16666.67 ≈ 60
    expect(result.bepUnit).toBeCloseTo(60, 0);
  });

  it('mengembalikan bepUnit null jika margin kontribusi <= 0', () => {
    const result = calculateBepHpp({
      totalBiayaProduksi: 3_000_000,
      biayaTetap: 1_000_000,
      jumlahProduksi: 150,
      hargaJualPerUnit: 5_000, // harga jual lebih rendah dari biaya variabel/unit
      totalPendapatan: 750_000,
    });
    expect(result.bepUnit).toBeNull();
  });

  it('mengembalikan bepRupiah null jika totalPendapatan = 0', () => {
    const result = calculateBepHpp({
      totalBiayaProduksi: 3_000_000,
      biayaTetap: 1_000_000,
      jumlahProduksi: 150,
      hargaJualPerUnit: 30_000,
      totalPendapatan: 0,
    });
    expect(result.bepRupiah).toBeNull();
  });

  it('biayaVariabelTotal minimum 0 jika biayaTetap > totalBiayaProduksi', () => {
    const result = calculateBepHpp({
      totalBiayaProduksi: 500_000,
      biayaTetap: 1_000_000, // lebih besar dari total biaya
      jumlahProduksi: 50,
      hargaJualPerUnit: 20_000,
      totalPendapatan: 1_000_000,
    });
    expect(result.biayaVariabelTotal).toBe(0);
    expect(result.biayaVariabelPerUnit).toBe(0);
  });

  it('mengembalikan 0 untuk semua hasil jika jumlahProduksi = 0', () => {
    const result = calculateBepHpp({
      totalBiayaProduksi: 3_000_000,
      biayaTetap: 1_000_000,
      jumlahProduksi: 0,
      hargaJualPerUnit: 30_000,
      totalPendapatan: 0,
    });
    expect(result.hppPerUnit).toBe(0);
    expect(result.biayaVariabelPerUnit).toBe(0);
    expect(result.bepUnit).toBeNull();
  });
});
```

- [ ] **Step 1.2: Jalankan test — pastikan GAGAL**

```bash
npx vitest run tests/hooks/useBepHppCalculator.test.ts
```

Expected: error `Cannot find module '@/hooks/useBepHppCalculator'`

- [ ] **Step 1.3: Buat implementasi hook**

```ts
// hooks/useBepHppCalculator.ts

export interface BepHppCalcInput {
  totalBiayaProduksi: number;
  biayaTetap: number;
  jumlahProduksi: number;
  hargaJualPerUnit: number;
  totalPendapatan: number;
}

export interface BepHppCalcResult {
  biayaVariabelTotal: number;
  biayaVariabelPerUnit: number;
  hppPerUnit: number;
  marginKontribusiPerUnit: number;
  bepUnit: number | null;
  bepRupiah: number | null;
}

export function calculateBepHpp(input: BepHppCalcInput): BepHppCalcResult {
  const { totalBiayaProduksi, biayaTetap, jumlahProduksi, hargaJualPerUnit, totalPendapatan } = input;

  const biayaVariabelTotal = Math.max(totalBiayaProduksi - biayaTetap, 0);
  const biayaVariabelPerUnit = jumlahProduksi > 0 ? biayaVariabelTotal / jumlahProduksi : 0;
  const hppPerUnit = jumlahProduksi > 0 ? totalBiayaProduksi / jumlahProduksi : 0;
  const marginKontribusiPerUnit = hargaJualPerUnit - biayaVariabelPerUnit;

  const bepUnit = marginKontribusiPerUnit > 0 ? biayaTetap / marginKontribusiPerUnit : null;

  const marginKontribusiRasio = totalPendapatan > 0
    ? 1 - biayaVariabelTotal / totalPendapatan
    : null;
  const bepRupiah = marginKontribusiRasio !== null && marginKontribusiRasio > 0
    ? biayaTetap / marginKontribusiRasio
    : null;

  return { biayaVariabelTotal, biayaVariabelPerUnit, hppPerUnit, marginKontribusiPerUnit, bepUnit, bepRupiah };
}
```

- [ ] **Step 1.4: Jalankan test — pastikan LULUS**

```bash
npx vitest run tests/hooks/useBepHppCalculator.test.ts
```

Expected: semua 7 test PASS

- [ ] **Step 1.5: Commit**

```bash
git add hooks/useBepHppCalculator.ts tests/hooks/useBepHppCalculator.test.ts
git commit -m "feat(bep-hpp): add pure calculateBepHpp function with tests"
```

---

## Task 2: Buat komponen `BepHppDialog` (pure UI)

**Files:**
- Create: `app/dashboard/keuangan/_components/BepHppDialog.tsx`

- [ ] **Step 2.1: Buat file komponen**

```tsx
// app/dashboard/keuangan/_components/BepHppDialog.tsx
'use client';

import {
  Dialog, DialogTitle, DialogContent,
  Box, Typography, TextField, InputAdornment,
  IconButton, Grid, Select, MenuItem, FormControl,
  InputLabel, Tabs, Tab, Alert, Chip, Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ApiHarvestBatch } from '@/lib/api';
import type { BepHppCalcResult } from '@/hooks/useBepHppCalculator';
import { formatRupiah } from '@/lib/formatters';

export type BepHppMode = 'per_batch' | 'per_periode';

interface BepHppDialogProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  // Mode
  mode: BepHppMode;
  onModeChange: (mode: BepHppMode) => void;
  // Per Batch
  batches: ApiHarvestBatch[];
  selectedBatchId: string | null;
  onBatchChange: (id: string) => void;
  stokLoading: boolean;
  // Per Periode
  periodeOptions: string[];
  selectedPeriode: string;
  onPeriodeChange: (periode: string) => void;
  getBulanLabel: (key: string) => string;
  // Auto-filled display values
  jumlahProduksiDisplay: string;
  hargaJualDisplay: string;
  // Manual input
  biayaTetap: number;
  onBiayaTetapChange: (value: string) => void;
  // Calculated results
  result: BepHppCalcResult;
  formatAngka: (value: number) => string;
}

export default function BepHppDialog({
  open, onClose, theme, mode, onModeChange,
  batches, selectedBatchId, onBatchChange, stokLoading,
  periodeOptions, selectedPeriode, onPeriodeChange, getBulanLabel,
  jumlahProduksiDisplay, hargaJualDisplay,
  biayaTetap, onBiayaTetapChange,
  result, formatAngka,
}: BepHppDialogProps) {
  const biayaTetapStr = biayaTetap === 0 ? '' : String(biayaTetap);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800, lineHeight: 1.2 }}>
              Kalkulator HPP & BEP
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hitung titik impas dan biaya produksi
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        {/* ── Mode selector ── */}
        <Tabs
          value={mode}
          onChange={(_, v) => onModeChange(v as BepHppMode)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Per Batch" value="per_batch" />
          <Tab label="Per Periode" value="per_periode" />
        </Tabs>

        <Grid container spacing={2}>
          {/* ── Mode Per Batch: batch selector ── */}
          {mode === 'per_batch' && (
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Pilih Batch Panen</InputLabel>
                <Select
                  value={selectedBatchId ?? ''}
                  label="Pilih Batch Panen"
                  onChange={(e) => onBatchChange(e.target.value)}
                  disabled={stokLoading || batches.length === 0}
                >
                  {batches.map((b) => (
                    <MenuItem key={b._id} value={b._id}>
                      {b.batchCode} — {b.tanggalPanen} ({b.beratMasuk} kg, Grade {b.grade})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!stokLoading && batches.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>Data stok tidak tersedia</Alert>
              )}
            </Grid>
          )}

          {/* ── Mode Per Periode: periode selector ── */}
          {mode === 'per_periode' && (
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Pilih Periode</InputLabel>
                <Select
                  value={selectedPeriode}
                  label="Pilih Periode"
                  onChange={(e) => onPeriodeChange(e.target.value)}
                >
                  <MenuItem value="semua">Semua Periode</MenuItem>
                  {periodeOptions.map((key) => (
                    <MenuItem key={key} value={key}>{getBulanLabel(key)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* ── Auto-filled: Jumlah Produksi ── */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Jumlah Produksi"
              value={jumlahProduksiDisplay}
              fullWidth
              disabled
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>kg</Typography>
                    </InputAdornment>
                  ),
                  startAdornment: (
                    <InputAdornment position="start">
                      <Chip
                        icon={<AutoAwesomeIcon sx={{ fontSize: 12 }} />}
                        label="auto"
                        size="small"
                        sx={{ bgcolor: '#dcfce7', color: '#15803d', height: 20, fontSize: 10 }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>

          {/* ── Auto-filled: Harga Jual ── */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Harga Jual / kg"
              value={hargaJualDisplay}
              fullWidth
              disabled
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Chip
                        icon={<AutoAwesomeIcon sx={{ fontSize: 12 }} />}
                        label="auto"
                        size="small"
                        sx={{ bgcolor: '#dcfce7', color: '#15803d', height: 20, fontSize: 10 }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp/kg</Typography>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>

          {/* ── Manual: Biaya Tetap ── */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Biaya Tetap"
              type="number"
              value={biayaTetapStr}
              placeholder="0"
              onChange={(e) => onBiayaTetapChange(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  inputProps: { min: 0 },
                  startAdornment: (
                    <InputAdornment position="start">
                      <Chip
                        icon={<EditIcon sx={{ fontSize: 12 }} />}
                        label="manual"
                        size="small"
                        sx={{ bgcolor: '#fef3c7', color: '#92400e', height: 20, fontSize: 10 }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
        </Grid>

        {/* ── Formula hint ── */}
        <Box sx={{ mt: 2, p: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            HPP = Total Biaya Produksi / Jumlah Produksi
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            BEP Unit = Biaya Tetap / (Harga Jual per Unit − Biaya Variabel per Unit)
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            BEP Rupiah = Biaya Tetap / (1 − Biaya Variabel / Total Pendapatan)
          </Typography>
        </Box>

        {/* ── Result cards ── */}
        <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.2 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Biaya Variabel Total</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatRupiah(result.biayaVariabelTotal)}</Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Biaya Variabel per Unit</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {result.biayaVariabelPerUnit > 0 ? formatRupiah(result.biayaVariabelPerUnit) : '—'}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfdf3', border: '1px solid #bbf7d0' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>HPP per Unit</Typography>
            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 800 }}>
              {result.hppPerUnit > 0 ? formatRupiah(result.hppPerUnit) : '—'}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfeff', border: '1px solid #bae6fd' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>BEP Unit</Typography>
            <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 800 }}>
              {result.bepUnit !== null ? `${formatAngka(result.bepUnit)} kg` : '—'}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa', gridColumn: { xs: '1 / -1', md: '1 / -1' } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>BEP Rupiah</Typography>
            <Typography variant="body2" sx={{ color: 'warning.dark', fontWeight: 800 }}>
              {result.bepRupiah !== null ? formatRupiah(result.bepRupiah) : '—'}
            </Typography>
          </Box>
        </Box>

        {/* ── Warnings ── */}
        {biayaTetap === 0 && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Masukkan Biaya Tetap untuk hasil BEP yang akurat
          </Alert>
        )}
        {result.marginKontribusiPerUnit <= 0 && result.hppPerUnit > 0 && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Harga jual terlalu rendah — margin kontribusi negatif, BEP tidak dapat dihitung
          </Alert>
        )}

        <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={onClose} sx={{ borderRadius: 8 }}>
            Tutup
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2.2: Pastikan TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: 0 error (atau hanya error tidak terkait file baru ini)

- [ ] **Step 2.3: Commit**

```bash
git add app/dashboard/keuangan/_components/BepHppDialog.tsx
git commit -m "feat(bep-hpp): add BepHppDialog pure UI component with mode selector"
```

---

## Task 3: Modifikasi `useKeuanganController` — wiring mode & data Stok

**Files:**
- Modify: `controllers/keuangan/useKeuanganController.tsx`

- [ ] **Step 3.1: Tambah import `useStok` dan `calculateBepHpp` di bagian atas file**

Cari baris import terakhir (sekitar baris 19) dan tambahkan:

```ts
import { useStok } from '@/hooks/useStok';
import { calculateBepHpp } from '@/hooks/useBepHppCalculator';
import type { BepHppMode } from '@/app/dashboard/keuangan/_components/BepHppDialog';
```

- [ ] **Step 3.2: Update type `BepHppInputs` dan tambah state baru**

Ganti blok ini (sekitar baris 34–38):

```ts
type BepHppInputs = {
  biayaTetap: number;
  jumlahProduksi: number;
  hargaJualPerUnit: number;
};
```

Dengan (hanya simpan `biayaTetap` — data lain kini dari Stok):

```ts
type BepHppInputs = {
  biayaTetap: number;
};
```

Juga update default value di `useLocalStorage` (sekitar baris 64) dari:
```ts
{ biayaTetap: 0, jumlahProduksi: 0, hargaJualPerUnit: 0 }
```
Menjadi:
```ts
{ biayaTetap: 0 }
```

Tambahkan state baru setelah deklarasi `bepKey` (sekitar baris 63):

```ts
const [bepMode, setBepMode] = useState<BepHppMode>('per_batch');
const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
const [bepPeriode, setBepPeriode] = useState<string>('semua');
```

- [ ] **Step 3.3: Tambahkan `useStok` di dalam body fungsi `useKeuanganController`**

Tambahkan tepat setelah baris `const { transactions, ... } = useTransactions();` (sekitar baris 61):

```ts
const { batches, loading: stokLoading } = useStok();
```

- [ ] **Step 3.4: Ganti blok kalkulasi HPP & BEP inline dengan `calculateBepHpp`**

Hapus seluruh blok ini (sekitar baris 363–378):

```ts
const totalBiayaProduksi = totalPengeluaran;
const biayaVariabelTotal = Math.max(totalPengeluaran - biayaTetap, 0);
const biayaVariabelPerUnit = jumlahProduksi > 0 ? biayaVariabelTotal / jumlahProduksi : 0;
const hppPerUnit = jumlahProduksi > 0 ? totalBiayaProduksi / jumlahProduksi : 0;

const marginKontribusiPerUnit = hargaJualPerUnit - biayaVariabelPerUnit;
const bepUnit = marginKontribusiPerUnit > 0 ? biayaTetap / marginKontribusiPerUnit : null;

const marginKontribusiRasio = totalPendapatan > 0 ? 1 - (biayaVariabelTotal / totalPendapatan) : null;
const bepRupiah = marginKontribusiRasio !== null && marginKontribusiRasio > 0 ? biayaTetap / marginKontribusiRasio : null;
```

Ganti dengan blok berikut (letakkan di posisi yang sama, setelah deklarasi `labaBersih`):

```ts
// ─── Derive input untuk kalkulasi sesuai mode ─────────────────────
const bepSelectedBatch = useMemo(
  () => batches.find((b) => b._id === selectedBatchId) ?? null,
  [batches, selectedBatchId]
);

const bepJumlahProduksi = useMemo(() => {
  if (bepMode === 'per_batch') {
    return bepSelectedBatch?.beratMasuk ?? 0;
  }
  const filtered = bepPeriode === 'semua'
    ? batches
    : batches.filter((b) => b.tanggalPanen.startsWith(bepPeriode));
  return filtered.reduce((sum, b) => sum + b.beratMasuk, 0);
}, [bepMode, bepSelectedBatch, batches, bepPeriode]);

const bepHargaJual = useMemo(() => {
  if (bepMode === 'per_batch') {
    return bepSelectedBatch?.hargaJual ?? 0;
  }
  const filtered = bepPeriode === 'semua'
    ? batches
    : batches.filter((b) => b.tanggalPanen.startsWith(bepPeriode));
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, b) => sum + b.hargaJual, 0) / filtered.length;
}, [bepMode, bepSelectedBatch, batches, bepPeriode]);

const bepCalcResult = useMemo(() => calculateBepHpp({
  totalBiayaProduksi: totalPengeluaran,
  biayaTetap: bepHppInputs.biayaTetap,
  jumlahProduksi: bepJumlahProduksi,
  hargaJualPerUnit: bepHargaJual,
  totalPendapatan,
}), [totalPengeluaran, bepHppInputs.biayaTetap, bepJumlahProduksi, bepHargaJual, totalPendapatan]);
```

- [ ] **Step 3.5: Perbarui `handleBepHppInputChange` agar hanya handle `biayaTetap`**

Hapus baris lama (sekitar baris 189–195):

```ts
const handleBepHppInputChange = useCallback((field: keyof BepHppInputs, rawValue: string) => {
  const numericValue = Math.max(0, Number(rawValue) || 0);
  setBepHppInputs((prev) => ({
    ...prev,
    [field]: numericValue,
  }));
}, [setBepHppInputs]);
```

Ganti dengan:

```ts
const handleBiayaTetapChange = useCallback((rawValue: string) => {
  const numericValue = Math.max(0, Number(rawValue) || 0);
  setBepHppInputs((prev) => ({ ...prev, biayaTetap: numericValue }));
}, [setBepHppInputs]);
```

- [ ] **Step 3.6: Perbarui return object — hapus nilai lama, tambah nilai baru**

Di bagian `return { ... }`, hapus entri lama yang tidak lagi relevan:
```ts
// HAPUS:
bepHppInputs,          // ganti dengan bepHppInputs (tetap ada untuk biayaTetap saja)
jumlahProduksi,        // tidak ada lagi sebagai variabel terpisah
biayaVariabelTotal,    // pindah ke bepCalcResult
biayaVariabelPerUnit,  // pindah ke bepCalcResult
hppPerUnit,            // pindah ke bepCalcResult
marginKontribusiPerUnit, // pindah ke bepCalcResult
bepUnit,               // pindah ke bepCalcResult
marginKontribusiRasio, // tidak diekspos langsung
bepRupiah,             // pindah ke bepCalcResult
handleBepHppInputChange, // diganti
hargaJualDisplayValue, // tidak ada lagi
```

Tambahkan entri baru:
```ts
// TAMBAH di return:
bepMode,
setBepMode,
selectedBatchId,
setSelectedBatchId: onBatchChange,
bepPeriode,
setBepPeriode,
bepCalcResult,
bepJumlahProduksiDisplay: bepJumlahProduksi > 0 ? String(bepJumlahProduksi) : '',
bepHargaJualDisplay: bepHargaJual > 0 ? formatRupiah(bepHargaJual) : '',
handleBiayaTetapChange,
batches,
stokLoading,
```

Juga tambahkan helper `onBatchChange` sebelum return:

```ts
const onBatchChange = useCallback((id: string) => {
  setSelectedBatchId(id);
}, []);
```

- [ ] **Step 3.7: Pastikan TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: 0 error baru (error pra-eksisting pada file lain bisa diabaikan)

- [ ] **Step 3.8: Commit**

```bash
git add controllers/keuangan/useKeuanganController.tsx
git commit -m "feat(bep-hpp): wire mode selector and stock data into keuangan controller"
```

---

## Task 4: Modifikasi `KeuanganView` — ganti inline dialog dengan `BepHppDialog`

**Files:**
- Modify: `app/dashboard/keuangan/_components/KeuanganView.tsx`

- [ ] **Step 4.1: Tambah import `BepHppDialog` di bagian atas file**

Cari baris `import` terakhir dan tambahkan:

```ts
import BepHppDialog from './BepHppDialog';
```

- [ ] **Step 4.2: Hapus props lama dari destructure KeuanganView props**

Di destructure props `KeuanganView`, hapus:
```ts
bepHppInputs,
getBepHppInputDisplayValue,
handleBepHppInputChange,
biayaVariabelTotal,
biayaVariabelPerUnit,
hppPerUnit,
marginKontribusiPerUnit,
bepUnit,
marginKontribusiRasio,
bepRupiah,
biayaTetapDisplayValue,
hargaJualDisplayValue,
```

Tambahkan props baru:
```ts
bepMode,
setBepMode,
selectedBatchId,
setSelectedBatchId,
bepPeriode,
setBepPeriode,
bepCalcResult,
bepJumlahProduksiDisplay,
bepHargaJualDisplay,
handleBiayaTetapChange,
batches,
stokLoading,
bepHppInputs,  // tetap ada, untuk mengambil biayaTetap
```

- [ ] **Step 4.3: Hapus seluruh inline Dialog BEP/HPP lama**

Hapus blok `{/* ─── MODAL: Kalkulator HPP & BEP ─── */}` yang dimulai dari `<Dialog open={bepHppDialogOpen}` hingga `</Dialog>` penutupnya (sekitar baris 758–910 di KeuanganView.tsx).

- [ ] **Step 4.4: Tambahkan `<BepHppDialog />` di posisi yang sama**

Tepat setelah Dialog transaksi ditutup, tambahkan:

```tsx
<BepHppDialog
  open={bepHppDialogOpen}
  onClose={() => setBepHppDialogOpen(false)}
  theme={theme}
  mode={bepMode}
  onModeChange={setBepMode}
  batches={batches}
  selectedBatchId={selectedBatchId}
  onBatchChange={setSelectedBatchId}
  stokLoading={stokLoading}
  periodeOptions={bulanOptions}
  selectedPeriode={bepPeriode}
  onPeriodeChange={setBepPeriode}
  getBulanLabel={getBulanLabel}
  jumlahProduksiDisplay={bepJumlahProduksiDisplay}
  hargaJualDisplay={bepHargaJualDisplay}
  biayaTetap={bepHppInputs.biayaTetap}
  onBiayaTetapChange={handleBiayaTetapChange}
  result={bepCalcResult}
  formatAngka={formatAngka}
/>
```

- [ ] **Step 4.5: Pastikan TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: 0 error baru

- [ ] **Step 4.6: Jalankan semua tests untuk memastikan tidak ada regresi**

```bash
npx vitest run
```

Expected: semua test PASS termasuk test BEP/HPP baru

- [ ] **Step 4.7: Commit final**

```bash
git add app/dashboard/keuangan/_components/KeuanganView.tsx
git commit -m "feat(bep-hpp): replace inline BEP/HPP dialog with BepHppDialog component"
```

---

## Checklist Verifikasi Manual

Setelah semua task selesai, buka aplikasi dan verifikasi:

- [ ] Tombol "HPP & BEP" di halaman Keuangan masih bisa diklik
- [ ] Modal terbuka dengan dua tab: "Per Batch" dan "Per Periode"
- [ ] Tab "Per Batch": dropdown batch terisi dari data Stok, pilih batch → jumlah produksi & harga jual auto-fill
- [ ] Tab "Per Periode": dropdown periode terisi dari bulan-bulan yang ada di transaksi, pilih periode → produksi & harga teragregasi
- [ ] Input "Biaya Tetap" bisa diisi manual, nilai tersimpan antar session (localStorage)
- [ ] Hasil HPP, BEP Unit, BEP Rupiah, dan Margin Kontribusi tampil dengan benar
- [ ] Warning kuning muncul jika biayaTetap = 0
- [ ] Error merah muncul jika margin kontribusi ≤ 0
- [ ] Jika data Stok kosong: dropdown disabled + info "Data stok tidak tersedia"
