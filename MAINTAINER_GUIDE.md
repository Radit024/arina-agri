---
status: active
last_verified: 2026-08-15
audience: maintainers-and-ai
sensitivity: internal
---

# Arina Agri Maintainer Guide

Use this guide for orientation and operational decisions. Use `README.md` for the feature map and setup. Current source, tests, SQL, and deployment evidence take precedence over historical plans.

## Before changing anything

1. Read `AGENTS.md` and preserve the required View/controller boundary.
2. Check `git status`, the current branch, and recent commits. The branch observed on 2026-08-15 had a nonstandard name, so do not assume `main` or rename/rebase it without owner approval.
3. Identify whether the task concerns the root Next.js runtime or the legacy `backend/` tree. Root Next.js is the default.
4. Classify the statement you are relying on as source-verified, test-verified, remote-verified, owner-reported, or proposed.
5. Keep secrets in ignored environment files or the deployment secret store. Never paste their values into issues, logs, guides, or commits.

## Architecture and ownership

```text
browser UI
  -> app/dashboard/**/_components/*View.tsx       presentational rendering
  -> controllers/**/use*Controller.ts             orchestration and UI state
  -> hooks/** and lib/api.ts                       reusable data access
  -> app/api/**/route.ts and lib/server/**         server boundary
  -> Supabase / Gemini / BMKG / market feeds / messaging providers
```

- `app/`: routes, layouts, route handlers, and feature-local views.
- `controllers/`: stateful feature orchestration; views should not absorb this responsibility.
- `hooks/`: reusable client data/state hooks.
- `lib/finance/`: pure finance calculations, parsing, labels, and matching.
- `lib/server/`: server-only integrations.
- `tests/`: unit, hook, controller, component, route, and server tests.
- `docs/sql/`: database changes. Treat every SQL file as an operator-reviewed migration, not a command to run automatically.
- `backend/`: older Express implementation/reference; do not make it a second source of truth.

## Finance status as of 2026-08-15

The historical `AUDIT_REVISI_MANAJEMEN_KEUANGAN.md` is a requirement/correction record, not proof that the current code is missing those features. Current tracked evidence includes:

- `finance_scenarios` with `PROJECTION` and `REALIZATION` flows;
- project-scoped active-scenario selection, defaulting to realization in tested controller behavior;
- scenario calculation engine and golden fixture tests;
- RAB import, calculations, categories, and suggestion matching;
- income statement, cash flow, comparison, financing assumptions, and post-financing output;
- scenario-aware transactions and migration controller;
- migration SQL at `docs/sql/2026-08-02-finance-scenarios.sql`.

Do not declare the finance revision complete from file presence alone. Verify CI, inspect the current database schema, exercise a migrated legacy project, and reconcile outputs against an owner-approved calculation sample.

## Safe database protocol

1. Confirm the target Supabase project identifier without printing keys.
2. Read the SQL and record expected tables, columns, constraints, policies, and destructive statements.
3. Run read-only preflight queries and preserve aggregate evidence only.
4. Back up or establish an explicit rollback path for any affected production data.
5. Apply the migration only with explicit operator approval for that project.
6. Run post-checks, application smoke checks, and a representative legacy-data test.
7. Record date, commit, environment, operator, outcome, and unresolved exceptions.

Never infer that a local SQL file has been deployed remotely.

## Local verification

Prerequisites are Node.js 20, npm, and appropriate environment values. Start with:

```powershell
npm install
npm run ci
```

`npm run ci` runs lint, Next type generation plus TypeScript checking, Vitest, i18n validation, and a production build. A passing CI run does not verify Supabase policies, third-party credentials, scheduled endpoints, real messaging delivery, or deployed behavior.

For a deployed target, use the existing smoke command only after checking what URL and environment it will contact:

```powershell
npm run smoke:deploy
```

## Change rules

- Add or update tests with domain behavior changes, especially finance calculations and scenario ownership.
- Keep pure calculations out of UI components.
- Preserve chronological ordering and deterministic fixtures in financial exports.
- Treat user financial data, contact details, tokens, and generated reports as private.
- Never silently map legacy records to projection or realization; make the migration rule explicit and test it.
- Do not claim an external integration works until it has been exercised in the intended environment.

## Definition of ready

A release candidate has a clean scoped diff, passing `npm run ci`, reviewed migrations, documented environment contract, representative finance acceptance results, and deployment smoke evidence. Any skipped gate must be recorded as an open risk rather than described as complete.

## Local verification note (2026-08-15)

The stale `RabImportDialog` fixtures and finance-scenario migration mock were corrected. The complete `npm run ci` then passed: lint, Next/TypeScript checking, all 111 test files and 517 tests, i18n validation, and the production build. Remote Supabase migration and deployed integration behavior remain separate operator gates.
