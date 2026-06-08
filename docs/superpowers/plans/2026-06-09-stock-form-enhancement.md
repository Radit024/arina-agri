# Stock Form Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Penyempurnaan form Stock In & Stock Out — tambah `namaPembeli`, `hargaRealisasi`, master data buyers, dan UX helpers (auto-fill expiry, preview nilai, batch info card, validasi berat real-time).

**Architecture:** Strict UI/Controller separation — semua logika (auto-fill, computed values, error setting) ada di `StokController.tsx`; `StokView.tsx` hanya terima props dan render. Pure helper functions (`computeExpiryDate`, `computeStockOutTotal`) diekspor dari `hooks/useStok.ts` agar bisa di-unit-test. Buyer upsert dikelola di dalam `useStok.stockOut`.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL), MUI v6 (`Autocomplete` freeSolo), react-hook-form + Zod, TypeScript, Vitest + jsdom.

---

## File Map

| File | Status | Tanggung Jawab |
|------|--------|----------------|
| `docs/sql/2026-06-09-stock-form-enhancement.sql` | **Create** | SQL migration — buat tabel `buyers`, tambah kolom `stock_mutations` |
| `lib/api.ts` | **Modify** | Tambah `ApiBuyer` type, `buyersApi`, update `ApiStockMutation`, `mapMutation`, `stokApi.stockOut` |
| `app/dashboard/stok/_lib/stockSchemas.ts` | **Modify** | Update `stockOutSchema` tambah `namaPembeli` + `hargaRealisasi` |
| `hooks/useStok.ts` | **Modify** | Export `computeExpiryDate`, `computeStockOutTotal`; tambah `buyers` state + `loadBuyers`; update `stockOut` |
| `controllers/stok/StokController.tsx` | **Modify** | Auto-fill expiry, auto-fill hargaRealisasi, computed props, validasi berat via `setError` |
| `app/dashboard/stok/_components/StokView.tsx` | **Modify** | BatchInfoCard, Autocomplete namaPembeli, hargaRealisasi + diff, preview total, preview nilai masuk |
| `tests/hooks/useStok.test.ts` | **Modify** | Tambah test untuk `computeExpiryDate` dan `computeStockOutTotal` |

---

## Task 1: SQL Migration File

**Files:**
- Create: `docs/sql/2026-06-09-stock-form-enhancement.sql`

- [ ] **Step 1.1: Buat file SQL migration**

```sql
-- ============================================================
-- Stock Form Enhancement Migration
-- Tanggal: 2026-06-09
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabel buyers — menyimpan daftar nama pembeli per user
CREATE TABLE IF NOT EXISTS buyers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,
  nama       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);

-- 2. Tambah kolom ke stock_mutations
ALTER TABLE stock_mutations
  ADD COLUMN IF NOT EXISTS nama_pembeli    text,
  ADD COLUMN IF NOT EXISTS harga_realisasi numeric;
```

Simpan file di `docs/sql/2026-06-09-stock-form-enhancement.sql`.

- [ ] **Step 1.2: Jalankan SQL di Supabase Dashboard**

Buka Supabase Dashboard → SQL Editor → paste isi file → Run.

Verifikasi: di Table Editor pastikan tabel `buyers` ada dan `stock_mutations` punya kolom `nama_pembeli` + `harga_realisasi`.

- [ ] **Step 1.3: Commit**

```bash
git add docs/sql/2026-06-09-stock-form-enhancement.sql
git commit -m "sql: add buyers table and stock_mutations columns for form enhancement"
```

---

## Task 2: Unit Tests untuk Pure Functions (TDD)

**Files:**
- Modify: `tests/hooks/useStok.test.ts`

Tulis test SEBELUM implementasi fungsinya.

- [ ] **Step 2.1: Tambah tests ke `tests/hooks/useStok.test.ts`**

Tambahkan dua `describe` block baru di bawah yang sudah ada:

```ts
import { describe, it, expect } from 'vitest';
import { computeLocalSummary, computeExpiryDate, computeStockOutTotal } from '@/hooks/useStok';
// ... (import ApiHarvestBatch tetap sama)
```

Tambahkan di akhir file (setelah describe block `computeLocalSummary` yang sudah ada):

```ts
describe('computeExpiryDate', () => {
  it('mengembalikan tanggal +14 hari dari tanggal panen', () => {
    const result = computeExpiryDate('2026-06-09');
    expect(result).toBe('2026-06-23');
  });

  it('menangani akhir bulan dengan benar', () => {
    const result = computeExpiryDate('2026-06-20');
    expect(result).toBe('2026-07-04');
  });

  it('menangani akhir tahun dengan benar', () => {
    const result = computeExpiryDate('2026-12-25');
    expect(result).toBe('2027-01-08');
  });
});

describe('computeStockOutTotal', () => {
  it('menghitung total transaksi dengan benar', () => {
    expect(computeStockOutTotal(350, 42000)).toBe(14_700_000);
  });

  it('mengembalikan 0 jika berat 0', () => {
    expect(computeStockOutTotal(0, 45000)).toBe(0);
  });

  it('mengembalikan 0 jika harga 0', () => {
    expect(computeStockOutTotal(100, 0)).toBe(0);
  });
});
```

- [ ] **Step 2.2: Jalankan test — pastikan FAIL**

```bash
npx vitest run tests/hooks/useStok.test.ts
```

Expected output: FAIL — `computeExpiryDate is not exported` / `computeStockOutTotal is not exported`.

- [ ] **Step 2.3: Commit tests (merah dulu)**

```bash
git add tests/hooks/useStok.test.ts
git commit -m "test(stok): add failing tests for computeExpiryDate and computeStockOutTotal"
```

---

## Task 3: Update `lib/api.ts`

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 3.1: Tambah type `ApiBuyer` setelah `StokSummary`**

Cari baris:
```ts
export interface StokSummary {
```

Tambahkan setelah closing brace `StokSummary`:

```ts
export interface ApiBuyer {
  id: string;
  nama: string;
  userId: string;
  createdAt: string;
}
```

- [ ] **Step 3.2: Update `ApiStockMutation` — tambah dua field opsional**

Ganti interface `ApiStockMutation`:
```ts
export interface ApiStockMutation {
  _id: string;
  batchId: string;
  batchCode: string;
  tipe: 'masuk' | 'keluar';
  berat: number;
  tujuan?: string;
  tanggal: string;
  catatan: string;
  createdAt: string;
  namaPembeli?: string;
  hargaRealisasi?: number;
}
```

- [ ] **Step 3.3: Update `mapMutation` — petakan kolom baru**

Ganti fungsi `mapMutation`:
```ts
function mapMutation(row: any): ApiStockMutation {
  return {
    _id: row.id,
    batchId: row.batch_id,
    batchCode: row.batch_code,
    tipe: row.tipe,
    berat: row.berat,
    tujuan: row.tujuan,
    tanggal: row.tanggal,
    catatan: row.catatan ?? '',
    createdAt: row.created_at,
    namaPembeli: row.nama_pembeli ?? undefined,
    hargaRealisasi: row.harga_realisasi ?? undefined,
  };
}
```

- [ ] **Step 3.4: Update `stokApi.stockOut` — tambah parameter `namaPembeli` dan `hargaRealisasi`**

Ganti signature dan insert body di `stokApi.stockOut`:
```ts
stockOut: async (
  batchId: string,
  payload: {
    berat: number;
    tujuan: string;
    tanggal: string;
    catatan: string;
    namaPembeli?: string;
    hargaRealisasi?: number;
  }
): Promise<{ batch: ApiHarvestBatch; mutation: ApiStockMutation }> => {
  const user = await resolveCurrentUser();
  if (!user) throw new Error('Belum login');

  const { data: batchRow, error: fetchErr } = await supabase
    .from('harvest_batches').select('*').eq('id', batchId).single();
  if (fetchErr) throw new Error(fetchErr.message);
  const batch = mapBatch(batchRow);

  if (payload.berat > batch.stokTersisa) {
    throw new Error(`Stok tidak cukup. Tersisa: ${batch.stokTersisa} kg`);
  }

  const newStok = batch.stokTersisa - payload.berat;
  const newStatus = computeStatus(newStok, batch.beratMasuk, batch.estimasiKadaluarsa);

  const { data: updatedBatch, error: updateErr } = await supabase
    .from('harvest_batches')
    .update({ stok_tersisa: newStok, status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', batchId)
    .select()
    .single();
  if (updateErr) throw new Error(updateErr.message);

  const { data: mutationRow, error: mutErr } = await supabase
    .from('stock_mutations')
    .insert({
      user_id: user.id,
      batch_id: batchId,
      batch_code: batch.batchCode,
      tipe: 'keluar',
      berat: payload.berat,
      tujuan: payload.tujuan,
      tanggal: payload.tanggal,
      catatan: payload.catatan,
      nama_pembeli: payload.namaPembeli ?? null,
      harga_realisasi: payload.hargaRealisasi ?? null,
    })
    .select()
    .single();
  if (mutErr) throw new Error(mutErr.message);

  return { batch: mapBatch(updatedBatch), mutation: mapMutation(mutationRow) };
},
```

- [ ] **Step 3.5: Tambah `buyersApi` setelah `stokApi`**

Tambahkan setelah closing `};` dari `stokApi`:

```ts
export const buyersApi = {
  getAll: async (): Promise<ApiBuyer[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('user_id', user.id)
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      nama: row.nama,
      userId: row.user_id,
      createdAt: row.created_at,
    }));
  },

  upsert: async (nama: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) return;
    const { error } = await supabase
      .from('buyers')
      .upsert({ user_id: user.id, nama }, { onConflict: 'user_id,nama', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  },
};
```

- [ ] **Step 3.6: Cek TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3.7: Commit**

```bash
git add lib/api.ts
git commit -m "feat(api): add ApiBuyer type, buyersApi, update stockOut with namaPembeli/hargaRealisasi"
```

---

## Task 4: Update `stockSchemas.ts`

**Files:**
- Modify: `app/dashboard/stok/_lib/stockSchemas.ts`

- [ ] **Step 4.1: Tambah field ke `stockOutSchema`**

Ganti seluruh isi file:
```ts
import { z } from 'zod';

export const batchSchema = z.object({
  tanggalPanen: z.string(),
  grade: z.enum(['A', 'B', 'C']),
  beratMasuk: z.coerce.number(),
  hargaModal: z.coerce.number(),
  hargaJual: z.coerce.number(),
  lokasiPenyimpanan: z.enum(['Gudang Utama', 'Gudang Cadangan']),
  estimasiKadaluarsa: z.string(),
  catatan: z.string().optional(),
});

export const stockOutSchema = z.object({
  batchId: z.string(),
  berat: z.coerce.number(),
  tujuan: z.enum(['Pasar Lokal', 'Distributor', 'Restoran', 'Lainnya']),
  tanggal: z.string(),
  catatan: z.string().optional(),
  namaPembeli: z.string().optional(),
  hargaRealisasi: z.coerce.number().min(0).optional(),
});

export type BatchFormInput = z.input<typeof batchSchema>;
export type BatchFormOutput = z.output<typeof batchSchema>;
export type StockOutFormInput = z.input<typeof stockOutSchema>;
export type StockOutFormOutput = z.output<typeof stockOutSchema>;
```

- [ ] **Step 4.2: Cek TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4.3: Commit**

```bash
git add app/dashboard/stok/_lib/stockSchemas.ts
git commit -m "feat(stok): add namaPembeli and hargaRealisasi fields to stockOutSchema"
```

---

## Task 5: Update `hooks/useStok.ts`

**Files:**
- Modify: `hooks/useStok.ts`

- [ ] **Step 5.1: Tambah import `buyersApi` dan `ApiBuyer`**

Ganti baris import:
```ts
import { stokApi, buyersApi, type ApiHarvestBatch, type ApiStockMutation, type StokSummary, type ApiBuyer } from '@/lib/api';
```

- [ ] **Step 5.2: Export fungsi `computeExpiryDate` dan `computeStockOutTotal`**

Tambahkan dua fungsi ini setelah `computeLocalSummary` (sebelum `useStok`):

```ts
export function computeExpiryDate(tanggalPanen: string): string {
  const date = new Date(tanggalPanen);
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
}

export function computeStockOutTotal(berat: number, hargaRealisasi: number): number {
  return berat * hargaRealisasi;
}
```

- [ ] **Step 5.3: Tambah `buyers` state dan `loadBuyers` di dalam `useStok`**

Di dalam `useStok`, setelah baris `const [error, setError] = useState<string | null>(null);`, tambahkan:
```ts
const [buyers, setBuyers] = useState<ApiBuyer[]>([]);
```

Setelah fungsi `loadData`, tambahkan `loadBuyers`:
```ts
const loadBuyers = useCallback(async () => {
  if (!user) return;
  try {
    const data = await buyersApi.getAll();
    setBuyers(data);
  } catch {
    // buyers non-critical, jangan crash
  }
}, [user]);

useEffect(() => { loadBuyers(); }, [loadBuyers]);
```

- [ ] **Step 5.4: Update `stockOut` — tambah `namaPembeli`/`hargaRealisasi` + upsert buyer**

Ganti fungsi `stockOut` di dalam `useStok`:
```ts
const stockOut = async (batchId: string, outData: Parameters<typeof stokApi.stockOut>[1]) => {
  const result = await stokApi.stockOut(batchId, outData);
  setBatches((prev) => prev.map((b) => (b._id === batchId ? result.batch : b)));
  setMutations((prev) => [result.mutation, ...prev]);
  setSummary(computeLocalSummary(batches.map(b => b._id === batchId ? result.batch : b)));

  // Simpan nama pembeli baru ke master data
  if (outData.namaPembeli?.trim()) {
    try {
      await buyersApi.upsert(outData.namaPembeli.trim());
      await loadBuyers();
    } catch {
      // non-critical
    }
  }
};
```

- [ ] **Step 5.5: Tambah `buyers` ke return value `useStok`**

Ganti baris `return`:
```ts
return {
  batches, mutations, summary, loading, backendOnline: true, error, buyers,
  addBatch, updateBatch, closeBatch, stockOut, refreshMutations, reload: loadData,
};
```

- [ ] **Step 5.6: Jalankan tests — pastikan PASS**

```bash
npx vitest run tests/hooks/useStok.test.ts
```

Expected: PASS — 11 tests (5 lama + 3 `computeExpiryDate` + 3 `computeStockOutTotal`).

- [ ] **Step 5.7: Cek TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5.8: Commit**

```bash
git add hooks/useStok.ts tests/hooks/useStok.test.ts
git commit -m "feat(stok): export computeExpiryDate/computeStockOutTotal, add buyers state to useStok"
```

---

## Task 6: Update `StokController.tsx`

**Files:**
- Modify: `controllers/stok/StokController.tsx`

- [ ] **Step 6.1: Tambah imports**

Tambahkan imports baru:
```ts
import { useEffect } from 'react';
import { computeExpiryDate } from '@/hooks/useStok';
import type { ApiBuyer } from '@/lib/api';
```

(Catatan: `useState` sudah ada. `useEffect` perlu ditambah ke import React.)

Ganti baris import React:
```ts
import { useState, useEffect } from 'react';
```

- [ ] **Step 6.2: Ambil `buyers` dari `useStok`**

Ganti destructuring `useStok`:
```ts
const {
  batches, mutations, summary, loading, backendOnline, buyers,
  addBatch, closeBatch, stockOut, refreshMutations,
} = useStok();
```

- [ ] **Step 6.3: Tambah `useEffect` auto-fill expiry**

Tambahkan setelah deklarasi `stockOutForm`, sebelum `openAddBatch`:

```ts
// Auto-fill estimasiKadaluarsa = tanggalPanen + 14 hari
const watchedTanggalPanen = batchForm.watch('tanggalPanen');
useEffect(() => {
  if (!watchedTanggalPanen) return;
  const current = batchForm.getValues('estimasiKadaluarsa');
  if (!current) {
    batchForm.setValue('estimasiKadaluarsa', computeExpiryDate(watchedTanggalPanen));
  }
}, [watchedTanggalPanen, batchForm]);
```

- [ ] **Step 6.4: Tambah `useEffect` auto-fill `hargaRealisasi` dan `setError` validasi berat**

Tambahkan setelah useEffect sebelumnya:

```ts
// Auto-fill hargaRealisasi dari batch yang dipilih; validasi berat real-time
const watchedBatchId = stockOutForm.watch('batchId');
const watchedBerat = stockOutForm.watch('berat');
const watchedHargaRealisasi = stockOutForm.watch('hargaRealisasi');

useEffect(() => {
  if (!watchedBatchId) return;
  const batch = batches.find((b) => b._id === watchedBatchId);
  if (!batch) return;
  // Auto-fill harga realisasi dari harga jual batch (hanya jika belum diubah user)
  const currentHarga = stockOutForm.getValues('hargaRealisasi');
  if (!currentHarga) {
    stockOutForm.setValue('hargaRealisasi', batch.hargaJual);
  }
}, [watchedBatchId, batches, stockOutForm]);

useEffect(() => {
  if (!watchedBatchId || !watchedBerat) return;
  const batch = batches.find((b) => b._id === watchedBatchId);
  if (!batch) return;
  if (watchedBerat > batch.stokTersisa) {
    stockOutForm.setError('berat', {
      type: 'manual',
      message: `Melebihi stok tersisa (${batch.stokTersisa} kg). Maksimal ${batch.stokTersisa} kg.`,
    });
  } else {
    stockOutForm.clearErrors('berat');
  }
}, [watchedBerat, watchedBatchId, batches, stockOutForm]);
```

- [ ] **Step 6.5: Hitung computed props untuk view**

Tambahkan setelah `useEffect` di atas, sebelum `openAddBatch`:

```ts
// Computed props untuk StokView
const stockOutSelectedBatch = batches.find((b) => b._id === watchedBatchId) ?? null;

const watchedBeratMasuk = batchForm.watch('beratMasuk');
const watchedHargaJual = batchForm.watch('hargaJual');
const batchEstimatedValue =
  (watchedBeratMasuk > 0 && watchedHargaJual > 0)
    ? watchedBeratMasuk * watchedHargaJual
    : 0;

const stockOutTotal =
  (watchedBerat > 0 && (watchedHargaRealisasi ?? 0) > 0)
    ? watchedBerat * (watchedHargaRealisasi ?? 0)
    : 0;

const stockOutHargaDiff: number | null =
  stockOutSelectedBatch && (watchedHargaRealisasi ?? 0) > 0
    ? (watchedHargaRealisasi ?? 0) - stockOutSelectedBatch.hargaJual
    : null;
```

- [ ] **Step 6.6: Update `onStockOutSubmit` — pass field baru**

Ganti fungsi `onStockOutSubmit`:
```ts
const onStockOutSubmit = async (data: StockOutFormOutput) => {
  await stockOut(data.batchId, {
    berat: data.berat,
    tujuan: data.tujuan,
    tanggal: data.tanggal,
    catatan: data.catatan || '',
    namaPembeli: data.namaPembeli?.trim() || undefined,
    hargaRealisasi: data.hargaRealisasi || undefined,
  });
  setStockOutDialogOpen(false);
  stockOutForm.reset();
};
```

- [ ] **Step 6.7: Tambah props baru ke `<StokView />`**

Di JSX return `<StokView ... />`, tambahkan props baru:
```tsx
buyers={buyers}
stockOutSelectedBatch={stockOutSelectedBatch}
batchEstimatedValue={batchEstimatedValue}
stockOutTotal={stockOutTotal}
stockOutHargaDiff={stockOutHargaDiff}
```

- [ ] **Step 6.8: Cek TypeScript**

```bash
npx tsc --noEmit
```

Expected: error karena `StokView` belum menerima props baru (akan diperbaiki di Task 7). Pastikan tidak ada error lain di `StokController.tsx` sendiri.

- [ ] **Step 6.9: Commit**

```bash
git add controllers/stok/StokController.tsx
git commit -m "feat(stok): add auto-fill expiry, hargaRealisasi, berat validation, computed props in controller"
```

---

## Task 7: Update `StokView.tsx`

**Files:**
- Modify: `app/dashboard/stok/_components/StokView.tsx`

- [ ] **Step 7.1: Tambah MUI `Autocomplete` import**

Tambahkan ke blok import MUI:
```ts
import Autocomplete from '@mui/material/Autocomplete';
import Tooltip from '@mui/material/Tooltip';
```

- [ ] **Step 7.2: Tambah import tipe `ApiBuyer`**

Ganti baris import dari `@/lib/api`:
```ts
import type { ApiHarvestBatch, ApiStockMutation, StokSummary, ApiBuyer } from '@/lib/api';
```

- [ ] **Step 7.3: Update `StokViewProps` — tambah 5 props baru**

Di dalam interface `StokViewProps`, tambahkan setelah props yang ada:
```ts
buyers: ApiBuyer[];
stockOutSelectedBatch: ApiHarvestBatch | null;
batchEstimatedValue: number;
stockOutTotal: number;
stockOutHargaDiff: number | null;
```

- [ ] **Step 7.4: Tambah props ke destructuring `StokView`**

Tambahkan ke parameter destructuring fungsi:
```ts
buyers,
stockOutSelectedBatch,
batchEstimatedValue,
stockOutTotal,
stockOutHargaDiff,
```

- [ ] **Step 7.5: Tambah komponen `BatchInfoCard` (inline, sebelum fungsi `StokView`)**

Tambahkan setelah `GradeChip` dan sebelum `interface StokViewProps`:

```tsx
// ─── Batch Info Card (Stock Out form) ─────────────────────────
const BatchInfoCard = ({ batch, theme, t }: { batch: ApiHarvestBatch; theme: Theme; t: StockTranslator }) => (
  <Box sx={{
    p: 1.5,
    borderRadius: 2,
    bgcolor: softBg(theme, 'info', 0.08),
    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
    alignItems: 'center',
  }}>
    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'text.primary' }}>
      {batch.batchCode}
    </Typography>
    <GradeChip grade={batch.grade} theme={theme} t={t} />
    <StatusChip status={batch.status} theme={theme} t={t} />
    <Box sx={{ width: '100%', display: 'flex', gap: 2, mt: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        Sisa: <strong>{batch.stokTersisa} kg</strong>
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Expired: <strong>{formatDateShort(batch.estimasiKadaluarsa)}</strong>
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Harga Rencana: <strong>{formatRupiah(batch.hargaJual)}/kg</strong>
      </Typography>
    </Box>
  </Box>
);
```

- [ ] **Step 7.6: Tambah preview Estimasi Nilai di Form Masuk (mobile & desktop)**

Di Form Masuk, cari bagian field `hargaJual` (ada di dua tempat — mobile SwipeableDrawer dan desktop Dialog). Setelah field `hargaJual` di **keduanya**, tambahkan:

```tsx
{batchEstimatedValue > 0 && (
  <Box sx={{ px: 1, py: 0.75, bgcolor: softBg(theme, 'success', 0.08), borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
    <Typography variant="caption" color="text.secondary">
      📦 Estimasi Nilai: <strong style={{ color: softText(theme, 'success') }}>{formatRupiah(batchEstimatedValue)}</strong>
      <span style={{ marginLeft: 6 }}>({batchForm.watch('beratMasuk')} kg × {formatRupiah(batchForm.watch('hargaJual'))})</span>
    </Typography>
  </Box>
)}
```

- [ ] **Step 7.7: Update Form Keluar — tambah BatchInfoCard setelah dropdown batch**

Di Form Keluar (ada di dua tempat — mobile dan desktop), cari blok `Controller name="batchId"`. Setelah Controller tersebut (tapi masih di dalam form), tambahkan:

```tsx
{stockOutSelectedBatch && (
  <BatchInfoCard batch={stockOutSelectedBatch} theme={theme} t={t} />
)}
```

- [ ] **Step 7.8: Update Form Keluar — tambah field `hargaRealisasi` setelah field `berat`**

Di Form Keluar (mobile dan desktop), setelah Controller `name="berat"`, tambahkan:

```tsx
<Controller name="hargaRealisasi" control={stockOutForm.control} render={({ field }) => (
  <TextField
    {...field}
    type="number"
    label="Harga Realisasi"
    fullWidth
    slotProps={{
      input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> },
      htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
    }}
    helperText={
      stockOutHargaDiff !== null && stockOutHargaDiff !== 0
        ? stockOutHargaDiff < 0
          ? `↓ ${formatRupiah(Math.abs(stockOutHargaDiff))}/kg di bawah harga rencana`
          : `↑ ${formatRupiah(stockOutHargaDiff)}/kg di atas harga rencana`
        : 'Terisi otomatis dari harga rencana batch'
    }
    FormHelperTextProps={{
      sx: {
        color: stockOutHargaDiff === null || stockOutHargaDiff === 0
          ? 'text.secondary'
          : stockOutHargaDiff < 0
          ? softText(theme, 'warning')
          : softText(theme, 'success'),
      },
    }}
  />
)} />
```

- [ ] **Step 7.9: Update Form Keluar — tambah field `namaPembeli` (Autocomplete) setelah `tujuan`**

Di Form Keluar (mobile dan desktop), setelah Controller `name="tujuan"`, tambahkan:

```tsx
<Controller name="namaPembeli" control={stockOutForm.control} render={({ field }) => (
  <Autocomplete
    freeSolo
    options={buyers.map((b) => b.nama)}
    value={field.value ?? ''}
    onChange={(_, newValue) => field.onChange(typeof newValue === 'string' ? newValue : (newValue ?? ''))}
    onInputChange={(_, newValue) => field.onChange(newValue)}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Nama Pembeli (opsional)"
        helperText="Pilih dari daftar atau ketik nama baru"
      />
    )}
  />
)} />
```

- [ ] **Step 7.10: Update Form Keluar — tambah preview Total Transaksi sebelum tombol submit**

Di Form Keluar (mobile dan desktop), setelah Controller `name="catatan"` dan sebelum Box tombol submit, tambahkan:

```tsx
{stockOutTotal > 0 && (
  <Box sx={{ px: 1.5, py: 1, bgcolor: softBg(theme, 'warning', 0.08), borderRadius: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
    <Typography variant="caption" color="text.secondary">
      💰 Total Transaksi: <strong style={{ color: softText(theme, 'warning') }}>{formatRupiah(stockOutTotal)}</strong>
      <span style={{ marginLeft: 6 }}>
        ({stockOutForm.watch('berat')} kg × {formatRupiah(stockOutForm.watch('hargaRealisasi') ?? 0)})
      </span>
    </Typography>
  </Box>
)}
```

- [ ] **Step 7.11: Cek TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7.12: Jalankan semua tests**

```bash
npx vitest run
```

Expected: PASS semua (minimal 211 tests — 202 lama + 6 baru + 3 baru = 211).

- [ ] **Step 7.13: Commit**

```bash
git add app/dashboard/stok/_components/StokView.tsx
git commit -m "feat(stok): add BatchInfoCard, buyer autocomplete, harga realisasi, total preview in forms"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Tabel `buyers` + kolom `stock_mutations` → Task 1
- ✅ `namaPembeli` opsional di form keluar → Task 4 + 7.9
- ✅ `hargaRealisasi` auto-fill + editable + diff display → Task 6.4 + 7.8
- ✅ Buyer master data auto-save saat submit → Task 5.4
- ✅ Buyer combobox freeSolo → Task 7.9
- ✅ Auto-suggest expiry +14 hari → Task 6.3
- ✅ Preview estimasi nilai stok (Form Masuk) → Task 7.6
- ✅ Kartu info batch saat batchId dipilih → Task 7.7
- ✅ Validasi berat real-time → Task 6.4
- ✅ Preview total transaksi → Task 7.10
- ✅ Unit tests `computeExpiryDate` + `computeStockOutTotal` → Task 2 + 5

**Type consistency:**
- `ApiBuyer` didefinisikan Task 3 → dipakai Task 5, 6, 7 ✅
- `computeExpiryDate` didefinisikan Task 5 → dipakai Task 6 ✅
- `stockOutHargaDiff: number | null` didefinisikan Task 6 → dipakai Task 7.8 ✅
- `stockOutSelectedBatch: ApiHarvestBatch | null` didefinisikan Task 6 → dipakai Task 7.7 ✅
- `buyers: ApiBuyer[]` ditambah ke `useStok` return Task 5 → dipakai Task 6 + 7 ✅
