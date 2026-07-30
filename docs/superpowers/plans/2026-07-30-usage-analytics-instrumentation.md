# Usage Analytics Instrumentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrument the 4 core features (Keuangan, Stok, Kalender, AI Chat) in the `arina-agri` repo so every page view and key action writes a row into a new `usage_events` Supabase table, which a separate analytics dashboard app will later read.

**Architecture:** Page views are tracked client-side via a small `trackPageView()` fetch to a new `/api/analytics/events` route. Key actions are tracked server-side via a `recordEvent()` util called right after each mutation succeeds. Because Keuangan and Stok currently write directly from the browser to Supabase (no server route exists), this plan also introduces two new server routes (`/api/finance/transactions`, `/api/stok/batches`) so their "create" actions become server-side and can call `recordEvent` reliably — matching what Kalender (`/api/calendar/events`) and AI Chat (`/api/ai/gemini`) already do.

**Tech Stack:** Next.js 16 App Router API routes, Supabase (`@supabase/supabase-js`), Vitest for tests.

---

## Reference: spec

This plan implements `docs/superpowers/specs/2026-07-30-usage-analytics-dashboard-design.md`, repo `arina-agri` side only. The separate `arina-agri-analytics` dashboard app is a follow-up plan.

---

## Task 1: Database migration — `usage_events` table and `profiles.is_admin`

**Files:**
- Create: `docs/sql/2026-07-30-usage-analytics.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 2026-07-30-usage-analytics.sql
-- Usage analytics event log + admin allowlist column.

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  feature text not null check (feature in ('keuangan', 'stok', 'kalender', 'ai_chat')),
  event_type text not null check (event_type in ('page_view', 'action')),
  event_name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_feature_created_at_idx
  on usage_events (feature, created_at);

create index if not exists usage_events_user_id_created_at_idx
  on usage_events (user_id, created_at);

create index if not exists usage_events_event_name_created_at_idx
  on usage_events (event_name, created_at);

alter table profiles
  add column if not exists is_admin boolean not null default false;
```

- [ ] **Step 2: Apply the migration**

Run this SQL against the Supabase project via the Supabase Dashboard SQL editor (or `supabase db execute` if the CLI is configured locally). This repo does not run migrations automatically — every other file in `docs/sql/` follows the same manual-apply convention.

- [ ] **Step 3: Commit**

```bash
git add -f docs/sql/2026-07-30-usage-analytics.sql
git commit -m "docs: tambah migration usage_events dan profiles.is_admin"
```

(Use `-f` because `docs/` is gitignored but `docs/sql/*.sql` files are tracked as an exception, same as the existing files in that folder.)

---

## Task 2: Extract `computeStockBatchStatus` into a shared module

This is a small prerequisite refactor: the stock-batch status calculation currently lives as a private function inside `lib/api.ts` (client code). Task 7 needs the same logic from a server route, so it must live somewhere both sides can import.

**Files:**
- Create: `lib/stok/computeStatus.ts`
- Modify: `lib/api.ts` (remove local `computeStatus` function, import the shared one)
- Test: `tests/lib/stok/computeStatus.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/stok/computeStatus.test.ts
import { describe, expect, it } from 'vitest';
import { computeStockBatchStatus } from '@/lib/stok/computeStatus';

describe('computeStockBatchStatus', () => {
  it('returns habis when stokTersisa is 0', () => {
    expect(computeStockBatchStatus(0, 100, '2099-01-01')).toBe('habis');
  });

  it('returns hampir_kadaluarsa when 3 days or fewer remain', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    expect(computeStockBatchStatus(50, 100, soon.toISOString())).toBe('hampir_kadaluarsa');
  });

  it('returns menipis when remaining stock is below 20% of intake', () => {
    const later = new Date();
    later.setDate(later.getDate() + 30);
    expect(computeStockBatchStatus(10, 100, later.toISOString())).toBe('menipis');
  });

  it('returns aman otherwise', () => {
    const later = new Date();
    later.setDate(later.getDate() + 30);
    expect(computeStockBatchStatus(80, 100, later.toISOString())).toBe('aman');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/stok/computeStatus.test.ts`
Expected: FAIL with "Cannot find module '@/lib/stok/computeStatus'"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/stok/computeStatus.ts
export type StockBatchStatus = 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis';

export function computeStockBatchStatus(
  stokTersisa: number,
  beratMasuk: number,
  estimasiKadaluarsa: string,
): StockBatchStatus {
  const now = new Date();
  const kadaluarsa = new Date(estimasiKadaluarsa);
  const daysLeft = Math.ceil((kadaluarsa.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (stokTersisa === 0) return 'habis';
  if (daysLeft <= 3) return 'hampir_kadaluarsa';
  if (stokTersisa < beratMasuk * 0.2) return 'menipis';
  return 'aman';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/stok/computeStatus.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Point `lib/api.ts` at the shared function**

In `lib/api.ts`, find the local `computeStatus` function (around line 447):

```typescript
function computeStatus(stokTersisa: number, beratMasuk: number, estimasiKadaluarsa: string): ApiHarvestBatch['status'] {
  const now = new Date();
  const kadaluarsa = new Date(estimasiKadaluarsa);
  const daysLeft = Math.ceil((kadaluarsa.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (stokTersisa === 0) return 'habis';
  if (daysLeft <= 3) return 'hampir_kadaluarsa';
  if (stokTersisa < beratMasuk * 0.2) return 'menipis';
  return 'aman';
}
```

Delete this function body and add an import at the top of `lib/api.ts`:

```typescript
import { computeStockBatchStatus as computeStatus } from '@/lib/stok/computeStatus';
```

Every existing call site (`computeStatus(...)`) keeps working unchanged because of the import alias.

- [ ] **Step 6: Run the full finance/stok test suite to confirm nothing broke**

Run: `npx vitest run tests/lib tests/hooks tests/finance`
Expected: PASS, same results as before this change

- [ ] **Step 7: Commit**

```bash
git add lib/stok/computeStatus.ts lib/api.ts tests/lib/stok/computeStatus.test.ts
git commit -m "refactor: ekstrak computeStockBatchStatus ke modul bersama"
```

---

## Task 3: `recordEvent` server util

**Files:**
- Create: `lib/analytics/recordEvent.ts`
- Test: `tests/lib/analytics/recordEvent.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/analytics/recordEvent.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const getSupabaseAdmin = vi.fn(() => ({ from }));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

describe('recordEvent', () => {
  beforeEach(() => {
    insert.mockReset();
    from.mockClear();
    getSupabaseAdmin.mockClear();
  });

  it('inserts a row with the given fields', async () => {
    insert.mockResolvedValue({ error: null });
    const { recordEvent } = await import('@/lib/analytics/recordEvent');

    await recordEvent({
      userId: 'user-1',
      feature: 'keuangan',
      eventType: 'action',
      eventName: 'transaction_created',
    });

    expect(from).toHaveBeenCalledWith('usage_events');
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      feature: 'keuangan',
      event_type: 'action',
      event_name: 'transaction_created',
      metadata: null,
    });
  });

  it('does not throw when the insert returns an error', async () => {
    insert.mockResolvedValue({ error: { message: 'insert failed' } });
    const { recordEvent } = await import('@/lib/analytics/recordEvent');

    await expect(recordEvent({
      userId: 'user-1',
      feature: 'stok',
      eventType: 'action',
      eventName: 'stock_entry_created',
    })).resolves.toBeUndefined();
  });

  it('does not throw when getSupabaseAdmin itself throws', async () => {
    getSupabaseAdmin.mockImplementation(() => {
      throw new Error('missing credentials');
    });
    const { recordEvent } = await import('@/lib/analytics/recordEvent');

    await expect(recordEvent({
      userId: null,
      feature: 'kalender',
      eventType: 'page_view',
      eventName: 'page_view',
    })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/analytics/recordEvent.test.ts`
Expected: FAIL with "Cannot find module '@/lib/analytics/recordEvent'"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/analytics/recordEvent.ts
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export type AnalyticsFeature = 'keuangan' | 'stok' | 'kalender' | 'ai_chat';
export type AnalyticsEventType = 'page_view' | 'action';

export interface RecordEventInput {
  userId: string | null;
  feature: AnalyticsFeature;
  eventType: AnalyticsEventType;
  eventName: string;
  metadata?: Record<string, unknown>;
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('usage_events').insert({
      user_id: input.userId,
      feature: input.feature,
      event_type: input.eventType,
      event_name: input.eventName,
      metadata: input.metadata ?? null,
    });

    if (error) {
      console.error('[recordEvent] Gagal mencatat usage event:', error.message);
    }
  } catch (error) {
    console.error('[recordEvent] Gagal mencatat usage event:', error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/analytics/recordEvent.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/recordEvent.ts tests/lib/analytics/recordEvent.test.ts
git commit -m "feat: tambah recordEvent util untuk mencatat usage event di server"
```

---

## Task 4: `/api/analytics/events` route for page views

**Files:**
- Create: `lib/server/analytics/events.ts`
- Create: `app/api/analytics/events/route.ts`
- Test: `tests/api/analyticsEventsRoute.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/analyticsEventsRoute.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const resolveRequestUserId = vi.fn();
const recordEvent = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/analytics/recordEvent', () => ({
  recordEvent: (input: unknown) => recordEvent(input),
}));

describe('analytics events route', () => {
  beforeEach(() => {
    resolveRequestUserId.mockReset();
    recordEvent.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/analytics/events/route');

    const response = await POST(new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ feature: 'keuangan' }),
    }));

    expect(response.status).toBe(401);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid feature', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const { POST } = await import('@/app/api/analytics/events/route');

    const response = await POST(new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ feature: 'not-a-feature' }),
    }));

    expect(response.status).toBe(400);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('records a page_view event and returns 204', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    recordEvent.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/analytics/events/route');

    const response = await POST(new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ feature: 'stok' }),
    }));

    expect(response.status).toBe(204);
    expect(recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'stok',
      eventType: 'page_view',
      eventName: 'page_view',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/analyticsEventsRoute.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/analytics/events/route'"

- [ ] **Step 3: Write the server handler**

```typescript
// lib/server/analytics/events.ts
import { NextResponse } from 'next/server';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { recordEvent, type AnalyticsFeature } from '@/lib/analytics/recordEvent';

const FEATURES: AnalyticsFeature[] = ['keuangan', 'stok', 'kalender', 'ai_chat'];

interface PageViewPayload {
  feature?: unknown;
}

function isAnalyticsFeature(value: unknown): value is AnalyticsFeature {
  return typeof value === 'string' && FEATURES.includes(value as AnalyticsFeature);
}

export async function handleAnalyticsEventCreate(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PageViewPayload;
    if (!isAnalyticsFeature(body.feature)) {
      return NextResponse.json({ success: false, message: 'Feature tidak valid' }, { status: 400 });
    }

    await recordEvent({
      userId,
      feature: body.feature,
      eventType: 'page_view',
      eventName: 'page_view',
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[API Analytics Events] POST Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mencatat event' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write the route file**

```typescript
// app/api/analytics/events/route.ts
import { handleAnalyticsEventCreate } from '@/lib/server/analytics/events';

export const dynamic = 'force-dynamic';

export const POST = handleAnalyticsEventCreate;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/api/analyticsEventsRoute.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/server/analytics/events.ts app/api/analytics/events/route.ts tests/api/analyticsEventsRoute.test.ts
git commit -m "feat: tambah endpoint POST /api/analytics/events untuk page view"
```

---

## Task 5: `trackPageView` client util

**Files:**
- Create: `lib/analytics/trackPageView.ts`
- Test: `tests/lib/analytics/trackPageView.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/analytics/trackPageView.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

vi.mock('@/lib/devAuth', () => ({
  readLocalDevelopmentUserId: () => null,
  buildDevelopmentAccessToken: (id: string) => `dev-token-${id}`,
}));

describe('trackPageView', () => {
  beforeEach(() => {
    getSession.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('does nothing when there is no session or dev user', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { trackPageView } = await import('@/lib/analytics/trackPageView');

    await trackPageView('keuangan');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts the feature with a bearer token when a session exists', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    const { trackPageView } = await import('@/lib/analytics/trackPageView');

    await trackPageView('stok');

    expect(fetch).toHaveBeenCalledWith('/api/analytics/events', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }),
      body: JSON.stringify({ feature: 'stok' }),
    }));
  });

  it('does not throw when fetch rejects', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { trackPageView } = await import('@/lib/analytics/trackPageView');

    await expect(trackPageView('kalender')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/analytics/trackPageView.test.ts`
Expected: FAIL with "Cannot find module '@/lib/analytics/trackPageView'"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/analytics/trackPageView.ts
'use client';

import { supabase } from '@/lib/supabase';
import { buildDevelopmentAccessToken, readLocalDevelopmentUserId } from '@/lib/devAuth';
import type { AnalyticsFeature } from './recordEvent';

async function buildAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }

  const localUserId = readLocalDevelopmentUserId();
  if (localUserId) {
    return { Authorization: `Bearer ${buildDevelopmentAccessToken(localUserId)}` };
  }

  return {};
}

export async function trackPageView(feature: AnalyticsFeature): Promise<void> {
  try {
    const authHeader = await buildAuthHeader();
    if (!authHeader.Authorization) return;

    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[trackPageView] Gagal mencatat page view:', error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/analytics/trackPageView.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/trackPageView.ts tests/lib/analytics/trackPageView.test.ts
git commit -m "feat: tambah trackPageView util untuk mencatat page view dari client"
```

---

## Task 6: Server route for finance transaction creation

**Files:**
- Create: `lib/server/finance/transactions.ts`
- Create: `app/api/finance/transactions/route.ts`
- Modify: `lib/api.ts:559-584` (`transactionApi.create`)
- Test: `tests/api/financeTransactionsRoute.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/financeTransactionsRoute.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const from = vi.fn();
const resolveRequestUserId = vi.fn();
const recordEvent = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

vi.mock('@/lib/analytics/recordEvent', () => ({
  recordEvent: (input: unknown) => recordEvent(input),
}));

const transactionRow = {
  id: 'tx-1',
  jenis: 'pengeluaran',
  kategori: 'Pupuk',
  nominal: 150000,
  tanggal: '2026-07-30',
  keterangan: 'Beli pupuk',
  project_id: null,
  rab_category_id: null,
  rab_item_id: null,
  volume: null,
  satuan: null,
  harga_satuan: null,
  created_at: '2026-07-30T00:00:00.000Z',
  updated_at: '2026-07-30T00:00:00.000Z',
};

describe('finance transactions route', () => {
  beforeEach(() => {
    from.mockReset();
    resolveRequestUserId.mockReset();
    recordEvent.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/finance/transactions/route');

    const response = await POST(new Request('http://localhost/api/finance/transactions', {
      method: 'POST',
      body: JSON.stringify({ jenis: 'pengeluaran', kategori: 'Pupuk', nominal: 1000, tanggal: '2026-07-30' }),
    }));

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('creates a transaction and records a usage event', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const single = vi.fn().mockResolvedValue({ data: transactionRow, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    from.mockReturnValue({ insert });
    const { POST } = await import('@/app/api/finance/transactions/route');

    const response = await POST(new Request('http://localhost/api/finance/transactions', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({
        jenis: 'pengeluaran',
        kategori: 'Pupuk',
        nominal: 150000,
        tanggal: '2026-07-30',
        keterangan: 'Beli pupuk',
      }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      jenis: 'pengeluaran',
      kategori: 'Pupuk',
      nominal: 150000,
    }));
    expect(json.data).toMatchObject({ _id: 'tx-1', jenis: 'pengeluaran', nominal: 150000 });
    expect(recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'keuangan',
      eventType: 'action',
      eventName: 'transaction_created',
    });
  });

  it('returns 400 for an invalid payload', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const { POST } = await import('@/app/api/finance/transactions/route');

    const response = await POST(new Request('http://localhost/api/finance/transactions', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ jenis: 'bukan-jenis-valid' }),
    }));

    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/financeTransactionsRoute.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/finance/transactions/route'"

- [ ] **Step 3: Write the server handler**

```typescript
// lib/server/finance/transactions.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { recordEvent } from '@/lib/analytics/recordEvent';
import type { ApiTransaction } from '@/lib/api';

interface DbTransactionRow {
  id: string;
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string | null;
  project_id: string | null;
  rab_category_id: string | null;
  rab_item_id: string | null;
  volume: number | null;
  satuan: string | null;
  harga_satuan: number | null;
  created_at: string;
  updated_at: string;
}

interface CreateTransactionPayload {
  jenis?: unknown;
  kategori?: unknown;
  nominal?: unknown;
  tanggal?: unknown;
  keterangan?: unknown;
  projectId?: unknown;
  rabCategoryId?: unknown;
  rabItemId?: unknown;
  volume?: unknown;
  satuan?: unknown;
  hargaSatuan?: unknown;
}

function mapTransactionRow(row: DbTransactionRow): ApiTransaction {
  return {
    _id: row.id,
    jenis: row.jenis,
    kategori: row.kategori,
    nominal: row.nominal,
    tanggal: row.tanggal,
    keterangan: row.keterangan ?? '',
    projectId: row.project_id,
    rabCategoryId: row.rab_category_id,
    rabItemId: row.rab_item_id,
    volume: row.volume,
    satuan: row.satuan,
    hargaSatuan: row.harga_satuan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init?.headers },
  });
}

function parseCreatePayload(body: CreateTransactionPayload) {
  if (
    (body.jenis !== 'pengeluaran' && body.jenis !== 'pendapatan') ||
    typeof body.kategori !== 'string' || !body.kategori.trim() ||
    typeof body.nominal !== 'number' ||
    typeof body.tanggal !== 'string' || !body.tanggal.trim()
  ) {
    return null;
  }

  const insertPayload: Record<string, unknown> = {
    jenis: body.jenis,
    kategori: body.kategori.trim(),
    nominal: body.nominal,
    tanggal: body.tanggal.trim(),
    keterangan: typeof body.keterangan === 'string' ? body.keterangan : '',
  };
  if (typeof body.projectId === 'string') insertPayload.project_id = body.projectId;
  if (typeof body.rabCategoryId === 'string') insertPayload.rab_category_id = body.rabCategoryId;
  if (typeof body.rabItemId === 'string') insertPayload.rab_item_id = body.rabItemId;
  if (typeof body.volume === 'number') insertPayload.volume = body.volume;
  if (typeof body.satuan === 'string') insertPayload.satuan = body.satuan;
  if (typeof body.hargaSatuan === 'number') insertPayload.harga_satuan = body.hargaSatuan;

  return insertPayload;
}

export async function handleFinanceTransactionCreate(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return jsonNoStore({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = parseCreatePayload(await request.json());
    if (!payload) {
      return jsonNoStore({ success: false, message: 'Payload transaksi tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('transactions')
      .insert({ user_id: userId, ...payload })
      .select()
      .single();

    if (error) throw error;

    await recordEvent({
      userId,
      feature: 'keuangan',
      eventType: 'action',
      eventName: 'transaction_created',
    });

    return jsonNoStore({ success: true, data: mapTransactionRow(data as DbTransactionRow) });
  } catch (error) {
    console.error('[API Finance Transactions] POST Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal menyimpan transaksi' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write the route file**

```typescript
// app/api/finance/transactions/route.ts
import { handleFinanceTransactionCreate } from '@/lib/server/finance/transactions';

export const dynamic = 'force-dynamic';

export const POST = handleFinanceTransactionCreate;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/api/financeTransactionsRoute.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Point the client at the new route**

In `lib/api.ts`, replace the body of `transactionApi.create` (around line 559):

```typescript
  create: async (payload: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiTransaction> => {
    return authenticatedJsonRequest<ApiTransaction>('/api/finance/transactions', {
      method: 'POST',
      body: payload,
    });
  },
```

This removes the old direct `supabase.from('transactions').insert(...)` call and the `resolveCurrentUser()` check from this method — both are now handled server-side. `authenticatedJsonRequest` already exists in this file (used elsewhere) and attaches the bearer token automatically.

- [ ] **Step 7: Run the existing finance hook/controller tests to confirm nothing broke**

Run: `npx vitest run tests/hooks tests/finance tests/controllers`
Expected: PASS, same results as before this change

- [ ] **Step 8: Commit**

```bash
git add lib/server/finance/transactions.ts app/api/finance/transactions/route.ts lib/api.ts tests/api/financeTransactionsRoute.test.ts
git commit -m "feat: pindahkan pembuatan transaksi keuangan ke server route dan catat usage event"
```

---

## Task 7: Server route for stok batch creation

**Files:**
- Create: `lib/server/stok/batches.ts`
- Create: `app/api/stok/batches/route.ts`
- Modify: `lib/api.ts:936-979` (`stokApi.create`)
- Test: `tests/api/stokBatchesRoute.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/stokBatchesRoute.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const from = vi.fn();
const resolveRequestUserId = vi.fn();
const recordEvent = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

vi.mock('@/lib/analytics/recordEvent', () => ({
  recordEvent: (input: unknown) => recordEvent(input),
}));

const batchRow = {
  id: 'batch-1',
  batch_code: 'BATCH-001-A',
  tanggal_panen: '2026-07-30',
  grade: 'A',
  berat_masuk: 100,
  stok_tersisa: 100,
  harga_modal: 10000,
  harga_jual: 20000,
  lokasi_penyimpanan: 'Gudang Utama',
  estimasi_kadaluarsa: '2026-08-13',
  catatan: '',
  status: 'aman',
  created_at: '2026-07-30T00:00:00.000Z',
  updated_at: '2026-07-30T00:00:00.000Z',
};

function validPayload() {
  return {
    tanggalPanen: '2026-07-30',
    grade: 'A',
    beratMasuk: 100,
    hargaModal: 10000,
    hargaJual: 20000,
    lokasiPenyimpanan: 'Gudang Utama',
    estimasiKadaluarsa: '2026-08-13',
  };
}

describe('stok batches route', () => {
  beforeEach(() => {
    from.mockReset();
    resolveRequestUserId.mockReset();
    recordEvent.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/stok/batches/route');

    const response = await POST(new Request('http://localhost/api/stok/batches', {
      method: 'POST',
      body: JSON.stringify(validPayload()),
    }));

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('creates a batch, logs the initial mutation, and records a usage event', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');

    const countSelect = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ count: 0 }) }));

    const batchSingle = vi.fn().mockResolvedValue({ data: batchRow, error: null });
    const batchSelect = vi.fn(() => ({ single: batchSingle }));
    const batchInsert = vi.fn(() => ({ select: batchSelect }));

    const mutationInsert = vi.fn().mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === 'harvest_batches') {
        return { select: countSelect, insert: batchInsert };
      }
      if (table === 'stock_mutations') {
        return { insert: mutationInsert };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { POST } = await import('@/app/api/stok/batches/route');
    const response = await POST(new Request('http://localhost/api/stok/batches', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify(validPayload()),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(batchInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      batch_code: 'BATCH-001-A',
      status: 'aman',
    }));
    expect(mutationInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      batch_id: 'batch-1',
      tipe: 'masuk',
    }));
    expect(json.data).toMatchObject({ _id: 'batch-1', batchCode: 'BATCH-001-A' });
    expect(recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'stok',
      eventType: 'action',
      eventName: 'stock_entry_created',
    });
  });

  it('returns 400 for an invalid payload', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const { POST } = await import('@/app/api/stok/batches/route');

    const response = await POST(new Request('http://localhost/api/stok/batches', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ grade: 'A' }),
    }));

    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/stokBatchesRoute.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/stok/batches/route'"

- [ ] **Step 3: Write the server handler**

```typescript
// lib/server/stok/batches.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { recordEvent } from '@/lib/analytics/recordEvent';
import { computeStockBatchStatus } from '@/lib/stok/computeStatus';
import type { ApiHarvestBatch } from '@/lib/api';

interface DbHarvestBatchRow {
  id: string;
  batch_code: string;
  tanggal_panen: string;
  grade: string;
  berat_masuk: number;
  stok_tersisa: number;
  harga_modal: number;
  harga_jual: number;
  lokasi_penyimpanan: string;
  estimasi_kadaluarsa: string;
  catatan: string | null;
  status: ApiHarvestBatch['status'];
  created_at: string;
  updated_at: string;
}

interface CreateBatchPayload {
  tanggalPanen?: unknown;
  grade?: unknown;
  beratMasuk?: unknown;
  hargaModal?: unknown;
  hargaJual?: unknown;
  lokasiPenyimpanan?: unknown;
  estimasiKadaluarsa?: unknown;
  catatan?: unknown;
}

function mapBatchRow(row: DbHarvestBatchRow): ApiHarvestBatch {
  return {
    _id: row.id,
    batchCode: row.batch_code,
    tanggalPanen: row.tanggal_panen,
    grade: row.grade,
    beratMasuk: row.berat_masuk,
    stokTersisa: row.stok_tersisa,
    hargaModal: row.harga_modal,
    hargaJual: row.harga_jual,
    lokasiPenyimpanan: row.lokasi_penyimpanan,
    estimasiKadaluarsa: row.estimasi_kadaluarsa,
    catatan: row.catatan ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init?.headers },
  });
}

function parseCreatePayload(body: CreateBatchPayload) {
  if (
    typeof body.tanggalPanen !== 'string' || !body.tanggalPanen.trim() ||
    typeof body.grade !== 'string' || !body.grade.trim() ||
    typeof body.beratMasuk !== 'number' || body.beratMasuk <= 0 ||
    typeof body.hargaModal !== 'number' ||
    typeof body.hargaJual !== 'number' ||
    typeof body.lokasiPenyimpanan !== 'string' || !body.lokasiPenyimpanan.trim() ||
    typeof body.estimasiKadaluarsa !== 'string' || !body.estimasiKadaluarsa.trim()
  ) {
    return null;
  }

  return {
    tanggalPanen: body.tanggalPanen.trim(),
    grade: body.grade.trim(),
    beratMasuk: body.beratMasuk,
    hargaModal: body.hargaModal,
    hargaJual: body.hargaJual,
    lokasiPenyimpanan: body.lokasiPenyimpanan.trim(),
    estimasiKadaluarsa: body.estimasiKadaluarsa.trim(),
    catatan: typeof body.catatan === 'string' ? body.catatan : '',
  };
}

export async function handleStokBatchCreate(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return jsonNoStore({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = parseCreatePayload(await request.json());
    if (!payload) {
      return jsonNoStore({ success: false, message: 'Payload batch tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { count } = await supabase
      .from('harvest_batches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    const batchCode = `BATCH-${String((count ?? 0) + 1).padStart(3, '0')}-${payload.grade}`;
    const status = computeStockBatchStatus(payload.beratMasuk, payload.beratMasuk, payload.estimasiKadaluarsa);

    const { data, error } = await supabase
      .from('harvest_batches')
      .insert({
        user_id: userId,
        batch_code: batchCode,
        tanggal_panen: payload.tanggalPanen,
        grade: payload.grade,
        berat_masuk: payload.beratMasuk,
        stok_tersisa: payload.beratMasuk,
        harga_modal: payload.hargaModal,
        harga_jual: payload.hargaJual,
        lokasi_penyimpanan: payload.lokasiPenyimpanan,
        estimasi_kadaluarsa: payload.estimasiKadaluarsa,
        catatan: payload.catatan,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('stock_mutations').insert({
      user_id: userId,
      batch_id: data.id,
      batch_code: batchCode,
      tipe: 'masuk',
      berat: payload.beratMasuk,
      tanggal: payload.tanggalPanen,
      catatan: 'Stok awal masuk gudang',
    });

    await recordEvent({
      userId,
      feature: 'stok',
      eventType: 'action',
      eventName: 'stock_entry_created',
    });

    return jsonNoStore({ success: true, data: mapBatchRow(data as DbHarvestBatchRow) });
  } catch (error) {
    console.error('[API Stok Batches] POST Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal menyimpan batch stok' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write the route file**

```typescript
// app/api/stok/batches/route.ts
import { handleStokBatchCreate } from '@/lib/server/stok/batches';

export const dynamic = 'force-dynamic';

export const POST = handleStokBatchCreate;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/api/stokBatchesRoute.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Point the client at the new route**

In `lib/api.ts`, replace the body of `stokApi.create` (around line 936):

```typescript
  create: async (payload: Omit<ApiHarvestBatch, '_id' | 'batchCode' | 'stokTersisa' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ApiHarvestBatch> => {
    return authenticatedJsonRequest<ApiHarvestBatch>('/api/stok/batches', {
      method: 'POST',
      body: payload,
    });
  },
```

This removes the old direct Supabase batch-code counting, insert, and stock-mutation insert from the client — all handled server-side now.

- [ ] **Step 7: Run the existing stok hook/controller tests to confirm nothing broke**

Run: `npx vitest run tests/hooks tests/controllers`
Expected: PASS, same results as before this change

- [ ] **Step 8: Commit**

```bash
git add lib/server/stok/batches.ts app/api/stok/batches/route.ts lib/api.ts tests/api/stokBatchesRoute.test.ts
git commit -m "feat: pindahkan pembuatan batch stok ke server route dan catat usage event"
```

---

## Task 8: Instrument Kalender (already server-side)

**Files:**
- Modify: `lib/server/calendar/events.ts:132-159` (`handleCalendarEventsPost`)
- Modify: `tests/api/calendarEventsRoute.test.ts`

- [ ] **Step 1: Extend the existing "creates calendar events" test to assert `recordEvent` is called**

Add this mock near the top of `tests/api/calendarEventsRoute.test.ts` (alongside the existing `vi.mock` calls):

```typescript
const recordEvent = vi.fn();

vi.mock('@/lib/analytics/recordEvent', () => ({
  recordEvent: (input: unknown) => recordEvent(input),
}));
```

Add `recordEvent.mockReset();` to the existing `beforeEach`. Then extend the `'creates calendar events with the resolved request user id'` test with this assertion at the end:

```typescript
    expect(recordEvent).toHaveBeenCalledWith({
      userId: '00000000-0000-4000-8000-000000000001',
      feature: 'kalender',
      eventType: 'action',
      eventName: 'calendar_event_created',
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/calendarEventsRoute.test.ts`
Expected: FAIL — `recordEvent` was not called

- [ ] **Step 3: Call `recordEvent` after a successful insert**

In `lib/server/calendar/events.ts`, add the import at the top:

```typescript
import { recordEvent } from '@/lib/analytics/recordEvent';
```

Then in `handleCalendarEventsPost`, right after `if (error) throw error;` and before the `return jsonNoStore(...)` line:

```typescript
    if (error) throw error;

    await recordEvent({
      userId: auth.userId,
      feature: 'kalender',
      eventType: 'action',
      eventName: 'calendar_event_created',
    });

    return jsonNoStore({ success: true, data: mapEvent(data as CalendarEventRow) });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/calendarEventsRoute.test.ts`
Expected: PASS (all existing tests + the new assertion)

- [ ] **Step 5: Commit**

```bash
git add lib/server/calendar/events.ts tests/api/calendarEventsRoute.test.ts
git commit -m "feat: catat usage event calendar_event_created setelah jadwal dibuat"
```

---

## Task 9: Instrument AI Chat (Gemini route, already server-side)

**Files:**
- Modify: `app/api/ai/gemini/route.ts`
- Test: `tests/api/geminiRoute.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/geminiRoute.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const resolveRequestUserId = vi.fn();
const recordEvent = vi.fn();
const generateGeminiReply = vi.fn();
const from = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/analytics/recordEvent', () => ({
  recordEvent: (input: unknown) => recordEvent(input),
}));

vi.mock('@/lib/server/ai/gemini', () => ({
  generateGeminiReply: (input: unknown) => generateGeminiReply(input),
}));

vi.mock('@/lib/server/ai/validators', () => ({
  validateGeminiPayload: (body: unknown) => {
    const b = body as { prompt?: unknown };
    if (typeof b.prompt !== 'string' || !b.prompt.trim()) {
      return { valid: false, message: 'Prompt wajib diisi' };
    }
    return { valid: true };
  },
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

describe('gemini route', () => {
  beforeEach(() => {
    resolveRequestUserId.mockReset();
    recordEvent.mockReset();
    generateGeminiReply.mockReset();
    from.mockReset();
  });

  it('records a chat_message_sent event with the resolved user id on success', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    generateGeminiReply.mockResolvedValue('Balasan AI');
    const { POST } = await import('@/app/api/ai/gemini/route');

    const response = await POST(new Request('http://localhost/api/ai/gemini', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ prompt: 'Kapan waktu tanam cabai?' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.reply).toBe('Balasan AI');
    expect(recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'ai_chat',
      eventType: 'action',
      eventName: 'chat_message_sent',
    });
  });

  it('still replies successfully for a guest (no resolvable user id)', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    generateGeminiReply.mockResolvedValue('Balasan AI untuk tamu');
    const { POST } = await import('@/app/api/ai/gemini/route');

    const response = await POST(new Request('http://localhost/api/ai/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Halo' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.reply).toBe('Balasan AI untuk tamu');
    expect(recordEvent).toHaveBeenCalledWith({
      userId: null,
      feature: 'ai_chat',
      eventType: 'action',
      eventName: 'chat_message_sent',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/geminiRoute.test.ts`
Expected: FAIL — `recordEvent` was not called

- [ ] **Step 3: Call `recordEvent` after a successful reply**

In `app/api/ai/gemini/route.ts`, add these imports at the top:

```typescript
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { recordEvent } from '@/lib/analytics/recordEvent';
```

Then, inside the `POST` handler, replace:

```typescript
    const reply = await generateGeminiReply({ prompt, context, userName, weatherContext });

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: { reply, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    });
```

with:

```typescript
    const reply = await generateGeminiReply({ prompt, context, userName, weatherContext });

    const userId = await resolveRequestUserId(request);
    await recordEvent({
      userId,
      feature: 'ai_chat',
      eventType: 'action',
      eventName: 'chat_message_sent',
    });

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: { reply, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    });
```

This route intentionally stays open to guests (no 401 gate is added) — `resolveRequestUserId` returning `null` is a valid input to `recordEvent`, matching the nullable `user_id` column from Task 1.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/geminiRoute.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/ai/gemini/route.ts tests/api/geminiRoute.test.ts
git commit -m "feat: catat usage event chat_message_sent setelah balasan AI berhasil"
```

---

## Task 10: Wire up `trackPageView` in the 4 core controllers

**Files:**
- Modify: `controllers/keuangan/useKeuanganController.tsx`
- Modify: `controllers/stok/StokController.tsx`
- Modify: `controllers/kalender/KalenderController.tsx`
- Modify: `controllers/ensiklopedia/useEnsiklopediaController.tsx`

Each of these files already imports `useEffect`. No render-level tests exist for these controllers today (confirmed via `tests/controllers/`), so this task is implementation-only — `trackPageView` is fire-and-forget and already covered by its own unit tests from Task 5.

- [ ] **Step 1: Add the import and mount effect to Keuangan**

In `controllers/keuangan/useKeuanganController.tsx`, add near the other imports:

```typescript
import { trackPageView } from '@/lib/analytics/trackPageView';
```

Add near the top of the `useKeuanganController` function body (after other hook calls that don't depend on it):

```typescript
  useEffect(() => {
    void trackPageView('keuangan');
  }, []);
```

- [ ] **Step 2: Add the import and mount effect to Stok**

In `controllers/stok/StokController.tsx`, add near the other imports:

```typescript
import { trackPageView } from '@/lib/analytics/trackPageView';
```

Add near the top of the `StokController` function body, alongside the existing hook calls:

```typescript
  useEffect(() => {
    void trackPageView('stok');
  }, []);
```

- [ ] **Step 3: Add the import and mount effect to Kalender**

In `controllers/kalender/KalenderController.tsx`, add:

```typescript
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics/trackPageView';
```

(Merge `useEffect` into the existing `import { useMemo, useState } from 'react';` line instead of a separate import statement.) Add near the top of the `KalenderController` function body:

```typescript
  useEffect(() => {
    void trackPageView('kalender');
  }, []);
```

- [ ] **Step 4: Add the import and mount effect to Ensiklopedia (AI Chat)**

In `controllers/ensiklopedia/useEnsiklopediaController.tsx`, add near the other imports:

```typescript
import { trackPageView } from '@/lib/analytics/trackPageView';
```

Add near the top of the `useEnsiklopediaController` function body:

```typescript
  useEffect(() => {
    void trackPageView('ai_chat');
  }, []);
```

- [ ] **Step 5: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS, same results as before this task (no new failures introduced by the added effects)

- [ ] **Step 6: Commit**

```bash
git add controllers/keuangan/useKeuanganController.tsx controllers/stok/StokController.tsx controllers/kalender/KalenderController.tsx controllers/ensiklopedia/useEnsiklopediaController.tsx
git commit -m "feat: catat page view untuk 4 fitur inti saat controller mount"
```

---

## Task 11: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: All tests pass, including every new file from Tasks 2–10

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 4: Manually confirm the SQL migration from Task 1 has been applied**

Open the Supabase Dashboard SQL editor for this project and confirm `usage_events` exists and `profiles.is_admin` exists, since Task 1 only writes the file — it does not run it automatically.

---

## What this plan does not cover

- The `arina-agri-analytics` dashboard app (separate repo, separate plan, depends on the `usage_events` table this plan creates).
- Manually creating the dedicated admin Supabase Auth account and setting its `is_admin = true` — that is a one-time manual operation against the shared Supabase project, not code.
