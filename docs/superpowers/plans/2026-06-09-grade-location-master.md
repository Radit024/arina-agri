# Grade & Lokasi Penyimpanan Master Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded grade (A/B/C) and storage location (Gudang Utama/Cadangan) enums with user-managed master data, editable via a ⚙️ icon that opens a mini CRUD dialog next to each Select field.

**Architecture:** Two new Supabase tables (`stock_grades`, `storage_locations`) hold per-user lists. `gradesApi`/`locationsApi` in `lib/api.ts` expose full CRUD with a delete guard (block if grade/location still used by active batches). `useStok` loads and exposes these lists with fallback defaults. A reusable `MasterDataDialog` component renders the ⚙️-triggered CRUD panel. `StokView` replaces hardcoded `MenuItem`s with dynamic ones and adds ⚙️ buttons.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL), MUI v6, TypeScript, react-hook-form + Zod, Vitest + jsdom

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `docs/sql/2026-06-09-grade-location-master.sql` | CREATE | SQL migration for `stock_grades` + `storage_locations` |
| `lib/supabase.ts` | MODIFY | `DbHarvestBatch.grade: string` (remove literal union) |
| `lib/api.ts` | MODIFY | Add `ApiGrade`, `ApiLocation`, `gradesApi`, `locationsApi`; widen `ApiHarvestBatch` types |
| `app/dashboard/stok/_lib/stockSchemas.ts` | MODIFY | `grade: z.string().min(1)`, `lokasiPenyimpanan: z.string().min(1)` |
| `hooks/useStok.ts` | MODIFY | Add grades/locations state, fallback defaults, 6 CRUD actions |
| `app/dashboard/stok/_components/MasterDataDialog.tsx` | CREATE | Reusable mini CRUD dialog: list + inline rename + delete + add |
| `app/dashboard/stok/_components/StokView.tsx` | MODIFY | Dynamic grade/lokasi Selects + ⚙️ buttons + wire MasterDataDialog |
| `controllers/stok/StokController.tsx` | MODIFY | Destructure grades/locations + CRUD from hook, add dialog/error state |
| `tests/hooks/useStok.test.ts` | MODIFY | Tests for `DEFAULT_GRADES`, `DEFAULT_LOCATIONS` exports |

---

## Task 1: SQL Migration

**Files:**
- Create: `docs/sql/2026-06-09-grade-location-master.sql`

- [ ] **Step 1: Create the SQL file**

```sql
-- docs/sql/2026-06-09-grade-location-master.sql
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS stock_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  nama text NOT NULL,
  urutan int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);

CREATE TABLE IF NOT EXISTS storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  nama text NOT NULL,
  urutan int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);

-- Enable RLS
ALTER TABLE stock_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

-- Policies: users only see their own rows
CREATE POLICY "stock_grades_user" ON stock_grades
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "storage_locations_user" ON storage_locations
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
```

- [ ] **Step 2: Commit**

```bash
git add docs/sql/2026-06-09-grade-location-master.sql
git commit -m "sql: add stock_grades and storage_locations tables"
```

---

## Task 2: Unit Tests — Exports from useStok (TDD)

**Files:**
- Modify: `tests/hooks/useStok.test.ts`

- [ ] **Step 1: Add failing tests for `DEFAULT_GRADES` and `DEFAULT_LOCATIONS`**

Add these tests at the bottom of `tests/hooks/useStok.test.ts`:

```ts
import { computeLocalSummary, computeExpiryDate, computeStockOutTotal, DEFAULT_GRADES, DEFAULT_LOCATIONS } from '@/hooks/useStok';

// (existing tests above unchanged)

describe('DEFAULT_GRADES', () => {
  it('contiene almeno un elemento', () => {
    expect(DEFAULT_GRADES.length).toBeGreaterThan(0);
  });

  it('ogni elemento ha id e nama non vuoti', () => {
    DEFAULT_GRADES.forEach((g) => {
      expect(g.id).toBeTruthy();
      expect(g.nama).toBeTruthy();
    });
  });
});

describe('DEFAULT_LOCATIONS', () => {
  it('contiene almeno un elemento', () => {
    expect(DEFAULT_LOCATIONS.length).toBeGreaterThan(0);
  });

  it('ogni elemento ha id e nama non vuoti', () => {
    DEFAULT_LOCATIONS.forEach((l) => {
      expect(l.id).toBeTruthy();
      expect(l.nama).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (DEFAULT_GRADES not exported yet)**

```bash
npx vitest run tests/hooks/useStok.test.ts
```

Expected: 2 test suites fail with `DEFAULT_GRADES is not a function` or similar import error.

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/hooks/useStok.test.ts
git commit -m "test(stok): add failing tests for DEFAULT_GRADES and DEFAULT_LOCATIONS"
```

---

## Task 3: Update `lib/supabase.ts` and `lib/api.ts`

**Files:**
- Modify: `lib/supabase.ts` line 43
- Modify: `lib/api.ts` lines 45, 50, 79–84

- [ ] **Step 1: Widen types in `lib/supabase.ts`**

In `lib/supabase.ts`, find the `DbHarvestBatch` interface and change:

```ts
// BEFORE
  grade: 'A' | 'B' | 'C';
// AFTER
  grade: string;
```

- [ ] **Step 2: Add `ApiGrade` and `ApiLocation` interfaces to `lib/api.ts`**

Add these two interfaces directly after `ApiBuyer` (after line 84):

```ts
export interface ApiGrade {
  id: string;
  nama: string;
  urutan: number;
}

export interface ApiLocation {
  id: string;
  nama: string;
  urutan: number;
}
```

- [ ] **Step 3: Widen `ApiHarvestBatch` types in `lib/api.ts`**

In `lib/api.ts`, update `ApiHarvestBatch`:

```ts
// BEFORE
  grade: 'A' | 'B' | 'C';
  ...
  lokasiPenyimpanan: 'Gudang Utama' | 'Gudang Cadangan';
// AFTER
  grade: string;
  ...
  lokasiPenyimpanan: string;
```

- [ ] **Step 4: Add `gradesApi` to `lib/api.ts`**

Add after the `buyersApi` block (after line 634):

```ts
export const gradesApi = {
  getAll: async (): Promise<ApiGrade[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('stock_grades')
      .select('*')
      .eq('user_id', user.id)
      .order('urutan', { ascending: true })
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      nama: row.nama,
      urutan: row.urutan ?? 0,
    }));
  },

  create: async (nama: string): Promise<ApiGrade> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('stock_grades')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  update: async (id: string, nama: string): Promise<ApiGrade> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('stock_grades')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data: gradeRow } = await supabase
      .from('stock_grades')
      .select('nama')
      .eq('id', id)
      .single();
    if (gradeRow) {
      const { count } = await supabase
        .from('harvest_batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('grade', gradeRow.nama)
        .neq('status', 'habis');
      if ((count ?? 0) > 0) {
        throw new Error(`Grade "${gradeRow.nama}" masih dipakai ${count} batch aktif. Tutup batch tersebut sebelum menghapus grade.`);
      }
    }
    const { error } = await supabase
      .from('stock_grades')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};
```

- [ ] **Step 5: Add `locationsApi` to `lib/api.ts`**

Add directly after `gradesApi`:

```ts
export const locationsApi = {
  getAll: async (): Promise<ApiLocation[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('storage_locations')
      .select('*')
      .eq('user_id', user.id)
      .order('urutan', { ascending: true })
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      nama: row.nama,
      urutan: row.urutan ?? 0,
    }));
  },

  create: async (nama: string): Promise<ApiLocation> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('storage_locations')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  update: async (id: string, nama: string): Promise<ApiLocation> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('storage_locations')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data: locRow } = await supabase
      .from('storage_locations')
      .select('nama')
      .eq('id', id)
      .single();
    if (locRow) {
      const { count } = await supabase
        .from('harvest_batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('lokasi_penyimpanan', locRow.nama)
        .neq('status', 'habis');
      if ((count ?? 0) > 0) {
        throw new Error(`Lokasi "${locRow.nama}" masih dipakai ${count} batch aktif. Tutup batch tersebut sebelum menghapus lokasi.`);
      }
    }
    const { error } = await supabase
      .from('storage_locations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};
```

- [ ] **Step 6: Run tests — expect all pass (type changes are backward-compatible)**

```bash
npx vitest run
```

Expected: PASS (208 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/supabase.ts lib/api.ts
git commit -m "feat(api): add ApiGrade/ApiLocation interfaces and gradesApi/locationsApi with delete guard"
```

---

## Task 4: Update `stockSchemas.ts`

**Files:**
- Modify: `app/dashboard/stok/_lib/stockSchemas.ts`

- [ ] **Step 1: Change `grade` and `lokasiPenyimpanan` from `z.enum` to `z.string().min(1)`**

Replace the full file content:

```ts
import { z } from 'zod';

export const batchSchema = z.object({
  tanggalPanen: z.string(),
  grade: z.string().min(1),
  beratMasuk: z.coerce.number(),
  hargaModal: z.coerce.number(),
  hargaJual: z.coerce.number(),
  lokasiPenyimpanan: z.string().min(1),
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

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: PASS (208 tests).

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/stok/_lib/stockSchemas.ts
git commit -m "feat(stok): loosen grade and lokasiPenyimpanan schema to free-form string"
```

---

## Task 5: Update `hooks/useStok.ts`

**Files:**
- Modify: `hooks/useStok.ts`

- [ ] **Step 1: Add imports and export DEFAULT_GRADES / DEFAULT_LOCATIONS**

At the top of `hooks/useStok.ts`, update the import line:

```ts
import { stokApi, buyersApi, gradesApi, locationsApi, type ApiHarvestBatch, type ApiStockMutation, type StokSummary, type ApiBuyer, type ApiGrade, type ApiLocation } from '@/lib/api';
```

Then add these exported constants after the `MOCK_MUTATIONS` block (before `computeExpiryDate`):

```ts
export const DEFAULT_GRADES: ApiGrade[] = [
  { id: 'default-A', nama: 'A', urutan: 0 },
  { id: 'default-B', nama: 'B', urutan: 1 },
  { id: 'default-C', nama: 'C', urutan: 2 },
];

export const DEFAULT_LOCATIONS: ApiLocation[] = [
  { id: 'default-gudang-utama', nama: 'Gudang Utama', urutan: 0 },
  { id: 'default-gudang-cadangan', nama: 'Gudang Cadangan', urutan: 1 },
];
```

- [ ] **Step 2: Run tests — DEFAULT_GRADES / DEFAULT_LOCATIONS tests now pass**

```bash
npx vitest run tests/hooks/useStok.test.ts
```

Expected: all 15 tests PASS (including the 4 new ones).

- [ ] **Step 3: Add grades/locations state inside `useStok()`**

Inside the `useStok` function, add after the `buyers` state line:

```ts
const [grades, setGrades] = useState<ApiGrade[]>([]);
const [locations, setLocations] = useState<ApiLocation[]>([]);
```

- [ ] **Step 4: Add `loadGrades` and `loadLocations` callbacks**

Add after the `loadBuyers` callback:

```ts
const loadGrades = useCallback(async () => {
  if (!user) return;
  try {
    const data = await gradesApi.getAll();
    setGrades(data);
  } catch {
    // non-critical, fallback to defaults
  }
}, [user]);

const loadLocations = useCallback(async () => {
  if (!user) return;
  try {
    const data = await locationsApi.getAll();
    setLocations(data);
  } catch {
    // non-critical, fallback to defaults
  }
}, [user]);
```

- [ ] **Step 5: Add useEffects to trigger loading**

Add after the `useEffect(() => { loadBuyers(); }, [loadBuyers]);` line:

```ts
useEffect(() => { loadGrades(); }, [loadGrades]);
useEffect(() => { loadLocations(); }, [loadLocations]);
```

- [ ] **Step 6: Add 6 CRUD action functions**

Add before the `return` statement:

```ts
const addGrade = async (nama: string): Promise<ApiGrade> => {
  const created = await gradesApi.create(nama);
  setGrades((prev) => [...prev, created]);
  return created;
};

const renameGrade = async (id: string, nama: string): Promise<void> => {
  const updated = await gradesApi.update(id, nama);
  setGrades((prev) => prev.map((g) => (g.id === id ? updated : g)));
};

const removeGrade = async (id: string): Promise<void> => {
  await gradesApi.delete(id); // throws if still in use
  setGrades((prev) => prev.filter((g) => g.id !== id));
};

const addLocation = async (nama: string): Promise<ApiLocation> => {
  const created = await locationsApi.create(nama);
  setLocations((prev) => [...prev, created]);
  return created;
};

const renameLocation = async (id: string, nama: string): Promise<void> => {
  const updated = await locationsApi.update(id, nama);
  setLocations((prev) => prev.map((l) => (l.id === id ? updated : l)));
};

const removeLocation = async (id: string): Promise<void> => {
  await locationsApi.delete(id); // throws if still in use
  setLocations((prev) => prev.filter((l) => l.id !== id));
};
```

- [ ] **Step 7: Update the `return` statement to include computed fallbacks + new exports**

Replace the return object to include:

```ts
const displayGrades = grades.length > 0 ? grades : DEFAULT_GRADES;
const displayLocations = locations.length > 0 ? locations : DEFAULT_LOCATIONS;

return {
  batches, mutations, summary, loading, backendOnline: true, error, buyers,
  grades: displayGrades,
  locations: displayLocations,
  addBatch, updateBatch, closeBatch, stockOut, refreshMutations, reload: loadData,
  addGrade, renameGrade, removeGrade,
  addLocation, renameLocation, removeLocation,
};
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: PASS (all 15 tests in useStok.test.ts, 208 total).

- [ ] **Step 9: Commit**

```bash
git add hooks/useStok.ts tests/hooks/useStok.test.ts
git commit -m "feat(stok): add grades/locations master data state and CRUD actions to useStok"
```

---

## Task 6: Create `MasterDataDialog.tsx`

**Files:**
- Create: `app/dashboard/stok/_components/MasterDataDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

export interface MasterDataItem {
  id: string;
  nama: string;
}

interface MasterDataDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: MasterDataItem[];
  onAdd: (nama: string) => Promise<void>;
  onRename: (id: string, nama: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  deleteError: string | null;
  onClearDeleteError: () => void;
}

export default function MasterDataDialog({
  open,
  onClose,
  title,
  items,
  onAdd,
  onRename,
  onDelete,
  deleteError,
  onClearDeleteError,
}: MasterDataDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newNama, setNewNama] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (item: MasterDataItem) => {
    setEditingId(item.id);
    setEditValue(item.nama);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    setSaving(true);
    try {
      await onRename(editingId, editValue.trim());
      setEditingId(null);
      setEditValue('');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAdd = async () => {
    if (!newNama.trim()) return;
    setSaving(true);
    try {
      await onAdd(newNama.trim());
      setNewNama('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    onClearDeleteError();
    setSaving(true);
    try {
      await onDelete(id);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setEditingId(null);
    setEditValue('');
    setNewNama('');
    onClearDeleteError();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {deleteError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={onClearDeleteError}>
            {deleteError}
          </Alert>
        )}

        {/* List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 2 }}>
          {items.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Belum ada item. Tambahkan di bawah.
            </Typography>
          )}
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
              {editingId === item.id ? (
                <>
                  <TextField
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    size="small"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" onClick={handleSaveEdit} disabled={saving || !editValue.trim()} color="primary">
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={handleCancelEdit}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{item.nama}</Typography>
                  <IconButton size="small" onClick={() => handleStartEdit(item)} disabled={saving}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(item.id)} color="error" disabled={saving}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Add new */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            value={newNama}
            onChange={(e) => setNewNama(e.target.value)}
            placeholder="Nama baru..."
            size="small"
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={saving}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleAdd}
            disabled={saving || !newNama.trim()}
            startIcon={<AddIcon />}
            sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}
          >
            Tambah
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Run tests (no new tests needed — UI component, covered by integration)**

```bash
npx vitest run
```

Expected: PASS (208 tests).

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/stok/_components/MasterDataDialog.tsx
git commit -m "feat(stok): add reusable MasterDataDialog component for grade/location CRUD"
```

---

## Task 7: Update `StokController.tsx`

**Files:**
- Modify: `controllers/stok/StokController.tsx`

- [ ] **Step 1: Add `useState` for dialog open states and delete errors**

In `StokController.tsx`, update the destructuring of `useStok()`:

```ts
const {
  batches, mutations, summary, loading, backendOnline, buyers,
  grades, locations,
  addBatch, closeBatch, stockOut, refreshMutations,
  addGrade, renameGrade, removeGrade,
  addLocation, renameLocation, removeLocation,
} = useStok();
```

- [ ] **Step 2: Add 4 new state variables after existing state declarations**

```ts
const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
const [locationDialogOpen, setLocationDialogOpen] = useState(false);
const [gradeDeleteError, setGradeDeleteError] = useState<string | null>(null);
const [locationDeleteError, setLocationDeleteError] = useState<string | null>(null);
```

- [ ] **Step 3: Add guarded delete handlers**

Add before `openAddBatch`:

```ts
const handleRemoveGrade = async (id: string) => {
  try {
    setGradeDeleteError(null);
    await removeGrade(id);
  } catch (err: any) {
    setGradeDeleteError(err.message ?? 'Gagal menghapus grade');
  }
};

const handleRemoveLocation = async (id: string) => {
  try {
    setLocationDeleteError(null);
    await removeLocation(id);
  } catch (err: any) {
    setLocationDeleteError(err.message ?? 'Gagal menghapus lokasi');
  }
};
```

- [ ] **Step 4: Update `openAddBatch` to use first grade/location from list**

```ts
const openAddBatch = () => {
  batchForm.reset({
    tanggalPanen: new Date().toISOString().split('T')[0],
    grade: grades[0]?.nama ?? 'A',
    lokasiPenyimpanan: locations[0]?.nama ?? 'Gudang Utama',
    estimasiKadaluarsa: '',
    beratMasuk: 0,
    hargaModal: 0,
    hargaJual: 0,
    catatan: '',
  });
  setBatchDialogOpen(true);
};
```

- [ ] **Step 5: Pass all new props to `<StokView />`**

Add these props to the `<StokView ... />` JSX:

```tsx
grades={grades}
locations={locations}
gradeDialogOpen={gradeDialogOpen}
locationDialogOpen={locationDialogOpen}
gradeDeleteError={gradeDeleteError}
locationDeleteError={locationDeleteError}
setGradeDialogOpen={setGradeDialogOpen}
setLocationDialogOpen={setLocationDialogOpen}
onAddGrade={addGrade}
onRenameGrade={renameGrade}
onRemoveGrade={handleRemoveGrade}
onAddLocation={addLocation}
onRenameLocation={renameLocation}
onRemoveLocation={handleRemoveLocation}
onClearGradeDeleteError={() => setGradeDeleteError(null)}
onClearLocationDeleteError={() => setLocationDeleteError(null)}
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run
```

Expected: PASS (208 tests).

- [ ] **Step 7: Commit**

```bash
git add controllers/stok/StokController.tsx
git commit -m "feat(stok): wire grades/locations CRUD and dialog state in StokController"
```

---

## Task 8: Update `StokView.tsx`

**Files:**
- Modify: `app/dashboard/stok/_components/StokView.tsx`

- [ ] **Step 1: Add new imports**

Add to the MUI icon imports block:

```ts
import SettingsIcon from '@mui/icons-material/Settings';
```

Add to the component imports:

```ts
import MasterDataDialog from './MasterDataDialog';
import type { ApiGrade, ApiLocation } from '@/lib/api';
```

- [ ] **Step 2: Update `GradeChip` to handle free-form grade strings**

Replace the entire `GradeChip` component (lines 76–89):

```tsx
// ─── Grade badge (free-form) ──────────────────────────────────────
const GRADE_PALETTE = [
  (t: Theme) => ({ bg: t.palette.success.main, text: accentText(t, 'success') }),
  (t: Theme) => ({ bg: t.palette.info.main, text: accentText(t, 'info') }),
  (t: Theme) => ({ bg: t.palette.warning.main, text: accentText(t, 'warning') }),
  (t: Theme) => ({ bg: t.palette.error.main, text: accentText(t, 'error') }),
  (t: Theme) => ({ bg: t.palette.primary.main, text: '#fff' }),
];

function gradeColorIndex(grade: string): number {
  let hash = 0;
  for (let i = 0; i < grade.length; i++) hash += grade.charCodeAt(i);
  return hash % GRADE_PALETTE.length;
}

const GradeChip = ({ grade, theme, t }: { grade: string; theme: Theme; t: StockTranslator }) => {
  const { bg, text } = GRADE_PALETTE[gradeColorIndex(grade)](theme);
  return (
    <Chip
      label={`${t('table.grade')} ${grade}`}
      size="small"
      sx={{ bgcolor: bg, color: text, fontWeight: 800, fontSize: '0.7rem', borderRadius: 1.5 }}
    />
  );
};
```

- [ ] **Step 3: Add 13 new props to `StokViewProps`**

Add these props to the `StokViewProps` interface after `stockOutHargaDiff`:

```ts
grades: ApiGrade[];
locations: ApiLocation[];
gradeDialogOpen: boolean;
locationDialogOpen: boolean;
gradeDeleteError: string | null;
locationDeleteError: string | null;
setGradeDialogOpen: (open: boolean) => void;
setLocationDialogOpen: (open: boolean) => void;
onAddGrade: (nama: string) => Promise<ApiGrade>;
onRenameGrade: (id: string, nama: string) => Promise<void>;
onRemoveGrade: (id: string) => Promise<void>;
onAddLocation: (nama: string) => Promise<ApiLocation>;
onRenameLocation: (id: string, nama: string) => Promise<void>;
onRemoveLocation: (id: string) => Promise<void>;
onClearGradeDeleteError: () => void;
onClearLocationDeleteError: () => void;
```

- [ ] **Step 4: Destructure new props in `StokView` function signature**

Add the new props to the destructuring in `export default function StokView({`:

```ts
grades,
locations,
gradeDialogOpen,
locationDialogOpen,
gradeDeleteError,
locationDeleteError,
setGradeDialogOpen,
setLocationDialogOpen,
onAddGrade,
onRenameGrade,
onRemoveGrade,
onAddLocation,
onRenameLocation,
onRemoveLocation,
onClearGradeDeleteError,
onClearLocationDeleteError,
```

- [ ] **Step 5: Replace grade Select with dynamic items + ⚙️ icon (mobile form)**

Find the mobile batch form grade Controller (around line 608–617). Replace the `<Grid size={{ xs: 12 }}>` block containing the grade Select with:

```tsx
<Grid size={{ xs: 12 }}>
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
    <Controller name="grade" control={batchForm.control} render={({ field }) => (
      <FormControl fullWidth>
        <InputLabel>{t('dialogs.fields.grade')}</InputLabel>
        <Select {...field} label={t('dialogs.fields.grade')}>
          {grades.map((g) => (
            <MenuItem key={g.id} value={g.nama}>{g.nama}</MenuItem>
          ))}
        </Select>
      </FormControl>
    )} />
    <IconButton size="small" onClick={() => setGradeDialogOpen(true)} sx={{ mt: 1, flexShrink: 0 }}>
      <SettingsIcon fontSize="small" />
    </IconButton>
  </Box>
</Grid>
```

- [ ] **Step 6: Replace lokasi Select with dynamic items + ⚙️ icon (mobile form)**

Find the mobile batch form lokasi Controller (around line 626–634). Replace with:

```tsx
<Grid size={{ xs: 12 }}>
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
    <Controller name="lokasiPenyimpanan" control={batchForm.control} render={({ field }) => (
      <FormControl fullWidth>
        <InputLabel>{t('dialogs.fields.location')}</InputLabel>
        <Select {...field} label={t('dialogs.fields.location')}>
          {locations.map((l) => (
            <MenuItem key={l.id} value={l.nama}>{l.nama}</MenuItem>
          ))}
        </Select>
      </FormControl>
    )} />
    <IconButton size="small" onClick={() => setLocationDialogOpen(true)} sx={{ mt: 1, flexShrink: 0 }}>
      <SettingsIcon fontSize="small" />
    </IconButton>
  </Box>
</Grid>
```

- [ ] **Step 7: Replace grade Select + ⚙️ icon (desktop form)**

Find the desktop batch form grade Controller (around line 692–700, inside `!isMobile` branch). Replace with same pattern as Step 5:

```tsx
<Grid size={{ xs: 12, sm: 6 }}>
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
    <Controller name="grade" control={batchForm.control} render={({ field }) => (
      <FormControl fullWidth>
        <InputLabel>{t('dialogs.fields.grade')}</InputLabel>
        <Select {...field} label={t('dialogs.fields.grade')}>
          {grades.map((g) => (
            <MenuItem key={g.id} value={g.nama}>{g.nama}</MenuItem>
          ))}
        </Select>
      </FormControl>
    )} />
    <IconButton size="small" onClick={() => setGradeDialogOpen(true)} sx={{ mt: 1, flexShrink: 0 }}>
      <SettingsIcon fontSize="small" />
    </IconButton>
  </Box>
</Grid>
```

- [ ] **Step 8: Replace lokasi Select + ⚙️ icon (desktop form)**

Find the desktop lokasi Controller (around line 709–716). Replace with:

```tsx
<Grid size={{ xs: 12, sm: 6 }}>
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
    <Controller name="lokasiPenyimpanan" control={batchForm.control} render={({ field }) => (
      <FormControl fullWidth>
        <InputLabel>{t('dialogs.fields.location')}</InputLabel>
        <Select {...field} label={t('dialogs.fields.location')}>
          {locations.map((l) => (
            <MenuItem key={l.id} value={l.nama}>{l.nama}</MenuItem>
          ))}
        </Select>
      </FormControl>
    )} />
    <IconButton size="small" onClick={() => setLocationDialogOpen(true)} sx={{ mt: 1, flexShrink: 0 }}>
      <SettingsIcon fontSize="small" />
    </IconButton>
  </Box>
</Grid>
```

- [ ] **Step 9: Replace hardcoded Grade filter in mutations tab with dynamic options**

Find the grade filter Select in the mutations tab (around line 432–439):

```tsx
<Select value={mutFilter} label={t('mutationTable.filterGrade')} onChange={(e) => setMutFilter(e.target.value)}>
  <MenuItem value="semua">{t('mutationTable.allGrades')}</MenuItem>
  {grades.map((g) => (
    <MenuItem key={g.id} value={g.nama}>{g.nama}</MenuItem>
  ))}
</Select>
```

- [ ] **Step 10: Add the two `MasterDataDialog` instances at the bottom of the component (before the final closing `</Box>`)**

```tsx
{/* ─── Grade Master Data Dialog ─── */}
<MasterDataDialog
  open={gradeDialogOpen}
  onClose={() => setGradeDialogOpen(false)}
  title="Kelola Grade"
  items={grades}
  onAdd={onAddGrade}
  onRename={onRenameGrade}
  onDelete={onRemoveGrade}
  deleteError={gradeDeleteError}
  onClearDeleteError={onClearGradeDeleteError}
/>

{/* ─── Location Master Data Dialog ─── */}
<MasterDataDialog
  open={locationDialogOpen}
  onClose={() => setLocationDialogOpen(false)}
  title="Kelola Lokasi Penyimpanan"
  items={locations}
  onAdd={onAddLocation}
  onRename={onRenameLocation}
  onDelete={onRemoveLocation}
  deleteError={locationDeleteError}
  onClearDeleteError={onClearLocationDeleteError}
/>
```

- [ ] **Step 11: Run all tests**

```bash
npx vitest run
```

Expected: PASS (208 tests).

- [ ] **Step 12: Commit**

```bash
git add app/dashboard/stok/_components/StokView.tsx
git commit -m "feat(stok): dynamic grade/location selects with MasterDataDialog gear icon"
```

---

## Self-Review

**Spec coverage:**
- ✅ 2 new tables (`stock_grades`, `storage_locations`) — Task 1
- ✅ `gradesApi`/`locationsApi` full CRUD — Task 3
- ✅ Delete guard (throws if active batches use the grade/location) — Task 3
- ✅ `ApiGrade`/`ApiLocation` interfaces — Task 3
- ✅ Free-form grade/lokasi in schemas — Task 4
- ✅ Fallback defaults when DB empty — Task 5
- ✅ `DEFAULT_GRADES`/`DEFAULT_LOCATIONS` exported for tests — Task 5
- ✅ 6 CRUD actions in hook — Task 5
- ✅ Reusable `MasterDataDialog` — Task 6
- ✅ Controller wires up actions + error state — Task 7
- ✅ Dynamic `MenuItem`s in both mobile and desktop forms — Task 8
- ✅ ⚙️ icon next to grade + lokasi Select — Task 8
- ✅ Dynamic grade filter in mutations tab — Task 8
- ✅ `GradeChip` updated for free-form strings — Task 8

**Placeholder scan:** None found.

**Type consistency:**
- `ApiGrade`/`ApiLocation` defined in Task 3, used consistently in Tasks 5–8
- `onAddGrade` returns `Promise<ApiGrade>` — matches `gradesApi.create` return type
- `MasterDataItem` (id, nama) is a subset of `ApiGrade`/`ApiLocation` — valid assignment
