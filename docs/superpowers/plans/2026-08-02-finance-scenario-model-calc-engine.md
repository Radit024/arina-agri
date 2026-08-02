# Finance Scenario Data Model + Calculation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Design the `finance_scenarios` data model (Proyeksi/Realisasi as a first-class entity, replacing the RAB-vs-transaction "planned vs actual" model) and build a pure-function calculation engine (`lib/finance/scenarioCalculations.ts`) implementing every formula from `AUDIT_REVISI_MANAJEMEN_KEUANGAN.md`, verified against the audit's golden fixture (Padi 1 Ha).

**Architecture:** A new `finance_scenarios` table (documented as SQL, not yet applied to production) makes scenario a first-class entity with its own assumptions (production/sales, financing), instead of tagging every row with a mode column. A new pure-function module computes RAB totals, HPP, BEP, B/C ratio, laba rugi, arus kas, arus kas pasca pembiayaan, and scenario comparison — all independent of Supabase/React, so the same functions will later be reused by UI, export, PDF, and AI (not in this plan's scope). Every formula is locked against the audit's corrected Padi 1 Ha numbers via a golden-fixture test.

**Tech Stack:** TypeScript (pure functions, no framework deps), Vitest, Supabase/PostgreSQL (SQL only, manual migration).

Spec: [docs/superpowers/specs/2026-08-02-finance-scenario-model-calc-engine-design.md](../specs/2026-08-02-finance-scenario-model-calc-engine-design.md)
Audit: [AUDIT_REVISI_MANAJEMEN_KEUANGAN.md](../../../AUDIT_REVISI_MANAJEMEN_KEUANGAN.md) (repo root)

---

## Task 1: SQL schema for `finance_scenarios` and related tables

**Files:**
- Create: `docs/sql/2026-08-02-finance-scenarios.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- ============================================================
-- Finance Scenarios (Proyeksi/Realisasi) Data Model
-- Tanggal: 2026-08-02
-- Jalankan di: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Scenario adalah entitas first-class: setiap proyek punya tepat satu scenario
-- PROJECTION dan satu scenario REALIZATION.
CREATE TABLE IF NOT EXISTS finance_scenarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES finance_projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  mode        text NOT NULL CHECK (mode IN ('PROJECTION', 'REALIZATION')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (project_id, mode)
);

CREATE INDEX IF NOT EXISTS finance_scenarios_project_id_idx
  ON finance_scenarios (project_id);

ALTER TABLE finance_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own finance scenarios"
  ON finance_scenarios
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RAB categories/items dan transactions mendapat scenario_id. project_id dipertahankan
-- sebagai denormalisasi untuk query lintas-scenario, kebenaran mode selalu dari scenario_id.
ALTER TABLE rab_categories ADD COLUMN IF NOT EXISTS scenario_id uuid REFERENCES finance_scenarios(id) ON DELETE CASCADE;
ALTER TABLE rab_items ADD COLUMN IF NOT EXISTS scenario_id uuid REFERENCES finance_scenarios(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS scenario_id uuid REFERENCES finance_scenarios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS rab_categories_scenario_id_idx ON rab_categories (scenario_id);
CREATE INDEX IF NOT EXISTS rab_items_scenario_id_idx ON rab_items (scenario_id);
CREATE INDEX IF NOT EXISTS transactions_scenario_id_idx ON transactions (scenario_id);

-- Asumsi produksi/penjualan: satu baris per scenario.
CREATE TABLE IF NOT EXISTS production_sales_assumptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id  uuid NOT NULL UNIQUE REFERENCES finance_scenarios(id) ON DELETE CASCADE,
  produksi     numeric,
  satuan       text,
  harga_jual   numeric,
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE production_sales_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own production/sales assumptions"
  ON production_sales_assumptions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM finance_scenarios
    WHERE finance_scenarios.id = production_sales_assumptions.scenario_id
      AND finance_scenarios.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM finance_scenarios
    WHERE finance_scenarios.id = production_sales_assumptions.scenario_id
      AND finance_scenarios.user_id = auth.uid()
  ));

-- Asumsi pembiayaan: satu baris per scenario.
CREATE TABLE IF NOT EXISTS financing_assumptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id         uuid NOT NULL UNIQUE REFERENCES finance_scenarios(id) ON DELETE CASCADE,
  saldo_kas_awal      numeric DEFAULT 0,
  modal_sendiri       numeric DEFAULT 0,
  nilai_pinjaman      numeric DEFAULT 0,
  bunga_per_periode   numeric DEFAULT 0,
  tanggal_pencairan   date,
  tanggal_pembayaran  date,
  biaya_lain          numeric DEFAULT 0,
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE financing_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own financing assumptions"
  ON financing_assumptions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM finance_scenarios
    WHERE finance_scenarios.id = financing_assumptions.scenario_id
      AND finance_scenarios.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM finance_scenarios
    WHERE finance_scenarios.id = financing_assumptions.scenario_id
      AND finance_scenarios.user_id = auth.uid()
  ));
```

- [ ] **Step 2: Note the manual run step**

This file is not auto-applied — every file in `docs/sql/` in this repo is run manually via the
Supabase Dashboard SQL Editor (already documented in the file's header comment above). No code
change needed for this step.

- [ ] **Step 3: Commit**

```bash
git add docs/sql/2026-08-02-finance-scenarios.sql
git commit -m "docs: add finance_scenarios SQL schema for scenario model"
```

---

## Task 2: TypeScript types for the scenario model

**Files:**
- Modify: `lib/finance/rabTypes.ts`

- [ ] **Step 1: Add the new types**

Open `lib/finance/rabTypes.ts`. Right after the existing `VarianceStatus` type definition (it ends
with `| 'di_bawah_target';`), add:

```typescript
export type ScenarioMode = 'PROJECTION' | 'REALIZATION';

export interface FinanceScenarioEntity {
  id: string;
  projectId: string;
  mode: ScenarioMode;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionSalesAssumptions {
  id: string;
  scenarioId: string;
  produksi: number;
  satuan: string;
  hargaJual: number;
}

export interface FinancingAssumptions {
  id: string;
  scenarioId: string;
  saldoKasAwal: number;
  modalSendiri: number;
  nilaiPinjaman: number;
  bungaPerPeriode: number;
  tanggalPencairan: string;
  tanggalPembayaran: string;
  biayaLain: number;
}

export type KelayakanStatus = 'rugi' | 'impas' | 'untung';

export interface ArusKasBulanan {
  bulan: string;
  kasMasuk: number;
  kasKeluar: number;
  kasBersih: number;
  kasKumulatif: number;
}

export interface ArusKasPascaPembiayaanBulanan {
  bulan: string;
  kasSetelahPembiayaan: number;
  kasKumulatifSetelahPembiayaan: number;
}

export interface ScenarioOutput {
  totalPendapatan: number;
  totalBiayaProduksi: number;
  labaRugi: number;
  hpp: number | null;
  bepProduksi: number | null;
  bcRatio: number | null;
  kategoriTotals: Record<string, number>;
  arusKasBulanan: ArusKasBulanan[];
  kebutuhanModalKerja: number;
  bunga: number;
  kasAkhirPascaPembiayaan: number;
}

export interface ScenarioComparisonMetric {
  label: string;
  proyeksi: number;
  realisasi: number;
  selisih: number;
  selisihPercent: number | null;
  unmatched?: boolean;
}

export interface ScenarioComparisonMonth {
  bulan: string;
  proyeksi: number;
  realisasi: number;
  selisih: number;
  selisihPercent: number | null;
}

export interface ScenarioComparison {
  metrics: ScenarioComparisonMetric[];
  kategoriMetrics: ScenarioComparisonMetric[];
  arusKasBulanan: ScenarioComparisonMonth[];
}
```

Note: `FinanceScenarioEntity` (not `FinanceScenario`) is used to avoid any naming collision — this
codebase has an unrelated `FinanceScenario = 'realisasi' | 'proyeksi'` type on another branch
(`feature/proyeksi-realisasi-scenario`, not merged, and not present on this branch). Since this
branch was created fresh from `main`, that type does not exist here — `FinanceScenarioEntity` is a
clear, self-explanatory name regardless.

Note: `RabItem`/`RabCategory` types are NOT modified in this task — adding `scenarioId` to those
types is deferred to the sub-project that wires this schema into the UI/controllers (out of scope
here per the design spec).

- [ ] **Step 2: Verify the file still compiles**

Run: `npx tsc --noEmit lib/finance/rabTypes.ts` (or `npm run typecheck` for the whole project if
faster/more reliable — check `package.json` scripts)
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/finance/rabTypes.ts
git commit -m "feat: add finance scenario, assumptions, and comparison types"
```

---

## Task 3: RAB totals and profitability formulas

**Files:**
- Create: `lib/finance/scenarioCalculations.ts`
- Test: `tests/finance/scenarioCalculations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/finance/scenarioCalculations.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import {
  computeBcRatio,
  computeBepProduksi,
  computeHpp,
  computeKelayakanStatus,
  computeKeuntungan,
  computePenerimaan,
  computeRabTotals,
} from '@/lib/finance/scenarioCalculations';
import type { RabItem } from '@/lib/finance/rabTypes';

const padi1HaRabItems: RabItem[] = [
  {
    id: 'benih', projectId: 'p1', categoryId: 'saprodi', categoryName: 'Saprodi',
    type: 'expense', name: 'Benih', volume: 25, unit: 'Kg', unitPrice: 16_500,
    plannedTotal: 412_500, aliases: [], sortOrder: 1,
  },
  {
    id: 'sewa', projectId: 'p1', categoryId: 'fixed', categoryName: 'Biaya Tetap',
    type: 'expense', name: 'Sewa Lahan', volume: 1, unit: 'Ha/Musim', unitPrice: 7_000_000,
    plannedTotal: 7_000_000, aliases: [], sortOrder: 2,
  },
  {
    id: 'lain', projectId: 'p1', categoryId: 'lain', categoryName: 'Lain-lain',
    type: 'expense', name: 'Sisa Biaya', volume: 1, unit: 'paket', unitPrice: 14_746_500,
    plannedTotal: 14_746_500, aliases: [], sortOrder: 3,
  },
  {
    id: 'panen', projectId: 'p1', categoryId: 'income', categoryName: 'Pendapatan',
    type: 'income', name: 'Penjualan Gabah', volume: 7_000, unit: 'Kg', unitPrice: 6_500,
    plannedTotal: 45_500_000, aliases: [], sortOrder: 4,
  },
];

describe('computeRabTotals', () => {
  it('sums total biaya produksi and total pendapatan RAB from Padi 1 Ha fixture', () => {
    const result = computeRabTotals(padi1HaRabItems);

    expect(result.totalBiayaProduksi).toBe(22_159_000);
    expect(result.totalPendapatanRab).toBe(45_500_000);
  });
});

describe('computePenerimaan', () => {
  it('multiplies produksi by hargaJual', () => {
    expect(computePenerimaan(7_000, 6_500)).toBe(45_500_000);
  });

  it('returns null for negative produksi', () => {
    expect(computePenerimaan(-1, 6_500)).toBeNull();
  });

  it('returns null for negative hargaJual', () => {
    expect(computePenerimaan(7_000, -1)).toBeNull();
  });
});

describe('computeKeuntungan', () => {
  it('subtracts total biaya produksi from penerimaan', () => {
    expect(computeKeuntungan(45_500_000, 22_159_000)).toBe(23_341_000);
  });

  it('allows a negative result (rugi)', () => {
    expect(computeKeuntungan(10_000, 20_000)).toBe(-10_000);
  });
});

describe('computeHpp', () => {
  it('divides total biaya produksi by produksi', () => {
    expect(computeHpp(22_159_000, 7_000)).toBeCloseTo(3165.5714, 4);
  });

  it('returns null when produksi is zero ("tidak dapat dihitung")', () => {
    expect(computeHpp(22_159_000, 0)).toBeNull();
  });

  it('returns null when produksi is negative', () => {
    expect(computeHpp(22_159_000, -1)).toBeNull();
  });
});

describe('computeBepProduksi', () => {
  it('divides total biaya produksi by harga jual (audit-corrected formula)', () => {
    expect(computeBepProduksi(22_159_000, 6_500)).toBeCloseTo(3409.0769, 4);
  });

  it('returns null when harga jual is zero', () => {
    expect(computeBepProduksi(22_159_000, 0)).toBeNull();
  });
});

describe('computeBcRatio', () => {
  it('divides keuntungan by total biaya produksi', () => {
    expect(computeBcRatio(23_341_000, 22_159_000)).toBeCloseTo(1.0533, 4);
  });

  it('returns null when total biaya produksi is zero', () => {
    expect(computeBcRatio(23_341_000, 0)).toBeNull();
  });
});

describe('computeKelayakanStatus', () => {
  it('returns rugi when produksi is below BEP', () => {
    expect(computeKelayakanStatus(3000, 3409.08)).toBe('rugi');
  });

  it('returns impas when produksi exactly equals BEP', () => {
    expect(computeKelayakanStatus(3409.08, 3409.08)).toBe('impas');
  });

  it('returns untung when produksi is above BEP', () => {
    expect(computeKelayakanStatus(7000, 3409.08)).toBe('untung');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: FAIL with "Cannot find module '@/lib/finance/scenarioCalculations'"

- [ ] **Step 3: Create `lib/finance/scenarioCalculations.ts` with the RAB/profitability functions**

```typescript
import type { KelayakanStatus, RabItem } from './rabTypes';
import { sumRabItemsByType } from './rabCalculations';

export function computeRabTotals(rabItems: RabItem[]): {
  totalBiayaProduksi: number;
  totalPendapatanRab: number;
} {
  return {
    totalBiayaProduksi: sumRabItemsByType(rabItems, 'expense'),
    totalPendapatanRab: sumRabItemsByType(rabItems, 'income'),
  };
}

export function computePenerimaan(produksi: number, hargaJual: number): number | null {
  if (!Number.isFinite(produksi) || !Number.isFinite(hargaJual)) return null;
  if (produksi < 0 || hargaJual < 0) return null;
  return produksi * hargaJual;
}

export function computeKeuntungan(penerimaan: number, totalBiayaProduksi: number): number {
  return penerimaan - totalBiayaProduksi;
}

export function computeHpp(totalBiayaProduksi: number, produksi: number): number | null {
  if (!Number.isFinite(totalBiayaProduksi) || !Number.isFinite(produksi)) return null;
  if (totalBiayaProduksi < 0 || produksi <= 0) return null;
  return totalBiayaProduksi / produksi;
}

export function computeBepProduksi(totalBiayaProduksi: number, hargaJual: number): number | null {
  if (!Number.isFinite(totalBiayaProduksi) || !Number.isFinite(hargaJual)) return null;
  if (totalBiayaProduksi < 0 || hargaJual <= 0) return null;
  return totalBiayaProduksi / hargaJual;
}

export function computeBcRatio(keuntungan: number, totalBiayaProduksi: number): number | null {
  if (!Number.isFinite(keuntungan) || !Number.isFinite(totalBiayaProduksi)) return null;
  if (totalBiayaProduksi <= 0) return null;
  return keuntungan / totalBiayaProduksi;
}

export function computeKelayakanStatus(produksi: number, bepProduksi: number): KelayakanStatus {
  if (produksi === bepProduksi) return 'impas';
  return produksi > bepProduksi ? 'untung' : 'rugi';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/finance/scenarioCalculations.ts tests/finance/scenarioCalculations.test.ts
git commit -m "feat: add RAB totals and profitability calculation functions"
```

---

## Task 4: Laba Rugi per scenario

**Files:**
- Modify: `lib/finance/scenarioCalculations.ts`
- Modify: `tests/finance/scenarioCalculations.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/finance/scenarioCalculations.test.ts` (near the top, add to imports:
`computeLabaRugi`), and add this new `describe` block:

```typescript
import type { FinanceTransactionForReport } from '@/lib/finance/rabTypes';

const padi1HaTransactions: FinanceTransactionForReport[] = [
  { id: 'tx1', jenis: 'pengeluaran', kategori: 'Benih', nominal: 412_500, tanggal: '2026-07-01' },
  { id: 'tx2', jenis: 'pengeluaran', kategori: 'Sewa Lahan', nominal: 7_000_000, tanggal: '2026-07-01' },
  { id: 'tx3', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 14_746_500, tanggal: '2026-08-15' },
  { id: 'tx4', jenis: 'pendapatan', kategori: 'Penjualan', nominal: 45_500_000, tanggal: '2026-12-20' },
];

describe('computeLabaRugi', () => {
  it('sums income and expense transactions independently for one scenario', () => {
    const result = computeLabaRugi(padi1HaTransactions);

    expect(result.totalPendapatan).toBe(45_500_000);
    expect(result.totalPengeluaran).toBe(22_159_000);
    expect(result.labaRugi).toBe(23_341_000);
  });

  it('returns zeros for an empty transaction list', () => {
    const result = computeLabaRugi([]);

    expect(result).toEqual({ totalPendapatan: 0, totalPengeluaran: 0, labaRugi: 0 });
  });
});
```

(Add `computeLabaRugi` to the existing import from `@/lib/finance/scenarioCalculations` at the top
of the file instead of duplicating the import statement.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: FAIL — `computeLabaRugi` is not exported

- [ ] **Step 3: Add `computeLabaRugi` to `lib/finance/scenarioCalculations.ts`**

Add this import at the top (merge with the existing `rabCalculations` import line):

```typescript
import { sumRabItemsByType, sumTransactionsByJenis } from './rabCalculations';
```

Add this type import alongside the existing ones from `./rabTypes`:

```typescript
import type { FinanceTransactionForReport, KelayakanStatus, RabItem } from './rabTypes';
```

Then add the function:

```typescript
export function computeLabaRugi(transactions: FinanceTransactionForReport[]): {
  totalPendapatan: number;
  totalPengeluaran: number;
  labaRugi: number;
} {
  const totalPendapatan = sumTransactionsByJenis(transactions, 'pendapatan');
  const totalPengeluaran = sumTransactionsByJenis(transactions, 'pengeluaran');
  return {
    totalPendapatan,
    totalPengeluaran,
    labaRugi: totalPendapatan - totalPengeluaran,
  };
}
```

This computes Laba Rugi directly from the scenario's own transactions (audit §6.6) — it does NOT
take `rabItems` as a second "planned" argument, unlike the old `buildIncomeStatementComparison` in
`lib/finance/rabCalculations.ts` (which stays untouched by this plan; superseding its callers is out
of scope here).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: PASS (all previous tests + 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/finance/scenarioCalculations.ts tests/finance/scenarioCalculations.test.ts
git commit -m "feat: add computeLabaRugi for single-scenario income statement"
```

---

## Task 5: Arus Kas bulanan per scenario

**Files:**
- Modify: `lib/finance/scenarioCalculations.ts`
- Modify: `tests/finance/scenarioCalculations.test.ts`

- [ ] **Step 1: Write the failing test**

Add `computeArusKasBulanan` to the existing import from `@/lib/finance/scenarioCalculations`, then
add:

```typescript
describe('computeArusKasBulanan', () => {
  it('builds monthly kas masuk/keluar/bersih/kumulatif from transaction dates, not RAB plannedCashMonth', () => {
    const result = computeArusKasBulanan(padi1HaTransactions, '2026-07', '2026-12');

    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({ bulan: '2026-07', kasMasuk: 0, kasKeluar: 7_412_500, kasBersih: -7_412_500 });
    expect(result[1]).toMatchObject({ bulan: '2026-08', kasMasuk: 0, kasKeluar: 14_746_500, kasBersih: -14_746_500 });
    expect(result[5]).toMatchObject({ bulan: '2026-12', kasMasuk: 45_500_000, kasKeluar: 0, kasBersih: 45_500_000 });
    expect(result[5].kasKumulatif).toBe(23_341_000);
  });

  it('keeps months with no transactions at zero instead of omitting them', () => {
    const result = computeArusKasBulanan(padi1HaTransactions, '2026-07', '2026-12');

    expect(result[2]).toMatchObject({ bulan: '2026-09', kasMasuk: 0, kasKeluar: 0, kasBersih: 0 });
    expect(result[3]).toMatchObject({ bulan: '2026-10', kasMasuk: 0, kasKeluar: 0, kasBersih: 0 });
    expect(result[4]).toMatchObject({ bulan: '2026-11', kasMasuk: 0, kasKeluar: 0, kasBersih: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: FAIL — `computeArusKasBulanan` is not exported

- [ ] **Step 3: Add `computeArusKasBulanan` to `lib/finance/scenarioCalculations.ts`**

Add this import alongside the existing `./rabCalculations` import:

```typescript
import { buildMonthRange, sumRabItemsByType, sumTransactionsByJenis } from './rabCalculations';
```

Add this type to the `./rabTypes` type import list: `ArusKasBulanan`.

Then add:

```typescript
function toMonthKey(dateLike: string) {
  return dateLike.slice(0, 7);
}

export function computeArusKasBulanan(
  transactions: FinanceTransactionForReport[],
  startMonth: string,
  endMonth: string,
): ArusKasBulanan[] {
  const months = buildMonthRange(startMonth, endMonth);
  let kasKumulatif = 0;

  return months.map((bulan) => {
    const kasMasuk = transactions
      .filter((tx) => tx.jenis === 'pendapatan' && toMonthKey(tx.tanggal) === bulan)
      .reduce((total, tx) => total + tx.nominal, 0);
    const kasKeluar = transactions
      .filter((tx) => tx.jenis === 'pengeluaran' && toMonthKey(tx.tanggal) === bulan)
      .reduce((total, tx) => total + tx.nominal, 0);
    const kasBersih = kasMasuk - kasKeluar;
    kasKumulatif += kasBersih;

    return { bulan, kasMasuk, kasKeluar, kasBersih, kasKumulatif };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: PASS (all previous tests + 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/finance/scenarioCalculations.ts tests/finance/scenarioCalculations.test.ts
git commit -m "feat: add computeArusKasBulanan driven by transaction dates"
```

---

## Task 6: Arus Kas Pasca Pembiayaan

**Files:**
- Modify: `lib/finance/scenarioCalculations.ts`
- Modify: `tests/finance/scenarioCalculations.test.ts`

- [ ] **Step 1: Write the failing test**

Add `computeArusKasPascaPembiayaan`, `computeBunga`, `computeKebutuhanModalKerja` to the existing
import, then add:

```typescript
describe('computeKebutuhanModalKerja', () => {
  it('returns the absolute value of the maximum cumulative deficit before financing', () => {
    const arusKas = computeArusKasBulanan(padi1HaTransactions, '2026-07', '2026-12');

    expect(computeKebutuhanModalKerja(arusKas)).toBe(22_159_000);
  });

  it('returns 0 when cumulative cash never goes negative', () => {
    const arusKas = computeArusKasBulanan(
      [{ id: 'tx', jenis: 'pendapatan', kategori: 'x', nominal: 1000, tanggal: '2026-07-01' }],
      '2026-07', '2026-07',
    );

    expect(computeKebutuhanModalKerja(arusKas)).toBe(0);
  });
});

describe('computeBunga', () => {
  it('multiplies pokok pinjaman by bunga per periode (percent)', () => {
    expect(computeBunga(15_000_000, 3)).toBe(450_000);
  });
});

describe('computeArusKasPascaPembiayaan', () => {
  it('reduces cumulative cash by the net financing cost (interest) by end of period', () => {
    const arusKas = computeArusKasBulanan(padi1HaTransactions, '2026-07', '2026-12');
    const result = computeArusKasPascaPembiayaan(arusKas, {
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      biayaLain: 0,
      tanggalPencairan: '2026-08',
      tanggalPembayaran: '2026-12',
    });

    expect(result).toHaveLength(6);
    expect(result[result.length - 1].kasKumulatifSetelahPembiayaan).toBe(22_891_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: FAIL — the three new functions are not exported

- [ ] **Step 3: Add the three functions to `lib/finance/scenarioCalculations.ts`**

Add `ArusKasPascaPembiayaanBulanan` to the `./rabTypes` type import list.

```typescript
export function computeKebutuhanModalKerja(arusKasBulanan: ArusKasBulanan[]): number {
  const minKumulatif = Math.min(0, ...arusKasBulanan.map((row) => row.kasKumulatif));
  return Math.abs(minKumulatif);
}

export function computeBunga(pokokPinjaman: number, bungaPerPeriode: number): number {
  return pokokPinjaman * (bungaPerPeriode / 100);
}

export function computeArusKasPascaPembiayaan(
  arusKasBulanan: ArusKasBulanan[],
  financing: {
    nilaiPinjaman: number;
    bungaPerPeriode: number;
    biayaLain: number;
    tanggalPencairan: string;
    tanggalPembayaran: string;
  },
): ArusKasPascaPembiayaanBulanan[] {
  const bunga = computeBunga(financing.nilaiPinjaman, financing.bungaPerPeriode);
  const pelunasan = financing.nilaiPinjaman + bunga + financing.biayaLain;
  let kasKumulatifSetelahPembiayaan = 0;

  return arusKasBulanan.map((row) => {
    const arusMasukPembiayaan = row.bulan === financing.tanggalPencairan ? financing.nilaiPinjaman : 0;
    const arusKeluarPembiayaan = row.bulan === financing.tanggalPembayaran ? pelunasan : 0;
    const kasSetelahPembiayaan = row.kasBersih + arusMasukPembiayaan - arusKeluarPembiayaan;
    kasKumulatifSetelahPembiayaan += kasSetelahPembiayaan;

    return { bulan: row.bulan, kasSetelahPembiayaan, kasKumulatifSetelahPembiayaan };
  });
}
```

Note: `tanggalPencairan`/`tanggalPembayaran` are compared as month keys (`'YYYY-MM'`) against
`row.bulan`, matching the granularity `computeArusKasBulanan` already produces — this is
intentional and matches how the golden fixture test in Task 8 uses them (not full ISO dates).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: PASS (all previous tests + 4 new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/finance/scenarioCalculations.ts tests/finance/scenarioCalculations.test.ts
git commit -m "feat: add Arus Kas Pasca Pembiayaan calculation functions"
```

---

## Task 7: Perbandingan Proyeksi vs Realisasi

**Files:**
- Modify: `lib/finance/scenarioCalculations.ts`
- Modify: `tests/finance/scenarioCalculations.test.ts`

- [ ] **Step 1: Write the failing test**

Add `compareScenarios` to the existing import, then add:

```typescript
import type { ScenarioOutput } from '@/lib/finance/rabTypes';

function makeScenarioOutput(overrides: Partial<ScenarioOutput> = {}): ScenarioOutput {
  return {
    totalPendapatan: 45_500_000,
    totalBiayaProduksi: 22_159_000,
    labaRugi: 23_341_000,
    hpp: 3165.5714,
    bepProduksi: 3409.0769,
    bcRatio: 1.0533,
    kategoriTotals: { 'expense:Benih': 412_500, 'expense:Sewa Lahan': 7_000_000 },
    arusKasBulanan: [],
    kebutuhanModalKerja: 18_869_000,
    bunga: 450_000,
    kasAkhirPascaPembiayaan: 22_891_000,
    ...overrides,
  };
}

describe('compareScenarios', () => {
  it('computes selisih and selisih% for each top-level metric', () => {
    const proyeksi = makeScenarioOutput();
    const realisasi = makeScenarioOutput({ totalPendapatan: 40_000_000, labaRugi: 17_841_000 });

    const result = compareScenarios(proyeksi, realisasi);
    const pendapatanMetric = result.metrics.find((m) => m.label === 'Total Pendapatan');

    expect(pendapatanMetric).toMatchObject({
      proyeksi: 45_500_000,
      realisasi: 40_000_000,
      selisih: -5_500_000,
    });
    expect(pendapatanMetric?.selisihPercent).toBeCloseTo(-0.1208, 4);
  });

  it('shows selisih% as null instead of Infinity when proyeksi is zero', () => {
    const proyeksi = makeScenarioOutput({ totalPendapatan: 0 });
    const realisasi = makeScenarioOutput({ totalPendapatan: 5_000_000 });

    const result = compareScenarios(proyeksi, realisasi);
    const pendapatanMetric = result.metrics.find((m) => m.label === 'Total Pendapatan');

    expect(pendapatanMetric?.selisih).toBe(5_000_000);
    expect(pendapatanMetric?.selisihPercent).toBeNull();
  });

  it('marks category items that only exist in one scenario as unmatched, not omitted', () => {
    const proyeksi = makeScenarioOutput({ kategoriTotals: { 'expense:Benih': 412_500 } });
    const realisasi = makeScenarioOutput({
      kategoriTotals: { 'expense:Benih': 400_000, 'expense:Pestisida': 320_000 },
    });

    const result = compareScenarios(proyeksi, realisasi);
    const pestisida = result.kategoriMetrics.find((m) => m.label === 'expense:Pestisida');

    expect(pestisida).toMatchObject({ proyeksi: 0, realisasi: 320_000, unmatched: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: FAIL — `compareScenarios` is not exported

- [ ] **Step 3: Add `compareScenarios` to `lib/finance/scenarioCalculations.ts`**

Add `ScenarioComparison`, `ScenarioComparisonMetric`, `ScenarioOutput` to the `./rabTypes` type
import list.

```typescript
function computeSelisihPercent(proyeksi: number, realisasi: number): number | null {
  if (proyeksi === 0) return null;
  return (realisasi - proyeksi) / proyeksi;
}

function buildComparisonMetric(
  label: string,
  proyeksi: number,
  realisasi: number,
  unmatched?: boolean,
): ScenarioComparisonMetric {
  return {
    label,
    proyeksi,
    realisasi,
    selisih: realisasi - proyeksi,
    selisihPercent: computeSelisihPercent(proyeksi, realisasi),
    ...(unmatched ? { unmatched: true } : {}),
  };
}

export function compareScenarios(proyeksi: ScenarioOutput, realisasi: ScenarioOutput): ScenarioComparison {
  const metrics: ScenarioComparisonMetric[] = [
    buildComparisonMetric('Total Pendapatan', proyeksi.totalPendapatan, realisasi.totalPendapatan),
    buildComparisonMetric('Total Biaya Produksi', proyeksi.totalBiayaProduksi, realisasi.totalBiayaProduksi),
    buildComparisonMetric('Laba/Rugi', proyeksi.labaRugi, realisasi.labaRugi),
    buildComparisonMetric('HPP', proyeksi.hpp ?? 0, realisasi.hpp ?? 0),
    buildComparisonMetric('BEP Produksi', proyeksi.bepProduksi ?? 0, realisasi.bepProduksi ?? 0),
    buildComparisonMetric('B/C Ratio', proyeksi.bcRatio ?? 0, realisasi.bcRatio ?? 0),
    buildComparisonMetric('Kebutuhan Modal Kerja', proyeksi.kebutuhanModalKerja, realisasi.kebutuhanModalKerja),
    buildComparisonMetric('Bunga', proyeksi.bunga, realisasi.bunga),
    buildComparisonMetric('Kas Akhir Pasca Pembiayaan', proyeksi.kasAkhirPascaPembiayaan, realisasi.kasAkhirPascaPembiayaan),
  ];

  const kategoriKeys = new Set([
    ...Object.keys(proyeksi.kategoriTotals),
    ...Object.keys(realisasi.kategoriTotals),
  ]);
  const kategoriMetrics: ScenarioComparisonMetric[] = Array.from(kategoriKeys).map((key) => {
    const proyeksiValue = proyeksi.kategoriTotals[key] ?? 0;
    const realisasiValue = realisasi.kategoriTotals[key] ?? 0;
    const unmatched = !(key in proyeksi.kategoriTotals) || !(key in realisasi.kategoriTotals);
    return buildComparisonMetric(key, proyeksiValue, realisasiValue, unmatched);
  });

  const bulanKeys = new Set([
    ...proyeksi.arusKasBulanan.map((row) => row.bulan),
    ...realisasi.arusKasBulanan.map((row) => row.bulan),
  ]);
  const arusKasBulanan = Array.from(bulanKeys).sort().map((bulan) => {
    const proyeksiRow = proyeksi.arusKasBulanan.find((row) => row.bulan === bulan);
    const realisasiRow = realisasi.arusKasBulanan.find((row) => row.bulan === bulan);
    const proyeksiValue = proyeksiRow?.kasBersih ?? 0;
    const realisasiValue = realisasiRow?.kasBersih ?? 0;
    return {
      bulan,
      proyeksi: proyeksiValue,
      realisasi: realisasiValue,
      selisih: realisasiValue - proyeksiValue,
      selisihPercent: computeSelisihPercent(proyeksiValue, realisasiValue),
    };
  });

  return { metrics, kategoriMetrics, arusKasBulanan };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/finance/scenarioCalculations.test.ts`
Expected: PASS (all previous tests + 3 new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/finance/scenarioCalculations.ts tests/finance/scenarioCalculations.test.ts
git commit -m "feat: add compareScenarios for Proyeksi vs Realisasi comparison"
```

---

## Task 8: Golden fixture integration test (Padi 1 Ha)

**Files:**
- Test: `tests/finance/scenarioGoldenFixture.test.ts`

This is a pure verification task — it wires together every function from Tasks 3-6 using the exact
numbers from `AUDIT_REVISI_MANAJEMEN_KEUANGAN.md` §15.1, as one end-to-end scenario computation.
No new production code should be needed; if this test fails, it means one of the earlier functions
has a bug that the smaller unit tests didn't catch (e.g. an off-by-one in month handling, or a wrong
composition order) — fix the function in `lib/finance/scenarioCalculations.ts`, not the test.

- [ ] **Step 1: Write the test**

```typescript
import { describe, expect, it } from 'vitest';

import {
  computeArusKasBulanan,
  computeArusKasPascaPembiayaan,
  computeBcRatio,
  computeBepProduksi,
  computeBunga,
  computeHpp,
  computeKebutuhanModalKerja,
  computeKelayakanStatus,
  computeKeuntungan,
  computeLabaRugi,
  computePenerimaan,
  computeRabTotals,
} from '@/lib/finance/scenarioCalculations';
import type { FinanceTransactionForReport, RabItem } from '@/lib/finance/rabTypes';

// Padi 1 Ha golden fixture — corrected per AUDIT_REVISI_MANAJEMEN_KEUANGAN.md §4:
// transportasi Rp200.000 (bukan Rp20.000 typo), dan Sewa Lahan Rp7.000.000 termasuk
// dalam total Lain-lain (bukan hilang dari subtotal seperti pada workbook sumber).
const rabItems: RabItem[] = [
  {
    id: 'benih', projectId: 'p1', categoryId: 'saprodi', categoryName: 'Saprodi',
    type: 'expense', name: 'Benih', volume: 25, unit: 'Kg', unitPrice: 16_500,
    plannedTotal: 412_500, aliases: [], sortOrder: 1,
  },
  {
    id: 'sewa', projectId: 'p1', categoryId: 'fixed', categoryName: 'Biaya Tetap',
    type: 'expense', name: 'Sewa Lahan', volume: 1, unit: 'Ha/Musim', unitPrice: 7_000_000,
    plannedTotal: 7_000_000, aliases: [], sortOrder: 2,
  },
  {
    id: 'lain', projectId: 'p1', categoryId: 'lain', categoryName: 'Lain-lain',
    type: 'expense', name: 'Biaya Operasional Lain (termasuk transportasi Rp200.000)',
    volume: 1, unit: 'paket', unitPrice: 14_746_500, plannedTotal: 14_746_500,
    aliases: [], sortOrder: 3,
  },
  {
    id: 'panen', projectId: 'p1', categoryId: 'income', categoryName: 'Pendapatan',
    type: 'income', name: 'Penjualan Gabah', volume: 7_000, unit: 'Kg', unitPrice: 6_500,
    plannedTotal: 45_500_000, aliases: [], sortOrder: 4,
  },
];

// Placed to reproduce the corrected monthly kas bersih from audit §15.1:
// Jul 0, Aug -13.464.000, Sep -1.330.000, Okt -840.000, Nov -3.235.000, Des +42.210.000
const transactions: FinanceTransactionForReport[] = [
  { id: 'tx-aug-1', jenis: 'pengeluaran', kategori: 'Benih', nominal: 412_500, tanggal: '2026-08-01' },
  { id: 'tx-aug-2', jenis: 'pengeluaran', kategori: 'Sewa Lahan', nominal: 7_000_000, tanggal: '2026-08-05' },
  { id: 'tx-aug-3', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 6_051_500, tanggal: '2026-08-20' },
  { id: 'tx-sep-1', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 1_330_000, tanggal: '2026-09-10' },
  { id: 'tx-okt-1', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 840_000, tanggal: '2026-10-10' },
  { id: 'tx-nov-1', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 3_235_000, tanggal: '2026-11-10' },
  { id: 'tx-des-1', jenis: 'pendapatan', kategori: 'Penjualan', nominal: 45_500_000, tanggal: '2026-12-20' },
  { id: 'tx-des-2', jenis: 'pengeluaran', kategori: 'Lain-lain', nominal: 3_290_000, tanggal: '2026-12-05' },
];

describe('Golden fixture: Padi 1 Ha (audit-corrected)', () => {
  it('matches every audit §15.1 expected value', () => {
    const { totalBiayaProduksi } = computeRabTotals(rabItems);
    expect(totalBiayaProduksi).toBe(22_159_000);

    const produksi = 7_000;
    const hargaJual = 6_500;
    const penerimaan = computePenerimaan(produksi, hargaJual);
    expect(penerimaan).toBe(45_500_000);

    const keuntungan = computeKeuntungan(penerimaan!, totalBiayaProduksi);
    expect(keuntungan).toBe(23_341_000);

    expect(computeHpp(totalBiayaProduksi, produksi)).toBeCloseTo(3165.5714, 4);
    expect(computeBepProduksi(totalBiayaProduksi, hargaJual)).toBeCloseTo(3409.0769, 4);
    expect(computeBcRatio(keuntungan, totalBiayaProduksi)).toBeCloseTo(1.0533, 4);
    expect(computeKelayakanStatus(produksi, computeBepProduksi(totalBiayaProduksi, hargaJual)!)).toBe('untung');

    const labaRugi = computeLabaRugi(transactions);
    expect(labaRugi.totalPendapatan).toBe(45_500_000);
    expect(labaRugi.totalPengeluaran).toBe(22_159_000);
    expect(labaRugi.labaRugi).toBe(23_341_000);

    const arusKas = computeArusKasBulanan(transactions, '2026-07', '2026-12');
    expect(arusKas.map((row) => row.kasBersih)).toEqual([
      0, -13_464_000, -1_330_000, -840_000, -3_235_000, 42_210_000,
    ]);
    expect(arusKas[arusKas.length - 1].kasKumulatif).toBe(23_341_000);

    expect(computeKebutuhanModalKerja(arusKas)).toBe(18_869_000);

    const bunga = computeBunga(15_000_000, 3);
    expect(bunga).toBe(450_000);

    const pascaPembiayaan = computeArusKasPascaPembiayaan(arusKas, {
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      biayaLain: 0,
      tanggalPencairan: '2026-08',
      tanggalPembayaran: '2026-12',
    });
    expect(pascaPembiayaan[pascaPembiayaan.length - 1].kasKumulatifSetelahPembiayaan).toBe(22_891_000);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/finance/scenarioGoldenFixture.test.ts`
Expected: PASS. If any assertion fails, fix the corresponding function in
`lib/finance/scenarioCalculations.ts` (added in Tasks 3-6) — do not adjust the expected values here,
they come directly from the audit document.

- [ ] **Step 3: Commit**

```bash
git add tests/finance/scenarioGoldenFixture.test.ts
git commit -m "test: add Padi 1 Ha golden fixture covering the full scenario calculation engine"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including every file from Tasks 3-8 (`tests/finance/scenarioCalculations.test.ts`
and `tests/finance/scenarioGoldenFixture.test.ts`), with no regressions in any pre-existing test.

- [ ] **Step 2: Run the production build to catch type errors**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors. This project has no UI wiring yet, so this step
mainly confirms `lib/finance/rabTypes.ts` and `lib/finance/scenarioCalculations.ts` don't break
anything that imports from `rabTypes.ts` elsewhere in the app (e.g. `lib/api.ts`).

- [ ] **Step 3: Remind about the SQL migration**

`docs/sql/2026-08-02-finance-scenarios.sql` (Task 1) is not applied anywhere yet — it must be run
manually in the Supabase Dashboard SQL Editor before any future sub-project wires this schema into
the app. Nothing in this plan depends on it having been run, since Tasks 3-8 are pure TypeScript
with no Supabase calls.

---

## Self-Review Notes

- **Spec coverage:** data model (§Data Model in spec) → Task 1 + Task 2; every function listed in
  the spec's "Calculation Engine" section → Tasks 3-7 (RAB/profitability, Laba Rugi, Arus Kas, Arus
  Kas Pasca Pembiayaan, compareScenarios); golden fixture (§Testing in spec) → Task 8. Out-of-scope
  items from the spec (migration execution, UI wiring, import/export/PDF/AI/dashboard, PERBANDINGAN
  UI) are intentionally not tasked here.
- **Type consistency:** `ScenarioOutput`, `ScenarioComparison`, `ScenarioComparisonMetric`,
  `ArusKasBulanan`, `ArusKasPascaPembiayaanBulanan` are defined once in Task 2 and referenced
  identically (same field names) in every later task's function signatures and tests.
- **Formula lock verification:** every numeric constant in Tasks 3, 6, and 8 was hand-verified
  against the audit's stated formulas before writing this plan (HPP = 22.159.000/7.000 =
  3165.571428..., BEP = 22.159.000/6.500 = 3409.076923..., B/C = 23.341.000/22.159.000 =
  1.053341757..., Kebutuhan Modal Kerja = max deficit = 18.869.000, Arus Kas Akhir Pasca
  Pembiayaan = 23.341.000 − 450.000 = 22.891.000) — these are not arbitrary expected values.
