# Reusable UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Create reusable mobile-first UI components and migrate their highest-value consumers in Keuangan and Stok without changing business data, controller contracts, or endpoint behavior.

**Architecture:** Shared components in components/ui and components/shared are presentational. Keuangan/Stok controllers continue owning data, mutations, validation, and selected scenario/project. Pilot views compose the primitives while retaining RAB and transaction domain renderers.

**Tech Stack:** Next.js 16, React 19, TypeScript, MUI 9, Vitest + Testing Library, Playwright.

---

## File structure

| File | Responsibility |
|---|---|
| components/ui/AppDialog.tsx | Accessible dialog header, scrollable body, actions, and mobile presentation. |
| components/ui/Modal.tsx | Compatibility re-export of AppDialog. |
| components/ui/ContentState.tsx | Loading, empty, error, retry, and ready state composition. |
| components/ui/MetricCard.tsx | Presentational metric surface. |
| components/ui/ResponsiveDataView.tsx | Switches a supplied desktop table and mobile renderer with common state handling. |
| components/shared/forms/MasterDataDialog.tsx | Shared master-data UI formerly owned by Stok. |
| app/dashboard/keuangan/_components/TransactionFormFields.tsx | Shared field-only transaction form View. |
| app/dashboard/keuangan/_components/RabPlanningView.tsx | Responsive RAB pilot and metric/state adoption. |

### Task 1: Build and test shared primitive components

**Files:**
- Create: components/ui/AppDialog.tsx, components/ui/ContentState.tsx, components/ui/MetricCard.tsx
- Modify: components/ui/Modal.tsx
- Test: tests/components/AppDialog.test.tsx, tests/components/ContentState.test.tsx, tests/components/MetricCard.test.tsx

- [ ] **Step 1: Write failing tests**

~~~tsx
it('labels and closes the shared dialog', () => {
  const onClose = vi.fn();
  render(<ThemeProvider theme={createTheme()}><AppDialog open title="Kelola data" onClose={onClose}>Isi</AppDialog></ThemeProvider>);
  expect(screen.getByRole('dialog', { name: 'Kelola data' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tutup dialog Kelola data' }));
  expect(onClose).toHaveBeenCalledOnce();
});

it.each(['loading', 'empty', 'error'] as const)('renders %s state', (state) => {
  render(<ContentState state={state} loadingLabel="Memuat" empty={{ title: 'Kosong', message: 'Tidak ada data' }} error={{ title: 'Gagal', message: 'Coba lagi' }} />);
  expect(screen.getByText(state === 'loading' ? 'Memuat' : state === 'empty' ? 'Kosong' : 'Gagal')).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Run tests to verify they fail**

Run: npm test -- tests/components/AppDialog.test.tsx tests/components/ContentState.test.tsx tests/components/MetricCard.test.tsx  
Expected: FAIL because the shared modules do not exist.

- [ ] **Step 3: Implement pure-UI APIs**

~~~tsx
export type ContentStateKind = 'ready' | 'loading' | 'empty' | 'error';

export function ContentState({ state, children, retry, ...copy }: ContentStateProps) {
  if (state === 'ready') return <>{children}</>;
  if (state === 'loading') return <Box role="status">{copy.loadingLabel ?? 'Memuat data...'}</Box>;
  return <EmptyState title={state === 'empty' ? copy.empty?.title : copy.error?.title} message={state === 'empty' ? copy.empty?.message ?? '' : copy.error?.message ?? ''} action={state === 'error' ? retry : undefined} />;
}
~~~

Implement AppDialog on MUI Dialog with title, optional subtitle, optional leading, actions, onClose, and mobilePresentation: fullscreen, bottom-sheet, or dialog. Its close button is labelled Tutup dialog followed by the title, is at least 44 px, and its content scrolls. Implement MetricCard with label, value, icon, intent, optional trend, and loading; it must not format domain numbers. Make Modal.tsx a compatibility default re-export.

- [ ] **Step 4: Verify and commit**

Run: npm test -- tests/components/AppDialog.test.tsx tests/components/ContentState.test.tsx tests/components/MetricCard.test.tsx && npm run typecheck  
Expected: PASS.

~~~bash
git add components/ui/AppDialog.tsx components/ui/ContentState.tsx components/ui/MetricCard.tsx components/ui/Modal.tsx tests/components/AppDialog.test.tsx tests/components/ContentState.test.tsx tests/components/MetricCard.test.tsx
git commit -m "feat(ui): add reusable dialog and state primitives"
~~~

### Task 2: Extract the master-data dialog to shared UI

**Files:**
- Create: components/shared/forms/MasterDataDialog.tsx
- Delete: app/dashboard/stok/_components/MasterDataDialog.tsx
- Modify: app/dashboard/stok/_components/StokView.tsx, app/dashboard/keuangan/_components/RabItemDialog.tsx, app/dashboard/keuangan/_components/TransactionBatchDialog.tsx
- Test: tests/components/MasterDataDialog.test.tsx, tests/components/TransactionBatchDialog.test.tsx

- [ ] **Step 1: Add the failing shared-dialog behavior test**

~~~tsx
it('edits and saves an item through callbacks', async () => {
  const onRename = vi.fn(async () => undefined);
  render(<MasterDataDialog open title="Kelola Kategori" items={[{ id: '1', nama: 'Pupuk' }]} onAdd={vi.fn()} onRename={onRename} onDelete={vi.fn()} deleteError={null} onClearDeleteError={vi.fn()} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Pupuk' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pupuk Organik' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan Pupuk' }));
  await waitFor(() => expect(onRename).toHaveBeenCalledWith('1', 'Pupuk Organik'));
});
~~~

- [ ] **Step 2: Verify the test fails**

Run: npm test -- tests/components/MasterDataDialog.test.tsx  
Expected: FAIL because the shared dialog is unresolved.

- [ ] **Step 3: Move the View without moving business logic**

Move the public MasterDataItem and callback API unchanged. Use AppDialog; retain enter/escape, disabled saving, delete error clear, and item layout. Add explicit labels Edit <name>, Hapus <name>, Simpan <name>, and Batalkan edit <name>. Update all feature imports to the shared component; no feature may import it through the Stok folder.

- [ ] **Step 4: Verify no deep import remains and commit**

Run: npm test -- tests/components/MasterDataDialog.test.tsx tests/components/TransactionBatchDialog.test.tsx tests/components/RabItemDialog.test.tsx && rg "app/dashboard/stok/_components/MasterDataDialog" app components tests  
Expected: tests PASS; rg has no matches.

~~~bash
git add components/shared/forms/MasterDataDialog.tsx app/dashboard/stok/_components/StokView.tsx app/dashboard/keuangan/_components/RabItemDialog.tsx app/dashboard/keuangan/_components/TransactionBatchDialog.tsx tests/components/MasterDataDialog.test.tsx tests/components/TransactionBatchDialog.test.tsx
git rm app/dashboard/stok/_components/MasterDataDialog.tsx
git commit -m "refactor(ui): share master data dialog"
~~~

### Task 3: Consolidate transaction field rendering and migrate the batch dialog pilot

**Files:**
- Create: app/dashboard/keuangan/_components/TransactionFormFields.tsx
- Modify: app/dashboard/keuangan/_components/TransactionEntryForm.tsx, app/dashboard/keuangan/_components/TransactionEditForm.tsx, app/dashboard/keuangan/_components/TransactionBatchDialog.tsx
- Test: tests/components/TransactionFormFields.test.tsx, tests/components/TransactionBatchDialog.test.tsx, tests/controllers/useTransactionBatchController.test.tsx

- [ ] **Step 1: Add a failing shared-fields test**

~~~tsx
it('forwards a field update and renders the optional RAB link checkbox', () => {
  const onFieldChange = vi.fn();
  render(<TransactionFormFields draft={draft} kategoriList={['Pupuk']} satuanList={['karung']} errors={{}} onFieldChange={onFieldChange} onOpenKategoriDialog={vi.fn()} onOpenSatuanDialog={vi.fn()} rabSuggestion="Pupuk Urea" showRabSuggestionAction />);
  fireEvent.change(screen.getByLabelText('Nominal'), { target: { value: '250.000' } });
  expect(onFieldChange).toHaveBeenCalledWith('nominal', '250.000');
  expect(screen.getByRole('checkbox', { name: /Hubungkan Otomatis/i })).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Verify it fails**

Run: npm test -- tests/components/TransactionFormFields.test.tsx  
Expected: FAIL because the shared field View is absent.

- [ ] **Step 3: Implement the shared View and thin wrappers**

Move only duplicate fields: jenis, tanggal, kategori/manage, volume, satuan/manage, harga satuan, nominal, keterangan, and RAB hint. Keep the checkbox opt-in for entry mode and the read-only alert for edit mode. Preserve TransactionDraft, DraftErrors, callbacks, form submit, and footer buttons.

- [ ] **Step 4: Replace only the main transaction flow dialog with AppDialog**

Keep stepper, draft list, warning, close-confirmation dialog, and controller callbacks. Give AppDialog the existing leading icon/title/subtitle and use requestClose for the labelled close callback.

- [ ] **Step 5: Verify and commit**

Run: npm test -- tests/components/TransactionFormFields.test.tsx tests/components/TransactionBatchDialog.test.tsx tests/controllers/useTransactionBatchController.test.tsx && npm run typecheck  
Expected: PASS with no controller signature changes.

~~~bash
git add app/dashboard/keuangan/_components/TransactionFormFields.tsx app/dashboard/keuangan/_components/TransactionEntryForm.tsx app/dashboard/keuangan/_components/TransactionEditForm.tsx app/dashboard/keuangan/_components/TransactionBatchDialog.tsx tests/components/TransactionFormFields.test.tsx tests/components/TransactionBatchDialog.test.tsx
git commit -m "refactor(finance): share transaction form fields"
~~~

### Task 4: Add responsive data composition and migrate the RAB pilot

**Files:**
- Create: components/ui/ResponsiveDataView.tsx
- Modify: app/dashboard/keuangan/_components/RabPlanningView.tsx
- Test: tests/components/ResponsiveDataView.test.tsx, tests/components/RabPlanningView.test.tsx
- Create: e2e/reusable-ui-foundation.spec.ts

- [ ] **Step 1: Add a failing responsive composition test**

~~~tsx
it('renders supplied desktop and mobile branches', () => {
  render(<ResponsiveDataView data={[{ id: 'urea' }]} getItemKey={(item) => item.id} desktop={<table aria-label="RAB desktop" />} renderMobileItem={(item) => <article aria-label="RAB mobile urea">{item.id}</article>} />);
  expect(screen.getByLabelText('RAB desktop')).toBeInTheDocument();
  expect(screen.getByRole('article', { name: 'RAB mobile urea' })).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Verify it fails**

Run: npm test -- tests/components/ResponsiveDataView.test.tsx  
Expected: FAIL because the component is absent.

- [ ] **Step 3: Implement a composition component, not a domain table**

~~~tsx
export function ResponsiveDataView<T>({ data, getItemKey, desktop, renderMobileItem, state = 'ready', empty, error, retry }: ResponsiveDataViewProps<T>) {
  return <ContentState state={state} empty={empty} error={error} retry={retry}>
    <Box sx={{ display: { xs: 'none', md: 'block' } }}>{desktop}</Box>
    <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {data.map((item) => <React.Fragment key={getItemKey(item)}>{renderMobileItem(item)}</React.Fragment>)}
    </Stack>
  </ContentState>;
}
~~~

- [ ] **Step 4: Migrate RAB**

Keep the existing table as the desktop prop. Supply a mobile article for every RAB item containing type/status, category, name, volume/unit, unit price, planned total, planned cash month, selection checkbox, and labelled edit/delete actions. Preserve filtering, bulk selection, fade-delete, confirmation, and controller callbacks. Replace the three RAB summary surfaces with MetricCard; use ContentState for no-project/loading/empty/error.

- [ ] **Step 5: Verify mobile and unit behavior, then commit**

Run: npm test -- tests/components/ResponsiveDataView.test.tsx tests/components/RabPlanningView.test.tsx && npm run typecheck  
Expected: PASS.

Implement Playwright at 320 x 568 and 390 x 844. It must open Keuangan/RAB and assert document.documentElement.scrollWidth <= window.innerWidth; it must assert a RAB item card when data is available or the documented empty state when it is not.

Run: npx playwright test e2e/reusable-ui-foundation.spec.ts --project=chromium  
Expected: PASS.

~~~bash
git add components/ui/ResponsiveDataView.tsx app/dashboard/keuangan/_components/RabPlanningView.tsx tests/components/ResponsiveDataView.test.tsx tests/components/RabPlanningView.test.tsx e2e/reusable-ui-foundation.spec.ts
git commit -m "feat(finance): render RAB data responsively"
~~~

### Task 5: Final pilot validation and audit record

**Files:**
- Modify: app/dashboard/stok/_components/StokView.tsx
- Modify: tests/components/StokView.test.tsx
- Modify: docs/audit-ui-simulasi-keuangan-padi.md

- [ ] **Step 1: Add a Stok metric-card regression test**

~~~tsx
it('keeps the stock summary labels after shared metric adoption', () => {
  renderView();
  expect(screen.getByText(/Nilai Stok|Batch Aktif|Total Stok/i)).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Adopt only equivalent metric/state surfaces**

Replace only Stok top-level summary cards that match the label/value/icon/intent contract. Keep batch, mutation, and form cards feature-specific. Use ContentState only where a matching current state exists. Do not change formatter calls, calculations, text, or controller callbacks.

- [ ] **Step 3: Record the delivered pilot in the audit**

Add an Implemented foundation subsection listing delivered primitives, migrated Keuangan/Stok consumers, and deferred CMP/FIN items. Do not mark persistence, scenario, or non-pilot pages complete.

- [ ] **Step 4: Run branch validation and commit**

Run: npm run lint && npm run typecheck && npm test -- tests/components/AppDialog.test.tsx tests/components/ContentState.test.tsx tests/components/MetricCard.test.tsx tests/components/MasterDataDialog.test.tsx tests/components/TransactionFormFields.test.tsx tests/components/TransactionBatchDialog.test.tsx tests/components/ResponsiveDataView.test.tsx tests/components/RabPlanningView.test.tsx tests/components/StokView.test.tsx && npx playwright test e2e/reusable-ui-foundation.spec.ts --project=chromium  
Expected: all commands exit 0.

~~~bash
git add app/dashboard/stok/_components/StokView.tsx tests/components/StokView.test.tsx docs/audit-ui-simulasi-keuangan-padi.md
git commit -m "refactor(ui): adopt shared finance and stock primitives"
~~~

## Final acceptance checks

- [ ] rg "app/dashboard/stok/_components/MasterDataDialog" app components tests has no matches.
- [ ] No shared UI component calls Supabase, fetch, a controller hook, or router.
- [ ] Create/edit transaction tests prove the same draft callbacks and submit actions work.
- [ ] RAB has a desktop table at md and complete item cards below md.
- [ ] Dialog close controls are labelled and have a 44 x 44 px hit area.
- [ ] Lint, typecheck, focused Vitest suite, and Chromium mobile Playwright test pass.

