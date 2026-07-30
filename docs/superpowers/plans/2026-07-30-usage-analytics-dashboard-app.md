# Usage Analytics Dashboard App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js app at `D:\Arina Agri\arina-agri-analytics` (its own git repo) that lets an admin log in and see growth + per-feature usage metrics computed from the `usage_events` table and `profiles` table in the same Supabase project used by `arina-agri`.

**Architecture:** A minimal Next.js App Router project with its own `package.json`/git history. Login uses Supabase Auth (anon key, client-side, same pattern as `arina-agri`). All actual data queries run in one server-side API route (`GET /api/dashboard/summary`) using the Supabase **service role** key, gated by an `is_admin` check — the service role key never reaches the browser. A pure, fully-unit-tested aggregation function turns raw `profiles`/`usage_events` rows into the KPI/chart/table shapes the dashboard page renders with `@mui/x-charts`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, MUI v9 + `@mui/x-charts`, `@supabase/supabase-js`, Vitest + Testing Library.

---

## Reference: spec and prior plan

This plan implements the `arina-agri-analytics` repo section of `docs/superpowers/specs/2026-07-30-usage-analytics-dashboard-design.md`. It depends on `docs/superpowers/plans/2026-07-30-usage-analytics-instrumentation.md`, which is already implemented on branch `feature/usage-analytics-instrumentation` of the `arina-agri` repo: the `usage_events` table and `profiles.is_admin` column exist as a migration file (`docs/sql/2026-07-30-usage-analytics.sql` in `arina-agri`) that must be applied to the shared Supabase project before this app can show real data (applying it is a manual, one-time step for the project owner — not part of this plan).

Every file path in this plan is relative to the new repo root: `D:\Arina Agri\arina-agri-analytics`.

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `tests/setup.ts`
- Create: `next-env.d.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Test: `tests/smoke.test.ts`

- [ ] **Step 1: Create the project directory and initialize git**

```bash
mkdir "D:\Arina Agri\arina-agri-analytics"
cd "D:\Arina Agri\arina-agri-analytics"
git init
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "arina-agri-analytics",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "next typegen && tsc --noEmit --pretty false",
    "test": "vitest run"
  },
  "dependencies": {
    "@emotion/cache": "^11.14.0",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "@mui/material": "^9.0.1",
    "@mui/material-nextjs": "^9.0.1",
    "@mui/x-charts": "^9.0.2",
    "@supabase/supabase-js": "^2.104.1",
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "jsdom": "^25.0.1",
    "typescript": "^5",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 6: Write `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 7: Write `.gitignore`**

```
node_modules
.next
.env.local
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 8: Write `.env.local.example`**

```
# Same Supabase project as arina-agri.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Server-only. Never expose this to the browser.
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 9: Write `next-env.d.ts`**

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 10: Write `app/globals.css`**

```css
html,
body {
  padding: 0;
  margin: 0;
}
```

- [ ] **Step 11: Write `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arina Agri Analytics',
  description: 'Dashboard usage analytics internal Arina Agri',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AppRouterCacheProvider>
          <CssBaseline />
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 12: Write `app/page.tsx`**

```tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
```

- [ ] **Step 13: Write a smoke test**

```typescript
// tests/smoke.test.ts
import { describe, expect, it } from 'vitest';

describe('project scaffold', () => {
  it('runs a basic vitest assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 14: Install dependencies and run the smoke test**

```bash
cd "D:\Arina Agri\arina-agri-analytics"
npm install
npx vitest run tests/smoke.test.ts
```

Expected: PASS (1 test)

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "chore: scaffold arina-agri-analytics Next.js project"
```

---

## Task 2: Supabase clients

**Files:**
- Create: `lib/supabaseClient.ts`
- Create: `lib/supabaseAdmin.ts`

- [ ] **Step 1: Write the browser client**

```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Write the server-only admin client**

```typescript
// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, serviceRoleKey);
}
```

This mirrors `lib/server/supabaseAdmin.ts` in the `arina-agri` repo exactly, so anyone familiar with that codebase recognizes the pattern immediately. `getSupabaseAdmin` must only ever be called from server-side code (API routes) — never imported into a `'use client'` file.

- [ ] **Step 3: Commit**

```bash
git add lib/supabaseClient.ts lib/supabaseAdmin.ts
git commit -m "feat: tambah Supabase client browser dan admin"
```

---

## Task 3: Admin auth gate

**Files:**
- Create: `lib/auth/requestAdmin.ts`
- Test: `tests/lib/auth/requestAdmin.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/auth/requestAdmin.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const createClient = vi.fn(() => ({ auth: { getUser } }));
const from = vi.fn();
const getSupabaseAdmin = vi.fn(() => ({ from }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

describe('resolveRequestAdmin', () => {
  beforeEach(() => {
    getUser.mockReset();
    createClient.mockClear();
    from.mockReset();
    getSupabaseAdmin.mockClear();
  });

  it('returns unauthenticated when there is no bearer token', async () => {
    const { resolveRequestAdmin } = await import('@/lib/auth/requestAdmin');
    const result = await resolveRequestAdmin(new Request('http://localhost/api/dashboard/summary'));
    expect(result).toEqual({ status: 'unauthenticated' });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('returns unauthenticated when the token does not resolve to a user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { resolveRequestAdmin } = await import('@/lib/auth/requestAdmin');
    const result = await resolveRequestAdmin(new Request('http://localhost/api/dashboard/summary', {
      headers: { authorization: 'Bearer bad-token' },
    }));
    expect(result).toEqual({ status: 'unauthenticated' });
  });

  it('returns forbidden when the user is not an admin', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const single = vi.fn().mockResolvedValue({ data: { is_admin: false } });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    const { resolveRequestAdmin } = await import('@/lib/auth/requestAdmin');
    const result = await resolveRequestAdmin(new Request('http://localhost/api/dashboard/summary', {
      headers: { authorization: 'Bearer good-token' },
    }));
    expect(result).toEqual({ status: 'forbidden', userId: 'user-1' });
  });

  it('returns ok when the user is an admin', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    const single = vi.fn().mockResolvedValue({ data: { is_admin: true } });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    const { resolveRequestAdmin } = await import('@/lib/auth/requestAdmin');
    const result = await resolveRequestAdmin(new Request('http://localhost/api/dashboard/summary', {
      headers: { authorization: 'Bearer good-token' },
    }));
    expect(result).toEqual({ status: 'ok', userId: 'admin-1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/auth/requestAdmin.test.ts`
Expected: FAIL with "Cannot find module '@/lib/auth/requestAdmin'"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/auth/requestAdmin.ts
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export type RequestAdminResult =
  | { status: 'unauthenticated' }
  | { status: 'forbidden'; userId: string }
  | { status: 'ok'; userId: string };

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function resolveRequestAdmin(request: Request): Promise<RequestAdminResult> {
  const token = getBearerToken(request);
  if (!token) return { status: 'unauthenticated' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'unauthenticated' };

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { status: 'forbidden', userId: user.id };
  }

  return { status: 'ok', userId: user.id };
}
```

This is the analytics app's equivalent of `arina-agri`'s `lib/server/auth/requestUser.ts`, extended with the `is_admin` check this app needs and `arina-agri` doesn't.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/auth/requestAdmin.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/requestAdmin.ts tests/lib/auth/requestAdmin.test.ts
git commit -m "feat: tambah resolveRequestAdmin untuk gate akses admin"
```

---

## Task 4: Dashboard aggregation logic

**Files:**
- Create: `lib/analytics/types.ts`
- Create: `lib/analytics/aggregate.ts`
- Test: `tests/lib/analytics/aggregate.test.ts`

- [ ] **Step 1: Write `lib/analytics/types.ts`**

```typescript
// lib/analytics/types.ts
export type AnalyticsFeature = 'keuangan' | 'stok' | 'kalender' | 'ai_chat';

export const CORE_FEATURES: AnalyticsFeature[] = ['keuangan', 'stok', 'kalender', 'ai_chat'];

export interface UsageEventRow {
  userId: string | null;
  feature: AnalyticsFeature;
  eventType: 'page_view' | 'action';
  createdAt: string;
}

export interface ProfileRow {
  id: string;
  createdAt: string;
}

export interface DashboardSummaryInput {
  profiles: ProfileRow[];
  events: UsageEventRow[];
  rangeStart: string;
  rangeEnd: string;
  previousRangeStart: string;
}

export interface FeatureBreakdownRow {
  feature: AnalyticsFeature;
  pageViews: number;
  uniqueUsers: number;
  keyActions: number;
  pageViewChangePct: number | null;
}

export interface DashboardSummary {
  totalUsers: number;
  newUsersInRange: number;
  dau: number;
  wau: number;
  mau: number;
  retentionWoW: number;
  growthSeries: { date: string; newUsers: number; activeUsers: number }[];
  featureSeries: { date: string; keuangan: number; stok: number; kalender: number; ai_chat: number }[];
  featureBreakdown: FeatureBreakdownRow[];
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/lib/analytics/aggregate.test.ts
import { describe, expect, it } from 'vitest';
import { buildDashboardSummary } from '@/lib/analytics/aggregate';
import type { ProfileRow, UsageEventRow } from '@/lib/analytics/types';

// 7-day range: 2026-07-24T00:00:00.000Z (inclusive) .. 2026-07-31T00:00:00.000Z (exclusive)
// previous 7-day range: 2026-07-17T00:00:00.000Z .. 2026-07-24T00:00:00.000Z
const RANGE_START = '2026-07-24T00:00:00.000Z';
const RANGE_END = '2026-07-31T00:00:00.000Z';
const PREVIOUS_RANGE_START = '2026-07-17T00:00:00.000Z';

const profiles: ProfileRow[] = [
  { id: 'p1', createdAt: '2026-07-10T00:00:00.000Z' }, // existing user, before range
  { id: 'p2', createdAt: '2026-07-25T05:00:00.000Z' }, // new user in range
  { id: 'p3', createdAt: '2026-07-29T10:00:00.000Z' }, // new user in range
  { id: 'p4', createdAt: '2026-07-01T00:00:00.000Z' }, // existing user, active only 30d ago
];

const events: UsageEventRow[] = [
  // previous-week activity for retention: p1 active in the week before the range
  { userId: 'p1', feature: 'keuangan', eventType: 'page_view', createdAt: '2026-07-18T09:00:00.000Z' },
  // in-range activity
  { userId: 'p1', feature: 'keuangan', eventType: 'page_view', createdAt: '2026-07-24T08:00:00.000Z' },
  { userId: 'p1', feature: 'keuangan', eventType: 'action', createdAt: '2026-07-24T08:05:00.000Z' },
  { userId: 'p2', feature: 'keuangan', eventType: 'page_view', createdAt: '2026-07-25T05:30:00.000Z' },
  { userId: 'p1', feature: 'keuangan', eventType: 'page_view', createdAt: '2026-07-30T10:00:00.000Z' },
  { userId: 'p2', feature: 'stok', eventType: 'page_view', createdAt: '2026-07-30T12:00:00.000Z' },
  // MAU-only activity: outside the 7-day range and the 14-day retention window, inside 30 days
  { userId: 'p4', feature: 'keuangan', eventType: 'page_view', createdAt: '2026-07-05T00:00:00.000Z' },
];

describe('buildDashboardSummary', () => {
  const summary = buildDashboardSummary({
    profiles,
    events,
    rangeStart: RANGE_START,
    rangeEnd: RANGE_END,
    previousRangeStart: PREVIOUS_RANGE_START,
  });

  it('counts total users and new users in range', () => {
    expect(summary.totalUsers).toBe(4);
    expect(summary.newUsersInRange).toBe(2);
  });

  it('computes DAU, WAU, and MAU relative to rangeEnd', () => {
    expect(summary.dau).toBe(2); // p1, p2 active on 07-30
    expect(summary.wau).toBe(2); // p1, p2 active within the 7-day range
    expect(summary.mau).toBe(3); // p1, p2, p4 active within 30 days of rangeEnd
  });

  it('computes week-over-week retention', () => {
    // last week (07-17..07-24): {p1}. this week (07-24..07-31): {p1, p2}. p1 retained -> 100%.
    expect(summary.retentionWoW).toBe(100);
  });

  it('builds a daily growth series covering the full range', () => {
    expect(summary.growthSeries).toHaveLength(7);
    const day25 = summary.growthSeries.find((row) => row.date === '2026-07-25');
    expect(day25).toEqual({ date: '2026-07-25', newUsers: 1, activeUsers: 1 });
    const day30 = summary.growthSeries.find((row) => row.date === '2026-07-30');
    expect(day30).toEqual({ date: '2026-07-30', newUsers: 0, activeUsers: 2 });
  });

  it('builds a daily per-feature page-view series', () => {
    const day30 = summary.featureSeries.find((row) => row.date === '2026-07-30');
    expect(day30).toEqual({ date: '2026-07-30', keuangan: 1, stok: 1, kalender: 0, ai_chat: 0 });
  });

  it('builds a feature breakdown with page-view change vs the previous period', () => {
    const keuangan = summary.featureBreakdown.find((row) => row.feature === 'keuangan');
    expect(keuangan).toEqual({
      feature: 'keuangan',
      pageViews: 3,
      uniqueUsers: 2,
      keyActions: 1,
      pageViewChangePct: 200, // 3 vs 1 previous page view
    });

    const stok = summary.featureBreakdown.find((row) => row.feature === 'stok');
    expect(stok).toEqual({
      feature: 'stok',
      pageViews: 1,
      uniqueUsers: 1,
      keyActions: 0,
      pageViewChangePct: null, // no previous-period page views to compare against
    });

    const kalender = summary.featureBreakdown.find((row) => row.feature === 'kalender');
    expect(kalender).toEqual({
      feature: 'kalender',
      pageViews: 0,
      uniqueUsers: 0,
      keyActions: 0,
      pageViewChangePct: null,
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/analytics/aggregate.test.ts`
Expected: FAIL with "Cannot find module '@/lib/analytics/aggregate'"

- [ ] **Step 4: Write the implementation**

```typescript
// lib/analytics/aggregate.ts
import { CORE_FEATURES } from './types';
import type { DashboardSummary, DashboardSummaryInput, FeatureBreakdownRow } from './types';

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function enumerateDateKeys(startIso: string, endIso: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${toDateKey(startIso)}T00:00:00.000Z`);
  const end = new Date(`${toDateKey(endIso)}T00:00:00.000Z`);
  while (cursor < end) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export function buildDashboardSummary(input: DashboardSummaryInput): DashboardSummary {
  const { profiles, events, rangeStart, rangeEnd, previousRangeStart } = input;

  const totalUsers = profiles.length;
  const newUsersInRange = profiles.filter((p) => p.createdAt >= rangeStart && p.createdAt < rangeEnd).length;

  const rangeEndMs = new Date(rangeEnd).getTime();
  const dauStart = new Date(rangeEndMs - 1 * 24 * 60 * 60 * 1000).toISOString();
  const wauStart = new Date(rangeEndMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const mauStart = new Date(rangeEndMs - 30 * 24 * 60 * 60 * 1000).toISOString();
  const prevWeekStart = new Date(rangeEndMs - 14 * 24 * 60 * 60 * 1000).toISOString();

  const uniqueUsersInWindow = (windowStart: string, windowEnd: string) => {
    const ids = new Set<string>();
    for (const event of events) {
      if (event.userId && event.createdAt >= windowStart && event.createdAt < windowEnd) {
        ids.add(event.userId);
      }
    }
    return ids;
  };

  const dau = uniqueUsersInWindow(dauStart, rangeEnd).size;
  const wau = uniqueUsersInWindow(wauStart, rangeEnd).size;
  const mau = uniqueUsersInWindow(mauStart, rangeEnd).size;

  const thisWeekUsers = uniqueUsersInWindow(wauStart, rangeEnd);
  const lastWeekUsers = uniqueUsersInWindow(prevWeekStart, wauStart);
  let retainedCount = 0;
  lastWeekUsers.forEach((id) => {
    if (thisWeekUsers.has(id)) retainedCount += 1;
  });
  const retentionWoW = lastWeekUsers.size === 0 ? 0 : Math.round((retainedCount / lastWeekUsers.size) * 100);

  const dateKeys = enumerateDateKeys(rangeStart, rangeEnd);

  const growthSeries = dateKeys.map((date) => {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const newUsers = profiles.filter((p) => p.createdAt >= dayStart && p.createdAt < dayEnd).length;
    const activeUsers = uniqueUsersInWindow(dayStart, dayEnd).size;
    return { date, newUsers, activeUsers };
  });

  const featureSeries = dateKeys.map((date) => {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const row = { date, keuangan: 0, stok: 0, kalender: 0, ai_chat: 0 };
    for (const event of events) {
      if (event.eventType === 'page_view' && event.createdAt >= dayStart && event.createdAt < dayEnd) {
        row[event.feature] += 1;
      }
    }
    return row;
  });

  const featureBreakdown: FeatureBreakdownRow[] = CORE_FEATURES.map((feature) => {
    const inRange = events.filter((e) => e.feature === feature && e.createdAt >= rangeStart && e.createdAt < rangeEnd);
    const inPreviousRange = events.filter(
      (e) => e.feature === feature && e.createdAt >= previousRangeStart && e.createdAt < rangeStart,
    );

    const pageViews = inRange.filter((e) => e.eventType === 'page_view').length;
    const previousPageViews = inPreviousRange.filter((e) => e.eventType === 'page_view').length;
    const keyActions = inRange.filter((e) => e.eventType === 'action').length;
    const uniqueUsers = new Set(inRange.filter((e) => e.userId).map((e) => e.userId as string)).size;

    const pageViewChangePct = previousPageViews === 0
      ? null
      : Math.round(((pageViews - previousPageViews) / previousPageViews) * 100);

    return { feature, pageViews, uniqueUsers, keyActions, pageViewChangePct };
  });

  return { totalUsers, newUsersInRange, dau, wau, mau, retentionWoW, growthSeries, featureSeries, featureBreakdown };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/analytics/aggregate.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/analytics/types.ts lib/analytics/aggregate.ts tests/lib/analytics/aggregate.test.ts
git commit -m "feat: tambah buildDashboardSummary untuk agregasi metrik usage"
```

---

## Task 5: Dashboard summary API route

**Files:**
- Create: `lib/server/dashboardSummary.ts`
- Create: `app/api/dashboard/summary/route.ts`
- Test: `tests/api/dashboardSummaryRoute.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/dashboardSummaryRoute.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const resolveRequestAdmin = vi.fn();
const from = vi.fn();
const getSupabaseAdmin = vi.fn(() => ({ from }));
const buildDashboardSummary = vi.fn();

vi.mock('@/lib/auth/requestAdmin', () => ({
  resolveRequestAdmin: (request: Request) => resolveRequestAdmin(request),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

vi.mock('@/lib/analytics/aggregate', () => ({
  buildDashboardSummary: (input: unknown) => buildDashboardSummary(input),
}));

describe('dashboard summary route', () => {
  beforeEach(() => {
    resolveRequestAdmin.mockReset();
    from.mockReset();
    getSupabaseAdmin.mockClear();
    buildDashboardSummary.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    resolveRequestAdmin.mockResolvedValue({ status: 'unauthenticated' });
    const { GET } = await import('@/app/api/dashboard/summary/route');

    const response = await GET(new Request('http://localhost/api/dashboard/summary'));

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated but not an admin', async () => {
    resolveRequestAdmin.mockResolvedValue({ status: 'forbidden', userId: 'user-1' });
    const { GET } = await import('@/app/api/dashboard/summary/route');

    const response = await GET(new Request('http://localhost/api/dashboard/summary', {
      headers: { authorization: 'Bearer token' },
    }));

    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it('fetches profiles and events, aggregates them, and returns 200 for an admin', async () => {
    resolveRequestAdmin.mockResolvedValue({ status: 'ok', userId: 'admin-1' });

    const profileRows = [{ id: 'p1', created_at: '2026-07-10T00:00:00.000Z' }];
    const eventRows = [
      { user_id: 'p1', feature: 'keuangan', event_type: 'page_view', created_at: '2026-07-25T00:00:00.000Z' },
    ];

    const profilesSelect = vi.fn().mockResolvedValue({ data: profileRows, error: null });
    const eventsGte = vi.fn(() => ({ lt: vi.fn().mockResolvedValue({ data: eventRows, error: null }) }));
    const eventsSelect = vi.fn(() => ({ gte: eventsGte }));

    from.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: profilesSelect };
      if (table === 'usage_events') return { select: eventsSelect };
      throw new Error(`unexpected table ${table}`);
    });

    buildDashboardSummary.mockReturnValue({ totalUsers: 1 });

    const { GET } = await import('@/app/api/dashboard/summary/route');
    const response = await GET(new Request('http://localhost/api/dashboard/summary?range=30d', {
      headers: { authorization: 'Bearer token' },
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, data: { totalUsers: 1 } });
    expect(buildDashboardSummary).toHaveBeenCalledWith(expect.objectContaining({
      profiles: [{ id: 'p1', createdAt: '2026-07-10T00:00:00.000Z' }],
      events: [{ userId: 'p1', feature: 'keuangan', eventType: 'page_view', createdAt: '2026-07-25T00:00:00.000Z' }],
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/dashboardSummaryRoute.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/dashboard/summary/route'"

- [ ] **Step 3: Write the server handler**

```typescript
// lib/server/dashboardSummary.ts
import { NextResponse } from 'next/server';
import { resolveRequestAdmin } from '@/lib/auth/requestAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { buildDashboardSummary } from '@/lib/analytics/aggregate';
import type { AnalyticsFeature } from '@/lib/analytics/types';

const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init?.headers },
  });
}

export async function handleDashboardSummaryGet(request: Request) {
  try {
    const admin = await resolveRequestAdmin(request);
    if (admin.status === 'unauthenticated') {
      return jsonNoStore({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (admin.status === 'forbidden') {
      return jsonNoStore({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const rangeParam = url.searchParams.get('range') ?? '30d';
    const rangeDays = RANGE_DAYS[rangeParam] ?? RANGE_DAYS['30d'];

    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - rangeDays * MS_PER_DAY);
    const previousRangeStart = new Date(rangeStart.getTime() - rangeDays * MS_PER_DAY);
    const fetchStart = new Date(Math.min(previousRangeStart.getTime(), rangeEnd.getTime() - 30 * MS_PER_DAY));

    const supabase = getSupabaseAdmin();

    const [profilesResult, eventsResult] = await Promise.all([
      supabase.from('profiles').select('id, created_at'),
      supabase
        .from('usage_events')
        .select('user_id, feature, event_type, created_at')
        .gte('created_at', fetchStart.toISOString())
        .lt('created_at', rangeEnd.toISOString()),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const summary = buildDashboardSummary({
      profiles: (profilesResult.data ?? []).map((row) => ({ id: row.id as string, createdAt: row.created_at as string })),
      events: (eventsResult.data ?? []).map((row) => ({
        userId: row.user_id as string | null,
        feature: row.feature as AnalyticsFeature,
        eventType: row.event_type as 'page_view' | 'action',
        createdAt: row.created_at as string,
      })),
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      previousRangeStart: previousRangeStart.toISOString(),
    });

    return jsonNoStore({ success: true, data: summary });
  } catch (error) {
    console.error('[API Dashboard Summary] GET Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal memuat ringkasan dashboard' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write the route file**

```typescript
// app/api/dashboard/summary/route.ts
import { handleDashboardSummaryGet } from '@/lib/server/dashboardSummary';

export const dynamic = 'force-dynamic';

export const GET = handleDashboardSummaryGet;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/api/dashboardSummaryRoute.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/server/dashboardSummary.ts app/api/dashboard/summary/route.ts tests/api/dashboardSummaryRoute.test.ts
git commit -m "feat: tambah endpoint GET /api/dashboard/summary dengan gate admin"
```

---

## Task 6: Login page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Write the login page**

```tsx
// app/login/page.tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError('Email atau password salah.');
      return;
    }
    router.push('/dashboard');
  };

  return (
    <Box sx={{ maxWidth: 360, mx: 'auto', mt: 10, p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Login Admin Arina Agri Analytics</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          sx={{ mb: 2 }}
        />
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Button type="submit" variant="contained" fullWidth disabled={loading}>
          {loading ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>
    </Box>
  );
}
```

There is no admin signup flow in this app by design — per the approved spec, the admin account is created manually (Supabase Auth + a manual `profiles.is_admin = true` update), not through this UI.

- [ ] **Step 2: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: tambah halaman login admin"
```

---

## Task 7: Dashboard page

**Files:**
- Create: `controllers/useDashboardController.ts`
- Create: `components/KpiCard.tsx`
- Create: `components/GrowthTrendChart.tsx`
- Create: `components/FeatureTrendChart.tsx`
- Create: `components/FeatureBreakdownTable.tsx`
- Create: `components/DateRangeFilter.tsx`
- Create: `app/dashboard/page.tsx`

This app follows the same Controller/View split used in `arina-agri`: the controller owns state and data fetching, the page composes presentational components.

- [ ] **Step 1: Write the controller**

```typescript
// controllers/useDashboardController.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { DashboardSummary } from '@/lib/analytics/types';

export type DashboardRange = '7d' | '30d' | '90d';

type DashboardState =
  | { status: 'loading' }
  | { status: 'access-denied' }
  | { status: 'error'; message: string }
  | { status: 'ready'; summary: DashboardSummary };

export function useDashboardController() {
  const router = useRouter();
  const [range, setRange] = useState<DashboardRange>('30d');
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  const load = useCallback(async (selectedRange: DashboardRange) => {
    setState({ status: 'loading' });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.replace('/login');
      return;
    }

    const response = await fetch(`/api/dashboard/summary?range=${selectedRange}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    });

    if (response.status === 401) {
      router.replace('/login');
      return;
    }
    if (response.status === 403) {
      setState({ status: 'access-denied' });
      return;
    }
    if (!response.ok) {
      setState({ status: 'error', message: 'Gagal memuat data dashboard.' });
      return;
    }

    const json = await response.json();
    setState({ status: 'ready', summary: json.data as DashboardSummary });
  }, [router]);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  return { range, setRange, state };
}
```

- [ ] **Step 2: Write `components/KpiCard.tsx`**

```tsx
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card sx={{ minWidth: 160 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5">{value}</Typography>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Write `components/GrowthTrendChart.tsx`**

```tsx
import { LineChart } from '@mui/x-charts/LineChart';
import type { DashboardSummary } from '@/lib/analytics/types';

export function GrowthTrendChart({ series }: { series: DashboardSummary['growthSeries'] }) {
  return (
    <LineChart
      height={300}
      xAxis={[{ scaleType: 'point', data: series.map((row) => row.date) }]}
      series={[
        { data: series.map((row) => row.newUsers), label: 'User Baru' },
        { data: series.map((row) => row.activeUsers), label: 'User Aktif' },
      ]}
    />
  );
}
```

- [ ] **Step 4: Write `components/FeatureTrendChart.tsx`**

```tsx
import { LineChart } from '@mui/x-charts/LineChart';
import type { AnalyticsFeature, DashboardSummary } from '@/lib/analytics/types';

const FEATURE_LABELS: Record<AnalyticsFeature, string> = {
  keuangan: 'Keuangan',
  stok: 'Stok',
  kalender: 'Kalender',
  ai_chat: 'AI Chat',
};

const FEATURES = Object.keys(FEATURE_LABELS) as AnalyticsFeature[];

export function FeatureTrendChart({ series }: { series: DashboardSummary['featureSeries'] }) {
  return (
    <LineChart
      height={300}
      xAxis={[{ scaleType: 'point', data: series.map((row) => row.date) }]}
      series={FEATURES.map((feature) => ({
        data: series.map((row) => row[feature]),
        label: FEATURE_LABELS[feature],
      }))}
    />
  );
}
```

- [ ] **Step 5: Write `components/FeatureBreakdownTable.tsx`**

```tsx
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { AnalyticsFeature, DashboardSummary } from '@/lib/analytics/types';

const FEATURE_LABELS: Record<AnalyticsFeature, string> = {
  keuangan: 'Keuangan',
  stok: 'Stok',
  kalender: 'Kalender',
  ai_chat: 'AI Chat',
};

export function FeatureBreakdownTable({ rows }: { rows: DashboardSummary['featureBreakdown'] }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Fitur</TableCell>
          <TableCell align="right">Page Views</TableCell>
          <TableCell align="right">Unique Users</TableCell>
          <TableCell align="right">Aksi Kunci</TableCell>
          <TableCell align="right">Perubahan</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.feature}>
            <TableCell>{FEATURE_LABELS[row.feature]}</TableCell>
            <TableCell align="right">{row.pageViews}</TableCell>
            <TableCell align="right">{row.uniqueUsers}</TableCell>
            <TableCell align="right">{row.keyActions}</TableCell>
            <TableCell align="right">
              {row.pageViewChangePct === null ? '-' : `${row.pageViewChangePct > 0 ? '+' : ''}${row.pageViewChangePct}%`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 6: Write `components/DateRangeFilter.tsx`**

```tsx
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { DashboardRange } from '@/controllers/useDashboardController';

export function DateRangeFilter({ value, onChange }: { value: DashboardRange; onChange: (range: DashboardRange) => void }) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_event, next: DashboardRange | null) => {
        if (next) onChange(next);
      }}
    >
      <ToggleButton value="7d">7 Hari</ToggleButton>
      <ToggleButton value="30d">30 Hari</ToggleButton>
      <ToggleButton value="90d">90 Hari</ToggleButton>
    </ToggleButtonGroup>
  );
}
```

- [ ] **Step 7: Write `app/dashboard/page.tsx`**

```tsx
'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useDashboardController } from '@/controllers/useDashboardController';
import { KpiCard } from '@/components/KpiCard';
import { GrowthTrendChart } from '@/components/GrowthTrendChart';
import { FeatureTrendChart } from '@/components/FeatureTrendChart';
import { FeatureBreakdownTable } from '@/components/FeatureBreakdownTable';
import { DateRangeFilter } from '@/components/DateRangeFilter';

export default function DashboardPage() {
  const { range, setRange, state } = useDashboardController();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Usage Analytics</Typography>
        <DateRangeFilter value={range} onChange={setRange} />
      </Box>

      {state.status === 'loading' && <CircularProgress />}
      {state.status === 'access-denied' && (
        <Alert severity="error">Akun ini tidak memiliki akses admin ke dashboard analytics.</Alert>
      )}
      {state.status === 'error' && <Alert severity="error">{state.message}</Alert>}

      {state.status === 'ready' && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><KpiCard label="Total User" value={state.summary.totalUsers} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><KpiCard label="User Baru" value={state.summary.newUsersInRange} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><KpiCard label="DAU" value={state.summary.dau} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><KpiCard label="WAU" value={state.summary.wau} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><KpiCard label="MAU" value={state.summary.mau} /></Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}><KpiCard label="Retensi WoW" value={`${state.summary.retentionWoW}%`} /></Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 1 }}>Tren Growth</Typography>
          <GrowthTrendChart series={state.summary.growthSeries} />

          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Tren Pemakaian Fitur</Typography>
          <FeatureTrendChart series={state.summary.featureSeries} />

          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Breakdown per Fitur</Typography>
          <FeatureBreakdownTable rows={state.summary.featureBreakdown} />
        </>
      )}
    </Box>
  );
}
```

`Grid size={{ xs, sm, md }}` is the MUI v9 Grid API (not the older `item xs=` API) — this matches how `Grid` is already used throughout `arina-agri` (e.g. `components/dashboard/DashboardKPI.tsx`).

- [ ] **Step 8: Run the full test suite and build to confirm nothing is broken**

```bash
npx vitest run
npx tsc --noEmit
npx next build
```

Expected: tests PASS, typecheck clean, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add controllers/useDashboardController.ts components/KpiCard.tsx components/GrowthTrendChart.tsx components/FeatureTrendChart.tsx components/FeatureBreakdownTable.tsx components/DateRangeFilter.tsx app/dashboard/page.tsx
git commit -m "feat: tambah halaman dashboard usage analytics"
```

---

## Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (scaffold smoke test, `requestAdmin`, `aggregate`, `dashboardSummaryRoute`)

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test against the real Supabase project**

This requires the `usage_events` migration from `docs/sql/2026-07-30-usage-analytics.sql` (in the `arina-agri` repo) to have been applied to the shared Supabase project, and a dedicated admin account created manually with `profiles.is_admin = true` (per the approved design decision — this app has no self-service admin signup).

1. Copy `.env.local.example` to `.env.local` and fill in the real `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` values from the Supabase project settings (same project as `arina-agri`).
2. Run `npm run dev`.
3. Visit `http://localhost:3000` — confirm it redirects to `/login`.
4. Log in with a non-admin account — confirm the dashboard shows the "tidak memiliki akses admin" alert, not real data.
5. Log in with the dedicated admin account — confirm the dashboard loads KPIs, both charts, and the feature breakdown table, and that switching between 7/30/90-day ranges reloads the data.

- [ ] **Step 5: Commit anything left uncommitted**

```bash
git status
```

If the working tree is clean, there is nothing left to commit — this step is just a final check.
