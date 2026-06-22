# Transaction Batch Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-transaction modal with a batch-input Stepper dialog supporting multiple transactions, custom categories, custom units, and auto-calculated nominal (volume × hargaSatuan).

**Architecture:** Two new controllers (`useTransactionBatchController`, `useTransactionMasterController`) extracted from `useKeuanganController`. Four new View components (`TransactionBatchDialog`, `TransactionDraftCard`, `TransactionEntryForm`, `TransactionConfirmView`) replace the inline Dialog in `KeuanganView`. Two new Supabase tables store custom categories and units.

**Tech Stack:** Next.js 15, MUI Material v6, Supabase (PostgreSQL), TypeScript, plain React state for batch form array (not react-hook-form)

---

## File Map

| Status | File | Purpose |
|---|---|---|
| Modify | `lib/supabase.ts` | Add `DbTransactionCategory`, `DbTransactionSatuan` interfaces |
| Modify | `lib/api.ts` | Add `transactionCategoryApi`, `transactionSatuanApi` + `ApiTransactionCategory` type |
| Create | `controllers/keuangan/useTransactionMasterController.ts` | CRUD for custom kategori & satuan |
| Create | `controllers/keuangan/useTransactionBatchController.ts` | Draft array state, validation, submit logic |
| Create | `app/dashboard/keuangan/_components/TransactionEntryForm.tsx` | Form fields for one draft |
| Create | `app/dashboard/keuangan/_components/TransactionDraftCard.tsx` | Accordion card per draft |
| Create | `app/dashboard/keuangan/_components/TransactionConfirmView.tsx` | Read-only confirmation list |
| Create | `app/dashboard/keuangan/_components/TransactionBatchDialog.tsx` | Main Stepper dialog |
| Modify | `controllers/keuangan/useKeuanganController.tsx` | Remove old form logic, compose new controllers |
| Modify | `app/dashboard/keuangan/_components/KeuanganView.tsx` | Replace inline Dialog with TransactionBatchDialog |

---

## Task 1: Add Supabase DB Types + API Functions

**Files:**
- Modify: `lib/supabase.ts`
- Modify: `lib/api.ts`

- [ ] **Step 1: Run SQL migrations in Supabase Dashboard**

Open your Supabase project → SQL Editor and run:

```sql
-- Custom kategori transaksi (global per user)
CREATE TABLE IF NOT EXISTS finance_transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE finance_transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categories" ON finance_transaction_categories
  FOR ALL USING (auth.uid() = user_id);

-- Custom satuan transaksi (global per user)
CREATE TABLE IF NOT EXISTS finance_transaction_satuans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE finance_transaction_satuans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own satuans" ON finance_transaction_satuans
  FOR ALL USING (auth.uid() = user_id);
```

- [ ] **Step 2: Add DB interfaces to `lib/supabase.ts`**

Add these two interfaces at the end of the file (after `DbSupplyMutation`):

```typescript
export interface DbTransactionCategory {
  id: string;
  user_id: string;
  nama: string;
  created_at: string;
}

export interface DbTransactionSatuan {
  id: string;
  user_id: string;
  nama: string;
  created_at: string;
}
```

- [ ] **Step 3: Add API type + functions to `lib/api.ts`**

At the top of `lib/api.ts`, add import of new DB types after the existing imports block:

```typescript
import type {
  DbFinanceProject,
  DbHarvestBatch,
  DbRabCategory,
  DbRabImport,
  DbRabItem,
  DbStockMutation,
  DbTransaction,
  DbTransactionCategory,
  DbTransactionSatuan,
} from '@/lib/supabase';
```

Add the `ApiTransactionCategory` export type after the existing `ApiRabImport` interface (around line 60):

```typescript
export interface ApiTransactionCategory {
  id: string;
  nama: string;
}
```

Add the two API objects at the end of `lib/api.ts` (after `transactionApi`):

```typescript
// ─── Transaction Category API ─────────────────────────────────────
export const transactionCategoryApi = {
  getAll: async (): Promise<ApiTransactionCategory[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbTransactionCategory) => ({ id: row.id, nama: row.nama }));
  },

  create: async (nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionCategory;
    return { id: row.id, nama: row.nama };
  },

  update: async (id: string, nama: string): Promise<ApiTransactionCategory> => {
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .update({ nama })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionCategory;
    return { id: row.id, nama: row.nama };
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('finance_transaction_categories')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ─── Transaction Satuan API ───────────────────────────────────────
export const transactionSatuanApi = {
  getAll: async (): Promise<ApiTransactionCategory[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbTransactionSatuan) => ({ id: row.id, nama: row.nama }));
  },

  create: async (nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionSatuan;
    return { id: row.id, nama: row.nama };
  },

  update: async (id: string, nama: string): Promise<ApiTransactionCategory> => {
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .update({ nama })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionSatuan;
    return { id: row.id, nama: row.nama };
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('finance_transaction_satuans')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts lib/api.ts
git commit -m "feat: add transaction category and satuan API"
```

---

## Task 2: Create `useTransactionMasterController.ts`

**Files:**
- Create: `controllers/keuangan/useTransactionMasterController.ts`

- [ ] **Step 1: Create the file**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { transactionCategoryApi, transactionSatuanApi } from '@/lib/api';
import type { ApiTransactionCategory } from '@/lib/api';

export type MasterItem = ApiTransactionCategory; // { id: string; nama: string }

const PRESET_KATEGORI_PENGELUARAN = ['Pupuk', 'Pestisida', 'Tenaga Kerja', 'Irigasi & Air', 'Alat Tani', 'Lainnya'];
const PRESET_KATEGORI_PENDAPATAN = ['Penjualan Hasil Panen', 'Jasa', 'Lainnya'];
export const PRESET_SATUAN = ['kg', 'gram', 'ton', 'liter', 'pcs', 'karung', 'ikat', 'botol', 'sak'];

export function useTransactionMasterController() {
  const { user } = useAuth();
  const [customKategori, setCustomKategori] = useState<MasterItem[]>([]);
  const [customSatuan, setCustomSatuan] = useState<MasterItem[]>([]);
  const [kategoriDialogOpen, setKategoriDialogOpen] = useState(false);
  const [satuanDialogOpen, setSatuanDialogOpen] = useState(false);
  const [deleteKategoriError, setDeleteKategoriError] = useState<string | null>(null);
  const [deleteSatuanError, setDeleteSatuanError] = useState<string | null>(null);

  const loadCustomKategori = useCallback(async () => {
    if (!user) return;
    try {
      const data = await transactionCategoryApi.getAll();
      setCustomKategori(data);
    } catch {
      // presets still available
    }
  }, [user]);

  const loadCustomSatuan = useCallback(async () => {
    if (!user) return;
    try {
      const data = await transactionSatuanApi.getAll();
      setCustomSatuan(data);
    } catch {}
  }, [user]);

  useEffect(() => {
    loadCustomKategori();
    loadCustomSatuan();
  }, [loadCustomKategori, loadCustomSatuan]);

  const allKategori = (jenis: 'pengeluaran' | 'pendapatan'): string[] => {
    const presets = jenis === 'pengeluaran' ? PRESET_KATEGORI_PENGELUARAN : PRESET_KATEGORI_PENDAPATAN;
    return [...presets, ...customKategori.map((k) => k.nama)];
  };

  const allSatuan: string[] = [...PRESET_SATUAN, ...customSatuan.map((s) => s.nama)];

  const addKategori = async (nama: string) => {
    const created = await transactionCategoryApi.create(nama);
    setCustomKategori((prev) => [...prev, created]);
  };

  const renameKategori = async (id: string, nama: string) => {
    await transactionCategoryApi.update(id, nama);
    setCustomKategori((prev) => prev.map((k) => (k.id === id ? { ...k, nama } : k)));
  };

  const deleteKategori = async (id: string) => {
    try {
      await transactionCategoryApi.delete(id);
      setCustomKategori((prev) => prev.filter((k) => k.id !== id));
      setDeleteKategoriError(null);
    } catch (err) {
      setDeleteKategoriError(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  const addSatuan = async (nama: string) => {
    const created = await transactionSatuanApi.create(nama);
    setCustomSatuan((prev) => [...prev, created]);
  };

  const renameSatuan = async (id: string, nama: string) => {
    await transactionSatuanApi.update(id, nama);
    setCustomSatuan((prev) => prev.map((s) => (s.id === id ? { ...s, nama } : s)));
  };

  const deleteSatuan = async (id: string) => {
    try {
      await transactionSatuanApi.delete(id);
      setCustomSatuan((prev) => prev.filter((s) => s.id !== id));
      setDeleteSatuanError(null);
    } catch (err) {
      setDeleteSatuanError(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  return {
    customKategori,
    customSatuan,
    kategoriDialogOpen,
    setKategoriDialogOpen,
    satuanDialogOpen,
    setSatuanDialogOpen,
    deleteKategoriError,
    setDeleteKategoriError,
    deleteSatuanError,
    setDeleteSatuanError,
    allKategori,
    allSatuan,
    addKategori,
    renameKategori,
    deleteKategori,
    addSatuan,
    renameSatuan,
    deleteSatuan,
  };
}

export type UseTransactionMasterControllerResult = ReturnType<typeof useTransactionMasterController>;
```

- [ ] **Step 2: Commit**

```bash
git add controllers/keuangan/useTransactionMasterController.ts
git commit -m "feat: add useTransactionMasterController for custom kategori & satuan"
```

---

## Task 3: Create `useTransactionBatchController.ts`

**Files:**
- Create: `controllers/keuangan/useTransactionBatchController.ts`

- [ ] **Step 1: Create the file**

```typescript
'use client';

import { useState, useMemo } from 'react';
import { suggestRabItemsForTransaction } from '@/lib/finance/rabSuggestionMatcher';
import type { ApiTransaction } from '@/lib/api';
import type { RabItem } from '@/lib/finance/rabTypes';

export type TransactionDraft = {
  id: string;
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  volume: string;
  satuan: string;
  hargaSatuan: string;
  nominal: string;
  tanggal: string;
  keterangan: string;
};

export type DraftErrors = Record<string, string>;
export type AllDraftErrors = Record<string, DraftErrors>;

function createEmptyDraft(): TransactionDraft {
  return {
    id: crypto.randomUUID(),
    jenis: 'pengeluaran',
    kategori: '',
    volume: '',
    satuan: '',
    hargaSatuan: '',
    nominal: '',
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
  };
}

function formatNumber(value: string): string {
  const raw = value.replace(/\D/g, '');
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumber(formatted: string): number {
  return Number(formatted.replace(/\./g, '')) || 0;
}

function validateDraft(draft: TransactionDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.kategori.trim()) errors.kategori = 'Kategori wajib dipilih';
  if (!draft.tanggal) errors.tanggal = 'Tanggal wajib diisi';
  const nominalNum = parseNumber(draft.nominal);
  if (!draft.nominal || nominalNum <= 0) errors.nominal = 'Nominal harus lebih dari 0';
  return errors;
}

function draftFromTransaction(tx: ApiTransaction): TransactionDraft {
  const nominal = tx.nominal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const hargaSatuan = tx.hargaSatuan != null
    ? tx.hargaSatuan.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : '';
  return {
    id: tx._id,
    jenis: tx.jenis,
    kategori: tx.kategori,
    volume: tx.volume != null ? String(tx.volume) : '',
    satuan: tx.satuan ?? '',
    hargaSatuan,
    nominal,
    tanggal: tx.tanggal,
    keterangan: tx.keterangan ?? '',
  };
}

export function useTransactionBatchController(
  rabItems: RabItem[],
  addTransaction: (data: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'>) => Promise<ApiTransaction>,
  updateTransaction: (id: string, data: Partial<ApiTransaction>) => Promise<ApiTransaction>
) {

  const [dialogOpen, setDialogOpen] = useState(false);
  const [drafts, setDrafts] = useState<TransactionDraft[]>([createEmptyDraft()]);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [stage, setStage] = useState<'input' | 'confirm'>('input');
  const [submitting, setSubmitting] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [draftErrors, setDraftErrors] = useState<AllDraftErrors>({});
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [submitResults, setSubmitResults] = useState<{ success: number; failed: number } | null>(null);

  const openForCreate = () => {
    const firstDraft = createEmptyDraft();
    setDrafts([firstDraft]);
    setExpandedDraftId(firstDraft.id);
    setStage('input');
    setEditingTransactionId(null);
    setDraftErrors({});
    setSubmitResults(null);
    setDialogOpen(true);
  };

  const openForEdit = (tx: ApiTransaction) => {
    const draft = draftFromTransaction(tx);
    setDrafts([draft]);
    setExpandedDraftId(draft.id);
    setStage('input');
    setEditingTransactionId(tx._id);
    setDraftErrors({});
    setSubmitResults(null);
    setDialogOpen(true);
  };

  const hasAnyDraftContent = (drafts: TransactionDraft[]) =>
    drafts.some((d) => d.kategori || d.nominal || d.keterangan);

  const requestClose = () => {
    if (hasAnyDraftContent(drafts) && stage === 'input') {
      setCloseConfirmOpen(true);
    } else {
      closeDialog();
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCloseConfirmOpen(false);
  };

  const updateDraftField = (id: string, field: keyof TransactionDraft, value: string) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };

        if (field === 'volume' || field === 'hargaSatuan') {
          const vol = parseNumber(field === 'volume' ? value : d.volume);
          const harga = parseNumber(field === 'hargaSatuan' ? value : d.hargaSatuan);
          if (vol > 0 && harga > 0) {
            updated.nominal = formatNumber(String(vol * harga));
          }
        }

        if (field === 'nominal') {
          updated.nominal = formatNumber(value);
        }

        if (field === 'hargaSatuan') {
          updated.hargaSatuan = formatNumber(value);
        }

        return updated;
      })
    );
    // clear field error on change
    setDraftErrors((prev) => {
      const draftErrs = { ...(prev[id] ?? {}) };
      delete draftErrs[field];
      return { ...prev, [id]: draftErrs };
    });
  };

  const expandDraft = (id: string) => setExpandedDraftId(id);

  const addDraft = () => {
    const activeDraft = drafts.find((d) => d.id === expandedDraftId);
    if (activeDraft) {
      const errors = validateDraft(activeDraft);
      if (Object.keys(errors).length > 0) {
        setDraftErrors((prev) => ({ ...prev, [activeDraft.id]: errors }));
        return;
      }
    }
    const newDraft = createEmptyDraft();
    setDrafts((prev) => [...prev, newDraft]);
    setExpandedDraftId(newDraft.id);
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const remaining = prev.filter((d) => d.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptyDraft();
        setExpandedDraftId(fresh.id);
        return [fresh];
      }
      if (expandedDraftId === id) {
        setExpandedDraftId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
    setDraftErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const goToConfirm = () => {
    const allErrors: AllDraftErrors = {};
    let hasErrors = false;
    for (const draft of drafts) {
      const errors = validateDraft(draft);
      if (Object.keys(errors).length > 0) {
        allErrors[draft.id] = errors;
        hasErrors = true;
      }
    }
    if (hasErrors) {
      setDraftErrors(allErrors);
      // expand first errored draft
      const firstErrorId = Object.keys(allErrors)[0];
      setExpandedDraftId(firstErrorId);
      return;
    }
    setStage('confirm');
  };

  const goBackToInput = () => setStage('input');

  const submitAll = async (
    getProjectId: () => string | undefined,
    getRabLinkForDraft: (draft: TransactionDraft) => { projectId?: string; rabCategoryId?: string; rabItemId?: string } | null
  ) => {
    setSubmitting(true);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      const isEditDraft = i === 0 && editingTransactionId !== null;

      const rabLink = getRabLinkForDraft(draft);
      const payload = {
        jenis: draft.jenis,
        kategori: draft.kategori,
        nominal: parseNumber(draft.nominal),
        tanggal: draft.tanggal,
        keterangan: draft.keterangan,
        projectId: rabLink?.projectId ?? getProjectId(),
        rabCategoryId: rabLink?.rabCategoryId,
        rabItemId: rabLink?.rabItemId,
        volume: draft.volume ? parseNumber(draft.volume) : undefined,
        satuan: draft.satuan || undefined,
        hargaSatuan: draft.hargaSatuan ? parseNumber(draft.hargaSatuan) : undefined,
      };

      try {
        if (isEditDraft && editingTransactionId) {
          await updateTransaction(editingTransactionId, payload);
        } else {
          await addTransaction(payload as Parameters<typeof addTransaction>[0]);
        }
        success++;
      } catch {
        failed++;
      }
    }

    setSubmitting(false);
    setSubmitResults({ success, failed });

    if (failed === 0) {
      closeDialog();
    }

    return { success, failed };
  };

  // RAB suggestion for the currently expanded draft
  const expandedDraft = drafts.find((d) => d.id === expandedDraftId);
  const rabSuggestion = useMemo(() => {
    if (!expandedDraft) return null;
    const suggestions = suggestRabItemsForTransaction({
      items: rabItems,
      transaction: {
        jenis: expandedDraft.jenis,
        kategori: expandedDraft.kategori,
        keterangan: expandedDraft.keterangan,
      },
    });
    const best = suggestions[0];
    if (!best) return null;
    return `${best.item.categoryName ?? 'Kategori RAB'} - ${best.item.name}`;
  }, [expandedDraft, rabItems]);

  const getRabLinkForDraft = (draft: TransactionDraft) => {
    const suggestions = suggestRabItemsForTransaction({
      items: rabItems,
      transaction: { jenis: draft.jenis, kategori: draft.kategori, keterangan: draft.keterangan },
    });
    const best = suggestions[0];
    if (!best) return null;
    return {
      projectId: best.item.projectId,
      rabCategoryId: best.item.categoryId,
      rabItemId: best.item.id,
    };
  };

  return {
    dialogOpen,
    drafts,
    expandedDraftId,
    stage,
    submitting,
    editingTransactionId,
    draftErrors,
    closeConfirmOpen,
    submitResults,
    openForCreate,
    openForEdit,
    requestClose,
    closeDialog,
    setCloseConfirmOpen,
    updateDraftField,
    expandDraft,
    addDraft,
    removeDraft,
    goToConfirm,
    goBackToInput,
    submitAll,
    rabSuggestion,
    getRabLinkForDraft,
  };
}

export type UseTransactionBatchControllerResult = ReturnType<typeof useTransactionBatchController>;
```

- [ ] **Step 2: Commit**

```bash
git add controllers/keuangan/useTransactionBatchController.ts
git commit -m "feat: add useTransactionBatchController for batch transaction input"
```

---

## Task 4: Create `TransactionEntryForm.tsx`

**Files:**
- Create: `app/dashboard/keuangan/_components/TransactionEntryForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client';

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
import Alert from '@mui/material/Alert';
import SettingsIcon from '@mui/icons-material/Settings';

import type { TransactionDraft, DraftErrors } from '@/controllers/keuangan/useTransactionBatchController';

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
            type="date"
            label="Tanggal"
            value={draft.tanggal}
            onChange={(e) => onFieldChange('tanggal', e.target.value)}
            fullWidth
            size="small"
            required
            error={!!errors.tanggal}
            helperText={errors.tanggal}
            slotProps={{ inputLabel: { shrink: true } }}
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
        slotProps={{
          input: {
            startAdornment: draft.hargaSatuan ? (
              <InputAdornment position="start">
                <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.875rem' }}>Rp</Typography>
              </InputAdornment>
            ) : undefined,
          },
        }}
        helperText="Jika diisi bersama Volume, Nominal dihitung otomatis"
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

      {/* Keterangan */}
      <TextField
        label="Keterangan (opsional)"
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
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/keuangan/_components/TransactionEntryForm.tsx
git commit -m "feat: add TransactionEntryForm component"
```

---

## Task 5: Create `TransactionDraftCard.tsx`

**Files:**
- Create: `app/dashboard/keuangan/_components/TransactionDraftCard.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client';

import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

import { formatRupiah } from '@/lib/formatters';
import type { TransactionDraft, DraftErrors } from '@/controllers/keuangan/useTransactionBatchController';
import TransactionEntryForm from './TransactionEntryForm';

interface Props {
  draft: TransactionDraft;
  index: number;
  isExpanded: boolean;
  hasError: boolean;
  errors: DraftErrors;
  onExpand: () => void;
  onRemove: () => void;
  canRemove: boolean;
  kategoriList: string[];
  satuanList: string[];
  onFieldChange: (field: keyof TransactionDraft, value: string) => void;
  onOpenKategoriDialog: () => void;
  onOpenSatuanDialog: () => void;
  rabSuggestion: string | null;
}

export default function TransactionDraftCard({
  draft,
  index,
  isExpanded,
  hasError,
  errors,
  onExpand,
  onRemove,
  canRemove,
  kategoriList,
  satuanList,
  onFieldChange,
  onOpenKategoriDialog,
  onOpenSatuanDialog,
  rabSuggestion,
}: Props) {
  const theme = useTheme();
  const nominalNum = Number(draft.nominal.replace(/\./g, '')) || 0;
  const isPendapatan = draft.jenis === 'pendapatan';

  return (
    <Accordion
      expanded={isExpanded}
      onChange={onExpand}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: hasError
          ? 'error.main'
          : isExpanded
          ? 'primary.main'
          : 'divider',
        borderRadius: '12px !important',
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: isExpanded
            ? alpha(theme.palette.primary.main, 0.04)
            : 'transparent',
          minHeight: 56,
          '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: hasError
              ? 'error.main'
              : isPendapatan
              ? 'success.main'
              : 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isPendapatan
            ? <TrendingUpIcon sx={{ color: 'white', fontSize: 14 }} />
            : <TrendingDownIcon sx={{ color: 'white', fontSize: 14 }} />}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
            {draft.kategori || `Transaksi ${index + 1}`}
          </Typography>
          {!isExpanded && nominalNum > 0 && (
            <Typography variant="caption" color="text.secondary">
              {formatRupiah(nominalNum)} · {draft.tanggal}
            </Typography>
          )}
        </Box>

        {!isExpanded && draft.kategori && (
          <Chip
            label={isPendapatan ? 'Pendapatan' : 'Pengeluaran'}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: isPendapatan
                ? alpha(theme.palette.success.main, 0.12)
                : alpha(theme.palette.error.main, 0.12),
              color: isPendapatan ? 'success.dark' : 'error.dark',
            }}
          />
        )}

        {canRemove && (
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label="Hapus transaksi ini"
            sx={{ color: 'error.main', flexShrink: 0 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 1.5, pb: 2, px: 2 }}>
        <TransactionEntryForm
          draft={draft}
          kategoriList={kategoriList}
          satuanList={satuanList}
          errors={errors}
          onFieldChange={onFieldChange}
          onOpenKategoriDialog={onOpenKategoriDialog}
          onOpenSatuanDialog={onOpenSatuanDialog}
          rabSuggestion={isExpanded ? rabSuggestion : null}
        />
      </AccordionDetails>
    </Accordion>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/keuangan/_components/TransactionDraftCard.tsx
git commit -m "feat: add TransactionDraftCard accordion component"
```

---

## Task 6: Create `TransactionConfirmView.tsx`

**Files:**
- Create: `app/dashboard/keuangan/_components/TransactionConfirmView.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

import { formatRupiah, formatDateShort } from '@/lib/formatters';
import type { TransactionDraft } from '@/controllers/keuangan/useTransactionBatchController';

interface Props {
  drafts: TransactionDraft[];
  submitting: boolean;
  editingTransactionId: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

export default function TransactionConfirmView({
  drafts,
  submitting,
  editingTransactionId,
  onBack,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const newCount = editingTransactionId ? drafts.length - 1 : drafts.length;
  const editCount = editingTransactionId ? 1 : 0;

  const buttonLabel = editingTransactionId
    ? `Simpan (${editCount} diperbarui${newCount > 0 ? ` + ${newCount} baru` : ''})`
    : `Simpan Semua (${drafts.length} transaksi)`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Periksa kembali sebelum menyimpan. Semua data di bawah akan disimpan sekaligus.
      </Typography>

      <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Tanggal', 'Kategori', 'Jenis', 'Nominal'].map((h) => (
                <TableCell
                  key={h}
                  sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase' }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {drafts.map((draft, i) => {
              const nominalNum = Number(draft.nominal.replace(/\./g, '')) || 0;
              const isPendapatan = draft.jenis === 'pendapatan';
              const isEdited = i === 0 && !!editingTransactionId;
              return (
                <TableRow key={draft.id}>
                  <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                    {formatDateShort(draft.tanggal)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {draft.kategori}
                    {isEdited && (
                      <Chip label="Edit" size="small" sx={{ ml: 1, height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isPendapatan ? 'Pendapatan' : 'Pengeluaran'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: isPendapatan
                          ? alpha(theme.palette.success.main, 0.12)
                          : alpha(theme.palette.error.main, 0.12),
                        color: isPendapatan ? 'success.dark' : 'error.dark',
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      color: isPendapatan ? 'success.main' : 'error.main',
                    }}
                  >
                    {isPendapatan ? '+' : '−'}{formatRupiah(nominalNum)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 1.5, pt: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          disabled={submitting}
          sx={{ flex: 1, borderRadius: 8 }}
        >
          Kembali
        </Button>
        <Button
          variant="contained"
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={onConfirm}
          disabled={submitting}
          sx={{ flex: 2, borderRadius: 8, bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
        >
          {submitting ? 'Menyimpan...' : buttonLabel}
        </Button>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/keuangan/_components/TransactionConfirmView.tsx
git commit -m "feat: add TransactionConfirmView component"
```

---

## Task 7: Create `TransactionBatchDialog.tsx`

**Files:**
- Create: `app/dashboard/keuangan/_components/TransactionBatchDialog.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import MasterDataDialog from '@/app/dashboard/stok/_components/MasterDataDialog';
import type { UseTransactionBatchControllerResult } from '@/controllers/keuangan/useTransactionBatchController';
import type { UseTransactionMasterControllerResult } from '@/controllers/keuangan/useTransactionMasterController';
import TransactionDraftCard from './TransactionDraftCard';
import TransactionConfirmView from './TransactionConfirmView';

interface Props {
  batch: UseTransactionBatchControllerResult;
  master: UseTransactionMasterControllerResult;
  selectedProjectId?: string;
}

const STEPS = ['Input Transaksi', 'Konfirmasi'];

export default function TransactionBatchDialog({ batch, master, selectedProjectId }: Props) {
  const theme = useTheme();

  const {
    dialogOpen,
    drafts,
    expandedDraftId,
    stage,
    submitting,
    editingTransactionId,
    draftErrors,
    closeConfirmOpen,
    submitResults,
    requestClose,
    closeDialog,
    setCloseConfirmOpen,
    updateDraftField,
    expandDraft,
    addDraft,
    removeDraft,
    goToConfirm,
    goBackToInput,
    submitAll,
    rabSuggestion,
    getRabLinkForDraft,
  } = batch;

  const {
    customKategori,
    customSatuan,
    kategoriDialogOpen,
    setKategoriDialogOpen,
    satuanDialogOpen,
    setSatuanDialogOpen,
    deleteKategoriError,
    setDeleteKategoriError,
    deleteSatuanError,
    setDeleteSatuanError,
    allKategori,
    allSatuan,
    addKategori,
    renameKategori,
    deleteKategori,
    addSatuan,
    renameSatuan,
    deleteSatuan,
  } = master;

  const activeStepIndex = stage === 'input' ? 0 : 1;

  const handleSubmit = () => {
    submitAll(
      () => selectedProjectId,
      getRabLinkForDraft
    );
  };

  return (
    <>
      {/* ─── Main Batch Dialog ─── */}
      <Dialog
        open={dialogOpen}
        onClose={requestClose}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, maxHeight: '90vh' } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  bgcolor: editingTransactionId ? 'primary.light' : '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {editingTransactionId
                  ? <EditOutlinedIcon sx={{ color: 'primary.dark', fontSize: 20 }} />
                  : <AddCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', lineHeight: 1.2, fontWeight: 800 }}>
                  {editingTransactionId ? 'Edit Transaksi' : 'Catat Transaksi'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {editingTransactionId ? 'Perbarui atau tambah transaksi baru' : 'Bisa tambah lebih dari satu sekaligus'}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={requestClose}
              sx={{
                color: 'text.secondary',
                bgcolor: alpha(theme.palette.text.primary, 0.06),
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStepIndex} sx={{ mt: 2, mb: 0.5 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </DialogTitle>

        <DialogContent sx={{ pt: '12px !important' }}>
          {submitResults && submitResults.failed > 0 && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              {submitResults.success} transaksi berhasil, {submitResults.failed} gagal disimpan.
            </Alert>
          )}

          {stage === 'input' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {drafts.map((draft, index) => {
                const isExpanded = draft.id === expandedDraftId;
                return (
                  <TransactionDraftCard
                    key={draft.id}
                    draft={draft}
                    index={index}
                    isExpanded={isExpanded}
                    hasError={!!draftErrors[draft.id] && Object.keys(draftErrors[draft.id]).length > 0}
                    errors={draftErrors[draft.id] ?? {}}
                    onExpand={() => expandDraft(draft.id)}
                    onRemove={() => removeDraft(draft.id)}
                    canRemove={drafts.length > 1 || (editingTransactionId ? index > 0 : false)}
                    kategoriList={allKategori(draft.jenis)}
                    satuanList={allSatuan}
                    onFieldChange={(field, value) => updateDraftField(draft.id, field, value)}
                    onOpenKategoriDialog={() => setKategoriDialogOpen(true)}
                    onOpenSatuanDialog={() => setSatuanDialogOpen(true)}
                    rabSuggestion={isExpanded ? rabSuggestion : null}
                  />
                );
              })}

              <Box sx={{ display: 'flex', gap: 1.5, pt: 0.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddCircleIcon />}
                  onClick={addDraft}
                  sx={{ flex: 1, borderRadius: 8, textTransform: 'none' }}
                >
                  + Tambah Transaksi Lagi
                </Button>
                <Button
                  variant="contained"
                  onClick={goToConfirm}
                  disabled={drafts.length === 0}
                  sx={{ flex: 1, borderRadius: 8, bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                >
                  Konfirmasi →
                </Button>
              </Box>
            </Box>
          )}

          {stage === 'confirm' && (
            <TransactionConfirmView
              drafts={drafts}
              submitting={submitting}
              editingTransactionId={editingTransactionId}
              onBack={goBackToInput}
              onConfirm={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Close Confirmation Dialog ─── */}
      <Dialog open={closeConfirmOpen} onClose={() => setCloseConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Keluar dari form?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Data transaksi yang belum disimpan akan hilang.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setCloseConfirmOpen(false)} sx={{ borderRadius: 2 }}>
            Lanjut Mengisi
          </Button>
          <Button variant="contained" color="error" onClick={closeDialog} sx={{ borderRadius: 2 }}>
            Ya, Keluar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Kelola Kategori Dialog ─── */}
      <MasterDataDialog
        open={kategoriDialogOpen}
        onClose={() => setKategoriDialogOpen(false)}
        title="Kelola Kategori Transaksi"
        items={customKategori}
        onAdd={addKategori}
        onRename={renameKategori}
        onDelete={deleteKategori}
        deleteError={deleteKategoriError}
        onClearDeleteError={() => setDeleteKategoriError(null)}
      />

      {/* ─── Kelola Satuan Dialog ─── */}
      <MasterDataDialog
        open={satuanDialogOpen}
        onClose={() => setSatuanDialogOpen(false)}
        title="Kelola Satuan"
        items={customSatuan}
        onAdd={addSatuan}
        onRename={renameSatuan}
        onDelete={deleteSatuan}
        deleteError={deleteSatuanError}
        onClearDeleteError={() => setDeleteSatuanError(null)}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/keuangan/_components/TransactionBatchDialog.tsx
git commit -m "feat: add TransactionBatchDialog with stepper and accordion"
```

---

## Task 8: Refactor `useKeuanganController.tsx`

**Files:**
- Modify: `controllers/keuangan/useKeuanganController.tsx`

- [ ] **Step 1: Remove old form logic and import new controllers**

Remove these imports (no longer needed):
```typescript
// Remove:
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useFinanceLedgerController } from './useFinanceLedgerController';
```

Add these imports after the existing imports:
```typescript
import { useTransactionBatchController } from './useTransactionBatchController';
import { useTransactionMasterController } from './useTransactionMasterController';
```

- [ ] **Step 2: Remove old state and schema from controller body**

Remove the entire `transactionSchema`, `TransactionFormData` type, and these state variables from the controller body:
```typescript
// Remove all of these:
const transactionSchema = z.object({ ... });
type TransactionFormData = z.infer<typeof transactionSchema>;
const [txDialogOpen, setTxDialogOpen] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);
const [txSubmitting, setTxSubmitting] = useState(false);
const { control, handleSubmit, reset, formState: { errors } } = useForm<TransactionFormData>({ ... });
const selectedJenis = useWatch({ control, name: 'jenis' });
const selectedKategori = useWatch({ control, name: 'kategori' }) ?? '';
const selectedKeterangan = useWatch({ control, name: 'keterangan' }) ?? '';
const kategoriFiltered = useMemo(...);
```

Remove these functions:
```typescript
// Remove all of these:
const openAddDialog = () => { ... };
const handleEdit = (tx: ApiTransaction) => { ... };
const onSubmit = async (data: TransactionFormData) => { ... };
const handleNominalChange = (value: string, onChange: (v: string) => void) => { ... };
```

- [ ] **Step 3: Add new controllers and update `financeLedger` usage**

Replace the `financeLedger` instantiation. Find this block:
```typescript
const financeLedger = useFinanceLedgerController({
  rabItems: rab.items,
  selectedJenis,
  selectedKategori,
  selectedKeterangan,
});
```

Remove it entirely (RAB suggestion is now handled inside `useTransactionBatchController`).

Add new controllers after `const rab = useRabController(financeProject.selectedProject);`:
```typescript
const transactionBatch = useTransactionBatchController(rab.items, addTransaction, updateTransaction);
const transactionMaster = useTransactionMasterController();
```

- [ ] **Step 4: Update the return object**

In the `return { ... }` block, remove these keys:
```typescript
// Remove from return:
txDialogOpen,
setTxDialogOpen,
editingId,
setEditingId,
txSubmitting,
control,
handleSubmit,
errors,
selectedJenis,
kategoriFiltered,
openAddDialog,
handleEdit,
onSubmit,
handleNominalChange,
financeLedger,
```

Add these keys to the return:
```typescript
// Add to return:
transactionBatch,
transactionMaster,
```

- [ ] **Step 5: Commit**

```bash
git add controllers/keuangan/useKeuanganController.tsx
git commit -m "refactor: extract transaction form logic into batch and master controllers"
```

---

## Task 9: Update `KeuanganView.tsx`

**Files:**
- Modify: `app/dashboard/keuangan/_components/KeuanganView.tsx`

- [ ] **Step 1: Add import for TransactionBatchDialog**

Add this import at the top of the file with other component imports:
```typescript
import TransactionBatchDialog from './TransactionBatchDialog';
```

- [ ] **Step 2: Update destructured props**

In the component's props destructuring, replace:
```typescript
// Remove these:
txDialogOpen,
setTxDialogOpen,
editingId,
setEditingId,
txSubmitting,
control,
handleSubmit,
errors,
selectedJenis,
kategoriFiltered,
openAddDialog,
handleEdit,
onSubmit,
handleNominalChange,
financeLedger,
```

Add:
```typescript
transactionBatch,
transactionMaster,
```

- [ ] **Step 3: Update button onClick handlers**

Find `onClick={openAddDialog}` (appears in 3 places) and replace each with:
```typescript
onClick={transactionBatch.openForCreate}
```

Find `onClick={() => handleEdit(tx)}` (appears in 2 places — mobile card and table row) and replace each with:
```typescript
onClick={() => transactionBatch.openForEdit(tx)}
```

- [ ] **Step 4: Replace the inline transaction Dialog**

Find the block starting at:
```typescript
{/* ─── MODAL: Catat / Edit Transaksi ─── */}
<Dialog
  open={txDialogOpen}
  ...
>
```

and ending at the closing `</Dialog>` tag of that modal (just before `{/* ─── MODAL: Analisis Kelayakan Usaha (BFA) ─── */}`).

Replace the entire block with:
```typescript
{/* ─── MODAL: Catat / Edit Transaksi (Batch) ─── */}
<TransactionBatchDialog
  batch={transactionBatch}
  master={transactionMaster}
  selectedProjectId={financeProject.selectedProject?.id}
/>
```

- [ ] **Step 5: Remove unused imports**

Remove these imports from `KeuanganView.tsx` that are no longer needed after the dialog extraction:
```typescript
// Remove if no longer used elsewhere in KeuanganView:
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import CircularProgress from '@mui/material/CircularProgress';
import { Controller } from 'react-hook-form';
```

> **Note:** Only remove imports that are truly unused. Keep any that are still used by the BFA dialog or other parts of `KeuanganView.tsx`.

- [ ] **Step 6: Update snackbar wiring**

The batch controller does not call `setSnackbar` — it closes the dialog on success and shows an inline result. Wire the snackbar from `useKeuanganController` to react to `transactionBatch.submitResults`. Add this inside the View, after the `TransactionBatchDialog`:

In `useKeuanganController.tsx`, add a `useEffect` after the new controllers are initialized:
```typescript
useEffect(() => {
  const results = transactionBatch.submitResults;
  if (!results) return;
  if (results.failed === 0) {
    setSnackbar({ open: true, message: `${results.success} transaksi berhasil disimpan`, severity: 'success' });
  } else {
    setSnackbar({ open: true, message: `${results.success} berhasil, ${results.failed} gagal`, severity: 'error' });
  }
}, [transactionBatch.submitResults]);
```

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/keuangan/_components/KeuanganView.tsx controllers/keuangan/useKeuanganController.tsx
git commit -m "feat: replace inline transaction dialog with TransactionBatchDialog"
```

---

## Task 10: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test tambah transaksi tunggal**
  - Buka `/dashboard/keuangan`
  - Klik "Catat Transaksi"
  - Stepper harus muncul di step "Input Transaksi"
  - Isi jenis, tanggal, kategori, nominal, klik "Konfirmasi →"
  - Step pindah ke "Konfirmasi", tabel summary muncul
  - Klik "Simpan Semua (1 transaksi)" → dialog tutup, snackbar "1 transaksi berhasil disimpan"
  - Transaksi muncul di tabel Buku Besar

- [ ] **Step 3: Test tambah transaksi batch**
  - Buka dialog, isi transaksi pertama
  - Klik "+ Tambah Transaksi Lagi" → kartu pertama collapse, form baru muncul
  - Isi transaksi kedua
  - Klik Edit pada kartu pertama → form pertama expand kembali
  - Klik "Konfirmasi →" → summary 2 transaksi
  - Klik "Simpan Semua" → 2 transaksi muncul di buku besar

- [ ] **Step 4: Test validasi**
  - Buka dialog, klik langsung "Konfirmasi →" tanpa mengisi
  - Error "Kategori wajib dipilih" dan "Nominal harus lebih dari 0" muncul di form

- [ ] **Step 5: Test auto-hitung nominal**
  - Isi Volume: 50, Harga Satuan: 10.000
  - Field Nominal harus otomatis terisi "500.000"

- [ ] **Step 6: Test custom kategori**
  - Klik ikon ⚙ di sebelah dropdown Kategori
  - MasterDataDialog terbuka, tambah kategori baru
  - Tutup dialog, buka dropdown kategori → kategori baru harus muncul

- [ ] **Step 7: Test edit transaksi**
  - Klik Edit pada transaksi yang sudah ada di tabel
  - Dialog buka dengan data lama ter-prefill
  - Ubah nominal → klik Konfirmasi → Simpan
  - Data di tabel harus berubah

- [ ] **Step 8: Test close warning**
  - Buka dialog, isi sebagian form, klik tombol ✕
  - Muncul konfirmasi "Keluar dari form?"
  - Klik "Ya, Keluar" → dialog tutup, data hilang

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "test: verify transaction batch input feature working"
```
