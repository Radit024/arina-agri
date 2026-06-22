# Date Input dd-MM-yyyy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native browser date inputs with text inputs that display `dd-MM-yyyy` while preserving ISO `YYYY-MM-DD` values for application state and API payloads.

**Architecture:** Add pure date input helpers in `lib/formatters.ts`. Views call helpers when rendering and changing date text, while controllers normalize submitted values before API calls.

**Tech Stack:** Next.js App Router, React, MUI TextField, React Hook Form, Vitest.

---

### Task 1: Date Helper Functions

**Files:**
- Modify: `lib/formatters.ts`
- Test: `tests/lib/formatters.test.ts`

- [ ] Add `formatDateInputValue(value)` to display ISO dates as `dd-MM-yyyy`.
- [ ] Add `normalizeDateInputValue(value)` to convert valid `dd-MM-yyyy` to `YYYY-MM-DD`.
- [ ] Add `isValidDateInputValue(value)` to accept valid ISO or valid display format.
- [ ] Test valid conversion and invalid calendar dates.

### Task 2: Finance Date Inputs

**Files:**
- Modify: `app/dashboard/keuangan/_components/TransactionEntryForm.tsx`
- Modify: `app/dashboard/keuangan/_components/FinanceProjectDialog.tsx`
- Modify: `controllers/keuangan/useTransactionBatchController.ts`

- [ ] Render transaction and project date fields as text inputs with placeholder `dd-MM-yyyy`.
- [ ] Normalize date changes into ISO once complete.
- [ ] Validate transaction dates with the shared helper.
- [ ] Normalize transaction payload dates before create or update.

### Task 3: Calendar Date Input

**Files:**
- Modify: `app/dashboard/kalender/_components/KalenderView.tsx`

- [ ] Render schedule date as a text field.
- [ ] Format the value for display and normalize changes back into the form state.

### Task 4: Stock And Supply Date Inputs

**Files:**
- Modify: `app/dashboard/stok/_components/StokView.tsx`
- Modify: `app/dashboard/stok/_components/SupplyItemsView.tsx`
- Modify: `controllers/stok/StokController.tsx`

- [ ] Render stock date fields and filters as text fields.
- [ ] Normalize filter dates before refresh.
- [ ] Normalize batch and stock-out submit payloads.
- [ ] Keep expiry auto-fill using ISO date values.

### Task 5: Verification

**Files:**
- Test: `tests/lib/formatters.test.ts`
- Test: existing component/controller tests

- [ ] Run targeted formatter and affected component tests.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `git diff --check`.
