# Telegram WhatsApp Backend Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to record finance transactions and stock changes from Telegram or WhatsApp through Arina Agri's backend without n8n.

**Architecture:** Add dedicated Next.js route handlers for Telegram and WhatsApp webhooks, then route both channels into a shared server-only chat-input processor. The processor normalizes incoming messages, resolves the sender to a Supabase profile, parses strict Indonesian commands, writes to `transactions`, `harvest_batches`, and `stock_mutations`, stores idempotency logs, and sends a confirmation through the existing direct channel senders.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript, Zod, Supabase/Postgres, Telegram Bot API, WhatsApp Cloud API, Vitest.

---

## Scope

This plan builds backend-only inbound input. It does not add a new dashboard UI, voice-note transcription, free-form AI parsing, or n8n compatibility.

Supported MVP commands:

```text
pengeluaran 50000 pupuk beli npk
pemasukan 750000 penjualan cabai
stok masuk 50kg grade A modal 18000 jual 25000 gudang utama exp 2026-06-20
stok keluar BATCH-001-A 20kg pasar lokal kirim pagi
```

Invalid or ambiguous messages are not saved. The bot replies with command examples.

## File Structure

- Create: `docs/database/chat-input-channel-identities.sql`
  Database columns and indexes for channel identity lookup and webhook idempotency.
- Create: `lib/server/chat-input/types.ts`
  Shared inbound message, parser output, and processing result types.
- Create: `lib/server/chat-input/parser.ts`
  Deterministic parser for finance and stock commands.
- Create: `lib/server/chat-input/identity.ts`
  Sender-to-user resolution from `profiles.telegram_chat_id` and `profiles.whatsapp_phone`.
- Create: `lib/server/chat-input/records.ts`
  Supabase write operations for transactions, harvest batch creation, stock in, and stock out.
- Create: `lib/server/chat-input/processor.ts`
  Orchestrates idempotency, parsing, identity resolution, database writes, and replies.
- Create: `app/api/webhook/telegram/route.ts`
  Telegram webhook adapter using `X-Telegram-Bot-Api-Secret-Token`.
- Create: `app/api/webhook/whatsapp/route.ts`
  WhatsApp webhook verification and incoming message adapter.
- Create: `tests/server/chatInputParser.test.ts`
  Unit tests for parser examples and invalid input.
- Create: `tests/server/chatInputRecords.test.ts`
  Unit tests for Supabase writes and stock safeguards.
- Create: `tests/server/chatInputProcessor.test.ts`
  Unit tests for orchestration, idempotency, replies, and unknown sender handling.
- Create: `tests/api/telegramWebhookRoute.test.ts`
  Route tests for Telegram webhook security and payload mapping.
- Create: `tests/api/whatsappWebhookRoute.test.ts`
  Route tests for WhatsApp verification, signature checks, and payload mapping.
- Modify: `README.md`
  Document new endpoints and env vars.
- Modify: `messages/id.json`, `messages/en.json`
  Remove n8n wording from notification/channel copy if still present.

---

### Task 1: Add Database Support for Channel Identity and Idempotency

**Files:**
- Create: `docs/database/chat-input-channel-identities.sql`

- [ ] **Step 1: Write the database SQL**

Create `docs/database/chat-input-channel-identities.sql`:

```sql
-- Channel identity and idempotency support for Telegram/WhatsApp inbound input.
-- Run manually in Supabase SQL editor or convert into a Supabase migration.

alter table public.profiles
  add column if not exists telegram_chat_id text,
  add column if not exists whatsapp_phone text;

create unique index if not exists profiles_telegram_chat_id_idx
  on public.profiles (telegram_chat_id)
  where telegram_chat_id is not null and telegram_chat_id <> '';

create unique index if not exists profiles_whatsapp_phone_idx
  on public.profiles (whatsapp_phone)
  where whatsapp_phone is not null and whatsapp_phone <> '';

create table if not exists public.inbound_message_logs (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('telegram', 'whatsapp')),
  external_message_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  sender_id text not null,
  raw_text text not null,
  command_type text,
  status text not null check (status in ('received', 'processed', 'ignored', 'failed')),
  response_text text,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists inbound_message_logs_channel_external_idx
  on public.inbound_message_logs (channel, external_message_id);

create index if not exists inbound_message_logs_user_created_idx
  on public.inbound_message_logs (user_id, created_at desc);
```

- [ ] **Step 2: Verify SQL syntax manually**

Run this in Supabase SQL editor against the project database. Expected: the statement completes without errors, and re-running it is safe because every DDL operation is idempotent.

- [ ] **Step 3: Commit database doc**

```bash
git add docs/database/chat-input-channel-identities.sql
git commit -m "docs: add chat input database support"
```

---

### Task 2: Define Shared Chat Input Types

**Files:**
- Create: `lib/server/chat-input/types.ts`
- Test: `tests/server/chatInputParser.test.ts`

- [ ] **Step 1: Write parser tests that import the future types**

Create `tests/server/chatInputParser.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseChatInput } from '@/lib/server/chat-input/parser';

describe('parseChatInput', () => {
  it('parses finance expense commands', () => {
    expect(parseChatInput('pengeluaran 50000 pupuk beli npk')).toEqual({
      ok: true,
      command: {
        type: 'finance',
        jenis: 'pengeluaran',
        nominal: 50000,
        kategori: 'pupuk',
        keterangan: 'beli npk',
      },
    });
  });

  it('parses finance income commands', () => {
    expect(parseChatInput('pemasukan 750000 penjualan cabai')).toEqual({
      ok: true,
      command: {
        type: 'finance',
        jenis: 'pendapatan',
        nominal: 750000,
        kategori: 'penjualan',
        keterangan: 'cabai',
      },
    });
  });

  it('parses stock-in batch creation commands', () => {
    expect(parseChatInput('stok masuk 50kg grade A modal 18000 jual 25000 gudang utama exp 2026-06-20')).toEqual({
      ok: true,
      command: {
        type: 'stock_in',
        berat: 50,
        grade: 'A',
        hargaModal: 18000,
        hargaJual: 25000,
        lokasiPenyimpanan: 'Gudang Utama',
        estimasiKadaluarsa: '2026-06-20',
        catatan: '',
      },
    });
  });

  it('parses stock-out commands', () => {
    expect(parseChatInput('stok keluar BATCH-001-A 20kg pasar lokal kirim pagi')).toEqual({
      ok: true,
      command: {
        type: 'stock_out',
        batchCode: 'BATCH-001-A',
        berat: 20,
        tujuan: 'Pasar Lokal',
        catatan: 'pagi',
      },
    });
  });

  it('returns help text for unsupported messages', () => {
    const result = parseChatInput('tolong catat sesuatu');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Format belum dikenali');
  });
});
```

- [ ] **Step 2: Run parser tests to verify failure**

Run: `npm run test -- tests/server/chatInputParser.test.ts`

Expected: FAIL because `@/lib/server/chat-input/parser` does not exist.

- [ ] **Step 3: Create shared types**

Create `lib/server/chat-input/types.ts`:

```ts
export type ChatInputChannel = 'telegram' | 'whatsapp';

export interface InboundChatMessage {
  channel: ChatInputChannel;
  externalMessageId: string;
  senderId: string;
  senderDisplayName?: string;
  text: string;
  receivedAt: string;
  replyTo: string;
}

export interface FinanceCommand {
  type: 'finance';
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  keterangan: string;
}

export interface StockInCommand {
  type: 'stock_in';
  berat: number;
  grade: 'A' | 'B' | 'C';
  hargaModal: number;
  hargaJual: number;
  lokasiPenyimpanan: 'Gudang Utama' | 'Gudang Cadangan';
  estimasiKadaluarsa: string;
  catatan: string;
}

export interface StockOutCommand {
  type: 'stock_out';
  batchCode: string;
  berat: number;
  tujuan: 'Pasar Lokal' | 'Distributor' | 'Restoran' | 'Lainnya';
  catatan: string;
}

export type ParsedChatCommand = FinanceCommand | StockInCommand | StockOutCommand;

export type ParseResult =
  | { ok: true; command: ParsedChatCommand }
  | { ok: false; message: string };

export interface ResolvedChatUser {
  id: string;
  displayName: string;
}

export interface ProcessChatInputResult {
  success: boolean;
  status: 'processed' | 'ignored' | 'failed';
  replyText: string;
}
```

- [ ] **Step 4: Commit types and failing tests**

```bash
git add lib/server/chat-input/types.ts tests/server/chatInputParser.test.ts
git commit -m "test: define chat input parser contract"
```

---

### Task 3: Implement Deterministic Command Parser

**Files:**
- Create: `lib/server/chat-input/parser.ts`
- Test: `tests/server/chatInputParser.test.ts`

- [ ] **Step 1: Implement the parser**

Create `lib/server/chat-input/parser.ts`:

```ts
import type { ParseResult, StockOutCommand } from './types';

const HELP_TEXT = [
  'Format belum dikenali.',
  'Contoh:',
  'pengeluaran 50000 pupuk beli npk',
  'pemasukan 750000 penjualan cabai',
  'stok masuk 50kg grade A modal 18000 jual 25000 gudang utama exp 2026-06-20',
  'stok keluar BATCH-001-A 20kg pasar lokal kirim pagi',
].join('\n');

function normalizeText(input: string) {
  return input.trim().replace(/\s+/g, ' ');
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^\d]/g, '');
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseWeightKg(value: string) {
  const match = value.match(/^(\d+(?:[.,]\d+)?)(?:\s?kg)?$/i);
  if (!match) return null;
  const weight = Number(match[1].replace(',', '.'));
  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function titleCase(input: string) {
  return input
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizeDestination(input: string): StockOutCommand['tujuan'] {
  const value = input.toLowerCase();
  if (value.includes('distributor')) return 'Distributor';
  if (value.includes('restoran')) return 'Restoran';
  if (value.includes('pasar')) return 'Pasar Lokal';
  return 'Lainnya';
}

function parseFinance(text: string): ParseResult | null {
  const match = text.match(/^(pengeluaran|pemasukan)\s+(\S+)\s+(\S+)(?:\s+(.*))?$/i);
  if (!match) return null;

  const nominal = parseAmount(match[2]);
  if (!nominal) return { ok: false, message: 'Nominal harus lebih dari 0.' };

  return {
    ok: true,
    command: {
      type: 'finance',
      jenis: match[1].toLowerCase() === 'pemasukan' ? 'pendapatan' : 'pengeluaran',
      nominal,
      kategori: match[3].toLowerCase(),
      keterangan: (match[4] || '').trim(),
    },
  };
}

function parseStockIn(text: string): ParseResult | null {
  const match = text.match(
    /^stok\s+masuk\s+(\S+)\s+grade\s+([abc])\s+modal\s+(\S+)\s+jual\s+(\S+)\s+(.+?)\s+exp\s+(\d{4}-\d{2}-\d{2})(?:\s+(.*))?$/i,
  );
  if (!match) return null;

  const berat = parseWeightKg(match[1]);
  const hargaModal = parseAmount(match[3]);
  const hargaJual = parseAmount(match[4]);
  if (!berat || !hargaModal || !hargaJual) {
    return { ok: false, message: 'Berat, modal, dan harga jual harus berupa angka valid.' };
  }

  const lokasiText = match[5].toLowerCase();
  const lokasiPenyimpanan = lokasiText.includes('cadangan') ? 'Gudang Cadangan' : 'Gudang Utama';

  return {
    ok: true,
    command: {
      type: 'stock_in',
      berat,
      grade: match[2].toUpperCase() as 'A' | 'B' | 'C',
      hargaModal,
      hargaJual,
      lokasiPenyimpanan,
      estimasiKadaluarsa: match[6],
      catatan: (match[7] || '').trim(),
    },
  };
}

function parseStockOut(text: string): ParseResult | null {
  const match = text.match(/^stok\s+keluar\s+(\S+)\s+(\S+)\s+(.+?)(?:\s+(kirim|catatan)\s+(.+))?$/i);
  if (!match) return null;

  const berat = parseWeightKg(match[2]);
  if (!berat) return { ok: false, message: 'Berat stok keluar harus lebih dari 0 kg.' };

  const destinationText = match[3].replace(/\s+(kirim|catatan)\s+.*$/i, '').trim();

  return {
    ok: true,
    command: {
      type: 'stock_out',
      batchCode: match[1].toUpperCase(),
      berat,
      tujuan: normalizeDestination(destinationText),
      catatan: titleCase(destinationText) === 'Lainnya' ? destinationText : (match[5] || '').trim(),
    },
  };
}

export function parseChatInput(input: string): ParseResult {
  const text = normalizeText(input);
  if (!text) return { ok: false, message: HELP_TEXT };

  return parseFinance(text)
    || parseStockIn(text)
    || parseStockOut(text)
    || { ok: false, message: HELP_TEXT };
}
```

- [ ] **Step 2: Run parser tests**

Run: `npm run test -- tests/server/chatInputParser.test.ts`

Expected: PASS.

- [ ] **Step 3: Commit parser**

```bash
git add lib/server/chat-input/parser.ts tests/server/chatInputParser.test.ts
git commit -m "feat: parse chat input commands"
```

---

### Task 4: Resolve Telegram and WhatsApp Senders to Profiles

**Files:**
- Create: `lib/server/chat-input/identity.ts`
- Test: `tests/server/chatInputProcessor.test.ts`

- [ ] **Step 1: Add identity tests inside processor test file**

Create `tests/server/chatInputProcessor.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  sendDirectNotification: vi.fn(),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('@/lib/server/notifications/channels', () => ({
  sendDirectNotification: mocks.sendDirectNotification,
}));

function createSupabaseMock(profile: unknown | null) {
  const single = vi.fn(async () => (
    profile
      ? { data: profile, error: null }
      : { data: null, error: { message: 'No rows found' } }
  ));

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single })),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe('processInboundChatMessage identity handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendDirectNotification.mockResolvedValue({ success: true, data: { ok: true } });
  });

  it('replies with account-linking instructions for unknown Telegram chat IDs', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(createSupabaseMock(null));
    const { processInboundChatMessage } = await import('@/lib/server/chat-input/processor');

    const result = await processInboundChatMessage({
      channel: 'telegram',
      externalMessageId: 'tg-1',
      senderId: '123456',
      text: 'pengeluaran 50000 pupuk',
      receivedAt: '2026-06-03T00:00:00.000Z',
      replyTo: '123456',
    });

    expect(result.status).toBe('ignored');
    expect(result.replyText).toContain('Akun Telegram ini belum terhubung');
    expect(mocks.sendDirectNotification).toHaveBeenCalledWith(expect.objectContaining({
      platform: 'telegram',
      to: '123456',
    }));
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- tests/server/chatInputProcessor.test.ts`

Expected: FAIL because processor and identity modules do not exist.

- [ ] **Step 3: Implement identity resolver**

Create `lib/server/chat-input/identity.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatInputChannel, ResolvedChatUser } from './types';

function normalizeWhatsAppPhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export async function resolveChatUser(
  supabase: SupabaseClient,
  channel: ChatInputChannel,
  senderId: string,
): Promise<ResolvedChatUser | null> {
  const column = channel === 'telegram' ? 'telegram_chat_id' : 'whatsapp_phone';
  const value = channel === 'telegram' ? senderId.trim() : normalizeWhatsAppPhone(senderId);

  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .eq(column, value)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    displayName: data.full_name || data.email || 'Petani',
  };
}
```

- [ ] **Step 4: Commit identity layer**

```bash
git add lib/server/chat-input/identity.ts tests/server/chatInputProcessor.test.ts
git commit -m "feat: resolve chat input identities"
```

---

### Task 5: Add Record Writers for Finance and Stock

**Files:**
- Create: `lib/server/chat-input/records.ts`
- Test: `tests/server/chatInputRecords.test.ts`

- [ ] **Step 1: Write record writer tests**

Create `tests/server/chatInputRecords.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { recordFinanceCommand, recordStockOutCommand } from '@/lib/server/chat-input/records';

function createInsertBuilder(result: unknown) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: result, error: null })),
      })),
    })),
  };
}

describe('chat input record writers', () => {
  it('inserts finance transactions for the resolved user', async () => {
    const transactions = createInsertBuilder({ id: 'tx-1' });
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('transactions');
        return transactions;
      }),
    } as any;

    const result = await recordFinanceCommand(supabase, 'user-1', {
      type: 'finance',
      jenis: 'pengeluaran',
      kategori: 'pupuk',
      nominal: 50000,
      keterangan: 'beli npk',
    }, new Date('2026-06-03T00:00:00.000Z'));

    expect(result.summary).toContain('Pengeluaran Rp50.000');
    expect(transactions.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      jenis: 'pengeluaran',
      kategori: 'pupuk',
      nominal: 50000,
      keterangan: 'beli npk',
    }));
  });

  it('rejects stock out when remaining stock is insufficient', async () => {
    const batchSingle = vi.fn(async () => ({
      data: {
        id: 'batch-1',
        batch_code: 'BATCH-001-A',
        berat_masuk: 50,
        stok_tersisa: 10,
        estimasi_kadaluarsa: '2026-06-20',
      },
      error: null,
    }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'harvest_batches') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({ single: batchSingle })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as any;

    await expect(recordStockOutCommand(supabase, 'user-1', {
      type: 'stock_out',
      batchCode: 'BATCH-001-A',
      berat: 20,
      tujuan: 'Pasar Lokal',
      catatan: '',
    }, new Date('2026-06-03T00:00:00.000Z'))).rejects.toThrow('Stok tidak cukup');
  });
});
```

- [ ] **Step 2: Run record tests to verify failure**

Run: `npm run test -- tests/server/chatInputRecords.test.ts`

Expected: FAIL because `records.ts` does not exist.

- [ ] **Step 3: Implement record writers**

Create `lib/server/chat-input/records.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinanceCommand, StockInCommand, StockOutCommand } from './types';

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function computeStatus(stokTersisa: number, beratMasuk: number, estimasiKadaluarsa: string) {
  const now = new Date();
  const kadaluarsa = new Date(estimasiKadaluarsa);
  const daysLeft = Math.ceil((kadaluarsa.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (stokTersisa === 0) return 'habis';
  if (daysLeft <= 3) return 'hampir_kadaluarsa';
  if (stokTersisa < beratMasuk * 0.2) return 'menipis';
  return 'aman';
}

function toDateString(now: Date) {
  return now.toISOString().slice(0, 10);
}

export async function recordFinanceCommand(
  supabase: SupabaseClient,
  userId: string,
  command: FinanceCommand,
  now: Date,
) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      jenis: command.jenis,
      kategori: command.kategori,
      nominal: command.nominal,
      tanggal: toDateString(now),
      keterangan: command.keterangan,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const label = command.jenis === 'pendapatan' ? 'Pemasukan' : 'Pengeluaran';
  return {
    data,
    summary: `${label} ${formatRupiah(command.nominal)} kategori ${command.kategori} berhasil dicatat.`,
  };
}

export async function recordStockInCommand(
  supabase: SupabaseClient,
  userId: string,
  command: StockInCommand,
  now: Date,
) {
  const { count } = await supabase
    .from('harvest_batches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const batchCode = `BATCH-${String((count ?? 0) + 1).padStart(3, '0')}-${command.grade}`;
  const status = computeStatus(command.berat, command.berat, command.estimasiKadaluarsa);

  const { data: batch, error: batchError } = await supabase
    .from('harvest_batches')
    .insert({
      user_id: userId,
      batch_code: batchCode,
      tanggal_panen: toDateString(now),
      grade: command.grade,
      berat_masuk: command.berat,
      stok_tersisa: command.berat,
      harga_modal: command.hargaModal,
      harga_jual: command.hargaJual,
      lokasi_penyimpanan: command.lokasiPenyimpanan,
      estimasi_kadaluarsa: command.estimasiKadaluarsa,
      catatan: command.catatan,
      status,
    })
    .select()
    .single();

  if (batchError) throw new Error(batchError.message);

  const { error: mutationError } = await supabase
    .from('stock_mutations')
    .insert({
      user_id: userId,
      batch_id: batch.id,
      batch_code: batchCode,
      tipe: 'masuk',
      berat: command.berat,
      tanggal: toDateString(now),
      catatan: command.catatan || 'Panen dicatat dari chat',
    });

  if (mutationError) throw new Error(mutationError.message);

  return {
    data: batch,
    summary: `Stok masuk ${command.berat} kg berhasil dicatat sebagai ${batchCode}.`,
  };
}

export async function recordStockOutCommand(
  supabase: SupabaseClient,
  userId: string,
  command: StockOutCommand,
  now: Date,
) {
  const { data: batch, error: batchError } = await supabase
    .from('harvest_batches')
    .select('*')
    .eq('user_id', userId)
    .eq('batch_code', command.batchCode)
    .single();

  if (batchError || !batch) throw new Error(`Batch ${command.batchCode} tidak ditemukan.`);
  if (command.berat > Number(batch.stok_tersisa)) {
    throw new Error(`Stok tidak cukup. Tersisa: ${batch.stok_tersisa} kg.`);
  }

  const newStock = Number(batch.stok_tersisa) - command.berat;
  const newStatus = computeStatus(newStock, Number(batch.berat_masuk), batch.estimasi_kadaluarsa);

  const { error: updateError } = await supabase
    .from('harvest_batches')
    .update({
      stok_tersisa: newStock,
      status: newStatus,
      updated_at: now.toISOString(),
    })
    .eq('id', batch.id);

  if (updateError) throw new Error(updateError.message);

  const { data: mutation, error: mutationError } = await supabase
    .from('stock_mutations')
    .insert({
      user_id: userId,
      batch_id: batch.id,
      batch_code: command.batchCode,
      tipe: 'keluar',
      berat: command.berat,
      tujuan: command.tujuan,
      tanggal: toDateString(now),
      catatan: command.catatan,
    })
    .select()
    .single();

  if (mutationError) throw new Error(mutationError.message);

  return {
    data: mutation,
    summary: `Stok keluar ${command.berat} kg dari ${command.batchCode} berhasil dicatat. Sisa stok ${newStock} kg.`,
  };
}
```

- [ ] **Step 4: Run record tests**

Run: `npm run test -- tests/server/chatInputRecords.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit record writers**

```bash
git add lib/server/chat-input/records.ts tests/server/chatInputRecords.test.ts
git commit -m "feat: record chat input finance and stock"
```

---

### Task 6: Implement the Shared Processor

**Files:**
- Create: `lib/server/chat-input/processor.ts`
- Modify: `tests/server/chatInputProcessor.test.ts`

- [ ] **Step 1: Add successful processing test**

Append to `tests/server/chatInputProcessor.test.ts`:

```ts
it('records valid finance input and sends a confirmation reply', async () => {
  const logInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'log-1' }, error: null })) })) }));
  const logUpdate = vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) }));
  const txInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'tx-1' }, error: null })) })) }));
  const profileSingle = vi.fn(async () => ({ data: { id: 'user-1', full_name: 'Budi' }, error: null }));

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: profileSingle })) })) };
      }
      if (table === 'inbound_message_logs') {
        return { insert: logInsert, update: logUpdate };
      }
      if (table === 'transactions') {
        return { insert: txInsert };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  mocks.getSupabaseAdmin.mockReturnValue(supabase);

  const { processInboundChatMessage } = await import('@/lib/server/chat-input/processor');
  const result = await processInboundChatMessage({
    channel: 'telegram',
    externalMessageId: 'tg-2',
    senderId: '123456',
    text: 'pengeluaran 50000 pupuk beli npk',
    receivedAt: '2026-06-03T00:00:00.000Z',
    replyTo: '123456',
  });

  expect(result.status).toBe('processed');
  expect(result.replyText).toContain('Pengeluaran Rp50.000');
  expect(mocks.sendDirectNotification).toHaveBeenCalledWith(expect.objectContaining({
    platform: 'telegram',
    to: '123456',
    message: expect.stringContaining('berhasil dicatat'),
  }));
});
```

- [ ] **Step 2: Implement processor**

Create `lib/server/chat-input/processor.ts`:

```ts
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { sendDirectNotification } from '@/lib/server/notifications/channels';
import { resolveChatUser } from './identity';
import { parseChatInput } from './parser';
import { recordFinanceCommand, recordStockInCommand, recordStockOutCommand } from './records';
import type { InboundChatMessage, ProcessChatInputResult } from './types';

async function reply(message: InboundChatMessage, text: string) {
  await sendDirectNotification({
    platform: message.channel,
    to: message.replyTo,
    message: text,
    metadata: {
      source: 'chat-input',
      externalMessageId: message.externalMessageId,
    },
  });
}

export async function processInboundChatMessage(message: InboundChatMessage): Promise<ProcessChatInputResult> {
  const supabase = getSupabaseAdmin();
  const now = new Date(message.receivedAt);

  const user = await resolveChatUser(supabase, message.channel, message.senderId);
  if (!user) {
    const platform = message.channel === 'telegram' ? 'Telegram' : 'WhatsApp';
    const replyText = `Akun ${platform} ini belum terhubung ke Arina Agri. Simpan ${platform} Anda di pengaturan profil terlebih dahulu.`;
    await reply(message, replyText);
    return { success: true, status: 'ignored', replyText };
  }

  const parsed = parseChatInput(message.text);
  if (!parsed.ok) {
    await reply(message, parsed.message);
    return { success: true, status: 'ignored', replyText: parsed.message };
  }

  const { data: logRow, error: logError } = await supabase
    .from('inbound_message_logs')
    .insert({
      channel: message.channel,
      external_message_id: message.externalMessageId,
      user_id: user.id,
      sender_id: message.senderId,
      raw_text: message.text,
      command_type: parsed.command.type,
      status: 'received',
    })
    .select()
    .single();

  if (logError) {
    const duplicateText = 'Pesan ini sudah pernah diproses.';
    await reply(message, duplicateText);
    return { success: true, status: 'ignored', replyText: duplicateText };
  }

  try {
    const result = parsed.command.type === 'finance'
      ? await recordFinanceCommand(supabase, user.id, parsed.command, now)
      : parsed.command.type === 'stock_in'
        ? await recordStockInCommand(supabase, user.id, parsed.command, now)
        : await recordStockOutCommand(supabase, user.id, parsed.command, now);

    await supabase
      .from('inbound_message_logs')
      .update({
        status: 'processed',
        response_text: result.summary,
        processed_at: now.toISOString(),
      })
      .eq('id', logRow.id);

    await reply(message, result.summary);
    return { success: true, status: 'processed', replyText: result.summary };
  } catch (error) {
    const replyText = error instanceof Error ? error.message : 'Gagal memproses pesan.';
    await supabase
      .from('inbound_message_logs')
      .update({
        status: 'failed',
        error_message: replyText,
        response_text: replyText,
        processed_at: now.toISOString(),
      })
      .eq('id', logRow.id);

    await reply(message, replyText);
    return { success: false, status: 'failed', replyText };
  }
}
```

- [ ] **Step 3: Run processor tests**

Run: `npm run test -- tests/server/chatInputProcessor.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit processor**

```bash
git add lib/server/chat-input/processor.ts tests/server/chatInputProcessor.test.ts
git commit -m "feat: process inbound chat input"
```

---

### Task 7: Add Telegram Webhook Route

**Files:**
- Create: `app/api/webhook/telegram/route.ts`
- Create: `tests/api/telegramWebhookRoute.test.ts`

- [ ] **Step 1: Write Telegram route tests**

Create `tests/api/telegramWebhookRoute.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  processInboundChatMessage: vi.fn(),
}));

vi.mock('@/lib/server/chat-input/processor', () => ({
  processInboundChatMessage: mocks.processInboundChatMessage,
}));

describe('/api/webhook/telegram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret-token';
    mocks.processInboundChatMessage.mockResolvedValue({
      success: true,
      status: 'processed',
      replyText: 'ok',
    });
  });

  it('rejects requests with an invalid Telegram secret token', async () => {
    const { POST } = await import('@/app/api/webhook/telegram/route');
    const response = await POST(new Request('http://localhost/api/webhook/telegram', {
      method: 'POST',
      headers: { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' },
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(401);
  });

  it('maps Telegram text messages into shared inbound messages', async () => {
    const { POST } = await import('@/app/api/webhook/telegram/route');
    const response = await POST(new Request('http://localhost/api/webhook/telegram', {
      method: 'POST',
      headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret-token' },
      body: JSON.stringify({
        update_id: 100,
        message: {
          message_id: 200,
          date: 1780454400,
          text: 'pengeluaran 50000 pupuk',
          chat: { id: 123456, first_name: 'Budi' },
          from: { id: 123456, first_name: 'Budi' },
        },
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.processInboundChatMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'telegram',
      externalMessageId: '100:200',
      senderId: '123456',
      replyTo: '123456',
      text: 'pengeluaran 50000 pupuk',
    }));
  });
});
```

- [ ] **Step 2: Implement Telegram route**

Create `app/api/webhook/telegram/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { processInboundChatMessage } from '@/lib/server/chat-input/processor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const actualSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  if (expectedSecret && actualSecret !== expectedSecret) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const message = body.message || body.edited_message;
  if (!message?.text || !message?.chat?.id) {
    return NextResponse.json({ success: true, message: 'Ignored non-text update' });
  }

  const result = await processInboundChatMessage({
    channel: 'telegram',
    externalMessageId: `${body.update_id}:${message.message_id}`,
    senderId: String(message.chat.id),
    senderDisplayName: message.from?.first_name || message.chat?.first_name,
    text: message.text,
    receivedAt: new Date(Number(message.date || Date.now() / 1000) * 1000).toISOString(),
    replyTo: String(message.chat.id),
  });

  return NextResponse.json({ success: true, data: result });
}
```

- [ ] **Step 3: Run Telegram route tests**

Run: `npm run test -- tests/api/telegramWebhookRoute.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit Telegram route**

```bash
git add app/api/webhook/telegram/route.ts tests/api/telegramWebhookRoute.test.ts
git commit -m "feat: add telegram input webhook"
```

---

### Task 8: Add WhatsApp Webhook Route

**Files:**
- Create: `app/api/webhook/whatsapp/route.ts`
- Create: `tests/api/whatsappWebhookRoute.test.ts`

- [ ] **Step 1: Write WhatsApp route tests**

Create `tests/api/whatsappWebhookRoute.test.ts`:

```ts
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  processInboundChatMessage: vi.fn(),
}));

vi.mock('@/lib/server/chat-input/processor', () => ({
  processInboundChatMessage: mocks.processInboundChatMessage,
}));

function sign(body: string, secret: string) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('/api/webhook/whatsapp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'verify-token';
    process.env.WHATSAPP_APP_SECRET = 'app-secret';
    mocks.processInboundChatMessage.mockResolvedValue({
      success: true,
      status: 'processed',
      replyText: 'ok',
    });
  });

  it('returns hub challenge for valid verification token', async () => {
    const { GET } = await import('@/app/api/webhook/whatsapp/route');
    const response = await GET(new Request(
      'http://localhost/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=abc123',
    ));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('abc123');
  });

  it('rejects invalid signatures', async () => {
    const { POST } = await import('@/app/api/webhook/whatsapp/route');
    const response = await POST(new Request('http://localhost/api/webhook/whatsapp', {
      method: 'POST',
      headers: { 'x-hub-signature-256': 'sha256=bad' },
      body: '{}',
    }));

    expect(response.status).toBe(401);
  });

  it('maps WhatsApp text messages into shared inbound messages', async () => {
    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            contacts: [{ profile: { name: 'Budi' }, wa_id: '628123456789' }],
            messages: [{
              id: 'wamid.1',
              from: '628123456789',
              timestamp: '1780454400',
              type: 'text',
              text: { body: 'pemasukan 750000 penjualan cabai' },
            }],
          },
        }],
      }],
    });

    const { POST } = await import('@/app/api/webhook/whatsapp/route');
    const response = await POST(new Request('http://localhost/api/webhook/whatsapp', {
      method: 'POST',
      headers: { 'x-hub-signature-256': sign(body, 'app-secret') },
      body,
    }));

    expect(response.status).toBe(200);
    expect(mocks.processInboundChatMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'whatsapp',
      externalMessageId: 'wamid.1',
      senderId: '628123456789',
      replyTo: '628123456789',
      text: 'pemasukan 750000 penjualan cabai',
    }));
  });
});
```

- [ ] **Step 2: Implement WhatsApp route**

Create `app/api/webhook/whatsapp/route.ts`:

```ts
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { processInboundChatMessage } from '@/lib/server/chat-input/processor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isValidSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return process.env.NODE_ENV !== 'production';
  if (!signature?.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const changes = body.entry?.flatMap((entry: any) => entry.changes || []) || [];
  const results = [];

  for (const change of changes) {
    const value = change.value || {};
    const contactByWaId = new Map((value.contacts || []).map((contact: any) => [
      contact.wa_id,
      contact.profile?.name,
    ]));

    for (const message of value.messages || []) {
      if (message.type !== 'text' || !message.text?.body || !message.from) continue;

      const result = await processInboundChatMessage({
        channel: 'whatsapp',
        externalMessageId: message.id,
        senderId: message.from,
        senderDisplayName: contactByWaId.get(message.from),
        text: message.text.body,
        receivedAt: new Date(Number(message.timestamp || Date.now() / 1000) * 1000).toISOString(),
        replyTo: message.from,
      });
      results.push(result);
    }
  }

  return NextResponse.json({ success: true, data: results });
}
```

- [ ] **Step 3: Run WhatsApp route tests**

Run: `npm run test -- tests/api/whatsappWebhookRoute.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit WhatsApp route**

```bash
git add app/api/webhook/whatsapp/route.ts tests/api/whatsappWebhookRoute.test.ts
git commit -m "feat: add whatsapp input webhook"
```

---

### Task 9: Update Documentation and Environment Setup

**Files:**
- Modify: `README.md`
- Modify: `messages/id.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Update README endpoint table**

Replace the old inbound webhook row with:

```md
| `/api/webhook/telegram` | POST | Webhook Telegram Bot API untuk input transaksi/stok |
| `/api/webhook/whatsapp` | GET/POST | Verifikasi dan webhook WhatsApp Cloud API untuk input transaksi/stok |
```

- [ ] **Step 2: Update README integration section**

Use this integration bullet:

```md
- **WhatsApp Cloud API / Telegram Bot API** untuk notifikasi dan input pencatatan via chat.
```

- [ ] **Step 3: Update README env variables**

Add:

```md
| `TELEGRAM_WEBHOOK_SECRET` | Secret token Telegram webhook, dikirim via `X-Telegram-Bot-Api-Secret-Token` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token verifikasi webhook WhatsApp Cloud API |
| `WHATSAPP_APP_SECRET` | App secret untuk validasi `x-hub-signature-256` WhatsApp |
```

- [ ] **Step 4: Update i18n copy**

Set `messages/id.json` notification note to:

```json
"note": "Pilih platform notifikasi terlebih dahulu, lalu simpan kontak tujuan yang sesuai. WhatsApp memakai nomor HP, sedangkan Telegram memakai Chat ID atau username bot Anda."
```

Set `messages/en.json` notification note to:

```json
"note": "Choose your notification platform first, then save the corresponding contact. WhatsApp uses a phone number, while Telegram uses your bot chat ID or username."
```

- [ ] **Step 5: Run docs and i18n verification**

Run: `npm run i18n:check`

Expected: PASS.

- [ ] **Step 6: Commit docs**

```bash
git add README.md messages/id.json messages/en.json
git commit -m "docs: document direct chat input webhooks"
```

---

### Task 10: Final Verification

**Files:**
- All files touched in this plan.

- [ ] **Step 1: Run focused tests**

```bash
npm run test -- tests/server/chatInputParser.test.ts tests/server/chatInputRecords.test.ts tests/server/chatInputProcessor.test.ts tests/api/telegramWebhookRoute.test.ts tests/api/whatsappWebhookRoute.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full quality gate**

```bash
npm run ci
```

Expected: PASS.

- [ ] **Step 3: Verify there are no live n8n runtime references**

```bash
rg -n "n8n|N8N|webhook/n8n" app lib backend/src README.md messages docs/deployment context.md notifikasi.md
```

Expected: no matches in live code and current docs. Historical files under `docs/superpowers/**` may still mention older n8n decisions and should only be changed if the project wants to rewrite archived design history.

- [ ] **Step 4: Commit final verification fixes if any**

```bash
git add app lib tests README.md messages docs/database
git commit -m "feat: add backend chat input"
```
