# Finance Cash Flow Mobile Design

## Goal

Make the populated cash-flow reports in Manajemen Keuangan easy to scan and operate at 320–390 px, without changing finance calculations, data sources, scenario rules, or the established desktop tables.

## Scope

The change covers three existing cash-flow presentations:

- `Arus Kas`: monthly actual/projection cash flow and its transaction detail.
- `Arus Kas Pasca Pembiayaan`: monthly financed cash position.
- `Perbandingan`: the monthly net-cash-flow comparison subsection only.

The import flow, report calculations, scenario separation, toolbar, non-cash-flow comparison tables, and global navigation are explicitly out of scope.

## Design

At `md` and above, each report retains its current semantic table, headers, totals, sorting order, and desktop scrolling behavior. Below `md`, `ResponsiveDataView` replaces only each monthly table with one card per month. A card exposes all values without horizontal scrolling, using labelled value pairs and the existing positive/negative colors in addition to text labels.

The regular Arus Kas header gains a mobile-only three-metric summary: total cash in, total cash out, and ending cash. Its per-month card shows the month, cash in, cash out, net cash, and cumulative cash. Transaction detail opens through a labelled MUI accordion and is rendered as a vertical list, never a nested table. The accordion control has a 44 px minimum touch target and an accessible month-specific name.

The financing and comparison cash-flow cards follow the same hierarchy: month first, then their two or three report values, then a textual positive/negative variance status where applicable. Financing keeps one primary `Atur Asumsi Pembiayaan` CTA in its empty state; repeated CTA buttons in summary cards are removed.

When regular Arus Kas has no rows, its empty state provides one direct action: `Catat Transaksi` if a project is selected, otherwise `Buat Proyek`. The parent view owns those callbacks; the report view remains presentation-only and does not call controllers or APIs itself.

## Component Boundaries

- `ContentState` gains an optional empty-state action slot so this and future views can provide an accessible empty-state CTA.
- `FinanceCashFlowMobileCard`, `FinanceFinancingMobileCard`, and `FinanceComparisonCashFlowMobileCard` are feature-local, presentational components. They receive row data and callbacks only; they do not import controllers.
- `FinanceCashFlowView` declares a narrow report-data prop rather than importing the Keuangan controller result type. `KeuanganView` supplies report data and controller-owned callbacks.
- `ResponsiveDataView` remains the breakpoint compositor: desktop table in `desktop`, cards in `renderMobileItem`.

## Acceptance Criteria

- At 320 × 568 and 390 × 844, a populated regular Arus Kas report has no document-level horizontal overflow, shows a monthly card, and exposes its transaction detail by keyboard and touch.
- A mobile card contains every value currently available from its corresponding desktop row; no financial value is represented only by color.
- Desktop tables remain visible from `md` upward, including the regular Arus Kas footer totals and constrained scroll behavior.
- The regular empty state opens the transaction dialog when a project exists and the project dialog otherwise.
- No cash-flow view imports a controller type for presentation props, and no controller, API, calculation, or persistence code changes.
- Unit tests cover populated, empty, and interaction states. A Chromium Playwright test uses isolated guest storage to exercise a populated regular Arus Kas screen at both mobile widths.

