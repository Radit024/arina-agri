# Dashboard Finance Project Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hybrid project scope to the dashboard finance summary so the default view shows all projects and users can filter finance KPIs/charts to one project.

**Architecture:** Keep UI and controller separated. The controller owns persisted scope state and API parameters, the view renders the selector and scoped labels, and server helpers perform project-aware financial aggregation.

**Tech Stack:** Next.js App Router, React client components, next-intl, MUI, Supabase, Vitest.

---

### Task 1: Add Pure Dashboard Project Metrics

**Files:**
- Modify: `lib/dashboard/summary.ts`
- Test: `tests/server/dashboardSummary.test.ts`

- [ ] Add `projectId?: string | null` to `DashboardSummaryTransaction`.
- [ ] Add `DashboardFinanceProjectOption`, `DashboardProjectPerformancePoint`, and `DashboardFinanceScope` interfaces.
- [ ] Add `buildDashboardProjectPerformance(transactions, projects, now)` that groups current-month income, expense, profit, and transaction count by project id.
- [ ] Include unlinked transactions as a `Tanpa Project` row with `projectId: null`.
- [ ] Test that current-month transactions are grouped by project and unlinked transactions are preserved.

### Task 2: Thread Scope Through Dashboard API

**Files:**
- Modify: `hooks/useDashboardSummary.ts`
- Modify: `app/api/dashboard/summary/route.ts`
- Modify: `lib/server/dashboard/summary.ts`
- Test: `tests/hooks/useDashboardSummary.test.ts`
- Test: `tests/api/dashboardSummaryRoute.test.ts`

- [ ] Add optional `financeProjectId` to dashboard summary params and URL builder.
- [ ] Parse `financeProjectId` in the route and pass it to `getDashboardSummary`.
- [ ] Query active or draft `finance_projects` for the user in the server summary service.
- [ ] Treat an invalid or stale `financeProjectId` as `Semua Project`.
- [ ] Filter the transaction query by `project_id` only when the validated project id exists.
- [ ] Return `financeScope` with selected id, selected name, project options, and project performance rows.

### Task 3: Add Dashboard Controller Scope State

**Files:**
- Modify: `controllers/dashboard-home/useDashboardHomeController.ts`

- [ ] Store selected dashboard finance project id with local storage key `arina-dashboard-finance-project-scope`.
- [ ] Pass selected id into `useDashboardSummary`.
- [ ] Reset stale project id when the loaded summary no longer contains it.
- [ ] Return `financeScope` props for the view: selected id, selected name, project options, project performance, and change handler.

### Task 4: Render Scope Selector And Project Performance

**Files:**
- Modify: `app/dashboard/_components/DashboardHomeView.tsx`
- Modify: `components/dashboard/DashboardCharts.tsx`
- Modify: `messages/id.json`
- Modify: `messages/en.json`

- [ ] Render a compact scope selector in the dashboard header.
- [ ] Pass the active scope label into finance charts.
- [ ] Add scoped chart subtitles in translations.
- [ ] Add a project performance card that appears only on `Semua Project` when project rows exist.

### Task 5: Verify

**Files:**
- Test: `tests/server/dashboardSummary.test.ts`
- Test: `tests/hooks/useDashboardSummary.test.ts`
- Test: `tests/api/dashboardSummaryRoute.test.ts`

- [ ] Run targeted tests for dashboard summary, hook URL, and API route.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Review `git diff --check`.
