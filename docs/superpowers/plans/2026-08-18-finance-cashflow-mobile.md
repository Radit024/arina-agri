# Finance Cash Flow Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three cash-flow report surfaces readable, actionable, and accessible at mobile widths while preserving their desktop tables and all finance calculations.

**Architecture:** `ResponsiveDataView` composes unchanged desktop tables with feature-local mobile cards below `md`. `KeuanganView` supplies controller-owned callbacks and narrow report data to the presentational cash-flow, financing, and comparison views; no calculation, API, or persistence logic moves into UI. `ContentState` receives a small, reusable empty-action extension for the regular cash-flow CTA.

**Tech Stack:** Next.js 16, React, TypeScript, MUI, Vitest + Testing Library, Playwright Chromium.

---

## File Structure

- Modify: `components/ui/ContentState.tsx` — add the generic empty-state action slot.
- Modify: `tests/components/ContentState.test.tsx` — cover that slot.
- Create: `app/dashboard/keuangan/_components/FinanceCashFlowMobileCard.tsx` — regular monthly cash-flow card plus transaction-detail accordion.
- Create: `app/dashboard/keuangan/_components/FinanceFinancingMobileCard.tsx` — financed monthly cash card.
- Create: `app/dashboard/keuangan/_components/FinanceComparisonCashFlowMobileCard.tsx` — projection versus realization cash-flow card.
- Modify: `app/dashboard/keuangan/_components/FinanceCashFlowView.tsx` — narrow props, mobile KPI summary, responsive desktop/card composition, and named desktop expander.
- Modify: `app/dashboard/keuangan/_components/FinanceFinancingView.tsx` — responsive monthly financing composition and one empty-state CTA.
- Modify: `app/dashboard/keuangan/_components/FinanceComparisonView.tsx` — responsive composition for its cash-flow subsection only.
- Modify: `app/dashboard/keuangan/_components/KeuanganView.tsx` — pass presentation callbacks/data to all three cash-flow views.
- Modify: `tests/components/FinanceCashFlowView.test.tsx`, `tests/components/FinanceFinancingView.test.tsx`, `tests/components/FinanceComparisonView.test.tsx`, `tests/components/KeuanganView.test.tsx` — behavior and parent wiring.
- Create: `tests/components/FinanceCashFlowMobileCard.test.tsx`, `tests/components/FinanceFinancingMobileCard.test.tsx`, `tests/components/FinanceComparisonCashFlowMobileCard.test.tsx` — focused card tests.
- Create: `e2e/finance-cashflow-mobile.spec.ts` — isolated populated mobile smoke.
- Modify: `docs/audit-ui-simulasi-keuangan-padi.md` — record only the items actually completed by this plan.

### Task 1: Add an action slot to the shared empty state

**Files:**
- Modify: `components/ui/ContentState.tsx:10-80`
- Modify: `tests/components/ContentState.test.tsx`

- [ ] **Step 1: Write the failing empty-action test**

  Add this test after the empty-state case:

  ```tsx
  it('renders an optional action in an empty state', () => {
    const onAdd = vi.fn();
    render(
      <ContentState
        state="empty"
        emptyTitle="Belum ada arus kas"
        emptyMessage="Catat transaksi pertama untuk melihat arus kas."
        emptyAction={<Button onClick={onAdd}>Catat Transaksi</Button>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Catat Transaksi' }));
    expect(onAdd).toHaveBeenCalledOnce();
  });
  ```

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `rtk npm test -- tests/components/ContentState.test.tsx`

  Expected: FAIL because `emptyAction` is not a `ContentStateProps` property.

- [ ] **Step 3: Pass the action to `EmptyState` only in the empty branch**

  Extend the prop interface and empty branch without changing loading, ready, or error behavior:

  ```tsx
  export interface ContentStateProps {
    state: ContentStateStatus;
    children?: React.ReactNode;
    loadingLabel?: React.ReactNode;
    emptyTitle?: string;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
    emptyAction?: React.ReactNode;
    errorTitle?: string;
    errorMessage?: string;
    errorIcon?: React.ReactNode;
    retry?: React.ReactNode;
  }

  // state === 'empty'
  return (
    <EmptyState
      action={emptyAction}
      aria-live="polite"
      icon={emptyIcon}
      message={emptyMessage}
      role="status"
      title={emptyTitle}
    />
  );
  ```

- [ ] **Step 4: Run the focused test to verify it passes**

  Run: `rtk npm test -- tests/components/ContentState.test.tsx`

  Expected: PASS with all ready, loading, empty, error, and empty-action tests.

- [ ] **Step 5: Commit the shared primitive**

  ```bash
  git add components/ui/ContentState.tsx tests/components/ContentState.test.tsx
  git commit -m "feat(ui): support empty state actions"
  ```

### Task 2: Build the regular Arus Kas mobile card and responsive report view

**Files:**
- Create: `app/dashboard/keuangan/_components/FinanceCashFlowMobileCard.tsx`
- Modify: `app/dashboard/keuangan/_components/FinanceCashFlowView.tsx:1-226`
- Modify: `app/dashboard/keuangan/_components/KeuanganView.tsx:1257-1265`
- Create: `tests/components/FinanceCashFlowMobileCard.test.tsx`
- Modify: `tests/components/FinanceCashFlowView.test.tsx`
- Modify: `tests/components/KeuanganView.test.tsx`

- [ ] **Step 1: Write failing card and view tests**

  Cover one populated card, its labelled accordion, the three mobile summary metrics, and both empty actions:

  ```tsx
  it('renders every monthly value and reveals only that month\'s transactions', () => {
    render(<FinanceCashFlowMobileCard row={juneRow} transactions={juneTransactions} />);

    expect(screen.getByRole('article', { name: 'Arus kas Juni 2026' })).toBeInTheDocument();
    expect(screen.getByText('Kas Masuk')).toBeInTheDocument();
    expect(screen.getByText('Kas Keluar')).toBeInTheDocument();
    expect(screen.getByText('Kas Bersih')).toBeInTheDocument();
    expect(screen.getByText('Kumulatif')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Detail transaksi Juni 2026' }));
    expect(screen.getByRole('list', { name: 'Transaksi Juni 2026' })).toBeInTheDocument();
    expect(screen.getByText('Pupuk')).toBeInTheDocument();
  });

  it('uses the transaction CTA for an empty selected project', () => {
    const onAddTransaction = vi.fn();
    renderView(emptyReports, { canAddTransaction: true, onAddTransaction });

    fireEvent.click(screen.getByRole('button', { name: 'Catat Transaksi' }));
    expect(onAddTransaction).toHaveBeenCalledOnce();
  });

  it('uses the project CTA when no project is selected', () => {
    const onCreateProject = vi.fn();
    renderView(emptyReports, { canAddTransaction: false, onCreateProject });

    fireEvent.click(screen.getByRole('button', { name: 'Buat Proyek' }));
    expect(onCreateProject).toHaveBeenCalledOnce();
  });
  ```

  In `KeuanganView.test.tsx`, render the `arus-kas` tab with an empty report, click the visible CTA, and assert `transactionBatch.openForCreate` for a selected project and `financeProject.openCreateProjectDialog` without one.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `rtk npm test -- tests/components/FinanceCashFlowMobileCard.test.tsx tests/components/FinanceCashFlowView.test.tsx tests/components/KeuanganView.test.tsx`

  Expected: FAIL because the card, narrow callback props, and CTA do not exist.

- [ ] **Step 3: Implement a presentational monthly card**

  Create a card with semantic labelled values and a MUI accordion. Do not use a nested table or import a controller type:

  ```tsx
  export interface FinanceCashFlowMobileCardProps {
    row: ArusKasBulanan;
    transactions: readonly FinanceTransactionForReport[];
  }

  function colorForNet(value: number) {
    return value > 0 ? 'success.main' : value < 0 ? 'error.main' : 'text.secondary';
  }

  export default function FinanceCashFlowMobileCard({ row, transactions }: FinanceCashFlowMobileCardProps) {
    const monthLabel = formatMonthYear(row.bulan);
    const monthTransactions = transactions.filter((transaction) => transaction.tanggal.startsWith(row.bulan));
    const net = row.kasMasuk - row.kasKeluar;

    return (
      <Card component="article" aria-label={`Arus kas ${monthLabel}`} variant="outlined" sx={{ mb: 1.5 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{monthLabel}</Typography>
          <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, m: 0, mt: 2 }}>
            {[
              { label: 'Kas Masuk', value: `+${formatRupiah(row.kasMasuk)}`, color: 'success.main' },
              { label: 'Kas Keluar', value: `−${formatRupiah(row.kasKeluar)}`, color: 'error.main' },
              { label: 'Kas Bersih', value: `${net >= 0 ? '+' : '−'}${formatRupiah(Math.abs(net))}`, color: colorForNet(net) },
              { label: 'Kumulatif', value: formatRupiah(row.kasKumulatif), color: colorForNet(row.kasKumulatif) },
            ].map((field) => (
              <Box key={field.label}>
                <Typography component="dt" variant="caption" color="text.secondary">{field.label}</Typography>
                <Typography component="dd" sx={{ color: field.color, fontFamily: 'var(--font-sora)', fontWeight: 800, m: 0 }} variant="body2">
                  {field.value}
                </Typography>
              </Box>
            ))}
          </Box>
          <Accordion disableGutters elevation={0} sx={{ mt: 2 }}>
            <AccordionSummary aria-label={`Detail transaksi ${monthLabel}`} expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44 }}>
              <Typography variant="body2">Detail transaksi ({monthTransactions.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="ul" aria-label={`Transaksi ${monthLabel}`} sx={{ display: 'grid', gap: 1, listStyle: 'none', m: 0, p: 0 }}>
                {monthTransactions.length === 0 ? (
                  <Typography component="li" color="text.secondary" variant="body2">Tidak ada transaksi di bulan ini.</Typography>
                ) : monthTransactions.map((transaction) => (
                  <Box component="li" key={transaction.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                      <Chip color={transaction.jenis === 'pendapatan' ? 'success' : 'error'} label={transaction.kategori} size="small" variant="outlined" />
                      <Typography color={transaction.jenis === 'pendapatan' ? 'success.main' : 'error.main'} variant="body2">
                        {transaction.jenis === 'pendapatan' ? '+' : '−'}{formatRupiah(transaction.nominal)}
                      </Typography>
                    </Box>
                    <Typography color="text.secondary" variant="caption">{formatDateShort(transaction.tanggal)} · {transaction.keterangan || 'Tanpa keterangan'}</Typography>
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    );
  }
  ```

  Give the desktop `IconButton` the matching descriptive name and `minWidth`/`minHeight: 44`; retain its current collapse and table layout for `md` and above.

- [ ] **Step 4: Compose the regular view through `ResponsiveDataView`**

  In `FinanceCashFlowView.tsx`, replace the controller-derived prop with a structural prop and compose cards/tables through `ResponsiveDataView`:

  ```tsx
  export interface FinanceCashFlowReportData {
    arusKasBulanan: readonly ArusKasBulanan[];
    reportEndMonth: string | null;
    reportStartMonth: string | null;
    reportTransactions: readonly FinanceTransactionForReport[];
  }

  export interface FinanceCashFlowViewProps {
    financeReports: FinanceCashFlowReportData;
    canAddTransaction: boolean;
    onAddTransaction: () => void;
    onCreateProject: () => void;
  }

  <Box sx={{ display: { md: 'none', xs: 'grid' }, gap: 1.5, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', mb: 2 }}>
    <MetricCard label="Kas Masuk" value={formatRupiah(totalInflow)} intent="success" />
    <MetricCard label="Kas Keluar" value={formatRupiah(totalOutflow)} intent="error" />
    <Box sx={{ gridColumn: '1 / -1' }}><MetricCard label="Saldo Akhir" value={formatRupiah(lastCumulative)} intent={lastCumulative < 0 ? 'error' : 'success'} /></Box>
  </Box>

  const desktopTable = (
    <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <Table aria-label="Tabel arus kas bulanan" size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 44 }} />
            <TableCell sx={{ fontWeight: 700 }}>Bulan</TableCell>
            <TableCell align="right" sx={{ color: 'success.main', fontWeight: 700 }}>Kas Masuk</TableCell>
            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>Kas Keluar</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Kas Bersih</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Kumulatif</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{arusKasBulanan.map((row) => <CashFlowRow key={row.bulan} row={row} transactions={reportTransactions} />)}</TableBody>
        <TableFooter>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell />
            <TableCell sx={{ fontSize: '1.1rem', fontWeight: 800 }}>Total</TableCell>
            <TableCell align="right" sx={{ color: 'success.main', fontSize: '1.1rem', fontWeight: 800 }}>+{formatRupiah(totalInflow)}</TableCell>
            <TableCell align="right" sx={{ color: 'error.main', fontSize: '1.1rem', fontWeight: 800 }}>−{formatRupiah(totalOutflow)}</TableCell>
            <TableCell align="right" sx={{ color: colorForNet(totalNet), fontSize: '1.1rem', fontWeight: 800 }}>{totalNet >= 0 ? '+' : '−'}{formatRupiah(Math.abs(totalNet))}</TableCell>
            <TableCell align="right" sx={{ color: colorForNet(lastCumulative), fontSize: '1.1rem', fontWeight: 800 }}>{formatRupiah(lastCumulative)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );

  <ResponsiveDataView
    data={arusKasBulanan}
    desktop={desktopTable}
    emptyAction={canAddTransaction
      ? <Button variant="contained" onClick={onAddTransaction}>Catat Transaksi</Button>
      : <Button variant="contained" onClick={onCreateProject}>Buat Proyek</Button>}
    emptyMessage={canAddTransaction ? 'Catat transaksi pertama untuk melihat arus kas bulanan.' : 'Buat proyek terlebih dahulu untuk mulai mencatat arus kas.'}
    emptyTitle="Belum ada arus kas"
    getItemKey={(row) => row.bulan}
    renderMobileItem={(row) => <FinanceCashFlowMobileCard row={row} transactions={reportTransactions} />}
    state={arusKasBulanan.length === 0 ? 'empty' : 'ready'}
  />
  ```

  In `KeuanganView.tsx`, pass `financeAccess.canInputFinance`, `transactionBatch.openForCreate`, and `financeProject.openCreateProjectDialog`. These callbacks remain controller-owned; the child view only invokes its props.

- [ ] **Step 5: Run the focused tests to verify they pass**

  Run: `rtk npm test -- tests/components/FinanceCashFlowMobileCard.test.tsx tests/components/FinanceCashFlowView.test.tsx tests/components/KeuanganView.test.tsx`

  Expected: PASS; desktop table/footer assertions remain present and the new card, CTA, and accessibility assertions pass.

- [ ] **Step 6: Commit the regular cash-flow work**

  ```bash
  git add app/dashboard/keuangan/_components/FinanceCashFlowMobileCard.tsx app/dashboard/keuangan/_components/FinanceCashFlowView.tsx app/dashboard/keuangan/_components/KeuanganView.tsx tests/components/FinanceCashFlowMobileCard.test.tsx tests/components/FinanceCashFlowView.test.tsx tests/components/KeuanganView.test.tsx
  git commit -m "feat(finance): make cash flow mobile responsive"
  ```

### Task 3: Render financed monthly cash flow as mobile cards and consolidate its empty CTA

**Files:**
- Create: `app/dashboard/keuangan/_components/FinanceFinancingMobileCard.tsx`
- Modify: `app/dashboard/keuangan/_components/FinanceFinancingView.tsx:1-112`
- Modify: `app/dashboard/keuangan/_components/KeuanganView.tsx:1266-1273`
- Create: `tests/components/FinanceFinancingMobileCard.test.tsx`
- Modify: `tests/components/FinanceFinancingView.test.tsx`

- [ ] **Step 1: Write the failing financing card tests**

  ```tsx
  it('renders the financed amount and cumulative balance without a table', () => {
    render(<FinanceFinancingMobileCard row={julyRow} />);

    expect(screen.getByRole('article', { name: 'Arus kas pasca pembiayaan Juli 2026' })).toBeInTheDocument();
    expect(screen.getByText('Kas Setelah Pembiayaan')).toBeInTheDocument();
    expect(screen.getByText('Kas Kumulatif Setelah Pembiayaan')).toBeInTheDocument();
  });
  ```

  Extend `FinanceFinancingView.test.tsx` to assert a populated report passes `renderMobileItem` data into a visible article and that the no-assumption state has exactly one `Atur Asumsi Pembiayaan` button.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `rtk npm test -- tests/components/FinanceFinancingMobileCard.test.tsx tests/components/FinanceFinancingView.test.tsx`

  Expected: FAIL because the mobile card and single-CTA composition do not exist.

- [ ] **Step 3: Implement narrow financing props, the card, and responsive table composition**

  Define presentation-only view props and a structural row prop; neither file imports `UseFinancingControllerResult`:

  ```tsx
  export interface FinanceFinancingViewProps {
    arusKasPascaPembiayaan: readonly ArusKasPascaPembiayaanBulanan[];
    bunga: number | null;
    kasAkhirPascaPembiayaan: number | null;
    kebutuhanModalKerja: number;
    onOpenAssumptions: () => void;
  }

  export interface FinanceFinancingMobileCardProps {
    row: ArusKasPascaPembiayaanBulanan;
  }

  export default function FinanceFinancingMobileCard({ row }: FinanceFinancingMobileCardProps) {
    const monthLabel = formatMonthYear(row.bulan);
    return (
      <Card component="article" aria-label={`Arus kas pasca pembiayaan ${monthLabel}`} variant="outlined" sx={{ mb: 1.5 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{monthLabel}</Typography>
          <Box component="dl" sx={{ display: 'grid', gap: 1.5, m: 0, mt: 2 }}>
            <Box><Typography component="dt" color="text.secondary" variant="caption">Kas Setelah Pembiayaan</Typography><Typography component="dd" sx={{ fontWeight: 800, m: 0 }} variant="body1">{formatRupiah(row.kasSetelahPembiayaan)}</Typography></Box>
            <Box><Typography component="dt" color="text.secondary" variant="caption">Kas Kumulatif Setelah Pembiayaan</Typography><Typography component="dd" sx={{ fontWeight: 800, m: 0 }} variant="body1">{formatRupiah(row.kasKumulatifSetelahPembiayaan)}</Typography></Box>
          </Box>
        </CardContent>
      </Card>
    );
  }
  ```

  Replace only the monthly table branch with:

  ```tsx
  <ResponsiveDataView
    data={arusKasPascaPembiayaan}
    desktop={(
      <TableContainer>
        <Table aria-label="Tabel arus kas pasca pembiayaan" size="small">
          <TableHead><TableRow><TableCell>Bulan</TableCell><TableCell align="right">Kas Setelah Pembiayaan</TableCell><TableCell align="right">Kas Kumulatif Setelah Pembiayaan</TableCell></TableRow></TableHead>
          <TableBody>{arusKasPascaPembiayaan.map((row) => <TableRow key={row.bulan}><TableCell>{formatMonthYear(row.bulan)}</TableCell><TableCell align="right">{formatRupiah(row.kasSetelahPembiayaan)}</TableCell><TableCell align="right">{formatRupiah(row.kasKumulatifSetelahPembiayaan)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </TableContainer>
    )}
    emptyMessage="Belum ada proyeksi arus kas setelah pembiayaan."
    emptyTitle="Belum ada proyeksi pembiayaan"
    getItemKey={(row) => row.bulan}
    renderMobileItem={(row) => <FinanceFinancingMobileCard row={row} />}
    state={arusKasPascaPembiayaan.length === 0 ? 'empty' : 'ready'}
  />
  ```

  In the `bunga === null` branch, keep one explanatory empty state with one contained `Atur Asumsi Pembiayaan` button. Replace the repeated summary-card buttons with clear non-action text such as `Belum diatur`; do not change financing calculation outputs. In `KeuanganView`, pass the five values above and `financing.openDialog` as `onOpenAssumptions`.

- [ ] **Step 4: Run the focused tests to verify they pass**

  Run: `rtk npm test -- tests/components/FinanceFinancingMobileCard.test.tsx tests/components/FinanceFinancingView.test.tsx`

  Expected: PASS; populated data, the one CTA, and the financing summary assertions remain valid.

- [ ] **Step 5: Commit the financing view**

  ```bash
  git add app/dashboard/keuangan/_components/FinanceFinancingMobileCard.tsx app/dashboard/keuangan/_components/FinanceFinancingView.tsx tests/components/FinanceFinancingMobileCard.test.tsx tests/components/FinanceFinancingView.test.tsx
  git commit -m "feat(finance): adapt financed cash flow for mobile"
  ```

### Task 4: Render the cash-flow comparison subsection as mobile cards

**Files:**
- Create: `app/dashboard/keuangan/_components/FinanceComparisonCashFlowMobileCard.tsx`
- Modify: `app/dashboard/keuangan/_components/FinanceComparisonView.tsx:389-459`
- Modify: `app/dashboard/keuangan/_components/KeuanganView.tsx:1274-1281`
- Create: `tests/components/FinanceComparisonCashFlowMobileCard.test.tsx`
- Modify: `tests/components/FinanceComparisonView.test.tsx`

- [ ] **Step 1: Write the failing comparison-card tests**

  ```tsx
  it('renders projection, realization, variance, and percentage in one monthly card', () => {
    render(<FinanceComparisonCashFlowMobileCard row={comparisonJune} />);

    expect(screen.getByRole('article', { name: 'Perbandingan arus kas Juni 2026' })).toBeInTheDocument();
    expect(screen.getByText('Proyeksi')).toBeInTheDocument();
    expect(screen.getByText('Realisasi')).toBeInTheDocument();
    expect(screen.getByText('Selisih')).toBeInTheDocument();
    expect(screen.getByText('+25,0%')).toBeInTheDocument();
  });
  ```

  Extend `FinanceComparisonView.test.tsx` with a populated `arusKasBulanan` assertion for the article and an empty-data assertion for `Belum ada data arus kas bulanan yang dapat dibandingkan.`

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `rtk npm test -- tests/components/FinanceComparisonCashFlowMobileCard.test.tsx tests/components/FinanceComparisonView.test.tsx`

  Expected: FAIL because the comparison mobile card is missing.

- [ ] **Step 3: Implement narrow comparison props, a local card, and compose it through `ResponsiveDataView`**

  Use a structural row interface instead of importing the comparison controller type:

  ```tsx
  export interface FinanceComparisonCashFlowMonth {
    bulan: string;
    proyeksi: number;
    realisasi: number;
    selisih: number;
    selisihPercent: number | null;
  }

  function colorForNet(value: number) {
    return value > 0 ? 'success.main' : value < 0 ? 'error.main' : 'text.secondary';
  }
  ```

  Define the view boundary from finance-library types, not `UseComparisonControllerResult`, then have `KeuanganView` pass the individual values:

  ```tsx
  export interface FinanceComparisonViewProps {
    comparison: ScenarioComparison | null;
    error: string | null;
    hasEnoughData: boolean;
    loading: boolean;
    projectionHasData: boolean;
    realizationHasData: boolean;
  }
  ```

  The card renders the month and three labelled currency values as `dt`/`dd` pairs:

  ```tsx
  <Card component="article" aria-label={`Perbandingan arus kas ${formatMonthYear(row.bulan)}`} variant="outlined" sx={{ m: 1.5 }}>
    <CardContent>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{formatMonthYear(row.bulan)}</Typography>
      <Box component="dl" sx={{ display: 'grid', gap: 1.5, m: 0, mt: 2 }}>
        <Box><Typography component="dt" color="text.secondary" variant="caption">Proyeksi</Typography><Typography component="dd" sx={{ m: 0 }} variant="body2">{formatRupiah(row.proyeksi)}</Typography></Box>
        <Box><Typography component="dt" color="text.secondary" variant="caption">Realisasi</Typography><Typography component="dd" sx={{ fontWeight: 800, m: 0 }} variant="body2">{formatRupiah(row.realisasi)}</Typography></Box>
        <Box><Typography component="dt" color="text.secondary" variant="caption">Selisih</Typography><Typography component="dd" sx={{ color: colorForNet(row.selisih), fontWeight: 800, m: 0 }} variant="body2">{row.selisih >= 0 ? '+' : '−'}{formatRupiah(Math.abs(row.selisih))}</Typography></Box>
      </Box>
      <Box sx={{ mt: 1.5 }}>{formatSelisihPercent(row.selisihPercent)}</Box>
    </CardContent>
  </Card>
  ```

  Replace only the `Perbandingan Arus Kas Bersih Bulanan` table with `ResponsiveDataView`; leave its banner, metric table, category table, loading, error, and scenario-gating branches unchanged.

- [ ] **Step 4: Run the focused tests to verify they pass**

  Run: `rtk npm test -- tests/components/FinanceComparisonCashFlowMobileCard.test.tsx tests/components/FinanceComparisonView.test.tsx`

  Expected: PASS; comparison metric and gating coverage remains green.

- [ ] **Step 5: Commit the comparison subsection**

  ```bash
  git add app/dashboard/keuangan/_components/FinanceComparisonCashFlowMobileCard.tsx app/dashboard/keuangan/_components/FinanceComparisonView.tsx tests/components/FinanceComparisonCashFlowMobileCard.test.tsx tests/components/FinanceComparisonView.test.tsx
  git commit -m "feat(finance): make cash flow comparison mobile responsive"
  ```

### Task 5: Add isolated Playwright mobile coverage and reconcile the audit

**Files:**
- Create: `e2e/finance-cashflow-mobile.spec.ts`
- Modify: `docs/audit-ui-simulasi-keuangan-padi.md:26-38, 51-56, 148-161`

- [ ] **Step 1: Write the populated local-guest fixture and failing mobile smoke**

  Seed only browser storage in `page.addInitScript`; do not call production APIs or mutate a shared backend. Use a fixed `projectId`, a local project in `arina-finance-projects-${userId}`, selection in `arina-selected-finance-project`, and two scenario transactions in `arina-scenario-transactions-guest-proj-${projectId}`. The fixture must include an income and expense in different months.

  ```tsx
  for (const viewport of [{ name: '320x568', width: 320, height: 568 }, { name: '390x844', width: 390, height: 844 }]) {
    test(`cash-flow cards are usable at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await installLocalGuestFinanceFixture(page);
      await page.goto('/dashboard/keuangan', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[aria-label="Navigasi Utama"]')).toBeVisible();
      const tab = page.getByRole('tablist', { name: 'Navigasi laporan keuangan' }).getByRole('tab', { name: 'Arus Kas', exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('article', { name: 'Arus kas Agustus 2026' })).toBeVisible();
      await page.getByRole('button', { name: 'Detail transaksi Agustus 2026' }).click();
      await expect(page.getByRole('list', { name: 'Transaksi Agustus 2026' })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
  ```

- [ ] **Step 2: Run the smoke to verify it fails before implementation**

  Run: `rtk npx playwright test e2e/finance-cashflow-mobile.spec.ts --project=chromium`

  Expected: FAIL because no monthly mobile `article` or named detail button exists.

- [ ] **Step 3: Run all relevant verification after Tasks 1–4 are complete**

  Run:

  ```bash
  rtk npm test -- tests/components/ContentState.test.tsx tests/components/FinanceCashFlowMobileCard.test.tsx tests/components/FinanceCashFlowView.test.tsx tests/components/FinanceFinancingMobileCard.test.tsx tests/components/FinanceFinancingView.test.tsx tests/components/FinanceComparisonCashFlowMobileCard.test.tsx tests/components/FinanceComparisonView.test.tsx tests/components/KeuanganView.test.tsx
  rtk npm run typecheck
  rtk npm run lint -- components/ui/ContentState.tsx app/dashboard/keuangan/_components/FinanceCashFlowMobileCard.tsx app/dashboard/keuangan/_components/FinanceCashFlowView.tsx app/dashboard/keuangan/_components/FinanceFinancingMobileCard.tsx app/dashboard/keuangan/_components/FinanceFinancingView.tsx app/dashboard/keuangan/_components/FinanceComparisonCashFlowMobileCard.tsx app/dashboard/keuangan/_components/FinanceComparisonView.tsx app/dashboard/keuangan/_components/KeuanganView.tsx e2e/finance-cashflow-mobile.spec.ts
  rtk npx playwright test e2e/finance-cashflow-mobile.spec.ts --project=chromium
  ```

  Expected: all focused tests, TypeScript, lint, and the two Chromium mobile viewport runs pass.

- [ ] **Step 4: Update audit status accurately**

  In `docs/audit-ui-simulasi-keuangan-padi.md`, mark FIN-10 complete only after the labelled 44 px regular expander ships. Mark FIN-07 as partially completed only if the single financing CTA and responsive financed cards ship; retain its scenario-data guidance as deferred. Keep FIN-01, FIN-02, FIN-04 through FIN-06, FIN-08, FIN-09, FIN-11, and FIN-12 open unless this plan actually changes them. Add the three responsive cash-flow card paths to the reusable-component section.

- [ ] **Step 5: Commit validation and audit documentation**

  ```bash
  git add e2e/finance-cashflow-mobile.spec.ts
  git add -f docs/audit-ui-simulasi-keuangan-padi.md
  git commit -m "test(finance): cover mobile cash flow reports"
  ```

## Final Review Checklist

- [ ] `FinanceCashFlowView`, `FinanceFinancingView`, `FinanceComparisonView`, and the three card components import no controller types for presentation data.
- [ ] Financial calculation helpers and controller files have no diff.
- [ ] Every card uses text labels with values; success/error color is supplementary only.
- [ ] Mobile-only cards are hidden at `md` and above; desktop tables are hidden below `md` without creating document-level horizontal overflow.
- [ ] The regular empty action opens the correct parent-owned dialog in both project states.
- [ ] Audit statuses describe only implemented work, and ignored audit documentation is deliberately force-added.
