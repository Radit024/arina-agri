# Arus Kas Pasca Pembiayaan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth finance report tab, "Arus Kas Pasca Pembiayaan", that lets the user enter financing assumptions (working capital loan, interest, disbursement/repayment timing) per scenario and see the resulting post-financing monthly cash flow, using the calculation engine already built in sub-bagian A.

**Architecture:** A new `financing_assumptions` API layer (table already exists from sub-bagian A's SQL) feeds a new hook (`useFinancingAssumptions`) and controller (`useFinancingController`) that assemble `computeKebutuhanModalKerja`/`computeBunga`/`computeArusKasPascaPembiayaan` (already built, sub-bagian A) using the `arusKasBulanan` already produced by `useFinanceReportController` (sub-bagian B). A dialog (`FinancingAssumptionsDialog`) collects the form input; a new tab (`FinanceFinancingView`) renders the summary + monthly table, wired into `KeuanganView.tsx`'s existing Tabs alongside Buku Besar/RAB/Laba Rugi/Arus Kas.

**Tech Stack:** TypeScript, React, MUI, Supabase, Vitest + Testing Library — matches the existing Keuangan module's stack exactly, no new dependencies.

Spec: [docs/superpowers/specs/2026-08-02-finance-scenario-financing-cashflow-design.md](../specs/2026-08-02-finance-scenario-financing-cashflow-design.md)

---

## Task 1: `financingAssumptionsApi` in `lib/api.ts`

**Files:**
- Modify: `lib/supabase.ts` (add `DbFinancingAssumptions` interface)
- Modify: `lib/api.ts` (add `ApiFinancingAssumptions` type, `mapFinancingAssumptions`, `financingAssumptionsApi`)
- Test: `tests/lib/financingAssumptionsApi.test.ts`

- [ ] **Step 1: Add the DB row type**

In `lib/supabase.ts`, right after the `DbFinanceScenario` interface, add:

```typescript
export interface DbFinancingAssumptions {
  id: string;
  scenario_id: string;
  saldo_kas_awal: number;
  modal_sendiri: number;
  nilai_pinjaman: number;
  bunga_per_periode: number;
  tanggal_pencairan: string | null;
  tanggal_pembayaran: string | null;
  biaya_lain: number;
  updated_at: string;
}
```

(The `financing_assumptions` table already exists — created by
`docs/sql/2026-08-02-finance-scenarios.sql` in sub-bagian A. This step only adds the TypeScript
type; no SQL change needed.)

- [ ] **Step 2: Write the failing test**

Create `tests/lib/financingAssumptionsApi.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    from,
  },
}));

vi.mock('@/lib/devAuth', () => ({
  buildDevelopmentAccessToken: () => 'dev-token',
  readLocalDevelopmentUserId: () => null,
}));

const dbRow = {
  id: 'financing-1',
  scenario_id: 'scenario-1',
  saldo_kas_awal: 0,
  modal_sendiri: 3_869_000,
  nilai_pinjaman: 15_000_000,
  bunga_per_periode: 3,
  tanggal_pencairan: '2026-08-01',
  tanggal_pembayaran: '2026-12-01',
  biaya_lain: 0,
  updated_at: '2026-08-02T00:00:00.000Z',
};

describe('financingAssumptionsApi', () => {
  beforeEach(() => {
    from.mockReset();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('getByScenario returns null when no row exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    const { financingAssumptionsApi } = await import('@/lib/api');
    const result = await financingAssumptionsApi.getByScenario('scenario-1');

    expect(from).toHaveBeenCalledWith('financing_assumptions');
    expect(eq).toHaveBeenCalledWith('scenario_id', 'scenario-1');
    expect(result).toBeNull();
  });

  it('getByScenario maps an existing row', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    const { financingAssumptionsApi } = await import('@/lib/api');
    const result = await financingAssumptionsApi.getByScenario('scenario-1');

    expect(result).toMatchObject({
      id: 'financing-1',
      scenarioId: 'scenario-1',
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      tanggalPencairan: '2026-08-01',
      tanggalPembayaran: '2026-12-01',
    });
  });

  it('upsert writes snake_case fields keyed by scenario_id', async () => {
    const single = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    from.mockReturnValue({ upsert });

    const { financingAssumptionsApi } = await import('@/lib/api');
    const result = await financingAssumptionsApi.upsert('scenario-1', {
      saldoKasAwal: 0,
      modalSendiri: 3_869_000,
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      tanggalPencairan: '2026-08-01',
      tanggalPembayaran: '2026-12-01',
      biayaLain: 0,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        scenario_id: 'scenario-1',
        nilai_pinjaman: 15_000_000,
        bunga_per_periode: 3,
        tanggal_pencairan: '2026-08-01',
        tanggal_pembayaran: '2026-12-01',
      }),
      { onConflict: 'scenario_id' },
    );
    expect(result.scenarioId).toBe('scenario-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/financingAssumptionsApi.test.ts`
Expected: FAIL — `financingAssumptionsApi` is not exported from `@/lib/api`

- [ ] **Step 3: Add the type, mapper, and API to `lib/api.ts`**

Add `DbFinancingAssumptions` to the `import type { ... } from '@/lib/supabase'` block at the top of
`lib/api.ts` (alongside `DbFinanceScenario`).

Add `FinancingAssumptions` to the `import type { ... } from '@/lib/finance/rabTypes'` block (it
already exists there from sub-bagian A — reuse it, don't redefine).

Right after the existing `export type ApiFinanceScenario = FinanceScenarioEntity;` line, add:

```typescript
export type ApiFinancingAssumptions = FinancingAssumptions;
```

Right after the existing `mapFinanceScenario` function, add:

```typescript
function mapFinancingAssumptions(row: DbFinancingAssumptions): FinancingAssumptions {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    saldoKasAwal: row.saldo_kas_awal,
    modalSendiri: row.modal_sendiri,
    nilaiPinjaman: row.nilai_pinjaman,
    bungaPerPeriode: row.bunga_per_periode,
    tanggalPencairan: row.tanggal_pencairan ?? '',
    tanggalPembayaran: row.tanggal_pembayaran ?? '',
    biayaLain: row.biaya_lain,
  };
}
```

Right after the existing `financeScenarioApi` export block, add:

```typescript
// ─── Financing Assumptions API ─────────────────────────────────────
export const financingAssumptionsApi = {
  getByScenario: async (scenarioId: string): Promise<ApiFinancingAssumptions | null> => {
    const user = await resolveCurrentUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('financing_assumptions')
      .select('*')
      .eq('scenario_id', scenarioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapFinancingAssumptions(data as DbFinancingAssumptions) : null;
  },

  upsert: async (
    scenarioId: string,
    payload: Omit<FinancingAssumptions, 'id' | 'scenarioId'>,
  ): Promise<ApiFinancingAssumptions> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('financing_assumptions')
      .upsert(
        {
          scenario_id: scenarioId,
          saldo_kas_awal: payload.saldoKasAwal,
          modal_sendiri: payload.modalSendiri,
          nilai_pinjaman: payload.nilaiPinjaman,
          bunga_per_periode: payload.bungaPerPeriode,
          tanggal_pencairan: payload.tanggalPencairan || null,
          tanggal_pembayaran: payload.tanggalPembayaran || null,
          biaya_lain: payload.biayaLain,
        },
        { onConflict: 'scenario_id' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapFinancingAssumptions(data as DbFinancingAssumptions);
  },
};
```

`resolveCurrentUser` and `supabase` already exist earlier in this file — reuse as-is.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/financingAssumptionsApi.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run typecheck and commit**

Run: `npm run typecheck` — expect clean.

```bash
git add lib/supabase.ts lib/api.ts tests/lib/financingAssumptionsApi.test.ts
git commit -m "feat: add financingAssumptionsApi for per-scenario financing data"
```

---

## Task 2: `useFinancingAssumptions` hook

**Files:**
- Create: `hooks/useFinancingAssumptions.ts`
- Test: `tests/hooks/useFinancingAssumptions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFinancingAssumptions } from '@/hooks/useFinancingAssumptions';
import { financingAssumptionsApi } from '@/lib/api';
import type { ApiFinancingAssumptions } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  financingAssumptionsApi: {
    getByScenario: vi.fn(),
    upsert: vi.fn(),
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const assumptions: ApiFinancingAssumptions = {
  id: 'financing-1',
  scenarioId: 'scenario-1',
  saldoKasAwal: 0,
  modalSendiri: 3_869_000,
  nilaiPinjaman: 15_000_000,
  bungaPerPeriode: 3,
  tanggalPencairan: '2026-08-01',
  tanggalPembayaran: '2026-12-01',
  biayaLain: 0,
};

beforeEach(() => {
  vi.mocked(financingAssumptionsApi.getByScenario).mockReset();
  vi.mocked(financingAssumptionsApi.upsert).mockReset();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
});

describe('useFinancingAssumptions', () => {
  it('returns null when no assumptions exist yet', async () => {
    vi.mocked(financingAssumptionsApi.getByScenario).mockResolvedValue(null);

    const { result } = renderHook(() => useFinancingAssumptions('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assumptions).toBeNull();
  });

  it('fetches assumptions for the given scenario', async () => {
    vi.mocked(financingAssumptionsApi.getByScenario).mockResolvedValue(assumptions);

    const { result } = renderHook(() => useFinancingAssumptions('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(financingAssumptionsApi.getByScenario).toHaveBeenCalledWith('scenario-1');
    expect(result.current.assumptions).toEqual(assumptions);
  });

  it('does not fetch when scenarioId is null', async () => {
    const { result } = renderHook(() => useFinancingAssumptions(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(financingAssumptionsApi.getByScenario).not.toHaveBeenCalled();
    expect(result.current.assumptions).toBeNull();
  });

  it('save() upserts and updates local state', async () => {
    vi.mocked(financingAssumptionsApi.getByScenario).mockResolvedValue(null);
    vi.mocked(financingAssumptionsApi.upsert).mockResolvedValue(assumptions);

    const { result } = renderHook(() => useFinancingAssumptions('scenario-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({
        saldoKasAwal: 0,
        modalSendiri: 3_869_000,
        nilaiPinjaman: 15_000_000,
        bungaPerPeriode: 3,
        tanggalPencairan: '2026-08-01',
        tanggalPembayaran: '2026-12-01',
        biayaLain: 0,
      });
    });

    expect(financingAssumptionsApi.upsert).toHaveBeenCalledWith('scenario-1', expect.objectContaining({
      nilaiPinjaman: 15_000_000,
    }));
    expect(result.current.assumptions).toEqual(assumptions);
  });

  it('sets an error message when the fetch fails', async () => {
    vi.mocked(financingAssumptionsApi.getByScenario).mockRejectedValue(new Error('Gagal memuat'));

    const { result } = renderHook(() => useFinancingAssumptions('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Gagal memuat');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/hooks/useFinancingAssumptions.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the hook**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { financingAssumptionsApi, type ApiFinancingAssumptions } from '@/lib/api';
import type { FinancingAssumptions } from '@/lib/finance/rabTypes';

export function useFinancingAssumptions(scenarioId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [assumptions, setAssumptions] = useState<ApiFinancingAssumptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!scenarioId || !user) {
        setAssumptions(null);
        setError(null);
        return;
      }
      const data = await financingAssumptionsApi.getByScenario(scenarioId);
      setAssumptions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat asumsi pembiayaan');
    } finally {
      setLoading(false);
    }
  }, [authLoading, scenarioId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = async (payload: Omit<FinancingAssumptions, 'id' | 'scenarioId'>) => {
    if (!scenarioId) throw new Error('Scenario belum dipilih');
    const saved = await financingAssumptionsApi.upsert(scenarioId, payload);
    setAssumptions(saved);
    return saved;
  };

  return { assumptions, loading, error, save, reload: loadData };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/hooks/useFinancingAssumptions.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useFinancingAssumptions.ts tests/hooks/useFinancingAssumptions.test.ts
git commit -m "feat: add useFinancingAssumptions hook"
```

---

## Task 3: `useFinancingController`

**Files:**
- Create: `controllers/keuangan/useFinancingController.ts`
- Test: `tests/controllers/useFinancingController.test.ts`

This controller assembles the draft form state, validation, and the three calculation-engine calls
(`computeKebutuhanModalKerja`, `computeBunga`, `computeArusKasPascaPembiayaan` — all already built in
`lib/finance/scenarioCalculations.ts` during sub-bagian A) on top of the hook from Task 2.

- [ ] **Step 1: Write the failing test**

```typescript
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFinancingController } from '@/controllers/keuangan/useFinancingController';
import { useFinancingAssumptions } from '@/hooks/useFinancingAssumptions';
import type { ArusKasBulanan } from '@/lib/finance/rabTypes';

vi.mock('@/hooks/useFinancingAssumptions', () => ({
  useFinancingAssumptions: vi.fn(),
}));

const arusKasBulanan: ArusKasBulanan[] = [
  { bulan: '2026-07', kasMasuk: 0, kasKeluar: 7_412_500, kasBersih: -7_412_500, kasKumulatif: -7_412_500 },
  { bulan: '2026-08', kasMasuk: 0, kasKeluar: 14_746_500, kasBersih: -14_746_500, kasKumulatif: -22_159_000 },
  { bulan: '2026-09', kasMasuk: 0, kasKeluar: 0, kasBersih: 0, kasKumulatif: -22_159_000 },
  { bulan: '2026-10', kasMasuk: 0, kasKeluar: 0, kasBersih: 0, kasKumulatif: -22_159_000 },
  { bulan: '2026-11', kasMasuk: 0, kasKeluar: 0, kasBersih: 0, kasKumulatif: -22_159_000 },
  { bulan: '2026-12', kasMasuk: 45_500_000, kasKeluar: 0, kasBersih: 45_500_000, kasKumulatif: 23_341_000 },
];

const save = vi.fn();

beforeEach(() => {
  save.mockReset().mockResolvedValue(undefined);
  vi.mocked(useFinancingAssumptions).mockReturnValue({
    assumptions: null,
    loading: false,
    error: null,
    save,
    reload: vi.fn(),
  });
});

describe('useFinancingController', () => {
  it('computes kebutuhanModalKerja without needing financing assumptions', () => {
    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    expect(result.current.kebutuhanModalKerja).toBe(22_159_000);
    expect(result.current.bunga).toBeNull();
    expect(result.current.kasAkhirPascaPembiayaan).toBeNull();
  });

  it('computes bunga and arus kas pasca pembiayaan once assumptions exist', () => {
    vi.mocked(useFinancingAssumptions).mockReturnValue({
      assumptions: {
        id: 'financing-1',
        scenarioId: 'scenario-1',
        saldoKasAwal: 0,
        modalSendiri: 3_869_000,
        nilaiPinjaman: 15_000_000,
        bungaPerPeriode: 3,
        tanggalPencairan: '2026-08-01',
        tanggalPembayaran: '2026-12-01',
        biayaLain: 0,
      },
      loading: false,
      error: null,
      save,
      reload: vi.fn(),
    });

    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    expect(result.current.bunga).toBe(450_000);
    expect(result.current.kasAkhirPascaPembiayaan).toBe(22_891_000);
  });

  it('openDialog seeds the draft from existing assumptions, converting dates to month keys', () => {
    vi.mocked(useFinancingAssumptions).mockReturnValue({
      assumptions: {
        id: 'financing-1',
        scenarioId: 'scenario-1',
        saldoKasAwal: 0,
        modalSendiri: 3_869_000,
        nilaiPinjaman: 15_000_000,
        bungaPerPeriode: 3,
        tanggalPencairan: '2026-08-01',
        tanggalPembayaran: '2026-12-01',
        biayaLain: 0,
      },
      loading: false,
      error: null,
      save,
      reload: vi.fn(),
    });

    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    act(() => result.current.openDialog());

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.draft).toMatchObject({
      nilaiPinjaman: '15000000',
      bungaPerPeriode: '3',
      tanggalPencairan: '2026-08',
      tanggalPembayaran: '2026-12',
    });
  });

  it('rejects negative nilaiPinjaman on submit without calling save', async () => {
    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    act(() => result.current.openDialog());
    act(() => result.current.updateDraftField('nilaiPinjaman', '-1000'));

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current.saveError).toMatch(/tidak boleh negatif/i);
  });

  it('rejects tanggalPembayaran before tanggalPencairan', async () => {
    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    act(() => result.current.openDialog());
    act(() => result.current.updateDraftField('nilaiPinjaman', '15000000'));
    act(() => result.current.updateDraftField('tanggalPencairan', '2026-12'));
    act(() => result.current.updateDraftField('tanggalPembayaran', '2026-08'));

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current.saveError).toMatch(/sebelum tanggal pencairan/i);
  });

  it('submits a valid draft, converting month keys back to full dates, and closes the dialog', async () => {
    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    act(() => result.current.openDialog());
    act(() => result.current.updateDraftField('nilaiPinjaman', '15000000'));
    act(() => result.current.updateDraftField('bungaPerPeriode', '3'));
    act(() => result.current.updateDraftField('tanggalPencairan', '2026-08'));
    act(() => result.current.updateDraftField('tanggalPembayaran', '2026-12'));

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      tanggalPencairan: '2026-08-01',
      tanggalPembayaran: '2026-12-01',
    }));
    await waitFor(() => expect(result.current.dialogOpen).toBe(false));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/controllers/useFinancingController.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the controller**

```typescript
'use client';

import { useMemo, useState } from 'react';

import { useFinancingAssumptions } from '@/hooks/useFinancingAssumptions';
import { toMonthKey } from '@/lib/finance/rabCalculations';
import {
  computeArusKasPascaPembiayaan,
  computeBunga,
  computeKebutuhanModalKerja,
} from '@/lib/finance/scenarioCalculations';
import type { ArusKasBulanan, FinancingAssumptions } from '@/lib/finance/rabTypes';

type FinancingDraft = {
  saldoKasAwal: string;
  modalSendiri: string;
  nilaiPinjaman: string;
  bungaPerPeriode: string;
  tanggalPencairan: string;
  tanggalPembayaran: string;
  biayaLain: string;
};

const EMPTY_DRAFT: FinancingDraft = {
  saldoKasAwal: '',
  modalSendiri: '',
  nilaiPinjaman: '',
  bungaPerPeriode: '',
  tanggalPencairan: '',
  tanggalPembayaran: '',
  biayaLain: '',
};

function draftFromAssumptions(assumptions: FinancingAssumptions | null): FinancingDraft {
  if (!assumptions) return EMPTY_DRAFT;
  return {
    saldoKasAwal: String(assumptions.saldoKasAwal),
    modalSendiri: String(assumptions.modalSendiri),
    nilaiPinjaman: String(assumptions.nilaiPinjaman),
    bungaPerPeriode: String(assumptions.bungaPerPeriode),
    tanggalPencairan: assumptions.tanggalPencairan ? toMonthKey(assumptions.tanggalPencairan) : '',
    tanggalPembayaran: assumptions.tanggalPembayaran ? toMonthKey(assumptions.tanggalPembayaran) : '',
    biayaLain: String(assumptions.biayaLain),
  };
}

function validateDraft(draft: FinancingDraft): string | null {
  const nilaiPinjaman = Number(draft.nilaiPinjaman) || 0;
  const bungaPerPeriode = Number(draft.bungaPerPeriode) || 0;
  const biayaLain = Number(draft.biayaLain) || 0;
  const saldoKasAwal = Number(draft.saldoKasAwal) || 0;
  const modalSendiri = Number(draft.modalSendiri) || 0;

  if (nilaiPinjaman < 0 || bungaPerPeriode < 0 || biayaLain < 0 || saldoKasAwal < 0 || modalSendiri < 0) {
    return 'Nilai pinjaman, bunga, biaya lain, saldo kas awal, dan modal sendiri tidak boleh negatif';
  }
  if (draft.tanggalPencairan && draft.tanggalPembayaran && draft.tanggalPembayaran < draft.tanggalPencairan) {
    return 'Tanggal pembayaran tidak boleh sebelum tanggal pencairan';
  }
  return null;
}

export function useFinancingController({
  scenarioId,
  arusKasBulanan,
}: {
  scenarioId: string | null;
  arusKasBulanan: ArusKasBulanan[];
}) {
  const { assumptions, loading, error, save } = useFinancingAssumptions(scenarioId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<FinancingDraft>(EMPTY_DRAFT);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const kebutuhanModalKerja = useMemo(
    () => computeKebutuhanModalKerja(arusKasBulanan),
    [arusKasBulanan],
  );

  const bunga = assumptions ? computeBunga(assumptions.nilaiPinjaman, assumptions.bungaPerPeriode) : null;

  const arusKasPascaPembiayaan = useMemo(() => {
    if (!assumptions) return [];
    return computeArusKasPascaPembiayaan(arusKasBulanan, {
      nilaiPinjaman: assumptions.nilaiPinjaman,
      bungaPerPeriode: assumptions.bungaPerPeriode,
      biayaLain: assumptions.biayaLain,
      pencairanBulan: assumptions.tanggalPencairan ? toMonthKey(assumptions.tanggalPencairan) : '',
      pembayaranBulan: assumptions.tanggalPembayaran ? toMonthKey(assumptions.tanggalPembayaran) : '',
    });
  }, [assumptions, arusKasBulanan]);

  const kasAkhirPascaPembiayaan = assumptions && arusKasPascaPembiayaan.length > 0
    ? arusKasPascaPembiayaan[arusKasPascaPembiayaan.length - 1].kasKumulatifSetelahPembiayaan
    : null;

  const openDialog = () => {
    setSaveError(null);
    setDraft(draftFromAssumptions(assumptions));
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const updateDraftField = (field: keyof FinancingDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const submitDraft = async () => {
    const validationError = validateDraft(draft);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await save({
        saldoKasAwal: Number(draft.saldoKasAwal) || 0,
        modalSendiri: Number(draft.modalSendiri) || 0,
        nilaiPinjaman: Number(draft.nilaiPinjaman) || 0,
        bungaPerPeriode: Number(draft.bungaPerPeriode) || 0,
        tanggalPencairan: draft.tanggalPencairan ? `${draft.tanggalPencairan}-01` : '',
        tanggalPembayaran: draft.tanggalPembayaran ? `${draft.tanggalPembayaran}-01` : '',
        biayaLain: Number(draft.biayaLain) || 0,
      });
      setDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan asumsi pembiayaan');
    } finally {
      setSaving(false);
    }
  };

  return {
    assumptions,
    loading,
    error,
    kebutuhanModalKerja,
    bunga,
    arusKasPascaPembiayaan,
    kasAkhirPascaPembiayaan,
    dialogOpen,
    draft,
    openDialog,
    closeDialog,
    updateDraftField,
    submitDraft,
    saving,
    saveError,
  };
}

export type UseFinancingControllerResult = ReturnType<typeof useFinancingController>;
```

`toMonthKey`, `computeArusKasPascaPembiayaan`, `computeBunga`, `computeKebutuhanModalKerja` all
already exist (`lib/finance/rabCalculations.ts` and `lib/finance/scenarioCalculations.ts`, built in
sub-bagian A) — reuse as-is, do not redefine. Note
`computeArusKasPascaPembiayaan`'s financing parameter is named `pencairanBulan`/`pembayaranBulan`
(month keys), not `tanggalPencairan`/`tanggalPembayaran` — this is intentional (see sub-bagian A's
final review, which renamed these fields specifically to prevent a full-date-vs-month-key mixup).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/controllers/useFinancingController.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add controllers/keuangan/useFinancingController.ts tests/controllers/useFinancingController.test.ts
git commit -m "feat: add useFinancingController for post-financing cash flow"
```

---

## Task 4: `FinancingAssumptionsDialog` component

**Files:**
- Create: `app/dashboard/keuangan/_components/FinancingAssumptionsDialog.tsx`
- Test: `tests/components/FinancingAssumptionsDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinancingAssumptionsDialog from '@/app/dashboard/keuangan/_components/FinancingAssumptionsDialog';
import type { UseFinancingControllerResult } from '@/controllers/keuangan/useFinancingController';

function makeFinancing(overrides: Partial<UseFinancingControllerResult> = {}): UseFinancingControllerResult {
  return {
    assumptions: null,
    loading: false,
    error: null,
    kebutuhanModalKerja: 22_159_000,
    bunga: null,
    arusKasPascaPembiayaan: [],
    kasAkhirPascaPembiayaan: null,
    dialogOpen: true,
    draft: {
      saldoKasAwal: '',
      modalSendiri: '',
      nilaiPinjaman: '',
      bungaPerPeriode: '',
      tanggalPencairan: '',
      tanggalPembayaran: '',
      biayaLain: '',
    },
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    updateDraftField: vi.fn(),
    submitDraft: vi.fn(),
    saving: false,
    saveError: null,
    ...overrides,
  };
}

function renderDialog(financing = makeFinancing()) {
  return {
    financing,
    ...render(
      <ThemeProvider theme={createTheme()}>
        <FinancingAssumptionsDialog financing={financing} />
      </ThemeProvider>,
    ),
  };
}

describe('FinancingAssumptionsDialog', () => {
  it('renders all financing input fields', () => {
    renderDialog();

    expect(screen.getByLabelText(/Nilai Pinjaman/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bunga per Periode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Pencairan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Pembayaran/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Biaya Lain/i)).toBeInTheDocument();
  });

  it('calls updateDraftField when a field changes', () => {
    const financing = makeFinancing();
    renderDialog(financing);

    fireEvent.change(screen.getByLabelText(/Nilai Pinjaman/i), { target: { value: '15000000' } });

    expect(financing.updateDraftField).toHaveBeenCalledWith('nilaiPinjaman', '15000000');
  });

  it('shows the saveError message when present', () => {
    renderDialog(makeFinancing({ saveError: 'Nilai pinjaman tidak boleh negatif' }));

    expect(screen.getByText('Nilai pinjaman tidak boleh negatif')).toBeInTheDocument();
  });

  it('calls submitDraft when the save button is clicked', () => {
    const financing = makeFinancing();
    renderDialog(financing);

    fireEvent.click(screen.getByRole('button', { name: /Simpan/i }));

    expect(financing.submitDraft).toHaveBeenCalled();
  });

  it('does not render when dialogOpen is false', () => {
    renderDialog(makeFinancing({ dialogOpen: false }));

    expect(screen.queryByLabelText(/Nilai Pinjaman/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/FinancingAssumptionsDialog.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create the component**

```tsx
'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { UseFinancingControllerResult } from '@/controllers/keuangan/useFinancingController';

type Props = {
  financing: UseFinancingControllerResult;
};

export default function FinancingAssumptionsDialog({ financing }: Props) {
  const { dialogOpen, draft, updateDraftField, submitDraft, saving, saveError, closeDialog } = financing;

  return (
    <Dialog
      open={dialogOpen}
      onClose={closeDialog}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="span" variant="h6" sx={{ display: 'block', fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
          Atur Asumsi Pembiayaan
        </Typography>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Dipakai untuk menghitung Arus Kas Pasca Pembiayaan pada scenario ini.
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {saveError}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Saldo Kas Awal"
              type="number"
              fullWidth
              value={draft.saldoKasAwal}
              onChange={(e) => updateDraftField('saldoKasAwal', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Modal Sendiri"
              type="number"
              fullWidth
              value={draft.modalSendiri}
              onChange={(e) => updateDraftField('modalSendiri', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nilai Pinjaman"
              type="number"
              fullWidth
              value={draft.nilaiPinjaman}
              onChange={(e) => updateDraftField('nilaiPinjaman', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Bunga per Periode (%)"
              type="number"
              fullWidth
              value={draft.bungaPerPeriode}
              onChange={(e) => updateDraftField('bungaPerPeriode', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tanggal Pencairan"
              type="month"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={draft.tanggalPencairan}
              onChange={(e) => updateDraftField('tanggalPencairan', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tanggal Pembayaran"
              type="month"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={draft.tanggalPembayaran}
              onChange={(e) => updateDraftField('tanggalPembayaran', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Biaya Lain"
              type="number"
              fullWidth
              value={draft.biayaLain}
              onChange={(e) => updateDraftField('biayaLain', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeDialog} sx={{ borderRadius: 8 }}>Batal</Button>
        <Button variant="contained" disabled={saving} onClick={submitDraft} sx={{ borderRadius: 8 }}>
          Simpan
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/FinancingAssumptionsDialog.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/keuangan/_components/FinancingAssumptionsDialog.tsx tests/components/FinancingAssumptionsDialog.test.tsx
git commit -m "feat: add FinancingAssumptionsDialog form"
```

---

## Task 5: `FinanceFinancingView` component

**Files:**
- Create: `app/dashboard/keuangan/_components/FinanceFinancingView.tsx`
- Test: `tests/components/FinanceFinancingView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinanceFinancingView from '@/app/dashboard/keuangan/_components/FinanceFinancingView';
import type { UseFinancingControllerResult } from '@/controllers/keuangan/useFinancingController';

function makeFinancing(overrides: Partial<UseFinancingControllerResult> = {}): UseFinancingControllerResult {
  return {
    assumptions: null,
    loading: false,
    error: null,
    kebutuhanModalKerja: 18_869_000,
    bunga: null,
    arusKasPascaPembiayaan: [],
    kasAkhirPascaPembiayaan: null,
    dialogOpen: false,
    draft: {
      saldoKasAwal: '', modalSendiri: '', nilaiPinjaman: '', bungaPerPeriode: '',
      tanggalPencairan: '', tanggalPembayaran: '', biayaLain: '',
    },
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    updateDraftField: vi.fn(),
    submitDraft: vi.fn(),
    saving: false,
    saveError: null,
    ...overrides,
  };
}

function renderView(financing = makeFinancing()) {
  return {
    financing,
    ...render(
      <ThemeProvider theme={createTheme()}>
        <FinanceFinancingView financing={financing} />
      </ThemeProvider>,
    ),
  };
}

describe('FinanceFinancingView', () => {
  it('always shows Kebutuhan Modal Kerja even without financing assumptions', () => {
    renderView();

    expect(screen.getByText(/Kebutuhan Modal Kerja/i)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?18\.869\.000/)).toBeInTheDocument();
  });

  it('shows a call-to-action instead of Bunga/Kas Akhir when assumptions are missing', () => {
    renderView();

    expect(screen.getAllByText(/Atur Asumsi Pembiayaan/i).length).toBeGreaterThan(0);
  });

  it('opens the dialog when the CTA button is clicked', () => {
    const financing = makeFinancing();
    renderView(financing);

    fireEvent.click(screen.getAllByRole('button', { name: /Atur Asumsi Pembiayaan/i })[0]);

    expect(financing.openDialog).toHaveBeenCalled();
  });

  it('renders Bunga, Kas Akhir Pasca Pembiayaan, and the monthly table once assumptions exist', () => {
    renderView(makeFinancing({
      bunga: 450_000,
      kasAkhirPascaPembiayaan: 22_891_000,
      arusKasPascaPembiayaan: [
        { bulan: '2026-07', kasSetelahPembiayaan: -7_412_500, kasKumulatifSetelahPembiayaan: -7_412_500 },
        { bulan: '2026-12', kasSetelahPembiayaan: 30_050_000, kasKumulatifSetelahPembiayaan: 22_891_000 },
      ],
    }));

    expect(screen.getByText(/Rp\s?450\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?22\.891\.000/)).toBeInTheDocument();
    expect(screen.getByText('2026-07')).toBeInTheDocument();
    expect(screen.getByText('2026-12')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/FinanceFinancingView.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create the component**

Check `lib/formatters.ts` for `formatRupiah` first (already used throughout this module, e.g.
`app/dashboard/keuangan/_components/FinanceCashFlowView.tsx`) — reuse it, don't reimplement Rupiah
formatting.

```tsx
'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { formatRupiah } from '@/lib/formatters';
import type { UseFinancingControllerResult } from '@/controllers/keuangan/useFinancingController';

type Props = {
  financing: UseFinancingControllerResult;
};

export default function FinanceFinancingView({ financing }: Props) {
  const { kebutuhanModalKerja, bunga, kasAkhirPascaPembiayaan, arusKasPascaPembiayaan, openDialog } = financing;
  const hasAssumptions = bunga !== null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Kebutuhan Modal Kerja</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{formatRupiah(kebutuhanModalKerja)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Bunga</Typography>
              {hasAssumptions ? (
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{formatRupiah(bunga)}</Typography>
              ) : (
                <Button size="small" variant="outlined" onClick={openDialog} sx={{ mt: 1, borderRadius: 8 }}>
                  Atur Asumsi Pembiayaan
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Kas Akhir Pasca Pembiayaan</Typography>
              {hasAssumptions ? (
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{formatRupiah(kasAkhirPascaPembiayaan ?? 0)}</Typography>
              ) : (
                <Button size="small" variant="outlined" onClick={openDialog} sx={{ mt: 1, borderRadius: 8 }}>
                  Atur Asumsi Pembiayaan
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700, mb: 1.5 }}>
            Arus Kas Pasca Pembiayaan Bulanan
          </Typography>
          {!hasAssumptions ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Atur asumsi pembiayaan untuk melihat proyeksi arus kas setelah pembiayaan.
              </Typography>
              <Button variant="contained" onClick={openDialog} sx={{ borderRadius: 8 }}>
                Atur Asumsi Pembiayaan
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bulan</TableCell>
                    <TableCell align="right">Kas Setelah Pembiayaan</TableCell>
                    <TableCell align="right">Kas Kumulatif Setelah Pembiayaan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {arusKasPascaPembiayaan.map((row) => (
                    <TableRow key={row.bulan}>
                      <TableCell>{row.bulan}</TableCell>
                      <TableCell align="right">{formatRupiah(row.kasSetelahPembiayaan)}</TableCell>
                      <TableCell align="right">{formatRupiah(row.kasKumulatifSetelahPembiayaan)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/FinanceFinancingView.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/keuangan/_components/FinanceFinancingView.tsx tests/components/FinanceFinancingView.test.tsx
git commit -m "feat: add FinanceFinancingView tab content"
```

---

## Task 6: Wire into `useKeuanganController.tsx`

**Files:**
- Modify: `controllers/keuangan/useKeuanganController.tsx`

- [ ] **Step 1: Extend the `financeTab` type**

Find:
```typescript
  const [financeTab, setFinanceTab] = useState<'buku-besar' | 'rab' | 'laba-rugi' | 'arus-kas'>('buku-besar');
```
Replace with:
```typescript
  const [financeTab, setFinanceTab] = useState<'buku-besar' | 'rab' | 'laba-rugi' | 'arus-kas' | 'arus-kas-pasca-pembiayaan'>('buku-besar');
```

- [ ] **Step 2: Import and instantiate `useFinancingController`**

Add the import alongside the other controller imports:
```typescript
import { useFinancingController } from './useFinancingController';
```

Find where `financeReports` is instantiated:
```typescript
  const financeReports = useFinanceReportController({
    project: financeProject.selectedProject,
    rabItems: rab.items,
    transactions,
  });
```
Right after it, add:
```typescript
  const financing = useFinancingController({
    scenarioId: financeScenario.activeScenario?.id ?? null,
    arusKasBulanan: financeReports.arusKasBulanan,
  });
```

- [ ] **Step 3: Return `financing` from the controller**

In the returned object, add `financing,` right after `financeReports,`:
```typescript
    financeReports,
    financing,
    labaRugiActions,
```

- [ ] **Step 4: Run typecheck and the existing controller test to confirm no regressions**

Run: `npm run typecheck` — expect clean.
Run: `npm test -- tests/controllers/useFinanceReportController.test.ts` — expect PASS unchanged (this
step only adds a new controller call, it doesn't touch `useFinanceReportController` itself).

- [ ] **Step 5: Commit**

```bash
git add controllers/keuangan/useKeuanganController.tsx
git commit -m "feat: wire useFinancingController into useKeuanganController"
```

---

## Task 7: Wire into `KeuanganView.tsx`

**Files:**
- Modify: `app/dashboard/keuangan/_components/KeuanganView.tsx`
- Modify: `tests/components/KeuanganView.test.tsx`

- [ ] **Step 1: Add a failing test**

In `tests/components/KeuanganView.test.tsx`, find the shared default-props object (search for
`financeReports:` to locate it) and add a `financing` field right after it, matching the
`UseFinancingControllerResult` shape:

```typescript
    financing: {
      assumptions: null,
      loading: false,
      error: null,
      kebutuhanModalKerja: 0,
      bunga: null,
      arusKasPascaPembiayaan: [],
      kasAkhirPascaPembiayaan: null,
      dialogOpen: false,
      draft: {
        saldoKasAwal: '', modalSendiri: '', nilaiPinjaman: '', bungaPerPeriode: '',
        tanggalPencairan: '', tanggalPembayaran: '', biayaLain: '',
      },
      openDialog: vi.fn(),
      closeDialog: vi.fn(),
      updateDraftField: vi.fn(),
      submitDraft: vi.fn(),
      saving: false,
      saveError: null,
    } satisfies KeuanganViewProps['financing'],
```

Then add a new test near the other `financeTab`-related tests:

```tsx
  it('shows the Arus Kas Pasca Pembiayaan tab and renders FinanceFinancingView when selected', () => {
    render(
      <ThemeProvider theme={activeTheme}>
        <KeuanganView {...defaultProps} financeTab="arus-kas-pasca-pembiayaan" />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('finance-panel-arus-kas-pasca-pembiayaan')).toBeInTheDocument();
  });
```

Use whichever identifier the file's actual default-props/theme variables are named (inspect the top
of the `describe('KeuanganView', ...)` block first — this plan assumes `defaultProps`/`activeTheme`
based on the pattern established in Tasks 8-11 of the prior sub-bagian B work, but confirm against
the actual current file before writing).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/KeuanganView.test.tsx`
Expected: FAIL — `financing` prop type error and/or missing tab/panel

- [ ] **Step 3: Import and add the Tab**

Add the import:
```typescript
import FinanceFinancingView from './FinanceFinancingView';
import FinancingAssumptionsDialog from './FinancingAssumptionsDialog';
```

Add `financing,` to the destructured props (near where `financeReports,` is destructured).

Find the `<Tabs>` block:
```tsx
        <Tab value="buku-besar" label="Buku Besar" />
        <Tab value="rab" label="RAB" />
        <Tab value="laba-rugi" label="Laba Rugi" />
        <Tab value="arus-kas" label="Arus Kas" />
```
Add a fifth tab right after:
```tsx
        <Tab value="arus-kas-pasca-pembiayaan" label="Arus Kas Pasca Pembiayaan" />
```

- [ ] **Step 4: Add the panel and dialog**

Find the `{financeTab === 'arus-kas' && ( ... )}` block and add a new block right after it:

```tsx
      {financeTab === 'arus-kas-pasca-pembiayaan' && (
        <Box
          data-testid="finance-panel-arus-kas-pasca-pembiayaan"
          data-finance-fill-height="true"
          sx={financePanelSx}
        >
          <FinanceFinancingView financing={financing} />
        </Box>
      )}
```

Find where `<TransactionBatchDialog ... />` and other modal components are rendered near the bottom
of the file, and add:

```tsx
      <FinancingAssumptionsDialog financing={financing} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/components/KeuanganView.test.tsx`
Expected: PASS (all existing tests + the new one)

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/keuangan/_components/KeuanganView.tsx tests/components/KeuanganView.test.tsx
git commit -m "feat: add Arus Kas Pasca Pembiayaan tab to KeuanganView"
```

---

## Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including every file from Tasks 1-7.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Manual smoke test in the browser**

Start the dev server, open the Keuangan page for a project with some transactions, and check:
- The "Arus Kas Pasca Pembiayaan" tab appears after "Arus Kas".
- Kebutuhan Modal Kerja shows a value immediately (no financing assumptions needed).
- Bunga and Kas Akhir Pasca Pembiayaan show "Atur Asumsi Pembiayaan" buttons before any assumptions
  are saved.
- Clicking "Atur Asumsi Pembiayaan" opens the dialog; entering a negative nilai pinjaman shows the
  validation error and does not save; entering a tanggal pembayaran before tanggal pencairan shows
  the validation error; a valid submission saves and the tab immediately shows Bunga, Kas Akhir
  Pasca Pembiayaan, and the monthly table.
- Switching between PROYEKSI/REALISASI mode Tabs (from sub-bagian B) shows different financing
  assumptions per scenario (each scenario has its own).

---

## Self-Review Notes

- **Spec coverage:** dialog-as-separate-component (Keputusan #1) → Task 4; tab placement after Arus
  Kas (Keputusan #2) → Task 7; month-key vs full-date conversion (Keputusan #3) → Task 3's
  `toMonthKey` usage in both `draftFromAssumptions` and the `arusKasPascaPembiayaan` memo; upsert
  semantics (Keputusan #4) → Task 1's `onConflict: 'scenario_id'`; error handling (negative values,
  Kebutuhan Modal Kerja always available, scenario-switch refetch) → Tasks 3 and 5.
- **Type consistency:** `FinancingDraft`, `UseFinancingControllerResult`, and the field names used in
  `FinancingAssumptionsDialog`/`FinanceFinancingView` match exactly what Task 3's controller defines
  and returns.
- **Out-of-scope confirmed unchanged:** no task touches PERBANDINGAN, migration, or Export/PDF/AI —
  matching the spec's "Out of Scope" section.
