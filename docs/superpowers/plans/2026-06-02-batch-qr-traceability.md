# Batch QR Traceability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build batch-level harvest traceability so each stock batch can generate a QR code that consumers scan to view a public, sanitized distribution timeline with blockchain-style event verification.

**Architecture:** Keep Supabase as the operational source of truth for stock and trace data. Add a server-only traceability data access layer, authenticated BFF routes for internal trace mutations, a public trace page for consumers, and a blockchain anchoring adapter that stores event hashes locally by default and can send EVM transactions when audited chain credentials are configured.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, MUI, Vitest, `qrcode` for QR generation, Node `crypto` for hashing, optional `viem` for EVM anchoring.

---

## Scope

This plan implements traceability per harvest batch, not per retail unit. A batch gets one `trace_id`, one QR URL, and a timeline that starts when the batch is created and continues through outbound stock movement, distributor handling, retailer handling, and consumer readiness.

The public consumer page must show only safe information: batch code, commodity label, harvest date, grade, broad storage/origin label, event timeline, latest status, and verification status. It must not expose price, user id, internal notes, service keys, detailed addresses, or private partner contact data.

Live blockchain anchoring is behind an adapter. The implementation defaults to `TRACE_CHAIN_MODE=local`, which stores deterministic hash anchors without network calls. When `TRACE_CHAIN_MODE=evm` and audited credentials are present, the same code path sends the event hash as EVM transaction data.

## File Structure

- Create `docs/database/stock-traceability.sql`
  Defines trace columns, event tables, anchor tables, scan metrics, indexes, and RLS policies.
- Create `lib/server/stock/traceability.ts`
  Server-only DAL for trace id generation, event hashing, event creation, anchor creation, and safe public DTO mapping.
- Create `lib/server/stock/blockchain.ts`
  Server-only blockchain adapter with `local` and `evm` modes.
- Create `app/api/stock/trace/route.ts`
  Authenticated BFF route for internal stock trace actions.
- Create `app/api/trace/scan/route.ts`
  Public route for privacy-preserving QR scan telemetry.
- Create `app/trace/[traceId]/page.tsx`
  Public Server Component route for consumer scans.
- Create `app/trace/[traceId]/_components/TracePageView.tsx`
  Public trace UI.
- Create `app/trace/[traceId]/_components/TraceScanBeacon.tsx`
  Small client beacon that records a successful scan after the page renders.
- Create `app/dashboard/stok/_components/TraceDialog.tsx`
  Internal dialog for QR preview, copy link, and adding distribution events.
- Create `app/dashboard/stok/_lib/traceSchemas.ts`
  Zod schemas for distribution event forms.
- Modify `lib/api.ts`
  Add trace DTOs and `stockTraceApi` client methods.
- Modify `hooks/useStok.ts`
  Add trace actions exposed to the stock controller.
- Modify `controllers/stok/StokController.tsx`
  Wire QR dialog state, trace loading, and form submit handlers.
- Modify `app/dashboard/stok/_components/StokView.tsx`
  Add QR/trace entry points in batch cards and tables.
- Modify `messages/id.json` and `messages/en.json`
  Add internal trace labels and public consumer page labels.
- Modify `package.json` and `package-lock.json`
  Add `qrcode`, `@types/qrcode`, and `viem`.
- Create tests:
  `tests/server/stockTraceability.test.ts`,
  `tests/server/stockBlockchain.test.ts`,
  `tests/api/stockTraceRoute.test.ts`,
  `tests/api/traceScanRoute.test.ts`,
  `tests/lib/stockTraceApi.test.ts`,
  `tests/components/TracePageView.test.tsx`,
  `tests/components/StokTraceDialog.test.tsx`.

---

### Task 1: Database Schema

**Files:**
- Create: `docs/database/stock-traceability.sql`

- [ ] **Step 1: Write the traceability schema SQL**

Create `docs/database/stock-traceability.sql`:

```sql
create extension if not exists pgcrypto;

alter table public.harvest_batches
  add column if not exists trace_id uuid default gen_random_uuid(),
  add column if not exists trace_public_enabled boolean not null default true,
  add column if not exists commodity text not null default 'Cabai';

create unique index if not exists harvest_batches_trace_id_idx
  on public.harvest_batches (trace_id);

create table if not exists public.distribution_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references public.harvest_batches(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'batch_created',
      'warehouse_in',
      'stock_out',
      'distributor_received',
      'retailer_received',
      'consumer_ready'
    )
  ),
  actor_role text not null check (
    actor_role in ('system', 'producer', 'distributor', 'retailer')
  ),
  actor_name text not null default '',
  location_label text not null default '',
  weight_kg numeric(12, 2),
  occurred_at timestamptz not null default now(),
  public_note text not null default '',
  internal_note text not null default '',
  event_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists distribution_events_event_hash_idx
  on public.distribution_events (event_hash);

create index if not exists distribution_events_batch_occurred_idx
  on public.distribution_events (batch_id, occurred_at asc);

create table if not exists public.blockchain_anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.distribution_events(id) on delete cascade,
  event_hash text not null,
  network text not null,
  tx_hash text not null,
  status text not null check (status in ('pending', 'verified', 'failed')),
  anchored_at timestamptz,
  error_message text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists blockchain_anchors_event_id_idx
  on public.blockchain_anchors (event_id);

create table if not exists public.qr_scan_events (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null,
  user_agent_hash text not null default '',
  referer_host text not null default '',
  scanned_at timestamptz not null default now()
);

create index if not exists qr_scan_events_trace_scanned_idx
  on public.qr_scan_events (trace_id, scanned_at desc);

alter table public.distribution_events enable row level security;
alter table public.blockchain_anchors enable row level security;
alter table public.qr_scan_events enable row level security;

drop policy if exists distribution_events_owner_select on public.distribution_events;
create policy distribution_events_owner_select
  on public.distribution_events
  for select
  using (auth.uid() = user_id);

drop policy if exists distribution_events_owner_insert on public.distribution_events;
create policy distribution_events_owner_insert
  on public.distribution_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists blockchain_anchors_owner_select on public.blockchain_anchors;
create policy blockchain_anchors_owner_select
  on public.blockchain_anchors
  for select
  using (auth.uid() = user_id);

drop policy if exists qr_scan_events_no_client_access on public.qr_scan_events;
create policy qr_scan_events_no_client_access
  on public.qr_scan_events
  for select
  using (false);
```

- [ ] **Step 2: Confirm the schema file exists**

Run:

```bash
rtk powershell -NoProfile -Command "Test-Path -LiteralPath 'docs\database\stock-traceability.sql'"
```

Expected: `True`

- [ ] **Step 3: Commit**

```bash
rtk git add docs/database/stock-traceability.sql
rtk git commit -m "docs: add stock traceability schema"
```

---

### Task 2: Server Traceability DAL

**Files:**
- Create: `lib/server/stock/traceability.ts`
- Test: `tests/server/stockTraceability.test.ts`

- [ ] **Step 1: Write failing tests for hashing and DTO minimization**

Create `tests/server/stockTraceability.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  buildPublicTraceDto,
  createTraceId,
  hashTraceEvent,
  isTraceEventType,
} from '@/lib/server/stock/traceability';

describe('stock traceability helpers', () => {
  it('creates unguessable uuid trace ids', () => {
    expect(createTraceId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(createTraceId()).not.toBe(createTraceId());
  });

  it('hashes canonical event data deterministically', () => {
    const first = hashTraceEvent({
      batchId: 'batch-1',
      eventType: 'stock_out',
      actorRole: 'producer',
      locationLabel: 'Gudang Utama',
      occurredAt: '2026-06-02T07:00:00.000Z',
      weightKg: 25,
    });
    const second = hashTraceEvent({
      weightKg: 25,
      occurredAt: '2026-06-02T07:00:00.000Z',
      locationLabel: 'Gudang Utama',
      actorRole: 'producer',
      eventType: 'stock_out',
      batchId: 'batch-1',
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('recognizes only supported event types', () => {
    expect(isTraceEventType('batch_created')).toBe(true);
    expect(isTraceEventType('consumer_ready')).toBe(true);
    expect(isTraceEventType('wrong_event')).toBe(false);
  });

  it('builds a public DTO without internal stock fields', () => {
    const dto = buildPublicTraceDto({
      batch: {
        id: 'batch-1',
        trace_id: '11111111-1111-4111-8111-111111111111',
        batch_code: 'BATCH-001-A',
        commodity: 'Cabai',
        tanggal_panen: '2026-06-01',
        grade: 'A',
        lokasi_penyimpanan: 'Gudang Utama',
        status: 'aman',
        trace_public_enabled: true,
      },
      events: [{
        id: 'event-1',
        event_type: 'stock_out',
        actor_role: 'producer',
        actor_name: 'Arina Farm',
        location_label: 'Gudang Utama',
        weight_kg: 40,
        occurred_at: '2026-06-02T07:00:00.000Z',
        public_note: 'Dikirim ke distributor',
        event_hash: 'a'.repeat(64),
      }],
      anchors: [{
        event_id: 'event-1',
        network: 'local-hashchain',
        tx_hash: 'local-aaaaaaaaaaaa',
        status: 'verified',
        anchored_at: '2026-06-02T07:00:01.000Z',
      }],
    });

    expect(dto.batch).toEqual({
      traceId: '11111111-1111-4111-8111-111111111111',
      batchCode: 'BATCH-001-A',
      commodity: 'Cabai',
      harvestDate: '2026-06-01',
      grade: 'A',
      storageLocation: 'Gudang Utama',
      status: 'aman',
    });
    expect(JSON.stringify(dto)).not.toContain('harga');
    expect(JSON.stringify(dto)).not.toContain('user_id');
    expect(dto.events[0].verification.status).toBe('verified');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk npm run test -- tests/server/stockTraceability.test.ts
```

Expected: FAIL because `lib/server/stock/traceability.ts` does not exist.

- [ ] **Step 3: Implement server traceability helpers**

Create `lib/server/stock/traceability.ts`:

```ts
import { createHash, randomUUID } from 'node:crypto';

export const TRACE_EVENT_TYPES = [
  'batch_created',
  'warehouse_in',
  'stock_out',
  'distributor_received',
  'retailer_received',
  'consumer_ready',
] as const;

export const TRACE_ACTOR_ROLES = ['system', 'producer', 'distributor', 'retailer'] as const;

export type TraceEventType = typeof TRACE_EVENT_TYPES[number];
export type TraceActorRole = typeof TRACE_ACTOR_ROLES[number];

export interface TraceHashInput {
  batchId: string;
  eventType: TraceEventType;
  actorRole: TraceActorRole;
  locationLabel: string;
  occurredAt: string;
  weightKg?: number | null;
}

export interface PublicTraceBatchRow {
  id: string;
  trace_id: string;
  batch_code: string;
  commodity: string;
  tanggal_panen: string;
  grade: 'A' | 'B' | 'C';
  lokasi_penyimpanan: string;
  status: 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis';
  trace_public_enabled: boolean;
}

export interface PublicTraceEventRow {
  id: string;
  event_type: TraceEventType;
  actor_role: TraceActorRole;
  actor_name: string;
  location_label: string;
  weight_kg: number | null;
  occurred_at: string;
  public_note: string;
  event_hash: string;
}

export interface PublicAnchorRow {
  event_id: string;
  network: string;
  tx_hash: string;
  status: 'pending' | 'verified' | 'failed';
  anchored_at: string | null;
}

export interface PublicBatchTrace {
  batch: {
    traceId: string;
    batchCode: string;
    commodity: string;
    harvestDate: string;
    grade: 'A' | 'B' | 'C';
    storageLocation: string;
    status: 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis';
  };
  events: Array<{
    id: string;
    type: TraceEventType;
    actorRole: TraceActorRole;
    actorName: string;
    locationLabel: string;
    weightKg: number | null;
    occurredAt: string;
    publicNote: string;
    eventHash: string;
    verification: {
      status: 'pending' | 'verified' | 'failed';
      network: string;
      txHash: string;
      anchoredAt: string | null;
    };
  }>;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function createTraceId() {
  return randomUUID();
}

export function isTraceEventType(value: unknown): value is TraceEventType {
  return typeof value === 'string' && TRACE_EVENT_TYPES.includes(value as TraceEventType);
}

export function isTraceActorRole(value: unknown): value is TraceActorRole {
  return typeof value === 'string' && TRACE_ACTOR_ROLES.includes(value as TraceActorRole);
}

export function hashTraceEvent(input: TraceHashInput) {
  const canonical = JSON.stringify(canonicalize(input));
  return createHash('sha256').update(canonical).digest('hex');
}

export function buildPublicTraceDto(input: {
  batch: PublicTraceBatchRow;
  events: PublicTraceEventRow[];
  anchors: PublicAnchorRow[];
}): PublicBatchTrace {
  const anchorByEventId = new Map(input.anchors.map((anchor) => [anchor.event_id, anchor]));

  return {
    batch: {
      traceId: input.batch.trace_id,
      batchCode: input.batch.batch_code,
      commodity: input.batch.commodity,
      harvestDate: input.batch.tanggal_panen,
      grade: input.batch.grade,
      storageLocation: input.batch.lokasi_penyimpanan,
      status: input.batch.status,
    },
    events: input.events.map((event) => {
      const anchor = anchorByEventId.get(event.id);
      return {
        id: event.id,
        type: event.event_type,
        actorRole: event.actor_role,
        actorName: event.actor_name,
        locationLabel: event.location_label,
        weightKg: event.weight_kg,
        occurredAt: event.occurred_at,
        publicNote: event.public_note,
        eventHash: event.event_hash,
        verification: {
          status: anchor?.status ?? 'pending',
          network: anchor?.network ?? '',
          txHash: anchor?.tx_hash ?? '',
          anchoredAt: anchor?.anchored_at ?? null,
        },
      };
    }),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
rtk npm run test -- tests/server/stockTraceability.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add lib/server/stock/traceability.ts tests/server/stockTraceability.test.ts
rtk git commit -m "feat: add stock traceability helpers"
```

---

### Task 3: Blockchain Anchor Adapter

**Files:**
- Create: `lib/server/stock/blockchain.ts`
- Test: `tests/server/stockBlockchain.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install blockchain dependency**

Run:

```bash
rtk npm install viem
```

Expected: `package.json` and `package-lock.json` include `viem`.

- [ ] **Step 2: Write failing tests for local and disabled anchoring**

Create `tests/server/stockBlockchain.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('stock blockchain adapter', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TRACE_CHAIN_MODE;
  });

  it('uses local hashchain mode by default', async () => {
    const { anchorTraceHash } = await import('@/lib/server/stock/blockchain');

    const result = await anchorTraceHash('a'.repeat(64));

    expect(result).toEqual({
      network: 'local-hashchain',
      txHash: 'local-aaaaaaaaaaaaaaaaaaaaaaaa',
      status: 'verified',
      errorMessage: '',
    });
  });

  it('can mark anchors pending when chain mode is disabled', async () => {
    process.env.TRACE_CHAIN_MODE = 'disabled';
    vi.resetModules();
    const { anchorTraceHash } = await import('@/lib/server/stock/blockchain');

    const result = await anchorTraceHash('b'.repeat(64));

    expect(result).toEqual({
      network: 'disabled',
      txHash: 'pending-bbbbbbbbbbbbbbbbbbbbbbbb',
      status: 'pending',
      errorMessage: '',
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
rtk npm run test -- tests/server/stockBlockchain.test.ts
```

Expected: FAIL because `lib/server/stock/blockchain.ts` does not exist.

- [ ] **Step 4: Implement adapter**

Create `lib/server/stock/blockchain.ts`:

```ts
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';

type AnchorStatus = 'pending' | 'verified' | 'failed';

interface AnchorResult {
  network: string;
  txHash: string;
  status: AnchorStatus;
  errorMessage: string;
}

function asHexData(hash: string): `0x${string}` {
  return `0x${hash}` as `0x${string}`;
}

export async function anchorTraceHash(eventHash: string): Promise<AnchorResult> {
  const mode = process.env.TRACE_CHAIN_MODE || 'local';

  if (mode === 'disabled') {
    return {
      network: 'disabled',
      txHash: `pending-${eventHash.slice(0, 24)}`,
      status: 'pending',
      errorMessage: '',
    };
  }

  if (mode !== 'evm') {
    return {
      network: 'local-hashchain',
      txHash: `local-${eventHash.slice(0, 24)}`,
      status: 'verified',
      errorMessage: '',
    };
  }

  const rpcUrl = process.env.TRACE_CHAIN_RPC_URL;
  const privateKey = process.env.TRACE_CHAIN_PRIVATE_KEY;
  const anchorAddress = process.env.TRACE_CHAIN_ANCHOR_ADDRESS;

  if (!rpcUrl || !privateKey || !anchorAddress) {
    return {
      network: 'evm-misconfigured',
      txHash: `failed-${eventHash.slice(0, 24)}`,
      status: 'failed',
      errorMessage: 'TRACE_CHAIN_RPC_URL, TRACE_CHAIN_PRIVATE_KEY, and TRACE_CHAIN_ANCHOR_ADDRESS are required in evm mode.',
    };
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const wallet = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http(rpcUrl),
    });

    const txHash = await wallet.sendTransaction({
      to: anchorAddress as `0x${string}`,
      data: asHexData(eventHash),
      value: 0n,
    });

    return {
      network: 'polygon-amoy',
      txHash,
      status: 'verified',
      errorMessage: '',
    };
  } catch (error) {
    return {
      network: 'polygon-amoy',
      txHash: `failed-${eventHash.slice(0, 24)}`,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown EVM anchoring error',
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
rtk npm run test -- tests/server/stockBlockchain.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add package.json package-lock.json lib/server/stock/blockchain.ts tests/server/stockBlockchain.test.ts
rtk git commit -m "feat: add stock trace anchor adapter"
```

---

### Task 4: Traceability DAL Database Operations

**Files:**
- Modify: `lib/server/stock/traceability.ts`
- Test: `tests/server/stockTraceability.test.ts`

- [ ] **Step 1: Extend tests for ensure trace and event insertion**

Update the first import in `tests/server/stockTraceability.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
```

Then append the database-operation tests:

```ts
const from = vi.fn();

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

vi.mock('@/lib/server/stock/blockchain', () => ({
  anchorTraceHash: vi.fn(async (eventHash: string) => ({
    network: 'local-hashchain',
    txHash: `local-${eventHash.slice(0, 24)}`,
    status: 'verified',
    errorMessage: '',
  })),
}));

describe('stock traceability DAL database operations', () => {
  beforeEach(() => {
    from.mockReset();
  });

  it('returns an existing trace id when the owner batch already has one', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'batch-1',
        trace_id: '11111111-1111-4111-8111-111111111111',
        batch_code: 'BATCH-001-A',
      },
      error: null,
    });
    const eq = vi.fn(() => ({ eq, single }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    const { ensureBatchTrace } = await import('@/lib/server/stock/traceability');

    const trace = await ensureBatchTrace({
      batchId: 'batch-1',
      userId: '00000000-0000-4000-8000-000000000001',
    });

    expect(trace.traceId).toBe('11111111-1111-4111-8111-111111111111');
    expect(from).toHaveBeenCalledWith('harvest_batches');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk npm run test -- tests/server/stockTraceability.test.ts
```

Expected: FAIL because `ensureBatchTrace` is not exported.

- [ ] **Step 3: Add DAL methods**

Add these imports and functions to `lib/server/stock/traceability.ts`:

```ts
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { anchorTraceHash } from '@/lib/server/stock/blockchain';

const BATCH_SELECT = 'id,trace_id,batch_code,commodity,tanggal_panen,grade,lokasi_penyimpanan,status,trace_public_enabled';
const EVENT_SELECT = 'id,event_type,actor_role,actor_name,location_label,weight_kg,occurred_at,public_note,event_hash';
const ANCHOR_SELECT = 'event_id,network,tx_hash,status,anchored_at';

export interface EnsureBatchTraceInput {
  batchId: string;
  userId: string;
}

export interface CreateDistributionEventInput {
  batchId: string;
  userId: string;
  eventType: TraceEventType;
  actorRole: TraceActorRole;
  actorName: string;
  locationLabel: string;
  weightKg?: number | null;
  occurredAt: string;
  publicNote: string;
  internalNote: string;
}

export async function ensureBatchTrace(input: EnsureBatchTraceInput) {
  const supabase = getSupabaseAdmin();
  const { data: batch, error } = await supabase
    .from('harvest_batches')
    .select('id,trace_id,batch_code')
    .eq('id', input.batchId)
    .eq('user_id', input.userId)
    .single();

  if (error) throw error;

  if (batch.trace_id) {
    return { batchId: batch.id, batchCode: batch.batch_code, traceId: batch.trace_id };
  }

  const traceId = createTraceId();
  const { data: updated, error: updateError } = await supabase
    .from('harvest_batches')
    .update({ trace_id: traceId, trace_public_enabled: true })
    .eq('id', input.batchId)
    .eq('user_id', input.userId)
    .select('id,trace_id,batch_code')
    .single();

  if (updateError) throw updateError;

  await createDistributionEvent({
    batchId: input.batchId,
    userId: input.userId,
    eventType: 'batch_created',
    actorRole: 'system',
    actorName: 'Arina Agri',
    locationLabel: 'Gudang panen',
    weightKg: null,
    occurredAt: new Date().toISOString(),
    publicNote: 'Batch panen dibuat dan siap dilacak.',
    internalNote: 'Trace otomatis dibuat oleh sistem.',
  });

  return { batchId: updated.id, batchCode: updated.batch_code, traceId: updated.trace_id };
}

export async function createDistributionEvent(input: CreateDistributionEventInput) {
  const supabase = getSupabaseAdmin();
  const eventHash = hashTraceEvent({
    batchId: input.batchId,
    eventType: input.eventType,
    actorRole: input.actorRole,
    locationLabel: input.locationLabel,
    occurredAt: input.occurredAt,
    weightKg: input.weightKg ?? null,
  });

  const { data: event, error } = await supabase
    .from('distribution_events')
    .insert({
      user_id: input.userId,
      batch_id: input.batchId,
      event_type: input.eventType,
      actor_role: input.actorRole,
      actor_name: input.actorName,
      location_label: input.locationLabel,
      weight_kg: input.weightKg ?? null,
      occurred_at: input.occurredAt,
      public_note: input.publicNote,
      internal_note: input.internalNote,
      event_hash: eventHash,
    })
    .select(`${EVENT_SELECT},batch_id`)
    .single();

  if (error) throw error;

  const anchor = await anchorTraceHash(eventHash);
  const { error: anchorError } = await supabase
    .from('blockchain_anchors')
    .insert({
      user_id: input.userId,
      event_id: event.id,
      event_hash: eventHash,
      network: anchor.network,
      tx_hash: anchor.txHash,
      status: anchor.status,
      anchored_at: anchor.status === 'verified' ? new Date().toISOString() : null,
      error_message: anchor.errorMessage,
    });

  if (anchorError) throw anchorError;

  return event;
}

export async function getPublicTraceByTraceId(traceId: string) {
  const supabase = getSupabaseAdmin();
  const { data: batch, error: batchError } = await supabase
    .from('harvest_batches')
    .select(BATCH_SELECT)
    .eq('trace_id', traceId)
    .eq('trace_public_enabled', true)
    .single();

  if (batchError || !batch) return null;

  const { data: events, error: eventsError } = await supabase
    .from('distribution_events')
    .select(EVENT_SELECT)
    .eq('batch_id', batch.id)
    .order('occurred_at', { ascending: true });

  if (eventsError) throw eventsError;

  const eventIds = ((events ?? []) as PublicTraceEventRow[]).map((event) => event.id);
  const { data: anchors, error: anchorsError } = await supabase
    .from('blockchain_anchors')
    .select(ANCHOR_SELECT)
    .in('event_id', eventIds.length > 0 ? eventIds : ['00000000-0000-4000-8000-000000000000']);

  if (anchorsError) throw anchorsError;

  return buildPublicTraceDto({
    batch: batch as PublicTraceBatchRow,
    events: (events ?? []) as PublicTraceEventRow[],
    anchors: (anchors ?? []) as PublicAnchorRow[],
  });
}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
rtk npm run test -- tests/server/stockTraceability.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add lib/server/stock/traceability.ts tests/server/stockTraceability.test.ts
rtk git commit -m "feat: add stock traceability data access"
```

---

### Task 5: Authenticated Stock Trace API

**Files:**
- Create: `app/api/stock/trace/route.ts`
- Test: `tests/api/stockTraceRoute.test.ts`

- [ ] **Step 1: Write failing route tests**

Create `tests/api/stockTraceRoute.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveRequestUserId = vi.fn();
const ensureBatchTrace = vi.fn();
const createDistributionEvent = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/server/stock/traceability', () => ({
  ensureBatchTrace: (input: unknown) => ensureBatchTrace(input),
  createDistributionEvent: (input: unknown) => createDistributionEvent(input),
  isTraceActorRole: (value: unknown) => ['system', 'producer', 'distributor', 'retailer'].includes(String(value)),
  isTraceEventType: (value: unknown) => [
    'batch_created',
    'warehouse_in',
    'stock_out',
    'distributor_received',
    'retailer_received',
    'consumer_ready',
  ].includes(String(value)),
}));

describe('stock trace route', () => {
  beforeEach(() => {
    resolveRequestUserId.mockReset();
    ensureBatchTrace.mockReset();
    createDistributionEvent.mockReset();
  });

  it('returns 401 without authorization', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/stock/trace/route');

    const response = await POST(new Request('http://localhost/api/stock/trace', {
      method: 'POST',
      body: JSON.stringify({ action: 'ensureBatchTrace', batchId: 'batch-1' }),
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, message: 'Unauthorized' });
  });

  it('ensures batch trace for the authorized user', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    ensureBatchTrace.mockResolvedValue({
      batchId: 'batch-1',
      batchCode: 'BATCH-001-A',
      traceId: '11111111-1111-4111-8111-111111111111',
    });
    const { POST } = await import('@/app/api/stock/trace/route');

    const response = await POST(new Request('http://localhost/api/stock/trace', {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: JSON.stringify({ action: 'ensureBatchTrace', batchId: 'batch-1' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(ensureBatchTrace).toHaveBeenCalledWith({ batchId: 'batch-1', userId: 'user-1' });
    expect(json.data.traceId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('records a distributor event with validated fields', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    createDistributionEvent.mockResolvedValue({ id: 'event-1' });
    const { POST } = await import('@/app/api/stock/trace/route');

    const response = await POST(new Request('http://localhost/api/stock/trace', {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: JSON.stringify({
        action: 'recordDistributionEvent',
        batchId: 'batch-1',
        eventType: 'distributor_received',
        actorRole: 'distributor',
        actorName: 'Distributor Mitra',
        locationLabel: 'Surabaya',
        weightKg: 40,
        occurredAt: '2026-06-02T07:00:00.000Z',
        publicNote: 'Diterima distributor.',
        internalNote: 'Penerimaan manual.',
      }),
    }));

    expect(response.status).toBe(200);
    expect(createDistributionEvent).toHaveBeenCalledWith({
      batchId: 'batch-1',
      userId: 'user-1',
      eventType: 'distributor_received',
      actorRole: 'distributor',
      actorName: 'Distributor Mitra',
      locationLabel: 'Surabaya',
      weightKg: 40,
      occurredAt: '2026-06-02T07:00:00.000Z',
      publicNote: 'Diterima distributor.',
      internalNote: 'Penerimaan manual.',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk npm run test -- tests/api/stockTraceRoute.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement route**

Create `app/api/stock/trace/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import {
  createDistributionEvent,
  ensureBatchTrace,
  isTraceActorRole,
  isTraceEventType,
} from '@/lib/server/stock/traceability';

export const dynamic = 'force-dynamic';

function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function POST(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return jsonNoStore({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = readString(body.action);
    const batchId = readString(body.batchId);

    if (!batchId) {
      return jsonNoStore({ success: false, message: 'ID batch tidak valid' }, { status: 400 });
    }

    if (action === 'ensureBatchTrace') {
      const data = await ensureBatchTrace({ batchId, userId });
      return jsonNoStore({ success: true, data });
    }

    if (action === 'recordDistributionEvent') {
      if (!isTraceEventType(body.eventType) || !isTraceActorRole(body.actorRole)) {
        return jsonNoStore({ success: false, message: 'Jenis event distribusi tidak valid' }, { status: 400 });
      }

      const locationLabel = readString(body.locationLabel);
      const occurredAt = readString(body.occurredAt);
      if (!locationLabel || !occurredAt) {
        return jsonNoStore({ success: false, message: 'Lokasi dan waktu distribusi wajib diisi' }, { status: 400 });
      }

      const data = await createDistributionEvent({
        batchId,
        userId,
        eventType: body.eventType,
        actorRole: body.actorRole,
        actorName: readString(body.actorName),
        locationLabel,
        weightKg: readOptionalNumber(body.weightKg),
        occurredAt,
        publicNote: readString(body.publicNote),
        internalNote: readString(body.internalNote),
      });

      return jsonNoStore({ success: true, data });
    }

    return jsonNoStore({ success: false, message: 'Aksi trace tidak dikenali' }, { status: 400 });
  } catch (error) {
    console.error('[API Stock Trace] POST Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal memproses trace stok' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
rtk npm run test -- tests/api/stockTraceRoute.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add app/api/stock/trace/route.ts tests/api/stockTraceRoute.test.ts
rtk git commit -m "feat: add stock trace API route"
```

---

### Task 6: Client API for Trace Actions

**Files:**
- Modify: `lib/api.ts`
- Test: `tests/lib/stockTraceApi.test.ts`

- [ ] **Step 1: Write failing client API tests**

Create `tests/lib/stockTraceApi.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      getUser: vi.fn(),
    },
    from: vi.fn(() => {
      throw new Error('stock trace API should use the BFF route');
    }),
  },
}));

describe('stockTraceApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      success: true,
      data: {
        batchId: 'batch-1',
        batchCode: 'BATCH-001-A',
        traceId: '11111111-1111-4111-8111-111111111111',
      },
    })));
    getSession.mockResolvedValue({ data: { session: { access_token: 'session-token' } } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    getSession.mockReset();
  });

  it('ensures a trace through the BFF route with auth headers', async () => {
    const { stockTraceApi } = await import('@/lib/api');

    const result = await stockTraceApi.ensureBatchTrace('batch-1');

    expect(result.traceId).toBe('11111111-1111-4111-8111-111111111111');
    expect(fetch).toHaveBeenCalledWith('/api/stock/trace', expect.objectContaining({
      method: 'POST',
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'ensureBatchTrace',
        batchId: 'batch-1',
      }),
      cache: 'no-store',
    }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk npm run test -- tests/lib/stockTraceApi.test.ts
```

Expected: FAIL because `stockTraceApi` is not exported.

- [ ] **Step 3: Add trace types and client methods**

Add to `lib/api.ts` near the stock interfaces:

```ts
export interface ApiBatchTraceInfo {
  batchId: string;
  batchCode: string;
  traceId: string;
}

export type ApiTraceEventType =
  | 'batch_created'
  | 'warehouse_in'
  | 'stock_out'
  | 'distributor_received'
  | 'retailer_received'
  | 'consumer_ready';

export type ApiTraceActorRole = 'system' | 'producer' | 'distributor' | 'retailer';

export interface ApiCreateTraceEventPayload {
  batchId: string;
  eventType: ApiTraceEventType;
  actorRole: ApiTraceActorRole;
  actorName: string;
  locationLabel: string;
  weightKg?: number | null;
  occurredAt: string;
  publicNote: string;
  internalNote: string;
}
```

Add below `stokApi`:

```ts
export const stockTraceApi = {
  ensureBatchTrace: (batchId: string): Promise<ApiBatchTraceInfo> =>
    calendarEventRequest<ApiBatchTraceInfo>('/api/stock/trace', {
      method: 'POST',
      body: { action: 'ensureBatchTrace', batchId },
    }),

  recordDistributionEvent: (payload: ApiCreateTraceEventPayload) =>
    calendarEventRequest<{ id: string }>('/api/stock/trace', {
      method: 'POST',
      body: {
        action: 'recordDistributionEvent',
        ...payload,
      },
    }),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
rtk npm run test -- tests/lib/stockTraceApi.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add lib/api.ts tests/lib/stockTraceApi.test.ts
rtk git commit -m "feat: add stock trace client API"
```

---

### Task 7: QR Generation Helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `app/dashboard/stok/_lib/traceQr.ts`
- Test: `tests/controllers/stockTraceQr.test.ts`

- [ ] **Step 1: Install QR dependency**

Run:

```bash
rtk npm install qrcode @types/qrcode
```

Expected: `package.json` and `package-lock.json` include `qrcode` and `@types/qrcode`.

- [ ] **Step 2: Write failing QR helper tests**

Create `tests/controllers/stockTraceQr.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildTraceUrl } from '@/app/dashboard/stok/_lib/traceQr';

describe('stock trace QR helpers', () => {
  it('builds a public trace URL from the current origin', () => {
    expect(buildTraceUrl({
      origin: 'https://arina.example',
      traceId: '11111111-1111-4111-8111-111111111111',
    })).toBe('https://arina.example/trace/11111111-1111-4111-8111-111111111111');
  });

  it('removes a trailing origin slash', () => {
    expect(buildTraceUrl({
      origin: 'https://arina.example/',
      traceId: '11111111-1111-4111-8111-111111111111',
    })).toBe('https://arina.example/trace/11111111-1111-4111-8111-111111111111');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
rtk npm run test -- tests/controllers/stockTraceQr.test.ts
```

Expected: FAIL because `traceQr.ts` does not exist.

- [ ] **Step 4: Implement QR helpers**

Create `app/dashboard/stok/_lib/traceQr.ts`:

```ts
import QRCode from 'qrcode';

export function buildTraceUrl(input: { origin: string; traceId: string }) {
  return `${input.origin.replace(/\/$/, '')}/trace/${encodeURIComponent(input.traceId)}`;
}

export async function buildTraceQrDataUrl(input: { origin: string; traceId: string }) {
  return QRCode.toDataURL(buildTraceUrl(input), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
rtk npm run test -- tests/controllers/stockTraceQr.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add package.json package-lock.json app/dashboard/stok/_lib/traceQr.ts tests/controllers/stockTraceQr.test.ts
rtk git commit -m "feat: add stock trace QR helpers"
```

---

### Task 8: Stock Hook Trace Actions

**Files:**
- Modify: `hooks/useStok.ts`
- Create: `app/dashboard/stok/_lib/traceSchemas.ts`

- [ ] **Step 1: Add trace form schema**

Create `app/dashboard/stok/_lib/traceSchemas.ts`:

```ts
import { z } from 'zod';

export const traceEventSchema = z.object({
  batchId: z.string().min(1),
  eventType: z.enum(['distributor_received', 'retailer_received', 'consumer_ready']),
  actorRole: z.enum(['distributor', 'retailer']),
  actorName: z.string().optional(),
  locationLabel: z.string().min(1),
  weightKg: z.coerce.number().min(0.1).optional(),
  occurredAt: z.string().min(1),
  publicNote: z.string().optional(),
  internalNote: z.string().optional(),
});

export type TraceEventFormInput = z.input<typeof traceEventSchema>;
export type TraceEventFormOutput = z.output<typeof traceEventSchema>;
```

- [ ] **Step 2: Expose trace actions in the stock hook**

Modify the import in `hooks/useStok.ts`:

```ts
import {
  stokApi,
  stockTraceApi,
  type ApiCreateTraceEventPayload,
  type ApiHarvestBatch,
  type ApiStockMutation,
  type StokSummary,
} from '@/lib/api';
```

Add functions before `return`:

```ts
  const ensureBatchTrace = async (batchId: string) => {
    return stockTraceApi.ensureBatchTrace(batchId);
  };

  const recordDistributionEvent = async (payload: ApiCreateTraceEventPayload) => {
    return stockTraceApi.recordDistributionEvent(payload);
  };
```

Add to returned object:

```ts
    ensureBatchTrace,
    recordDistributionEvent,
```

- [ ] **Step 3: Run focused tests and typecheck**

Run:

```bash
rtk npm run test -- tests/lib/stockTraceApi.test.ts
rtk npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add hooks/useStok.ts app/dashboard/stok/_lib/traceSchemas.ts
rtk git commit -m "feat: add stock trace hook actions"
```

---

### Task 9: Internal Stock QR Dialog UI

**Files:**
- Create: `app/dashboard/stok/_components/TraceDialog.tsx`
- Modify: `controllers/stok/StokController.tsx`
- Modify: `app/dashboard/stok/_components/StokView.tsx`
- Test: `tests/components/StokTraceDialog.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `tests/components/StokTraceDialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TraceDialog from '@/app/dashboard/stok/_components/TraceDialog';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('TraceDialog', () => {
  it('renders a consumer trace link when trace info exists', () => {
    render(
      <TraceDialog
        open
        onClose={() => undefined}
        origin="https://arina.example"
        traceInfo={{
          batchId: 'batch-1',
          batchCode: 'BATCH-001-A',
          traceId: '11111111-1111-4111-8111-111111111111',
        }}
        form={undefined as never}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('BATCH-001-A')).toBeInTheDocument();
    expect(screen.getByText('https://arina.example/trace/11111111-1111-4111-8111-111111111111')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk npm run test -- tests/components/StokTraceDialog.test.tsx
```

Expected: FAIL because `TraceDialog.tsx` does not exist.

- [ ] **Step 3: Create dialog component**

Create `app/dashboard/stok/_components/TraceDialog.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslations } from 'next-intl';
import type { SubmitHandler, UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { buildTraceQrDataUrl, buildTraceUrl } from '../_lib/traceQr';
import type { TraceEventFormInput, TraceEventFormOutput } from '../_lib/traceSchemas';

interface TraceDialogProps {
  open: boolean;
  onClose: () => void;
  origin: string;
  traceInfo: { batchId: string; batchCode: string; traceId: string } | null;
  form: UseFormReturn<TraceEventFormInput, unknown, TraceEventFormOutput>;
  onSubmit: SubmitHandler<TraceEventFormOutput>;
}

export default function TraceDialog({ open, onClose, origin, traceInfo, form, onSubmit }: TraceDialogProps) {
  const t = useTranslations('Stock');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const traceUrl = traceInfo ? buildTraceUrl({ origin, traceId: traceInfo.traceId }) : '';

  useEffect(() => {
    let cancelled = false;
    if (!traceInfo || !open) return;

    buildTraceQrDataUrl({ origin, traceId: traceInfo.traceId }).then((value) => {
      if (!cancelled) setQrDataUrl(value);
    });

    return () => {
      cancelled = true;
    };
  }, [open, origin, traceInfo]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {t('trace.dialogTitle')}
        <IconButton aria-label={t('trace.close')} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {traceInfo && (
          <>
            <Typography variant="h6">{traceInfo.batchCode}</Typography>
            {qrDataUrl && <Box component="img" src={qrDataUrl} alt={t('trace.qrAlt')} sx={{ width: 220, height: 220 }} />}
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{traceUrl}</Typography>
            <Button
              type="button"
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => navigator.clipboard?.writeText(traceUrl)}
            >
              {t('trace.copyLink')}
            </Button>
          </>
        )}

        {form && (
          <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller name="locationLabel" control={form.control} render={({ field }) => (
              <TextField {...field} label={t('trace.locationLabel')} fullWidth />
            )} />
            <Controller name="actorName" control={form.control} render={({ field }) => (
              <TextField {...field} label={t('trace.actorName')} fullWidth />
            )} />
            <Controller name="publicNote" control={form.control} render={({ field }) => (
              <TextField {...field} label={t('trace.publicNote')} fullWidth multiline minRows={2} />
            )} />
            <Button type="submit" variant="contained">{t('trace.saveEvent')}</Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Wire controller state and submit handler**

Modify `controllers/stok/StokController.tsx` imports:

```ts
import {
  traceEventSchema,
  type TraceEventFormInput,
  type TraceEventFormOutput,
} from '@/app/dashboard/stok/_lib/traceSchemas';
```

Update the hook destructuring:

```ts
  const {
    batches,
    mutations,
    summary,
    loading,
    backendOnline,
    addBatch,
    deleteBatch,
    stockOut,
    ensureBatchTrace,
    recordDistributionEvent,
  } = useStok();
```

Add state:

```ts
  const [traceDialogOpen, setTraceDialogOpen] = useState(false);
  const [selectedTraceInfo, setSelectedTraceInfo] = useState<{ batchId: string; batchCode: string; traceId: string } | null>(null);
```

Add form:

```ts
  const traceEventForm = useForm<TraceEventFormInput, unknown, TraceEventFormOutput>({
    resolver: zodResolver(traceEventSchema.extend({
      locationLabel: z.string().min(1, t('trace.validation.locationRequired')),
      occurredAt: z.string().min(1, t('dialogs.validation.required')),
    })),
    defaultValues: {
      batchId: '',
      eventType: 'distributor_received',
      actorRole: 'distributor',
      actorName: '',
      locationLabel: '',
      weightKg: undefined,
      occurredAt: new Date().toISOString().slice(0, 16),
      publicNote: '',
      internalNote: '',
    },
  });
```

Add handlers:

```ts
  const openTraceDialog = async (batchId: string) => {
    const traceInfo = await ensureBatchTrace(batchId);
    setSelectedTraceInfo(traceInfo);
    traceEventForm.reset({
      batchId,
      eventType: 'distributor_received',
      actorRole: 'distributor',
      actorName: '',
      locationLabel: '',
      weightKg: undefined,
      occurredAt: new Date().toISOString().slice(0, 16),
      publicNote: '',
      internalNote: '',
    });
    setTraceDialogOpen(true);
  };

  const onTraceEventSubmit = async (data: TraceEventFormOutput) => {
    await recordDistributionEvent({
      batchId: data.batchId,
      eventType: data.eventType,
      actorRole: data.actorRole,
      actorName: data.actorName || '',
      locationLabel: data.locationLabel,
      weightKg: data.weightKg ?? null,
      occurredAt: new Date(data.occurredAt).toISOString(),
      publicNote: data.publicNote || '',
      internalNote: data.internalNote || '',
    });
    setTraceDialogOpen(false);
  };
```

Pass props into `StokView`:

```tsx
      onTraceEventSubmit={onTraceEventSubmit}
      openTraceDialog={openTraceDialog}
      selectedTraceInfo={selectedTraceInfo}
      setTraceDialogOpen={setTraceDialogOpen}
      traceDialogOpen={traceDialogOpen}
      traceEventForm={traceEventForm}
```

- [ ] **Step 5: Add props and buttons to StokView**

Modify `StokViewProps` in `app/dashboard/stok/_components/StokView.tsx`:

```ts
  onTraceEventSubmit: SubmitHandler<TraceEventFormOutput>;
  openTraceDialog: (batchId: string) => Promise<void>;
  selectedTraceInfo: { batchId: string; batchCode: string; traceId: string } | null;
  setTraceDialogOpen: (open: boolean) => void;
  traceDialogOpen: boolean;
  traceEventForm: UseFormReturn<TraceEventFormInput, unknown, TraceEventFormOutput>;
```

Add imports:

```ts
import QrCodeIcon from '@mui/icons-material/QrCode';
import TraceDialog from './TraceDialog';
import type { TraceEventFormInput, TraceEventFormOutput } from '../_lib/traceSchemas';
```

Add a QR button next to each batch action:

```tsx
<Button
  variant="outlined"
  startIcon={<QrCodeIcon />}
  onClick={() => openTraceDialog(b._id)}
  sx={{ borderRadius: 2 }}
>
  {t('trace.qrButton')}
</Button>
```

Render the dialog near the bottom of `StokView`:

```tsx
<TraceDialog
  open={traceDialogOpen}
  onClose={() => setTraceDialogOpen(false)}
  origin={typeof window === 'undefined' ? '' : window.location.origin}
  traceInfo={selectedTraceInfo}
  form={traceEventForm}
  onSubmit={onTraceEventSubmit}
/>
```

- [ ] **Step 6: Run component test and typecheck**

Run:

```bash
rtk npm run test -- tests/components/StokTraceDialog.test.tsx
rtk npm run typecheck
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add controllers/stok/StokController.tsx app/dashboard/stok/_components/TraceDialog.tsx app/dashboard/stok/_components/StokView.tsx tests/components/StokTraceDialog.test.tsx
rtk git commit -m "feat: add stock trace QR dialog"
```

---

### Task 10: Public Consumer Trace Page

**Files:**
- Create: `app/trace/[traceId]/page.tsx`
- Create: `app/trace/[traceId]/_components/TracePageView.tsx`
- Create: `app/trace/[traceId]/_components/TraceScanBeacon.tsx`
- Test: `tests/components/TracePageView.test.tsx`

- [ ] **Step 1: Write failing public trace view test**

Create `tests/components/TracePageView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TracePageView from '@/app/trace/[traceId]/_components/TracePageView';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('TracePageView', () => {
  it('renders safe public trace details', () => {
    render(
      <TracePageView
        trace={{
          batch: {
            traceId: '11111111-1111-4111-8111-111111111111',
            batchCode: 'BATCH-001-A',
            commodity: 'Cabai',
            harvestDate: '2026-06-01',
            grade: 'A',
            storageLocation: 'Gudang Utama',
            status: 'aman',
          },
          events: [{
            id: 'event-1',
            type: 'stock_out',
            actorRole: 'producer',
            actorName: 'Arina Farm',
            locationLabel: 'Surabaya',
            weightKg: 40,
            occurredAt: '2026-06-02T07:00:00.000Z',
            publicNote: 'Dikirim ke distributor.',
            eventHash: 'a'.repeat(64),
            verification: {
              status: 'verified',
              network: 'local-hashchain',
              txHash: 'local-aaaaaaaaaaaaaaaaaaaaaaaa',
              anchoredAt: '2026-06-02T07:00:01.000Z',
            },
          }],
        }}
      />,
    );

    expect(screen.getByText('BATCH-001-A')).toBeInTheDocument();
    expect(screen.getByText('Cabai')).toBeInTheDocument();
    expect(screen.getByText('Dikirim ke distributor.')).toBeInTheDocument();
    expect(JSON.stringify(document.body.textContent)).not.toContain('harga');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk npm run test -- tests/components/TracePageView.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement trace scan beacon**

Create `app/trace/[traceId]/_components/TraceScanBeacon.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export default function TraceScanBeacon({ traceId }: { traceId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/trace/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traceId, referer: document.referrer }),
      signal: controller.signal,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [traceId]);

  return null;
}
```

- [ ] **Step 4: Implement public trace view**

Create `app/trace/[traceId]/_components/TracePageView.tsx`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VerifiedIcon from '@mui/icons-material/Verified';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { formatDateShort } from '@/lib/formatters';
import type { PublicBatchTrace } from '@/lib/server/stock/traceability';
import TraceScanBeacon from './TraceScanBeacon';

function verificationIcon(status: string) {
  if (status === 'verified') return <VerifiedIcon fontSize="small" />;
  if (status === 'failed') return <ErrorOutlineIcon fontSize="small" />;
  return <PendingIcon fontSize="small" />;
}

export default function TracePageView({ trace }: { trace: PublicBatchTrace }) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', py: { xs: 3, md: 6 } }}>
      <TraceScanBeacon traceId={trace.batch.traceId} />
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="text.secondary">Arina Agri Trace</Typography>
            <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
              {trace.batch.batchCode}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Riwayat distribusi batch panen yang dapat diverifikasi.
            </Typography>
          </Box>

          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
              <Box>
                <Typography variant="caption" color="text.secondary">Komoditas</Typography>
                <Typography variant="h6">{trace.batch.commodity}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Tanggal panen</Typography>
                <Typography variant="h6">{formatDateShort(trace.batch.harvestDate)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Grade</Typography>
                <Typography variant="h6">{trace.batch.grade}</Typography>
              </Box>
            </Stack>
          </Paper>

          <Stack spacing={2}>
            {trace.events.map((event) => (
              <Paper key={event.id} sx={{ p: 2.5, borderRadius: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {event.locationLabel}
                    </Typography>
                    <Chip
                      size="small"
                      icon={verificationIcon(event.verification.status)}
                      label={event.verification.status === 'verified' ? 'Terverifikasi' : 'Menunggu verifikasi'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {formatDateShort(event.occurredAt)}
                  </Typography>
                  {event.publicNote && <Typography variant="body1">{event.publicNote}</Typography>}
                  {event.verification.txHash && (
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {event.verification.network}: {event.verification.txHash}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 5: Implement public route**

Create `app/trace/[traceId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getPublicTraceByTraceId } from '@/lib/server/stock/traceability';
import TracePageView from './_components/TracePageView';

export const dynamic = 'force-dynamic';

export default async function TracePage({ params }: { params: Promise<{ traceId: string }> }) {
  const { traceId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(traceId)) notFound();

  const trace = await getPublicTraceByTraceId(traceId);
  if (!trace) notFound();

  return <TracePageView trace={trace} />;
}
```

- [ ] **Step 6: Run component test**

Run:

```bash
rtk npm run test -- tests/components/TracePageView.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add app/trace tests/components/TracePageView.test.tsx
rtk git commit -m "feat: add public batch trace page"
```

---

### Task 11: Public Scan Telemetry Route

**Files:**
- Create: `app/api/trace/scan/route.ts`
- Test: `tests/api/traceScanRoute.test.ts`

- [ ] **Step 1: Write failing scan route tests**

Create `tests/api/traceScanRoute.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.fn();

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

describe('trace scan route', () => {
  beforeEach(() => {
    from.mockReset();
  });

  it('records a scan without storing raw user-agent text', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({ insert });
    const { POST } = await import('@/app/api/trace/scan/route');

    const response = await POST(new Request('http://localhost/api/trace/scan', {
      method: 'POST',
      headers: { 'user-agent': 'Test Browser 1.0' },
      body: JSON.stringify({
        traceId: '11111111-1111-4111-8111-111111111111',
        referer: 'https://example.com/catalog',
      }),
    }));

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      trace_id: '11111111-1111-4111-8111-111111111111',
      referer_host: 'example.com',
    }));
    expect(JSON.stringify(insert.mock.calls[0][0])).not.toContain('Test Browser');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk npm run test -- tests/api/traceScanRoute.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement scan route**

Create `app/api/trace/scan/route.ts`:

```ts
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function readRefererHost(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const traceId = typeof body.traceId === 'string' ? body.traceId.trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(traceId)) {
      return NextResponse.json({ success: false, message: 'Trace ID tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const userAgent = request.headers.get('user-agent') || '';
    const { error } = await supabase.from('qr_scan_events').insert({
      trace_id: traceId,
      user_agent_hash: userAgent ? hashText(userAgent) : '',
      referer_host: readRefererHost(body.referer),
    });

    if (error) throw error;

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('[API Trace Scan] POST Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mencatat scan' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
rtk npm run test -- tests/api/traceScanRoute.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add app/api/trace/scan/route.ts tests/api/traceScanRoute.test.ts
rtk git commit -m "feat: add trace scan telemetry route"
```

---

### Task 12: Auto-Create Trace Events From Stock Actions

**Files:**
- Modify: `hooks/useStok.ts`

- [ ] **Step 1: Create trace after a new batch**

In `hooks/useStok.ts`, modify `addBatch`:

```ts
  const addBatch = async (data: Parameters<typeof stokApi.create>[0]) => {
    const created = await stokApi.create(data);
    await stockTraceApi.ensureBatchTrace(created._id);
    setBatches((prev) => [created, ...prev]);
    await loadData();
  };
```

- [ ] **Step 2: Record stock-out as a trace event**

In `hooks/useStok.ts`, modify `stockOut` after the `stokApi.stockOut` call:

```ts
  const stockOut = async (batchId: string, outData: Parameters<typeof stokApi.stockOut>[1]) => {
    const result = await stokApi.stockOut(batchId, outData);
    await stockTraceApi.ensureBatchTrace(batchId);
    await stockTraceApi.recordDistributionEvent({
      batchId,
      eventType: 'stock_out',
      actorRole: 'producer',
      actorName: 'Arina Agri',
      locationLabel: outData.tujuan,
      weightKg: outData.berat,
      occurredAt: new Date(outData.tanggal).toISOString(),
      publicNote: `Batch dikirim ke ${outData.tujuan}.`,
      internalNote: outData.catatan,
    });
    setBatches((prev) => prev.map((b) => (b._id === batchId ? result.batch : b)));
    setMutations((prev) => [result.mutation, ...prev]);
    setSummary(computeLocalSummary(batches.map(b => b._id === batchId ? result.batch : b)));
  };
```

- [ ] **Step 3: Run stock-related tests and typecheck**

Run:

```bash
rtk npm run test -- tests/lib/stockTraceApi.test.ts tests/controllers/stockTraceQr.test.ts
rtk npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add hooks/useStok.ts
rtk git commit -m "feat: record stock actions in trace timeline"
```

---

### Task 13: Translations

**Files:**
- Modify: `messages/id.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add Indonesian labels**

Add under `Stock` in `messages/id.json`:

```json
"trace": {
  "dialogTitle": "QR & Tracking Batch",
  "close": "Tutup tracking",
  "qrAlt": "QR tracking batch",
  "copyLink": "Salin link QR",
  "qrButton": "QR",
  "saveEvent": "Simpan Event",
  "locationLabel": "Lokasi distribusi",
  "actorName": "Nama mitra",
  "publicNote": "Catatan untuk konsumen",
  "validation": {
    "locationRequired": "Lokasi distribusi wajib diisi"
  }
}
```

- [ ] **Step 2: Add English labels**

Add under `Stock` in `messages/en.json`:

```json
"trace": {
  "dialogTitle": "Batch QR & Tracking",
  "close": "Close tracking",
  "qrAlt": "Batch tracking QR",
  "copyLink": "Copy QR link",
  "qrButton": "QR",
  "saveEvent": "Save Event",
  "locationLabel": "Distribution location",
  "actorName": "Partner name",
  "publicNote": "Consumer note",
  "validation": {
    "locationRequired": "Distribution location is required"
  }
}
```

- [ ] **Step 3: Run i18n check**

Run:

```bash
rtk npm run i18n:check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add messages/id.json messages/en.json
rtk git commit -m "feat: add stock trace translations"
```

---

### Task 14: Final Verification

**Files:**
- No file edits.

- [ ] **Step 1: Run full test suite**

Run:

```bash
rtk npm run test
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
rtk npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run:

```bash
rtk npm run build
```

Expected: PASS.

- [ ] **Step 5: Start local dev server**

Run:

```bash
rtk npm run dev
```

Expected: Next dev server starts and prints a localhost URL.

- [ ] **Step 6: Manual audit checklist**

Open `/dashboard/stok`, create a batch, open QR, copy the trace link, open the trace page, and verify:

- The QR dialog shows a link under `/trace/{traceId}`.
- The public page loads without login.
- The public page shows batch code, commodity, harvest date, grade, timeline, and verification status.
- The public page does not show harga modal, harga jual, user id, internal notes, or private contact details.
- Stock out creates a timeline event.
- Manual distributor or retailer event appears in the public timeline.
- In `TRACE_CHAIN_MODE=local`, event status is verified with `local-hashchain`.
- In `TRACE_CHAIN_MODE=disabled`, event status is pending.

- [ ] **Step 7: Commit final verification notes if docs changed**

If this task adds a short audit note, commit it:

```bash
rtk git add docs/superpowers/plans/2026-06-02-batch-qr-traceability.md
rtk git commit -m "docs: note stock trace verification"
```

---

## Risks and Audit Points

- QR proves a digital timeline, not the physical product identity. Label reuse or product swapping still needs physical controls such as tamper-evident labels.
- Public trace data must stay minimal. Every public DTO change should be reviewed for price, user id, internal note, and private partner data leakage.
- Live EVM mode needs a funded testnet wallet, a controlled private key, and a reviewed RPC provider before activation.
- Current stock CRUD still uses direct Supabase client calls. This plan only moves trace mutations through BFF routes; a full stock BFF migration should be a separate plan.
- GET page rendering must not write scan metrics directly. Scan logging uses the client beacon and POST route to avoid render side effects.

## Self-Review Notes

- Spec coverage: batch trace id, QR generation, authenticated internal updates, public consumer page, event hashing, anchor records, scan telemetry, and tests are covered.
- Scope: this is one cohesive stock traceability feature. A later live-chain hardening pass can split into a separate plan if the audit chooses a different blockchain provider.
- Type consistency: event types use `batch_created`, `warehouse_in`, `stock_out`, `distributor_received`, `retailer_received`, and `consumer_ready` across schema, DAL, API, and UI.
