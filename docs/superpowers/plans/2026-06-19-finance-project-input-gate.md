# Finance Project Input Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent finance input before a project exists and enable export only after the selected project has data.

**Architecture:** `useKeuanganController` owns finance access flags and guarded handlers. UI components receive those flags as props and only render disabled states, labels, and empty-state copy. Export logic keeps a controller-level guard so direct calls cannot bypass disabled buttons.

**Tech Stack:** Next.js App Router client components, React hooks, MUI, Vitest, Testing Library.

---

### Task 1: Add Finance Access Flags

**Files:**
- Modify: `controllers/keuangan/useKeuanganController.tsx`
- Modify: `controllers/keuangan/useFinanceExportController.ts`
- Test: `tests/components/KeuanganView.test.tsx`

- [ ] **Step 1: Add failing tests**

Add tests that render `KeuanganView` with three states: no selected project, selected project without data, selected project with data. Assert input/export disabled state follows the spec.

- [ ] **Step 2: Implement controller flags**

In `useKeuanganController`, compute:

```ts
const hasSelectedProject = Boolean(financeProject.selectedProject);
const hasProjectData = hasSelectedProject && (projectScopedTransactions.length > 0 || rab.items.length > 0);
const financeAccess = {
  hasSelectedProject,
  hasProjectData,
  canInputFinance: hasSelectedProject,
  canExportFinance: hasSelectedProject && hasProjectData,
};
```

Return `financeAccess`.

- [ ] **Step 3: Harden export controller**

Update `useFinanceExportController` input with `canExport?: boolean` and `hasProjectData?: boolean`. If no project, set `Buat atau pilih proyek terlebih dahulu`. If no data, set `Tambahkan transaksi atau RAB sebelum export laporan`.

### Task 2: Wire UI Disabled States

**Files:**
- Modify: `app/dashboard/keuangan/_components/FinanceProjectToolbar.tsx`
- Modify: `app/dashboard/keuangan/_components/KeuanganView.tsx`
- Test: `tests/components/KeuanganView.test.tsx`

- [ ] **Step 1: Toolbar flags**

Add `financeAccess` to toolbar props. Disable import when `!financeAccess.canInputFinance`, export Excel/PDF when `!financeAccess.canExportFinance`, and keep `Buat Proyek` enabled.

- [ ] **Step 2: Ledger input guard**

In `KeuanganView`, disable `Catat Transaksi`, mobile FAB, and empty-state `Tambah pertama` when `!financeAccess.canInputFinance`. Change empty text to `Buat proyek terlebih dahulu untuk mulai mencatat transaksi.` when there is no selected project.

- [ ] **Step 3: Dialog guard**

Pass `selectedProjectId` to `TransactionBatchDialog` as today, but ensure open actions do not fire when input is disabled by wrapping click handlers in the view.

### Task 3: Verify and Commit

**Files:**
- Test commands only.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
rtk proxy npm run test -- tests/components/KeuanganView.test.tsx tests/finance/rabCalculations.test.ts tests/finance/rabExcel.test.ts
```

- [ ] **Step 2: Run project checks**

Run:

```bash
rtk proxy npm run lint
rtk proxy npm run typecheck
rtk proxy git diff --check
```

- [ ] **Step 3: Commit scoped implementation**

Stage only files related to this feature and commit:

```bash
rtk proxy git add controllers/keuangan/useKeuanganController.tsx controllers/keuangan/useFinanceExportController.ts app/dashboard/keuangan/_components/FinanceProjectToolbar.tsx app/dashboard/keuangan/_components/KeuanganView.tsx tests/components/KeuanganView.test.tsx docs/superpowers/plans/2026-06-19-finance-project-input-gate.md
rtk proxy git commit -m "feat: gate finance input by project data"
```
