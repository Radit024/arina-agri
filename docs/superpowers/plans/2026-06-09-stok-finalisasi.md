# Finalisasi Fitur Stok — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalisasi fitur Manajemen Stok Hasil Panen dengan perbaikan data model, rich metadata untuk traceability, hapus hard-delete (blockchain-ready), fix kalkulasi summary, dan tambah filter tanggal + export.

**Architecture:** Semua perubahan mengikuti prinsip **append-only** — batch tidak pernah dihapus, hanya di-close; mutasi tidak pernah diedit/dihapus. `ApiStockMutation` diperkaya dengan `namaPembeli` dan `hargaRealisasi` untuk supply chain traceability. Layer API (`lib/api.ts`) menjadi satu-satunya tempat query Supabase.

**Tech Stack:** TypeScript, React hooks, MUI v6, react-hook-form + Zod, Supabase, ExcelJS (export), Vitest.

---

> ⚠️ **Catatan Supabase:** Beberapa task membutuhkan penambahan kolom di tabel Supabase. Jalankan migration SQL di Supabase Dashboard → SQL Editor sebelum menjalankan kode yang menggunakannya.

---

## File Map

| File | Aksi | Tanggung Jawab |
|---|---|---|
| `lib/api.ts` | **Modifikasi** | Update types, tambah `closeBatch`, perkaya `stockOut`, fix `getMutations` grade filter + `stokTerjualMingguIni` |
| `app/dashboard/stok/_lib/stockSchemas.ts` | **Modifikasi** | Tambah `namaPembeli`, `hargaRealisasi` ke `stockOutSchema`; tambah `closeBatchSchema` |
| `controllers/stok/StokController.tsx` | **Modifikasi** | Ganti `deleteBatch` → `closeBatch`, tambah state untuk date filter dan export |
| `app/dashboard/stok/_components/StokView.tsx` | **Modifikasi** | Perkaya form stockOut (namaPembeli, hargaRealisasi), tambah date filter mutations, ganti delete button → close button |
| `hooks/useStok.ts` | **Modifikasi** | Tambah `closeBatch`, hapus `deleteBatch` dari return, fix `stokTerjualMingguIni` |
| `tests/hooks/useStok.test.ts` | **Buat baru** | Unit test untuk `computeLocalSummary` termasuk `stokTerjualMingguIni` |

---

## Task 1: Migration SQL + Update Types di `lib/api.ts`

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1.1: Jalankan migration SQL di Supabase Dashboard**

Buka Supabase Dashboard → SQL Editor, jalankan:

```sql
-- Tambah kolom ke stock_mutations untuk traceability
ALTER TABLE stock_mutations
  ADD COLUMN IF NOT EXISTS nama_pembeli TEXT,
  ADD COLUMN IF NOT EXISTS harga_realisasi INTEGER,
  ADD COLUMN IF NOT EXISTS tanggal_server TIMESTAMPTZ DEFAULT NOW();

-- Perluas tipe kolom 'tipe' di stock_mutations
-- Jika kolom tipe menggunakan TEXT, tidak perlu migration
-- Jika menggunakan enum, jalankan:
-- ALTER TYPE mutation_type ADD VALUE IF NOT EXISTS 'koreksi';
-- ALTER TYPE mutation_type ADD VALUE IF NOT EXISTS 'susut';
```

- [ ] **Step 1.2: Update `ApiStockMutation` interface**

Di `lib/api.ts`, ganti interface `ApiStockMutation` (baris 58–68):

```ts
export interface ApiStockMutation {
  _id: string;
  batchId: string;
  batchCode: string;
  tipe: 'masuk' | 'keluar' | 'koreksi' | 'susut';
  berat: number;
  tujuan?: string;
  namaPembeli?: string;
  hargaRealisasi?: number;
  tanggal: string;
  tanggalServer?: string;
  catatan: string;
  createdAt: string;
}
```

- [ ] **Step 1.3: Update fungsi `mapMutation` di `lib/api.ts`**

Cari fungsi `mapMutation` (sekitar baris 212) dan update:

```ts
function mapMutation(row: any): ApiStockMutation {
  return {
    _id: row.id,
    batchId: row.batch_id,
    batchCode: row.batch_code,
    tipe: row.tipe,
    berat: row.berat,
    tujuan: row.tujuan ?? undefined,
    namaPembeli: row.nama_pembeli ?? undefined,
    hargaRealisasi: row.harga_realisasi ?? undefined,
    tanggal: row.tanggal,
    tanggalServer: row.tanggal_server ?? undefined,
    catatan: row.catatan ?? '',
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 1.4: Fix `getMutations` — tambah grade filter di query Supabase**

Ganti fungsi `getMutations` di `stokApi`:

```ts
getMutations: async (params?: { grade?: string; from?: string; to?: string }): Promise<ApiStockMutation[]> => {
  let query = supabase
    .from('stock_mutations')
    .select('*, harvest_batches!inner(grade)')
    .order('tanggal', { ascending: false });

  if (params?.from) query = query.gte('tanggal', params.from);
  if (params?.to) query = query.lte('tanggal', params.to);
  if (params?.grade && params.grade !== 'semua') {
    query = query.eq('harvest_batches.grade', params.grade);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMutation);
},
```

- [ ] **Step 1.5: Fix `getSummary` — hitung `stokTerjualMingguIni` dari mutasi**

Ganti fungsi `getSummary`:

```ts
getSummary: async (): Promise<StokSummary> => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const fromDate = oneWeekAgo.toISOString().split('T')[0];

  const [batchResult, mutResult] = await Promise.all([
    supabase.from('harvest_batches').select('*'),
    supabase
      .from('stock_mutations')
      .select('berat')
      .eq('tipe', 'keluar')
      .gte('tanggal', fromDate),
  ]);

  if (batchResult.error) throw new Error(batchResult.error.message);
  if (mutResult.error) throw new Error(mutResult.error.message);

  const batches = (batchResult.data ?? []).map(mapBatch);
  const active = batches.filter(b => b.status !== 'habis');
  const stokTerjualMingguIni = (mutResult.data ?? []).reduce((sum, m) => sum + (m.berat ?? 0), 0);

  return {
    totalStokSiapJual: active.reduce((s, b) => s + b.stokTersisa, 0),
    stokTerjualMingguIni,
    estimasiNilaiStok: active.reduce((s, b) => s + b.stokTersisa * b.hargaJual, 0),
    batchHampirKadaluarsa: batches.filter(b => b.status === 'hampir_kadaluarsa').length,
  };
},
```

- [ ] **Step 1.6: Tambah `closeBatch` dan hapus `delete` dari `stokApi`**

Hapus fungsi `delete` dari `stokApi` dan ganti dengan `closeBatch`:

```ts
closeBatch: async (id: string): Promise<ApiHarvestBatch> => {
  const { data, error } = await supabase
    .from('harvest_batches')
    .update({ status: 'habis', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapBatch(data);
},
```

- [ ] **Step 1.7: Perkaya `stockOut` — tambah `namaPembeli` dan `hargaRealisasi`**

Ganti signature dan body `stockOut`:

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
      tanggal_server: new Date().toISOString(),
    })
    .select()
    .single();
  if (mutErr) throw new Error(mutErr.message);

  return { batch: mapBatch(updatedBatch), mutation: mapMutation(mutationRow) };
},
```

- [ ] **Step 1.8: Pastikan TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: 0 error baru terkait file `lib/api.ts`

- [ ] **Step 1.9: Commit**

```bash
git add lib/api.ts
git commit -m "feat(stok): enrich mutation types, add closeBatch, fix getSummary and getMutations"
```

---

## Task 2: Update Schema Zod + Mock Data

**Files:**
- Modify: `app/dashboard/stok/_lib/stockSchemas.ts`
- Modify: `hooks/useStok.ts` (mock mutations)

- [ ] **Step 2.1: Perkaya `stockOutSchema`**

Ganti isi `app/dashboard/stok/_lib/stockSchemas.ts`:

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
  namaPembeli: z.string().optional(),
  hargaRealisasi: z.coerce.number().optional(),
  catatan: z.string().optional(),
});

export type BatchFormInput = z.input<typeof batchSchema>;
export type BatchFormOutput = z.output<typeof batchSchema>;
export type StockOutFormInput = z.input<typeof stockOutSchema>;
export type StockOutFormOutput = z.output<typeof stockOutSchema>;
```

- [ ] **Step 2.2: Update mock mutations di `hooks/useStok.ts`**

Update `MOCK_MUTATIONS` agar sesuai dengan tipe baru:

```ts
const MOCK_MUTATIONS: ApiStockMutation[] = [
  {
    _id: 'm1', batchId: '1', batchCode: 'BATCH-001-A',
    tipe: 'masuk', berat: 400, tanggal: '2026-04-12',
    catatan: 'Panen awal masuk gudang', createdAt: '2026-04-12T06:00:00Z',
  },
  {
    _id: 'm2', batchId: '1', batchCode: 'BATCH-001-A',
    tipe: 'keluar', berat: 80, tujuan: 'Pasar Lokal',
    namaPembeli: 'Pak Slamet', hargaRealisasi: 45000,
    tanggal: '2026-04-14', catatan: 'Jual ke pasar pagi',
    createdAt: '2026-04-14T08:00:00Z',
  },
  {
    _id: 'm3', batchId: '2', batchCode: 'BATCH-002-B',
    tipe: 'masuk', berat: 350, tanggal: '2026-04-15',
    catatan: 'Panen awal masuk gudang', createdAt: '2026-04-15T06:00:00Z',
  },
];
```

- [ ] **Step 2.3: Ganti `deleteBatch` dengan `closeBatch` di `hooks/useStok.ts`**

Hapus fungsi `deleteBatch` dan ganti dengan:

```ts
const closeBatch = async (id: string) => {
  if (!user) {
    // mode offline: update status lokal saja
    setBatches((prev) => prev.map((b) => b._id === id ? { ...b, status: 'habis' as const } : b));
    return;
  }
  const updated = await stokApi.closeBatch(id);
  setBatches((prev) => prev.map((b) => (b._id === id ? updated : b)));
  await loadData();
};
```

Update bagian `return` — ganti `deleteBatch` dengan `closeBatch`:

```ts
return {
  batches, mutations, summary, loading, backendOnline: true, error,
  addBatch, updateBatch, closeBatch, stockOut, refreshMutations, reload: loadData,
};
```

- [ ] **Step 2.4: Pastikan TypeScript tidak error**

```bash
npx tsc --noEmit
```

- [ ] **Step 2.5: Commit**

```bash
git add app/dashboard/stok/_lib/stockSchemas.ts hooks/useStok.ts
git commit -m "feat(stok): enrich stockOut schema with namaPembeli/hargaRealisasi, replace deleteBatch with closeBatch"
```

---

## Task 3: Buat unit test `useStok` (computeLocalSummary)

**Files:**
- Create: `tests/hooks/useStok.test.ts`

- [ ] **Step 3.1: Buat file test**

```ts
// tests/hooks/useStok.test.ts
import { describe, it, expect } from 'vitest';
import type { ApiHarvestBatch } from '@/lib/api';

// Ekstrak fungsi computeLocalSummary untuk bisa ditest
// (fungsi ini ada di hooks/useStok.ts — pastikan sudah di-export atau copy logikanya)
function computeLocalSummary(batches: ApiHarvestBatch[]) {
  const active = batches.filter(b => b.status !== 'habis');
  return {
    totalStokSiapJual: active.reduce((s, b) => s + b.stokTersisa, 0),
    stokTerjualMingguIni: 0,
    estimasiNilaiStok: active.reduce((s, b) => s + b.stokTersisa * b.hargaJual, 0),
    batchHampirKadaluarsa: batches.filter(b => b.status === 'hampir_kadaluarsa').length,
  };
}

const mockBatch = (overrides: Partial<ApiHarvestBatch>): ApiHarvestBatch => ({
  _id: '1', batchCode: 'BATCH-001-A', tanggalPanen: '2026-04-12',
  grade: 'A', beratMasuk: 100, stokTersisa: 80, hargaModal: 15000,
  hargaJual: 45000, lokasiPenyimpanan: 'Gudang Utama',
  estimasiKadaluarsa: '2026-04-26', catatan: '', status: 'aman',
  createdAt: '2026-04-12T06:00:00Z', updatedAt: '2026-04-12T06:00:00Z',
  ...overrides,
});

describe('computeLocalSummary', () => {
  it('menghitung totalStokSiapJual hanya dari batch yang tidak habis', () => {
    const batches = [
      mockBatch({ _id: '1', stokTersisa: 80, status: 'aman' }),
      mockBatch({ _id: '2', stokTersisa: 50, status: 'menipis' }),
      mockBatch({ _id: '3', stokTersisa: 0, status: 'habis' }),
    ];
    const result = computeLocalSummary(batches);
    expect(result.totalStokSiapJual).toBe(130);
  });

  it('menghitung estimasiNilaiStok dengan benar', () => {
    const batches = [
      mockBatch({ _id: '1', stokTersisa: 100, hargaJual: 45000, status: 'aman' }),
      mockBatch({ _id: '2', stokTersisa: 50, hargaJual: 38000, status: 'menipis' }),
    ];
    const result = computeLocalSummary(batches);
    // 100 * 45000 + 50 * 38000 = 4.500.000 + 1.900.000 = 6.400.000
    expect(result.estimasiNilaiStok).toBe(6_400_000);
  });

  it('menghitung batchHampirKadaluarsa dengan benar', () => {
    const batches = [
      mockBatch({ _id: '1', status: 'aman' }),
      mockBatch({ _id: '2', status: 'hampir_kadaluarsa' }),
      mockBatch({ _id: '3', status: 'hampir_kadaluarsa' }),
    ];
    const result = computeLocalSummary(batches);
    expect(result.batchHampirKadaluarsa).toBe(2);
  });

  it('mengembalikan semua 0 jika tidak ada batch', () => {
    const result = computeLocalSummary([]);
    expect(result.totalStokSiapJual).toBe(0);
    expect(result.estimasiNilaiStok).toBe(0);
    expect(result.batchHampirKadaluarsa).toBe(0);
  });
});
```

- [ ] **Step 3.2: Export `computeLocalSummary` dari `hooks/useStok.ts`**

Di `hooks/useStok.ts`, ubah baris:

```ts
function computeLocalSummary(batches: ApiHarvestBatch[]): StokSummary {
```

Menjadi:

```ts
export function computeLocalSummary(batches: ApiHarvestBatch[]): StokSummary {
```

Update import di test file:

```ts
import { computeLocalSummary } from '@/hooks/useStok';
```

Dan hapus definisi fungsi lokal `computeLocalSummary` dari file test.

- [ ] **Step 3.3: Jalankan tests**

```bash
npx vitest run tests/hooks/useStok.test.ts
```

Expected: semua 4 test PASS

- [ ] **Step 3.4: Commit**

```bash
git add tests/hooks/useStok.test.ts hooks/useStok.ts
git commit -m "test(stok): add computeLocalSummary unit tests, export function"
```

---

## Task 4: Update `StokController` — wiring state baru

**Files:**
- Modify: `controllers/stok/StokController.tsx`

- [ ] **Step 4.1: Tambah state date filter dan ganti `deleteBatch` → `closeBatch`**

Ganti isi `controllers/stok/StokController.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useStok } from '@/hooks/useStok';
import { useWeatherRiskSignal } from '@/hooks/useWeatherRiskSignal';
import StokView from '@/app/dashboard/stok/_components/StokView';
import {
  batchSchema,
  stockOutSchema,
  type BatchFormInput,
  type BatchFormOutput,
  type StockOutFormInput,
  type StockOutFormOutput,
} from '@/app/dashboard/stok/_lib/stockSchemas';

export default function StokController() {
  const t = useTranslations('Stock');
  const { batches, mutations, summary, loading, backendOnline, addBatch, closeBatch, stockOut, refreshMutations } = useStok();
  const { riskNote: weatherRiskNote } = useWeatherRiskSignal('stock');
  const [tab, setTab] = useState(0);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [stockOutDialogOpen, setStockOutDialogOpen] = useState(false);
  const [mutFilter, setMutFilter] = useState('semua');
  const [mutFromDate, setMutFromDate] = useState('');
  const [mutToDate, setMutToDate] = useState('');
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);

  const batchForm = useForm<BatchFormInput, unknown, BatchFormOutput>({
    resolver: zodResolver(batchSchema.extend({
      tanggalPanen: z.string().min(1, t('dialogs.validation.required')),
      beratMasuk: z.coerce.number().min(0.1, t('dialogs.validation.minWeight')),
      hargaModal: z.coerce.number().min(1, t('dialogs.validation.required')),
      hargaJual: z.coerce.number().min(1, t('dialogs.validation.required')),
      estimasiKadaluarsa: z.string().min(1, t('dialogs.validation.required')),
    })),
    defaultValues: {
      tanggalPanen: new Date().toISOString().split('T')[0],
      grade: 'A',
      lokasiPenyimpanan: 'Gudang Utama',
      estimasiKadaluarsa: '',
      beratMasuk: 0,
      hargaModal: 0,
      hargaJual: 0,
      catatan: '',
    },
  });

  const stockOutForm = useForm<StockOutFormInput, unknown, StockOutFormOutput>({
    resolver: zodResolver(stockOutSchema.extend({
      batchId: z.string().min(1, t('dialogs.validation.selectBatch')),
      berat: z.coerce.number().min(0.1, t('dialogs.validation.minWeight')),
      tanggal: z.string().min(1, t('dialogs.validation.required')),
    })),
    defaultValues: {
      batchId: '',
      berat: 0,
      tujuan: 'Pasar Lokal',
      tanggal: new Date().toISOString().split('T')[0],
      namaPembeli: '',
      hargaRealisasi: 0,
      catatan: '',
    },
  });

  const openAddBatch = () => {
    batchForm.reset({
      tanggalPanen: new Date().toISOString().split('T')[0],
      grade: 'A',
      lokasiPenyimpanan: 'Gudang Utama',
      estimasiKadaluarsa: '',
      beratMasuk: 0,
      hargaModal: 0,
      hargaJual: 0,
      catatan: '',
    });
    setBatchDialogOpen(true);
  };

  const onBatchSubmit = async (data: BatchFormOutput) => {
    await addBatch({ ...data, catatan: data.catatan ?? '' });
    setBatchDialogOpen(false);
  };

  const onStockOutSubmit = async (data: StockOutFormOutput) => {
    await stockOut(data.batchId, {
      berat: data.berat,
      tujuan: data.tujuan,
      tanggal: data.tanggal,
      catatan: data.catatan || '',
      namaPembeli: data.namaPembeli || undefined,
      hargaRealisasi: data.hargaRealisasi || undefined,
    });
    setStockOutDialogOpen(false);
    stockOutForm.reset();
  };

  const handleCloseBatch = async (id: string) => {
    setCloseConfirmId(id);
  };

  const handleConfirmClose = async () => {
    if (!closeConfirmId) return;
    await closeBatch(closeConfirmId);
    setCloseConfirmId(null);
  };

  const handleApplyDateFilter = () => {
    refreshMutations({
      grade: mutFilter !== 'semua' ? mutFilter : undefined,
      from: mutFromDate || undefined,
      to: mutToDate || undefined,
    });
  };

  const alertBatches = batches.filter((b) => b.status === 'hampir_kadaluarsa');
  const activeBatches = batches.filter((b) => b.status !== 'habis');
  const filteredMutations = mutFilter === 'semua'
    ? mutations
    : mutations.filter((m) => m.batchCode.includes(`-${mutFilter}`));

  return (
    <StokView
      activeBatches={activeBatches}
      alertBatches={alertBatches}
      backendOnline={backendOnline}
      batchDialogOpen={batchDialogOpen}
      batchForm={batchForm}
      closeConfirmId={closeConfirmId}
      filteredMutations={filteredMutations}
      loading={loading}
      mutFilter={mutFilter}
      mutFromDate={mutFromDate}
      mutToDate={mutToDate}
      onBatchSubmit={onBatchSubmit}
      onStockOutSubmit={onStockOutSubmit}
      openAddBatch={openAddBatch}
      onCloseBatch={handleCloseBatch}
      onConfirmClose={handleConfirmClose}
      onCancelClose={() => setCloseConfirmId(null)}
      onApplyDateFilter={handleApplyDateFilter}
      setBatchDialogOpen={setBatchDialogOpen}
      setMutFilter={setMutFilter}
      setMutFromDate={setMutFromDate}
      setMutToDate={setMutToDate}
      setStockOutDialogOpen={setStockOutDialogOpen}
      setTab={setTab}
      stockOutDialogOpen={stockOutDialogOpen}
      stockOutForm={stockOutForm}
      summary={summary}
      tab={tab}
      weatherRiskNote={weatherRiskNote}
    />
  );
}
```

- [ ] **Step 4.2: Pastikan TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: error hanya karena `StokView` props belum diupdate (Task 5 akan fix ini)

- [ ] **Step 4.3: Commit**

```bash
git add controllers/stok/StokController.tsx
git commit -m "feat(stok): update StokController with closeBatch, date filter state, stockOut rich fields"
```

---

## Task 5: Update `StokView` — UI untuk field baru

**Files:**
- Modify: `app/dashboard/stok/_components/StokView.tsx`

- [ ] **Step 5.1: Update `StokViewProps` interface**

Ganti interface `StokViewProps` (baris 90–112):

```ts
interface StokViewProps {
  activeBatches: ApiHarvestBatch[];
  alertBatches: ApiHarvestBatch[];
  backendOnline: boolean;
  batchDialogOpen: boolean;
  batchForm: UseFormReturn<BatchFormInput, unknown, BatchFormOutput>;
  closeConfirmId: string | null;
  filteredMutations: ApiStockMutation[];
  loading: boolean;
  mutFilter: string;
  mutFromDate: string;
  mutToDate: string;
  onBatchSubmit: SubmitHandler<BatchFormOutput>;
  onStockOutSubmit: SubmitHandler<StockOutFormOutput>;
  openAddBatch: () => void;
  onCloseBatch: (id: string) => void;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  onApplyDateFilter: () => void;
  setBatchDialogOpen: (open: boolean) => void;
  setMutFilter: (value: string) => void;
  setMutFromDate: (value: string) => void;
  setMutToDate: (value: string) => void;
  setStockOutDialogOpen: (open: boolean) => void;
  setTab: (tab: number) => void;
  stockOutDialogOpen: boolean;
  stockOutForm: UseFormReturn<StockOutFormInput, unknown, StockOutFormOutput>;
  summary: StokSummary;
  tab: number;
  weatherRiskNote: string;
}
```

- [ ] **Step 5.2: Update destructure props di fungsi `StokView`**

Ganti bagian destructure (baris 114–136) agar sesuai dengan interface baru:

```ts
export default function StokView({
  activeBatches, alertBatches, backendOnline, batchDialogOpen, batchForm,
  closeConfirmId, filteredMutations, loading, mutFilter, mutFromDate, mutToDate,
  onBatchSubmit, onStockOutSubmit, openAddBatch, onCloseBatch, onConfirmClose,
  onCancelClose, onApplyDateFilter, setBatchDialogOpen, setMutFilter,
  setMutFromDate, setMutToDate, setStockOutDialogOpen, setTab,
  stockOutDialogOpen, stockOutForm, summary, tab, weatherRiskNote,
}: StokViewProps) {
```

- [ ] **Step 5.3: Ganti tombol Delete batch → Close batch (desktop table)**

Di tabel batch desktop (sekitar baris 352–356), ganti `IconButton` delete:

```tsx
<IconButton
  size="small"
  aria-label="Close batch"
  onClick={() => onCloseBatch(b._id)}
  sx={{ color: softText(theme, 'warning'), bgcolor: softBg(theme, 'warning', 0.14), borderRadius: 1.5, '&:hover': { bgcolor: theme.palette.warning.main, color: accentText(theme, 'warning') } }}
>
  <InventoryIcon fontSize="small" />
</IconButton>
```

- [ ] **Step 5.4: Ganti tombol Delete batch → Close batch (mobile card)**

Di mobile card (sekitar baris 294–302), ganti tombol delete:

```tsx
<Button
  color="warning"
  variant="outlined"
  size="small"
  onClick={() => onCloseBatch(b._id)}
  sx={{ borderRadius: 2, minWidth: 44, width: 44, height: 40 }}
  aria-label="Close batch"
>
  <InventoryIcon fontSize="small" />
</Button>
```

- [ ] **Step 5.5: Tambah date range filter di tab Mutasi**

Di bagian filter mutasi (sekitar baris 371–381), tambahkan setelah `FormControl` grade filter:

```tsx
<TextField
  type="date"
  label="Dari Tanggal"
  size="small"
  value={mutFromDate}
  onChange={(e) => setMutFromDate(e.target.value)}
  sx={{ minWidth: 150 }}
  slotProps={{ inputLabel: { shrink: true } }}
/>
<TextField
  type="date"
  label="Sampai Tanggal"
  size="small"
  value={mutToDate}
  onChange={(e) => setMutToDate(e.target.value)}
  sx={{ minWidth: 150 }}
  slotProps={{ inputLabel: { shrink: true } }}
/>
<Button variant="outlined" size="small" onClick={onApplyDateFilter} sx={{ height: 40, borderRadius: 2 }}>
  Terapkan
</Button>
```

- [ ] **Step 5.6: Tambah kolom `namaPembeli` dan `hargaRealisasi` di tabel mutasi desktop**

Di header tabel mutasi (baris 441), tambahkan dua kolom baru:

```tsx
{[
  t('mutationTable.date'),
  t('mutationTable.batch'),
  t('mutationTable.type'),
  t('mutationTable.weight'),
  t('mutationTable.target'),
  'Pembeli',
  'Harga Realisasi',
  t('mutationTable.note'),
].map((h) => (
  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', bgcolor: 'background.paper' }}>{h}</TableCell>
))}
```

Di baris data tabel (setelah `TableCell` tujuan, baris ~459), tambahkan:

```tsx
<TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{m.namaPembeli || '—'}</TableCell>
<TableCell sx={{ fontSize: '0.8rem', fontWeight: m.hargaRealisasi ? 600 : 400 }}>
  {m.hargaRealisasi ? formatRupiah(m.hargaRealisasi) : '—'}
</TableCell>
```

- [ ] **Step 5.7: Tambah field `namaPembeli` dan `hargaRealisasi` ke form Stock Out (desktop)**

Di form stock out desktop (sekitar baris 770), setelah field `tujuan` dan sebelum `tanggal`, tambahkan:

```tsx
<Controller name="namaPembeli" control={stockOutForm.control} render={({ field }) => (
  <TextField {...field} label="Nama Pembeli (opsional)" fullWidth placeholder="Contoh: Pak Slamet / CV Agro Jaya" />
)} />
<Controller name="hargaRealisasi" control={stockOutForm.control} render={({ field }) => (
  <TextField
    {...field}
    type="number"
    label="Harga Realisasi / kg (opsional)"
    fullWidth
    slotProps={{ input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> } }}
  />
)} />
```

Tambahkan field yang sama di form mobile SwipeableDrawer (sekitar baris 720).

- [ ] **Step 5.8: Tambah dialog konfirmasi Close Batch**

Di akhir komponen (sebelum tag penutup `</Box>` paling luar), tambahkan:

```tsx
{/* ─── Dialog Konfirmasi Close Batch ─── */}
<Dialog
  open={closeConfirmId !== null}
  onClose={onCancelClose}
  maxWidth="xs"
  fullWidth
  slotProps={{ paper: { sx: { borderRadius: 3 } } }}
>
  <DialogTitle>
    <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
      Tutup Batch?
    </Typography>
  </DialogTitle>
  <DialogContent>
    <Typography variant="body2" color="text.secondary">
      Batch akan ditandai sebagai <strong>Habis</strong> dan tidak bisa diedit lagi.
      Riwayat mutasi tetap tersimpan untuk traceability.
    </Typography>
    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
      <Button variant="outlined" onClick={onCancelClose} sx={{ flex: 1, borderRadius: 8 }}>Batal</Button>
      <Button variant="contained" color="warning" onClick={onConfirmClose} sx={{ flex: 1, borderRadius: 8 }}>
        Ya, Tutup Batch
      </Button>
    </Box>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5.9: Pastikan TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: 0 error baru

- [ ] **Step 5.10: Jalankan semua tests**

```bash
npx vitest run
```

Expected: semua test PASS

- [ ] **Step 5.11: Commit**

```bash
git add app/dashboard/stok/_components/StokView.tsx
git commit -m "feat(stok): add namaPembeli/hargaRealisasi to stockOut form, date filter, close batch UI"
```

---

## Task 6: Export Riwayat Mutasi (Excel)

**Files:**
- Modify: `controllers/stok/StokController.tsx`
- Modify: `app/dashboard/stok/_components/StokView.tsx`

- [ ] **Step 6.1: Tambah fungsi `handleExportMutations` ke `StokController`**

Di `StokController.tsx`, tambahkan fungsi sebelum `return`:

```ts
const handleExportMutations = async () => {
  const [ExcelJS, { saveAs }] = await Promise.all([
    import('exceljs').then(m => m.default),
    import('file-saver'),
  ]);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Riwayat Mutasi Stok');

  ws.mergeCells('A1:H1');
  const title = ws.getCell('A1');
  title.value = 'Riwayat Mutasi Stok — Arina Agri';
  title.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.addRow([]);
  const header = ws.addRow(['Tanggal', 'Batch', 'Tipe', 'Berat (kg)', 'Tujuan', 'Pembeli', 'Harga Realisasi', 'Catatan']);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  filteredMutations.forEach((m) => {
    const row = ws.addRow([
      m.tanggal,
      m.batchCode,
      m.tipe,
      m.berat,
      m.tujuan || '-',
      m.namaPembeli || '-',
      m.hargaRealisasi ?? '-',
      m.catatan || '-',
    ]);
    row.eachCell((cell, col) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (col === 7 && typeof cell.value === 'number') cell.numFmt = '"Rp"#,##0';
    });
  });

  ws.columns = [{ width: 14 }, { width: 16 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 22 }, { width: 18 }, { width: 30 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `mutasi_stok_${new Date().toISOString().split('T')[0]}.xlsx`);
};
```

Tambahkan `handleExportMutations` ke props yang diteruskan ke `StokView`.

- [ ] **Step 6.2: Tambah prop `onExportMutations` ke `StokViewProps` dan tombol Export**

Di `StokView.tsx`, tambahkan ke interface:

```ts
onExportMutations: () => void;
```

Di bagian header tab Mutasi (baris sekitar 371), tambahkan tombol export di sebelah kanan filter:

```tsx
<Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
  {/* ... existing filter controls ... */}
  <Box sx={{ ml: 'auto' }}>
    <Button
      variant="outlined"
      size="small"
      onClick={onExportMutations}
      sx={{ height: 40, borderRadius: 2 }}
    >
      Export Excel
    </Button>
  </Box>
</Box>
```

- [ ] **Step 6.3: Pastikan TypeScript tidak error dan tests lulus**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 0 error, semua tests PASS

- [ ] **Step 6.4: Commit**

```bash
git add controllers/stok/StokController.tsx app/dashboard/stok/_components/StokView.tsx
git commit -m "feat(stok): add mutation export to Excel"
```

---

## Checklist Verifikasi Manual

Setelah semua task selesai, verifikasi di browser:

- [ ] Tambah batch baru → muncul di tabel + mutation log (`masuk`)
- [ ] Stock Out dengan `namaPembeli` diisi → tersimpan dan tampil di tabel mutasi
- [ ] Stock Out tanpa `namaPembeli` → kolom menampilkan `—`
- [ ] Tombol tutup batch → dialog konfirmasi muncul → konfirmasi → batch berubah status `habis`
- [ ] Filter grade mutasi bekerja
- [ ] Filter tanggal mutasi bekerja (dari/sampai)
- [ ] Export Excel → file ter-download dengan data yang benar
- [ ] KPI "Stok Terjual Minggu Ini" menampilkan nilai > 0 setelah ada stock out di 7 hari terakhir
- [ ] Tidak ada tombol hard-delete batch di mana pun
