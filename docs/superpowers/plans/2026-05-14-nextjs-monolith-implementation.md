# Next.js Monolith Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Express backend with Next.js Route Handlers and Vercel Cron endpoints while keeping API paths intact.

**Architecture:** Server-only logic moves to `lib/server/*` and is invoked by App Router route handlers in `app/api/**/route.ts`. Vercel Cron calls authenticated cron endpoints, while schedule state is stored in Supabase. Client API calls use same-origin `/api/...` endpoints.

**Tech Stack:** Next.js App Router, Supabase JS, Vercel Cron, puppeteer-core + @sparticuz/chromium, Vitest.

---

## File Structure

**Create**
- `lib/server/cron/auth.ts` — cron auth helper for serverless endpoints
- `lib/server/supabaseAdmin.ts` — service role Supabase client factory
- `lib/server/news/helpers.ts` — RSS relevance helpers (moved from backend)
- `lib/server/news/fetch.ts` — fetch + upsert + cleanup news
- `lib/server/notifications/channels.ts` — WhatsApp/Telegram sender
- `lib/server/notifications/decision.ts` — rule engine + message builder
- `lib/server/notifications/schedule.ts` — schedule validation and due logic
- `lib/server/notifications/process.ts` — cron processor for schedules
- `lib/server/notifications/scheduleHandlers.ts` — GET/POST handlers for schedule
- `lib/server/ai/gemini.ts` — Gemini prompt logic
- `lib/server/ai/validators.ts` — input validation helpers
- `lib/server/prices/scraper.ts` — serverless price scraping
- `app/api/ai/gemini/route.ts`
- `app/api/ai/financial-report/route.ts`
- `app/api/health/route.ts`
- `app/api/news/trigger/route.ts`
- `app/api/notification/send/route.ts`
- `app/api/notification/schedule/route.ts`
- `app/api/notification/decide/route.ts`
- `app/api/notification/decide-send/route.ts`
- `app/api/cron/news/route.ts`
- `app/api/cron/notifications/route.ts`
- `app/api/cron/prices/route.ts`
- `tests/server/cronAuth.test.ts`
- `tests/server/newsHelpers.test.ts`
- `tests/server/notificationSchedule.test.ts`
- `tests/server/aiValidators.test.ts`
- `tests/server/priceParser.test.ts`

**Modify**
- `app/api/news/route.ts` — use shared server modules
- `app/api/webhook/n8n/route.ts` — use shared Supabase admin helper
- `app/api/notifications/schedule/route.ts` — re-export schedule handlers
- `lib/api.ts` — same-origin API base + schedule auth header
- `vercel.json` — cron schedules for news/notifications/prices
- `package.json` — scripts and dependencies

**Delete**
- `app/api/cron/daily/route.ts`
- `lib/notifications/service.ts`

---

### Task 1: Server Utilities (Supabase Admin + Cron Auth)

**Files:**
- Create: `lib/server/cron/auth.ts`
- Create: `lib/server/supabaseAdmin.ts`
- Create: `tests/server/cronAuth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { isCronAuthorized } from '@/lib/server/cron/auth';

const originalEnv = { ...process.env };

function makeRequest(auth?: string) {
  return new Request('http://localhost', {
    headers: auth ? { authorization: auth } : {},
  });
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('isCronAuthorized', () => {
  it('allows requests in development without auth header', () => {
    process.env.NODE_ENV = 'development';
    expect(isCronAuthorized(makeRequest())).toBe(true);
  });

  it('denies in production when secret is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(makeRequest())).toBe(false);
  });

  it('denies in production with wrong header', () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'secret';
    expect(isCronAuthorized(makeRequest('Bearer wrong'))).toBe(false);
  });

  it('allows in production with correct header', () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'secret';
    expect(isCronAuthorized(makeRequest('Bearer secret'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest tests/server/cronAuth.test.ts`

Expected: FAIL with module not found for `@/lib/server/cron/auth`.

- [ ] **Step 3: Implement cron auth helper**

```ts
export function isCronAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const auth = request.headers.get('authorization');
  return auth === `Bearer ${expected}`;
}

export function requireCronAuth(request: Request): Response | null {
  return isCronAuthorized(request) ? null : new Response('Unauthorized', { status: 401 });
}
```

- [ ] **Step 4: Implement Supabase admin helper**

```ts
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, serviceRoleKey);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest tests/server/cronAuth.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/server/cron/auth.ts lib/server/supabaseAdmin.ts tests/server/cronAuth.test.ts

git commit -m "feat: add cron auth and supabase admin helpers"
```

---

### Task 2: News Pipeline + Cron Endpoint

**Files:**
- Create: `lib/server/news/helpers.ts`
- Create: `lib/server/news/fetch.ts`
- Create: `app/api/news/trigger/route.ts`
- Create: `app/api/cron/news/route.ts`
- Modify: `app/api/news/route.ts`
- Create: `tests/server/newsHelpers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { extractSnippet, isAgriRelevant } from '@/lib/server/news/helpers';

describe('isAgriRelevant', () => {
  it('matches agriculture keywords in title', () => {
    expect(isAgriRelevant('Harga cabai naik tajam')).toBe(true);
  });

  it('returns false when no keyword is present', () => {
    expect(isAgriRelevant('Teknologi startup terbaru')).toBe(false);
  });
});

describe('extractSnippet', () => {
  it('strips html tags and trims output', () => {
    expect(extractSnippet('<p>Hello <b>World</b></p>', null)).toBe('Hello World');
  });

  it('returns null for empty content', () => {
    expect(extractSnippet('', '')).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest tests/server/newsHelpers.test.ts`

Expected: FAIL with module not found for `@/lib/server/news/helpers`.

- [ ] **Step 3: Implement news helpers**

```ts
import Parser from 'rss-parser';

export const AGRI_KEYWORDS = [
  'cabai', 'pupuk', 'hama', 'cuaca', 'panen', 'pertanian', 'harga',
  'komoditas', 'agri', 'petani', 'sawah', 'irigasi', 'holtikultura',
  'tanaman', 'kebun', 'lahan', 'beras', 'jagung', 'kedelai', 'tomat', 'padi'
];

export function isAgriRelevant(title: string, content?: string): boolean {
  const textToCheck = `${title} ${content || ''}`.toLowerCase();
  return AGRI_KEYWORDS.some((kw) => textToCheck.includes(kw));
}

export function extractSnippet(content?: string | null, summary?: string | null): string | null {
  const raw = content || summary || '';
  const stripped = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!stripped) return null;
  return stripped.length > 200 ? `${stripped.substring(0, 200)}...` : stripped;
}

export function extractImageUrl(item: Parser.Item & { enclosure?: { url?: string } }): string | null {
  const mediaContent = (item as Record<string, unknown>)['media:content'] as
    | { $?: { url?: string } }
    | undefined;
  if (mediaContent?.['$']?.url) return mediaContent['$'].url;

  if (item.enclosure?.url) return item.enclosure.url;

  const contentHtml = (item as Record<string, unknown>)['content:encoded'] as string | undefined;
  if (contentHtml) {
    const match = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match?.[1]) return match[1];
  }

  return null;
}
```

- [ ] **Step 4: Implement news fetcher**

```ts
import Parser from 'rss-parser';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { extractImageUrl, extractSnippet, isAgriRelevant } from './helpers';

interface NewsArticleInsert {
  title: string;
  snippet: string | null;
  link: string;
  source: string;
  image_url: string | null;
  pub_date: string;
}

const RSS_SOURCES = [
  {
    name: 'Berita Pertanian',
    url: 'https://news.google.com/rss/search?q=pertanian+OR+agribisnis+OR+petani+when:7d&hl=id&gl=ID&ceid=ID:id',
  },
  {
    name: 'Info Komoditas',
    url: 'https://news.google.com/rss/search?q=komoditas+pangan+OR+"harga+cabai"+OR+"harga+pupuk"+when:7d&hl=id&gl=ID&ceid=ID:id',
  },
  {
    name: 'Kabar Panen & Cuaca',
    url: 'https://news.google.com/rss/search?q="gagal+panen"+OR+"musim+tanam"+OR+"hama+tanaman"+when:14d&hl=id&gl=ID&ceid=ID:id',
  },
];

const ITEMS_PER_SOURCE = 5;

async function fetchSource(parser: Parser, source: { name: string; url: string }) {
  const feed = await parser.parseURL(source.url);
  const items = feed.items.slice(0, ITEMS_PER_SOURCE);

  const toInsert: NewsArticleInsert[] = [];

  for (const item of items) {
    if (!item.title || !item.link) continue;

    const isRelevant = isAgriRelevant(item.title, item.contentSnippet || item.summary);
    if (!isRelevant) continue;

    const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

    toInsert.push({
      title: item.title.trim(),
      snippet: extractSnippet(item.contentSnippet, item.summary),
      link: item.link,
      source: source.name,
      image_url: extractImageUrl(item as Parser.Item & { enclosure?: { url?: string } }),
      pub_date: pubDate,
    });
  }

  return toInsert;
}

export async function fetchNewsAndUpsert(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media:content', { keepArray: false }],
        ['content:encoded', 'content:encoded'],
      ],
    },
    timeout: 15000,
  });

  const batches = await Promise.all(RSS_SOURCES.map((source) => fetchSource(parser, source)));
  const toInsert = batches.flat();

  if (toInsert.length === 0) return 0;

  const { error } = await supabase
    .from('news_articles')
    .upsert(toInsert, { onConflict: 'link', ignoreDuplicates: true });

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }

  return toInsert.length;
}

export async function cleanupOldNews(days: number = 30): Promise<number> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { error, count } = await supabase
    .from('news_articles')
    .delete({ count: 'exact' })
    .lt('pub_date', cutoff.toISOString());

  if (error) {
    throw new Error(`Supabase cleanup error: ${error.message}`);
  }

  return count ?? 0;
}
```

- [ ] **Step 5: Update news API route**

```ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = getSupabaseAdmin();

    const { data, error, count } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact' })
      .order('pub_date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[API News] Supabase error:', error.message);
      return NextResponse.json({ success: false, message: 'Gagal mengambil data berita' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API News] Error:', message);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Add news trigger endpoint**

```ts
import { NextResponse } from 'next/server';
import { fetchNewsAndUpsert } from '@/lib/server/news/fetch';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const inserted = await fetchNewsAndUpsert();
    return NextResponse.json({
      success: true,
      message: 'Fetch berita selesai dilakukan',
      inserted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
```

- [ ] **Step 7: Add news cron endpoint**

```ts
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/server/cron/auth';
import { cleanupOldNews, fetchNewsAndUpsert } from '@/lib/server/news/fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (auth) return auth;

  try {
    const inserted = await fetchNewsAndUpsert();
    const deleted = await cleanupOldNews(30);

    return NextResponse.json({
      success: true,
      message: 'News cron completed',
      inserted,
      deleted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
```

- [ ] **Step 8: Run tests**

Run: `npx vitest tests/server/newsHelpers.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/server/news/helpers.ts lib/server/news/fetch.ts app/api/news/route.ts app/api/news/trigger/route.ts app/api/cron/news/route.ts tests/server/newsHelpers.test.ts

git commit -m "feat: migrate news pipeline to Next.js"
```

---

### Task 3: Notification Core + Schedule + Routes + Cron

**Files:**
- Create: `lib/server/notifications/decision.ts`
- Create: `lib/server/notifications/channels.ts`
- Create: `lib/server/notifications/schedule.ts`
- Create: `lib/server/notifications/process.ts`
- Create: `lib/server/notifications/scheduleHandlers.ts`
- Create: `app/api/notification/send/route.ts`
- Create: `app/api/notification/schedule/route.ts`
- Create: `app/api/notification/decide/route.ts`
- Create: `app/api/notification/decide-send/route.ts`
- Create: `app/api/cron/notifications/route.ts`
- Modify: `app/api/notifications/schedule/route.ts`
- Delete: `lib/notifications/service.ts`
- Delete: `app/api/cron/daily/route.ts`
- Create: `tests/server/notificationSchedule.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { isScheduleDue, isValidScheduleTime } from '@/lib/server/notifications/schedule';

const now = new Date('2026-05-14T00:10:00Z');

function makeSchedule(overrides: Partial<{ enabled: boolean; time: string; timezone: string; last_sent_at: string | null }> = {}) {
  return {
    id: 'sched-1',
    user_id: 'user-1',
    enabled: true,
    time: '07:00',
    timezone: 'Asia/Jakarta',
    platform: 'telegram' as const,
    recipient_name: 'Petani',
    recipient_number: null,
    telegram_chat_id: '123',
    custom_message: null,
    last_sent_at: null,
    ...overrides,
  };
}

describe('isValidScheduleTime', () => {
  it('accepts HH:mm format', () => {
    expect(isValidScheduleTime('07:30')).toBe(true);
  });

  it('rejects invalid time', () => {
    expect(isValidScheduleTime('7:3')).toBe(false);
  });
});

describe('isScheduleDue', () => {
  it('returns false when disabled', () => {
    const schedule = makeSchedule({ enabled: false });
    expect(isScheduleDue(schedule, now)).toBe(false);
  });

  it('returns true when due and not sent today', () => {
    const schedule = makeSchedule({ time: '07:00', timezone: 'Asia/Jakarta' });
    expect(isScheduleDue(schedule, now)).toBe(true);
  });

  it('returns false when already sent today', () => {
    const schedule = makeSchedule({ last_sent_at: '2026-05-14T00:00:00Z' });
    expect(isScheduleDue(schedule, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest tests/server/notificationSchedule.test.ts`

Expected: FAIL with module not found for `@/lib/server/notifications/schedule`.

- [ ] **Step 3: Add notification decision engine**

```ts
import { generateNotificationDecisionMessage } from '@/lib/server/ai/gemini';

export type NotificationPlatform = 'whatsapp' | 'telegram';

export interface WeatherSnapshotInput {
  kondisi: string;
  suhu: number;
  kelembapan: number;
  curahHujan: number;
  kecepatanAngin: number;
  lokasi?: string;
}

export interface DailyAgendaItem {
  title: string;
  time?: string;
  category?: string;
  note?: string;
}

export interface DecisionMetadataInput {
  source?: string;
  customMessage?: string;
  locale?: 'id' | 'en';
  forecastWindowHours?: number;
  dailyEvents?: DailyAgendaItem[];
  forceSend?: boolean;
}

export interface NotificationDecisionInput {
  platform: NotificationPlatform;
  to: string;
  recipientName?: string;
  notificationsEnabled?: boolean;
  weather: WeatherSnapshotInput;
  metadata?: DecisionMetadataInput;
}

export interface TriggeredRule {
  code: string;
  reason: string;
  weight: number;
}

export interface NotificationDecisionResult {
  decisionId: string;
  shouldSend: boolean;
  riskScore: number;
  riskLevel: 'rendah' | 'sedang' | 'tinggi' | 'ekstrem';
  triggeredRules: TriggeredRule[];
  recommendations: string[];
  reason: string;
  draftMessage: string;
  finalMessage: string;
  payload: {
    platform: NotificationPlatform;
    to: string;
    message: string;
    metadata: Record<string, unknown>;
  };
}

function normalizeWeatherSnapshot(weather: WeatherSnapshotInput): WeatherSnapshotInput {
  return {
    kondisi: typeof weather.kondisi === 'string' ? weather.kondisi : '',
    suhu: Number.isFinite(Number(weather.suhu)) ? Number(weather.suhu) : 0,
    kelembapan: Number.isFinite(Number(weather.kelembapan)) ? Number(weather.kelembapan) : 0,
    curahHujan: Number.isFinite(Number(weather.curahHujan)) ? Number(weather.curahHujan) : 0,
    kecepatanAngin: Number.isFinite(Number(weather.kecepatanAngin)) ? Number(weather.kecepatanAngin) : 0,
    lokasi: typeof weather.lokasi === 'string' ? weather.lokasi : undefined,
  };
}

const RAIN_HEAVY_MM = Number(process.env.ALERT_HEAVY_RAIN_MM || 20);
const WIND_STRONG_KMH = Number(process.env.ALERT_STRONG_WIND_KMH || 12);
const TEMP_EXTREME_C = Number(process.env.ALERT_EXTREME_TEMP_C || 32);
const HUMIDITY_LOW_PERCENT = Number(process.env.ALERT_LOW_HUMIDITY_PERCENT || 50);

function makeDecisionId() {
  return `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return digits;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

function evaluateRules(weather: WeatherSnapshotInput): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const kondisi = weather.kondisi.toLowerCase();

  if (weather.curahHujan >= RAIN_HEAVY_MM) {
    rules.push({
      code: 'HEAVY_RAIN',
      reason: `Curah hujan ${weather.curahHujan}mm >= ${RAIN_HEAVY_MM}mm`,
      weight: 40,
    });
  } else if ((kondisi === 'hujan' || kondisi === 'gerimis') && weather.curahHujan >= 10) {
    rules.push({
      code: 'RAINY_CONDITION',
      reason: `Kondisi ${weather.kondisi} dengan curah hujan ${weather.curahHujan}mm`,
      weight: 20,
    });
  }

  if (weather.kecepatanAngin >= WIND_STRONG_KMH) {
    rules.push({
      code: 'STRONG_WIND',
      reason: `Angin ${weather.kecepatanAngin} km/j >= ${WIND_STRONG_KMH} km/j`,
      weight: 25,
    });
  }

  if (weather.suhu >= TEMP_EXTREME_C) {
    rules.push({
      code: 'EXTREME_HEAT',
      reason: `Suhu ${weather.suhu}C >= ${TEMP_EXTREME_C}C`,
      weight: 20,
    });
  }

  if (weather.kelembapan < HUMIDITY_LOW_PERCENT) {
    rules.push({
      code: 'LOW_HUMIDITY',
      reason: `Kelembapan ${weather.kelembapan}% < ${HUMIDITY_LOW_PERCENT}%`,
      weight: 15,
    });
  }

  return rules;
}

function riskLevelFromScore(score: number): 'rendah' | 'sedang' | 'tinggi' | 'ekstrem' {
  if (score >= 80) return 'ekstrem';
  if (score >= 55) return 'tinggi';
  if (score >= 30) return 'sedang';
  return 'rendah';
}

function buildRecommendations(triggeredRules: TriggeredRule[]): string[] {
  const recommendations: string[] = [];
  const codes = new Set(triggeredRules.map((r) => r.code));

  if (codes.has('HEAVY_RAIN') || codes.has('RAINY_CONDITION')) {
    recommendations.push('Tunda penyemprotan pupuk daun dan pestisida sampai cuaca stabil.');
    recommendations.push('Pastikan saluran drainase tidak tersumbat untuk mencegah genangan.');
  }

  if (codes.has('STRONG_WIND')) {
    recommendations.push('Perkuat ajir/paranet dan ikat tanaman yang mulai rebah.');
  }

  if (codes.has('EXTREME_HEAT')) {
    recommendations.push('Lakukan penyiraman pagi/sore dan hindari pemupukan saat siang terik.');
  }

  if (codes.has('LOW_HUMIDITY')) {
    recommendations.push('Tingkatkan frekuensi cek kelembapan tanah pada zona akar.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Kondisi relatif aman, lanjutkan monitoring cuaca rutin.');
  }

  return recommendations.slice(0, 3);
}

function buildDraftMessage({
  recipientName,
  weather,
  riskLevel,
  riskScore,
  recommendations,
  triggeredRules,
  customMessage,
  dailyEvents,
}: {
  recipientName: string;
  weather: WeatherSnapshotInput;
  riskLevel: 'rendah' | 'sedang' | 'tinggi' | 'ekstrem';
  riskScore: number;
  recommendations: string[];
  triggeredRules: TriggeredRule[];
  customMessage?: string;
  dailyEvents?: DailyAgendaItem[];
}) {
  const intro = customMessage?.trim();

  const header = 'Arina Agri - Ringkasan Cuaca Harian';
  const greeting = `Halo ${recipientName}, berikut ringkasan cuaca hari ini.`;
  const locationLine = `Lokasi: ${weather.lokasi || 'Kebun Anda'}`;
  const weatherLine = `Cuaca: ${weather.kondisi}, Suhu ${weather.suhu}C, Hujan ${weather.curahHujan}mm, Angin ${weather.kecepatanAngin} km/j.`;
  const triggerLine = triggeredRules.length > 0
    ? `Risiko: ${riskLevel.toUpperCase()} (${riskScore}/100). Pemicu: ${triggeredRules.map((r) => r.code).join(', ')}.`
    : `Risiko: ${riskLevel.toUpperCase()} (${riskScore}/100). Pemicu: monitoring rutin.`;
  const actionLines = recommendations.map((item, i) => `${i + 1}) ${item}`).join('\n');
  const actionBlock = `Aksi disarankan:\n${actionLines}`;

  const agendaSection = dailyEvents ? buildAgendaSection(dailyEvents) : '';
  return [intro, header, greeting, locationLine, weatherLine, triggerLine, actionBlock, agendaSection]
    .filter(Boolean)
    .join('\n');
}

function formatAgendaCategory(value?: string) {
  if (!value) return '';
  const cleaned = value.replace(/_/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildAgendaSection(events: DailyAgendaItem[]) {
  const header = 'Agenda hari ini:';
  if (!events.length) {
    return `${header}\n- Belum ada kegiatan terjadwal.`;
  }

  const lines = events.map((event) => {
    const timeLabel = event.time ? `${event.time} - ` : '';
    const categoryLabel = formatAgendaCategory(event.category);
    const categorySuffix = categoryLabel ? ` (${categoryLabel})` : '';
    return `- ${timeLabel}${event.title}${categorySuffix}`;
  });

  return `${header}\n${lines.join('\n')}`;
}

export async function buildNotificationDecision(input: NotificationDecisionInput): Promise<NotificationDecisionResult> {
  const decisionId = makeDecisionId();
  const recipientName = input.recipientName || 'Petani';
  const weather = normalizeWeatherSnapshot(input.weather);
  const triggeredRules = evaluateRules(weather);
  const score = Math.min(100, triggeredRules.reduce((sum, rule) => sum + rule.weight, 0));
  const riskScore = Math.max(score, 0);
  const riskLevel = riskLevelFromScore(riskScore);
  const recommendations = buildRecommendations(triggeredRules);
  const isTestRequest = input.metadata?.source === 'weather-dashboard-test-button';

  const notificationsEnabled = input.notificationsEnabled !== false;
  const forceSend = input.metadata?.forceSend === true;
  const shouldSend = notificationsEnabled && (isTestRequest || forceSend || riskScore >= 30 || Boolean(input.metadata?.customMessage));

  const reason = !notificationsEnabled
    ? 'Notifikasi dinonaktifkan oleh pengguna.'
    : shouldSend
      ? isTestRequest
        ? 'Mode uji coba aktif, notifikasi dipaksa terkirim.'
        : `Risk score ${riskScore} memenuhi ambang kirim notifikasi.`
      : `Risk score ${riskScore} di bawah ambang notifikasi (30).`;

  const draftMessage = buildDraftMessage({
    recipientName,
    weather,
    riskLevel,
    riskScore,
    recommendations,
    triggeredRules,
    customMessage: input.metadata?.customMessage,
    dailyEvents: input.metadata?.dailyEvents,
  });

  let finalMessage = draftMessage;
  if (shouldSend) {
    try {
      finalMessage = await generateNotificationDecisionMessage({
        farmerName: recipientName,
        location: weather.lokasi,
        riskLevel,
        riskScore,
        triggeredRules: triggeredRules.map((rule) => `${rule.code}: ${rule.reason}`),
        recommendedActions: recommendations,
        weatherSummary: `kondisi=${weather.kondisi}, suhu=${weather.suhu}C, kelembapan=${weather.kelembapan}%, hujan=${weather.curahHujan}mm, angin=${weather.kecepatanAngin}km/j`,
        draftMessage,
      });
    } catch {
      finalMessage = draftMessage;
    }
  }

  if (input.metadata?.dailyEvents) {
    const agendaSection = buildAgendaSection(input.metadata.dailyEvents);
    if (!finalMessage.includes('Agenda hari ini')) {
      finalMessage = `${finalMessage}\n${agendaSection}`;
    }
  }

  const to = input.platform === 'whatsapp' ? normalizeWhatsAppNumber(input.to) : input.to;

  const metadata: Record<string, unknown> = {
    source: input.metadata?.source || 'weather-dashboard',
    decision: {
      decisionId,
      riskScore,
      riskLevel,
      shouldSend,
      triggeredRules,
      recommendations,
      reason,
    },
    weather: input.weather,
    dailyEvents: input.metadata?.dailyEvents,
  };

  return {
    decisionId,
    shouldSend,
    riskScore,
    riskLevel,
    triggeredRules,
    recommendations,
    reason,
    draftMessage,
    finalMessage,
    payload: {
      platform: input.platform,
      to,
      message: finalMessage,
      metadata,
    },
  };
}
```

- [ ] **Step 4: Add notification channels**

```ts
export type NotificationPlatform = 'whatsapp' | 'telegram';

export interface ChannelNotificationPayload {
  platform: NotificationPlatform;
  to: string;
  message: string;
  metadata?: Record<string, any>;
}

interface ChannelSendResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function isNumericChatId(value: string) {
  return /^-?\d+$/.test(value);
}

function normalizeTelegramIdentifier(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

async function resolveTelegramChatId(input: string, apiBase: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (isNumericChatId(trimmed)) return trimmed;

  const normalized = normalizeTelegramIdentifier(trimmed);

  try {
    const chatResponse = await fetch(`${apiBase}/getChat?chat_id=${encodeURIComponent(normalized)}`);
    const chatData = await chatResponse.json() as any;
    if (chatResponse.ok && chatData?.ok && chatData?.result?.id) {
      return String(chatData.result.id);
    }
  } catch {
    // fallback to getUpdates
  }

  const updatesResponse = await fetch(`${apiBase}/getUpdates?limit=50`);
  const updatesData = await updatesResponse.json() as any;
  if (!updatesResponse.ok || !updatesData?.ok) {
    throw new Error('Tidak bisa mengakses update Telegram. Pastikan bot aktif dan token benar.');
  }

  const target = normalized.replace('@', '').toLowerCase();
  const updates = Array.isArray(updatesData.result) ? updatesData.result : [];
  for (const update of updates) {
    const message = update.message || update.channel_post || update.my_chat_member;
    const fromUsername = message?.from?.username || message?.chat?.username;
    if (fromUsername && String(fromUsername).toLowerCase() === target) {
      const chatId = message?.chat?.id || update?.message?.chat?.id;
      if (chatId !== undefined && chatId !== null) {
        return String(chatId);
      }
    }
  }

  throw new Error('Username Telegram belum terdeteksi. Pastikan user sudah menekan START dan mengirim pesan ke bot.');
}

async function sendWhatsAppCloud(payload: ChannelNotificationPayload): Promise<ChannelSendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION || 'v19.0';

  if (!token || !phoneNumberId) {
    return {
      success: false,
      error: 'WhatsApp Cloud API belum dikonfigurasi. Isi WHATSAPP_CLOUD_TOKEN dan WHATSAPP_PHONE_NUMBER_ID.',
    };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: payload.to,
      type: 'text',
      text: {
        body: payload.message,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `WhatsApp Cloud API error: ${response.status} ${response.statusText} - ${errorText}`,
    };
  }

  const data = await response.json();
  return { success: true, data };
}

async function sendTelegram(payload: ChannelNotificationPayload): Promise<ChannelSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return {
      success: false,
      error: 'Telegram Bot API belum dikonfigurasi. Isi TELEGRAM_BOT_TOKEN di env.',
    };
  }

  const apiBase = process.env.TELEGRAM_API_URL || `https://api.telegram.org/bot${token}`;

  let chatId = payload.to.trim();
  try {
    chatId = await resolveTelegramChatId(chatId, apiBase);
  } catch (error) {
    return {
      success: false,
      error: `Telegram API: ${error instanceof Error ? error.message : 'Gagal resolve username Telegram.'}`,
    };
  }

  try {
    const response = await fetch(`${apiBase}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      let friendlyError = data.description || 'Gagal mengirim pesan ke Telegram';

      if (data.description === 'Bad Request: chat not found') {
        friendlyError = `Chat ID "${chatId}" tidak ditemukan. Pastikan user sudah menekan 'START' di bot Anda atau Chat ID sudah benar.`;
      }

      return {
        success: false,
        error: `Telegram API: ${friendlyError}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Koneksi ke Telegram gagal: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function sendDirectNotification(payload: ChannelNotificationPayload): Promise<ChannelSendResult> {
  if (payload.platform === 'whatsapp') {
    return sendWhatsAppCloud(payload);
  }

  if (payload.platform === 'telegram') {
    return sendTelegram(payload);
  }

  return {
    success: false,
    error: 'Platform tidak dikenal. Gunakan "whatsapp" atau "telegram".',
  };
}
```

- [ ] **Step 5: Add schedule validation and due logic**

```ts
export type NotificationSchedulePlatform = 'whatsapp' | 'telegram';

export interface NotificationScheduleRow {
  id: string;
  user_id: string;
  enabled: boolean;
  time: string;
  timezone?: string | null;
  platform: NotificationSchedulePlatform;
  recipient_number?: string | null;
  telegram_chat_id?: string | null;
  recipient_name?: string | null;
  custom_message?: string | null;
  last_sent_at?: string | null;
}

export interface NotificationSchedulePayload {
  enabled: boolean;
  time: string;
  timezone?: string;
  platform: NotificationSchedulePlatform;
  to: string;
  recipientName?: string;
  customMessage?: string;
}

export function isValidScheduleTime(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return Boolean(match);
}

function getDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseTimeToMinutes(time: string) {
  const [hour, minute] = time.split(':').map((value) => Number(value));
  return hour * 60 + minute;
}

export function isScheduleDue(
  schedule: NotificationScheduleRow,
  now: Date,
  toleranceMinutes: number = 10
) {
  if (!schedule.enabled) return false;
  if (!isValidScheduleTime(schedule.time)) return false;

  const timezone = schedule.timezone || 'Asia/Jakarta';

  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const [currHour, currMin] = localTime.split(':').map(Number);
  const currentMinutes = currHour * 60 + currMin;
  const scheduledMinutes = parseTimeToMinutes(schedule.time);

  const diff = Math.abs(currentMinutes - scheduledMinutes);
  if (diff > toleranceMinutes) return false;

  if (schedule.last_sent_at) {
    const sentDate = getDateKey(new Date(schedule.last_sent_at), timezone);
    const today = getDateKey(now, timezone);
    if (sentDate === today) return false;
  }

  return true;
}

export function validateSchedulePayload(body: any): { valid: boolean; message?: string; payload?: NotificationSchedulePayload } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (!body.time || typeof body.time !== 'string' || !isValidScheduleTime(body.time)) {
    return { valid: false, message: 'Field time harus berupa format HH:mm.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  return {
    valid: true,
    payload: {
      enabled: Boolean(body.enabled),
      time: body.time,
      timezone: body.timezone || 'Asia/Jakarta',
      platform: body.platform,
      to: body.to,
      recipientName: body.recipientName || 'Petani',
      customMessage: body.customMessage,
    },
  };
}
```

- [ ] **Step 6: Add notification processor for cron**

```ts
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { buildNotificationDecision } from './decision';
import { sendDirectNotification } from './channels';
import { isScheduleDue, NotificationScheduleRow } from './schedule';

export async function processScheduledNotifications(forceAll: boolean = false) {
  const supabase = getSupabaseAdmin();

  const { data: schedules, error } = await supabase
    .from('notification_schedules')
    .select('*')
    .eq('enabled', true);

  if (error || !schedules) {
    console.error('[Notification Service] Error fetching schedules:', error);
    return { success: false, error };
  }

  const results: Array<Record<string, unknown>> = [];
  const now = new Date();

  for (const raw of schedules as NotificationScheduleRow[]) {
    try {
      if (!forceAll && !isScheduleDue(raw, now)) {
        continue;
      }

      const to = raw.platform === 'whatsapp'
        ? raw.recipient_number || raw.telegram_chat_id || ''
        : raw.telegram_chat_id || raw.recipient_number || '';

      if (!to) {
        results.push({ user_id: raw.user_id, success: false, error: 'Recipient tidak ditemukan.' });
        continue;
      }

      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: raw.timezone || 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);

      const { data: events } = await supabase
        .from('calendar_events')
        .select('title,category,waktu,description')
        .eq('user_id', raw.user_id)
        .eq('date', dateStr)
        .order('waktu', { ascending: true });

      const dailyEvents = (events || []).map((e) => ({
        title: e.title,
        time: e.waktu || undefined,
        category: e.category || undefined,
        note: e.description || undefined,
      }));

      const decision = await buildNotificationDecision({
        platform: raw.platform,
        to,
        recipientName: raw.recipient_name || 'Petani',
        notificationsEnabled: true,
        weather: {
          kondisi: 'cerah',
          suhu: 28,
          kelembapan: 75,
          curahHujan: 0,
          kecepatanAngin: 5,
          lokasi: 'Kebun Anda',
        },
        metadata: {
          source: 'vercel-cron-scheduler',
          customMessage: raw.custom_message || undefined,
          dailyEvents,
          forceSend: true,
          locale: 'id',
        },
      });

      if (decision.shouldSend) {
        const sendResult = await sendDirectNotification(decision.payload);
        results.push({ user_id: raw.user_id, success: sendResult.success, error: sendResult.error });

        if (sendResult.success) {
          await supabase
            .from('notification_schedules')
            .update({ last_sent_at: now.toISOString() })
            .eq('id', raw.id);
        }
      } else {
        results.push({ user_id: raw.user_id, skipped: true, reason: decision.reason });
      }
    } catch (err) {
      console.error(`[Notification Service] Error processing user ${raw.user_id}:`, err);
      results.push({ user_id: raw.user_id, success: false, error: String(err) });
    }
  }

  return { success: true, processed: results.length, results };
}
```

- [ ] **Step 7: Add schedule handlers (GET/POST)**

```ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { validateSchedulePayload, NotificationScheduleRow } from './schedule';

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

async function resolveUserId(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

function mapScheduleRow(row: NotificationScheduleRow) {
  const to = row.platform === 'whatsapp'
    ? row.recipient_number || ''
    : row.telegram_chat_id || '';

  return {
    enabled: Boolean(row.enabled),
    time: row.time,
    timezone: row.timezone || 'Asia/Jakarta',
    platform: row.platform,
    to,
    recipientName: row.recipient_name || 'Petani',
    customMessage: row.custom_message || '',
    userId: row.user_id,
  };
}

export async function handleScheduleGet(request: Request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notification_schedules')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          time: '07:00',
          timezone: 'Asia/Jakarta',
          platform: 'telegram',
          to: '',
          recipientName: 'Petani',
          customMessage: '',
          userId,
        },
      });
    }

    return NextResponse.json({ success: true, data: mapScheduleRow(data as NotificationScheduleRow) });
  } catch (err) {
    console.error('[API Schedule] Error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handleSchedulePost(request: Request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateSchedulePayload(body);
    if (!validation.valid || !validation.payload) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const payload = validation.payload;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('notification_schedules')
      .upsert({
        user_id: userId,
        enabled: payload.enabled,
        time: payload.time,
        timezone: payload.timezone || 'Asia/Jakarta',
        platform: payload.platform,
        recipient_number: payload.platform === 'whatsapp' ? payload.to : null,
        telegram_chat_id: payload.platform === 'telegram' ? payload.to : null,
        recipient_name: payload.recipientName || 'Petani',
        custom_message: payload.customMessage || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: mapScheduleRow(data as NotificationScheduleRow) });
  } catch (err) {
    console.error('[API Schedule] POST Error:', err);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan jadwal' }, { status: 500 });
  }
}
```

- [ ] **Step 8: Add notification route handlers**

`app/api/notification/send/route.ts`

```ts
import { NextResponse } from 'next/server';
import { sendDirectNotification } from '@/lib/server/notifications/channels';

function validateSendPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, message: 'Field "message" wajib diisi.' };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateSendPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const result = await sendDirectNotification({
      platform: body.platform,
      to: body.to,
      message: body.message,
      metadata: body.metadata,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully via backend channel',
      data: result.data,
    });
  } catch (error) {
    console.error('[Notification Route Error]', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
```

`app/api/notification/decide/route.ts`

```ts
import { NextResponse } from 'next/server';
import { buildNotificationDecision, type NotificationDecisionInput } from '@/lib/server/notifications/decision';

function validateDecisionPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  if (!body.weather || typeof body.weather !== 'object') {
    return { valid: false, message: 'Field "weather" wajib diisi.' };
  }

  const requiredWeatherFields = ['kondisi', 'suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
  for (const field of requiredWeatherFields) {
    if (body.weather[field] === undefined || body.weather[field] === null) {
      return { valid: false, message: `Field weather.${field} wajib diisi.` };
    }
  }

  const numericWeatherFields = ['suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
  for (const field of numericWeatherFields) {
    const value = Number(body.weather[field]);
    if (!Number.isFinite(value)) {
      return { valid: false, message: `Field weather.${field} harus berupa angka valid.` };
    }
  }

  if (typeof body.weather.kondisi !== 'string' || !body.weather.kondisi.trim()) {
    return { valid: false, message: 'Field weather.kondisi harus berupa teks yang valid.' };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateDecisionPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const decision = await buildNotificationDecision(body as NotificationDecisionInput);

    return NextResponse.json({
      success: true,
      message: 'Decision generated successfully',
      data: decision,
    });
  } catch (error) {
    console.error('[Notification Decide Error]', error);
    return NextResponse.json({ success: false, message: 'Gagal menghasilkan keputusan notifikasi.' }, { status: 500 });
  }
}
```

`app/api/notification/decide-send/route.ts`

```ts
import { NextResponse } from 'next/server';
import { buildNotificationDecision, type NotificationDecisionInput } from '@/lib/server/notifications/decision';
import { sendDirectNotification } from '@/lib/server/notifications/channels';

function validateDecisionPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  if (!body.weather || typeof body.weather !== 'object') {
    return { valid: false, message: 'Field "weather" wajib diisi.' };
  }

  const requiredWeatherFields = ['kondisi', 'suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
  for (const field of requiredWeatherFields) {
    if (body.weather[field] === undefined || body.weather[field] === null) {
      return { valid: false, message: `Field weather.${field} wajib diisi.` };
    }
  }

  const numericWeatherFields = ['suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
  for (const field of numericWeatherFields) {
    const value = Number(body.weather[field]);
    if (!Number.isFinite(value)) {
      return { valid: false, message: `Field weather.${field} harus berupa angka valid.` };
    }
  }

  if (typeof body.weather.kondisi !== 'string' || !body.weather.kondisi.trim()) {
    return { valid: false, message: 'Field weather.kondisi harus berupa teks yang valid.' };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateDecisionPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const decision = await buildNotificationDecision(body as NotificationDecisionInput);

    if (!decision.shouldSend) {
      return NextResponse.json({
        success: true,
        message: 'Notifikasi tidak dikirim karena kondisi belum memenuhi aturan.',
        data: {
          sent: false,
          decision,
        },
      });
    }

    const sendResult = await sendDirectNotification(decision.payload);
    if (!sendResult.success) {
      return NextResponse.json({
        success: false,
        message: sendResult.error || 'Gagal meneruskan notifikasi ke channel tujuan.',
        data: {
          sent: false,
          decision,
        },
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Keputusan berhasil dibuat dan notifikasi diteruskan ke channel tujuan.',
      data: {
        sent: true,
        decision,
        channel: sendResult.data,
      },
    });
  } catch (error) {
    console.error('[Notification DecideSend Error]', error);
    return NextResponse.json({ success: false, message: 'Gagal memproses notifikasi berbasis AI decision system.' }, { status: 500 });
  }
}
```

`app/api/notification/schedule/route.ts`

```ts
import { handleScheduleGet, handleSchedulePost } from '@/lib/server/notifications/scheduleHandlers';

export const dynamic = 'force-dynamic';

export const GET = handleScheduleGet;
export const POST = handleSchedulePost;
```

- [ ] **Step 9: Update plural schedule route to re-export**

```ts
import { handleScheduleGet, handleSchedulePost } from '@/lib/server/notifications/scheduleHandlers';

export const dynamic = 'force-dynamic';

export const GET = handleScheduleGet;
export const POST = handleSchedulePost;
```

- [ ] **Step 10: Add notification cron endpoint**

```ts
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/server/cron/auth';
import { processScheduledNotifications } from '@/lib/server/notifications/process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (auth) return auth;

  try {
    const result = await processScheduledNotifications(false);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
```

- [ ] **Step 11: Remove unused files**

Delete `lib/notifications/service.ts` and `app/api/cron/daily/route.ts`.

- [ ] **Step 12: Run tests**

Run: `npx vitest tests/server/notificationSchedule.test.ts`

Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add lib/server/notifications app/api/notification app/api/notifications/schedule/route.ts app/api/cron/notifications/route.ts tests/server/notificationSchedule.test.ts

git rm lib/notifications/service.ts app/api/cron/daily/route.ts

git commit -m "feat: migrate notification routes and scheduler"
```

---

### Task 4: AI Routes + Health + Client API Updates

**Files:**
- Create: `lib/server/ai/gemini.ts`
- Create: `lib/server/ai/validators.ts`
- Create: `app/api/ai/gemini/route.ts`
- Create: `app/api/ai/financial-report/route.ts`
- Create: `app/api/health/route.ts`
- Modify: `lib/api.ts`
- Modify: `app/api/webhook/n8n/route.ts`
- Create: `tests/server/aiValidators.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { validateFinancialReportPayload, validateGeminiPayload } from '@/lib/server/ai/validators';

describe('validateGeminiPayload', () => {
  it('rejects empty prompt', () => {
    const result = validateGeminiPayload({ prompt: '' });
    expect(result.valid).toBe(false);
  });

  it('accepts valid payload', () => {
    const result = validateGeminiPayload({ prompt: 'Halo', history: [] });
    expect(result.valid).toBe(true);
  });
});

describe('validateFinancialReportPayload', () => {
  it('rejects missing period', () => {
    const result = validateFinancialReportPayload({ transactions: [] });
    expect(result.valid).toBe(false);
  });

  it('accepts valid payload', () => {
    const result = validateFinancialReportPayload({ periode: 'Mei 2026', transactions: [] });
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest tests/server/aiValidators.test.ts`

Expected: FAIL with module not found for `@/lib/server/ai/validators`.

- [ ] **Step 3: Implement AI validators**

```ts
export function validateGeminiPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return { valid: false, message: 'Prompt tidak boleh kosong.' };
  }

  return { valid: true };
}

export function validateFinancialReportPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (!body.periode || typeof body.periode !== 'string') {
    return { valid: false, message: 'Data laporan tidak lengkap.' };
  }

  if (!Array.isArray(body.transactions)) {
    return { valid: false, message: 'Data laporan tidak valid.' };
  }

  return { valid: true };
}
```

- [ ] **Step 4: Add Gemini service**

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

export const SYSTEM_PROMPTS = {
  ensiklopedia: [
    'Anda adalah Arina AI, asisten pertanian cerdas yang ahli dalam budidaya tanaman cabai di Indonesia.',
    'Tugas utama Anda: membantu petani cabai mengenali penyakit tanaman, hama, teknik budidaya, jadwal pemupukan, dan manajemen lahan.',
    '',
    'Panduan respons:',
    '- Gunakan Bahasa Indonesia yang mudah dipahami oleh petani dengan latar belakang pendidikan beragam.',
    '- Berikan jawaban yang praktis, dapat langsung diterapkan di lapangan.',
    '- Jika mendiagnosis penyakit/hama: sebutkan (1) nama penyakit, (2) penyebab, (3) gejala khas, (4) penanganan darurat, (5) pencegahan jangka panjang.',
    '- Jika membahas pupuk/nutrisi: berikan dosis konkret dalam gram/liter atau kg/hektar.',
    '- Jika pertanyaan kurang jelas, tanyakan: lokasi kebun (dataran tinggi/rendah), varietas cabai, umur tanaman, dan gejala yang terlihat.',
    '- Selalu prioritaskan solusi yang terjangkau dan mudah didapat di toko pertanian lokal.',
    '- Gunakan format poin (•) untuk langkah-langkah agar mudah dibaca.',
    '- Jangan memberikan informasi di luar topik pertanian dan budidaya tanaman.',
    '- Akhiri dengan ajakan untuk bertanya lebih lanjut jika petani membutuhkan klarifikasi.',
  ].join('\n'),
  keuangan: [
    'Anda adalah Arina Finance AI, konsultan keuangan pertanian untuk petani dan pelaku agribisnis UMKM di Indonesia.',
    'Tugas Anda: menganalisis data keuangan usaha pertanian yang diberikan dan memberikan saran keuangan yang actionable.',
    '',
    'PENTING:',
    '- Awali laporan dengan sapaan personal: "Halo, [Nama Petani]!" (Gunakan nama pemilik akun yang diberikan).',
    '- Gunakan **teks tebal (bold)** dengan format **teks** untuk menekankan angka penting, temuan kritis, dan judul rekomendasi.',
    '- Berikan analisis yang tajam dan berfokus pada efisiensi biaya dan maksimalisasi keuntungan.',
    '',
    'Data yang akan Anda terima:',
    '- Periode laporan (bulan/tahun)',
    '- Total pendapatan (dalam Rupiah)',
    '- Total pengeluaran (dalam Rupiah)',
    '- Laba/rugi bersih',
    '- Daftar transaksi dengan kategori (Pupuk, Pestisida, Tenaga Kerja, Irigasi & Air, Alat Tani, Penjualan, dll)',
    '',
    'Format saran Anda HARUS mengandung 3 bagian utama:',
    '',
    '📊 RINGKASAN KONDISI KEUANGAN',
    '(Deskripsikan kondisi keuangan bulan ini secara singkat: apakah sehat, perlu perhatian, atau kritis)',
    '',
    '💡 3 REKOMENDASI UTAMA',
    '(Berikan tepat 3 rekomendasi spesifik berdasarkan data yang ada, bukan saran generik)',
    '• Rekomendasi 1: **[Judul]** — [penjelasan spesifik]',
    '• Rekomendasi 2: **[Judul]** — [penjelasan spesifik]',
    '• Rekomendasi 3: **[Judul]** — [penjelasan spesifik]',
    '',
    '⚠️ HAL YANG PERLU DIWASPADAI',
    '(Identifikasi 1-2 risiko atau pola pengeluaran yang perlu dievaluasi)',
    '',
    'Panduan tambahan:',
    '- Gunakan angka nyata dari data yang diberikan dalam saran Anda.',
    '- Gunakan **bold** pada setiap nominal uang yang Anda sebutkan.',
    '- Perbandingan dengan standar industri pertanian cabai Indonesia jika relevan.',
    '- Bahasa harus ramah, tidak menghakimi, dan memotivasi petani.',
    '- Jangan buat laporan fiktif — hanya analisis data yang diberikan.',
  ].join('\n'),
  notificationDecision: [
    'Anda adalah Arina Decision AI untuk notifikasi cuaca petani di Indonesia.',
    'Anda bekerja bersama rule engine. Rule engine sudah menentukan level risiko, alasan, dan aksi utama.',
    '',
    'Tugas Anda:',
    '- Ubah draft pesan menjadi lebih jelas, ringkas, dan mudah dipahami petani.',
    '- Pertahankan keputusan rule engine (jangan ubah level risiko, jangan menambah klaim cuaca baru).',
    '- Gunakan Bahasa Indonesia sederhana, praktis, dan tidak menakut-nakuti.',
    '- Maksimal 120 kata.',
    '- Sertakan 2-3 aksi yang bisa dilakukan hari ini.',
    '- Gunakan format teks polos, tanpa markdown tabel.',
    '',
    'Larangan:',
    '- Jangan memberikan diagnosis medis manusia/hewan.',
    '- Jangan menyarankan tindakan berbahaya.',
    '- Jangan membuat data cuaca fiktif di luar input.',
  ].join('\n'),
};

export async function generateGeminiReply({ prompt, context, userName }: { prompt: string; context?: string; userName?: string }) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY belum diisi di env.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const farmerName = userName ? userName : 'Petani';

  const mergedPrompt = [
    SYSTEM_PROMPTS.ensiklopedia,
    `\nPENTING: Nama pengguna (petani) yang sedang bertanya adalah: ${farmerName}. Sapa pengguna dengan namanya sesekali agar lebih personal.`,
    '',
    'Konteks percakapan sebelumnya:',
    context || '(belum ada percakapan sebelumnya)',
    '',
    `Pertanyaan ${farmerName}:`,
    prompt,
  ].join('\n');

  const result = await model.generateContent(mergedPrompt);
  const text = result?.response?.text?.();

  if (!text) {
    throw new Error('Gemini tidak mengembalikan respons teks.');
  }

  return text.trim();
}

export async function generateFinancialAnalysis({ reportData }: { reportData: any }) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY belum diisi di env.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const { periode, totalPendapatan, totalPengeluaran, labaBersih, transactions, userName } = reportData;

  const pengeluaranPerKategori: Record<string, number> = {};
  const pendapatanPerKategori: Record<string, number> = {};

  if (transactions && Array.isArray(transactions)) {
    transactions.forEach((tx: any) => {
      if (tx.jenis === 'pengeluaran') {
        pengeluaranPerKategori[tx.kategori] = (pengeluaranPerKategori[tx.kategori] || 0) + tx.nominal;
      } else {
        pendapatanPerKategori[tx.kategori] = (pendapatanPerKategori[tx.kategori] || 0) + tx.nominal;
      }
    });
  }

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const farmerName = userName ? userName : 'Petani';

  const dataContext = [
    `NAMA PETANI / PEMILIK AKUN: ${farmerName}`,
    `PERIODE LAPORAN: ${periode}`,
    `TOTAL PENDAPATAN: ${formatRp(totalPendapatan)}`,
    `TOTAL PENGELUARAN: ${formatRp(totalPengeluaran)}`,
    `LABA/RUGI BERSIH: ${formatRp(Math.abs(labaBersih))} (${labaBersih >= 0 ? 'LABA' : 'RUGI'})`,
    '',
    'RINCIAN PENGELUARAN PER KATEGORI:',
    ...Object.entries(pengeluaranPerKategori).map(([k, v]) => `- ${k}: ${formatRp(v)}`),
    '',
    'RINCIAN PENDAPATAN PER KATEGORI:',
    ...Object.entries(pendapatanPerKategori).map(([k, v]) => `- ${k}: ${formatRp(v)}`),
    '',
    `TOTAL TRANSAKSI: ${transactions?.length || 0} transaksi (${transactions?.filter((t: any) => t.jenis === 'pengeluaran').length || 0} pengeluaran, ${transactions?.filter((t: any) => t.jenis === 'pendapatan').length || 0} pendapatan)`,
  ].join('\n');

  const mergedPrompt = [
    SYSTEM_PROMPTS.keuangan,
    `\nPENTING: Analisis laporan ini adalah untuk akun milik "${farmerName}". Berikan saran keuangan yang ditujukan langsung kepadanya dengan menyapanya secara profesional namun ramah.`,
    '',
    'DATA KEUANGAN YANG PERLU DIANALISIS:',
    dataContext,
    '',
    'Berikan analisis dan rekomendasi berdasarkan data di atas.',
  ].join('\n');

  const result = await model.generateContent(mergedPrompt);
  const text = result?.response?.text?.();

  if (!text) {
    throw new Error('Gemini tidak mengembalikan respons teks.');
  }

  return text.trim();
}

export async function generateNotificationDecisionMessage({
  farmerName,
  location,
  riskLevel,
  riskScore,
  triggeredRules,
  recommendedActions,
  weatherSummary,
  draftMessage,
}: {
  farmerName: string;
  location?: string;
  riskLevel: 'rendah' | 'sedang' | 'tinggi' | 'ekstrem';
  riskScore: number;
  triggeredRules: string[];
  recommendedActions: string[];
  weatherSummary: string;
  draftMessage: string;
}) {
  const client = getClient();
  if (!client) {
    return draftMessage;
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  const mergedPrompt = [
    SYSTEM_PROMPTS.notificationDecision,
    '',
    'DATA KEPUTUSAN RULE ENGINE (WAJIB DIIKUTI):',
    `- Nama petani: ${farmerName}`,
    `- Lokasi: ${location || 'tidak diketahui'}`,
    `- Risk level: ${riskLevel}`,
    `- Risk score: ${riskScore}`,
    `- Triggered rules: ${triggeredRules.join(', ') || 'tidak ada'}`,
    `- Recommended actions: ${recommendedActions.join(' | ') || 'tidak ada'}`,
    `- Ringkasan cuaca: ${weatherSummary}`,
    '',
    'DRAFT PESAN SAAT INI:',
    draftMessage,
    '',
    'Keluarkan versi final pesan notifikasi saja.',
  ].join('\n');

  const result = await model.generateContent(mergedPrompt);
  const text = result?.response?.text?.();

  if (!text) {
    return draftMessage;
  }

  return text.trim();
}
```

- [ ] **Step 5: Add AI route handlers**

`app/api/ai/gemini/route.ts`

```ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { generateGeminiReply } from '@/lib/server/ai/gemini';
import { validateGeminiPayload } from '@/lib/server/ai/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateGeminiPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const { prompt, history, userName } = body;

    let context = '';
    if (history && Array.isArray(history)) {
      context = history.map((msg: any) => `${msg.role === 'user' ? 'Petani' : 'Arina'}: ${msg.content}`).join('\n');
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data: prices } = await supabase
        .from('commodity_prices')
        .select('*')
        .eq('commodity', 'Cabe Rawit Merah')
        .order('date', { ascending: false })
        .limit(7);

      if (prices && prices.length > 0) {
        const sortedPrices = prices.reverse();
        const priceInfo = sortedPrices.map((p) => `- ${p.date}: Rp ${p.price}`).join('\n');
        context += `\n\nINFO PASAR SAAT INI (Harga Cabai Rawit 7 hari terakhir):\n${priceInfo}\nGunakan info harga ini untuk memberikan saran proaktif terkait panen atau penjualan jika relevan dengan pertanyaan petani.`;
      }
    } catch (dbErr) {
      console.warn('[Gemini Context] Gagal memuat data harga dari Supabase:', dbErr);
    }

    const reply = await generateGeminiReply({ prompt, context, userName });

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: { reply, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    });
  } catch (error: any) {
    console.error('[Gemini Error]', error.message);
    return NextResponse.json({ success: false, message: error.message || 'Gagal memanggil Gemini.' }, { status: 500 });
  }
}
```

`app/api/ai/financial-report/route.ts`

```ts
import { NextResponse } from 'next/server';
import { generateFinancialAnalysis } from '@/lib/server/ai/gemini';
import { validateFinancialReportPayload } from '@/lib/server/ai/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateFinancialReportPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const analysis = await generateFinancialAnalysis({ reportData: body });

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: { analysis, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    });
  } catch (error: any) {
    console.error('[Gemini Error]', error.message);
    return NextResponse.json({ success: false, message: error.message || 'Gagal memanggil Gemini.' }, { status: 500 });
  }
}
```

`app/api/health/route.ts`

```ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Arina Agri API is running',
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 6: Update webhook route to use Supabase admin helper**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

const supabaseAdmin = getSupabaseAdmin();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    const secret = req.headers.get('x-webhook-secret');
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!type || !data) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    let user_id = data.user_id;

    if (!user_id && data.telegram_chat_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('telegram_chat_id', data.telegram_chat_id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { success: false, message: 'Akun Telegram ini belum dihubungkan ke Arina Agri.' },
          { status: 404 }
        );
      }
      user_id = profile.id;
    }

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'user_id atau telegram_chat_id tidak ditemukan di payload' },
        { status: 400 }
      );
    }

    if (type === 'keuangan') {
      const { jenis, kategori, nominal, tanggal, keterangan } = data;

      const { data: result, error } = await supabaseAdmin
        .from('transactions')
        .insert([
          {
            user_id,
            jenis,
            kategori,
            nominal: Number(nominal),
            tanggal: tanggal || new Date().toISOString(),
            keterangan: keterangan || '',
          },
        ])
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Keuangan tercatat', data: result });
    }

    if (type === 'stok') {
      const { batch_code, tipe, berat, tujuan, tanggal, catatan } = data;

      const { data: result, error } = await supabaseAdmin
        .from('stock_mutations')
        .insert([
          {
            user_id,
            batch_code,
            tipe,
            berat: Number(berat),
            tujuan: tujuan || null,
            tanggal: tanggal || new Date().toISOString(),
            catatan: catatan || '',
          },
        ])
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Stok tercatat', data: result });
    }

    return NextResponse.json({ success: false, message: 'Unknown type' }, { status: 400 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 7: Update client API helpers**

Replace the AI base and schedule calls in `lib/api.ts` with:

```ts
import { supabase } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function resolveApiUrl(path: string) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function apiFetch<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(resolveApiUrl(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP error ${res.status}`);
  return json.data as T;
}

async function buildAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export const aiApi = {
  askGemini: (payload: { prompt: string; history?: GeminiChatMessage[]; userName?: string }) =>
    apiFetch<{ reply: string; model: string }>('/api/ai/gemini', payload),

  generateFinancialReport: (payload: {
    periode: string;
    totalPendapatan: number;
    totalPengeluaran: number;
    labaBersih: number;
    userName?: string;
    transactions: Array<{
      jenis: string;
      kategori: string;
      nominal: number;
      tanggal: string;
      keterangan?: string;
    }>;
  }) =>
    apiFetch<{ analysis: string; model: string }>('/api/ai/financial-report', payload),
};

export const notificationApi = {
  decide: (payload: NotificationDecisionInput) =>
    apiFetch<NotificationDecisionResponse['decision']>('/api/notification/decide', payload),

  decideAndSend: (payload: NotificationDecisionInput) =>
    apiFetch<NotificationDecisionResponse>('/api/notification/decide-send', payload),
};

async function getNotificationSchedule(): Promise<NotificationScheduleConfig> {
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/notification/schedule', { headers });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP error ${res.status}`);
  return json.data as NotificationScheduleConfig;
}

export const notificationScheduleApi = {
  get: () => getNotificationSchedule(),
  set: async (payload: NotificationScheduleConfig) => {
    const headers = await buildAuthHeaders();
    return fetch('/api/notification/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    }).then((res) => res.json());
  },
};
```

- [ ] **Step 8: Run tests**

Run: `npx vitest tests/server/aiValidators.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/server/ai app/api/ai app/api/health/route.ts app/api/webhook/n8n/route.ts lib/api.ts tests/server/aiValidators.test.ts

git commit -m "feat: add AI routes and update client API"
```

---

### Task 5: Price Scraper + Cron Endpoint + Vercel Cron Config

**Files:**
- Create: `lib/server/prices/scraper.ts`
- Create: `app/api/cron/prices/route.ts`
- Create: `tests/server/priceParser.test.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { parsePriceLine } from '@/lib/server/prices/scraper';

describe('parsePriceLine', () => {
  it('parses location and price', () => {
    const parsed = parsePriceLine('Kabupaten Malang: Rp 65.000');
    expect(parsed).toEqual({ location: 'Kabupaten Malang', price: 65000 });
  });

  it('returns null on invalid input', () => {
    expect(parsePriceLine('Tidak ada data')).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest tests/server/priceParser.test.ts`

Expected: FAIL with module not found for `@/lib/server/prices/scraper`.

- [ ] **Step 3: Implement price scraper**

```ts
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

const ALL_REGIONS = [
  'Kabupaten Bangkalan', 'Kabupaten Banyuwangi', 'Kabupaten Bojonegoro', 'Kabupaten Bondowoso', 'Kabupaten Gresik',
  'Kabupaten Jember', 'Kabupaten Jombang', 'Kabupaten Kediri', 'Kabupaten Lamongan', 'Kabupaten Lumajang',
  'Kabupaten Madiun', 'Kabupaten Magetan', 'Kabupaten Malang', 'Kabupaten Mojokerto', 'Kabupaten Nganjuk',
  'Kabupaten Ngawi', 'Kabupaten Pacitan', 'Kabupaten Pamekasan', 'Kabupaten Pasuruan', 'Kabupaten Ponorogo',
  'Kabupaten Probolinggo', 'Kabupaten Sampang', 'Kabupaten Sidoarjo', 'Kabupaten Situbondo', 'Kabupaten Sumenep',
  'Kabupaten Trenggalek', 'Kabupaten Tuban', 'Kabupaten Tulungagung',
  'Kota Batu', 'Kota Blitar', 'Kota Kediri', 'Kota Madiun', 'Kota Malang', 'Kota Mojokerto', 'Kota Pasuruan',
  'Kota Probolinggo', 'Kota Surabaya'
];

export function parsePriceLine(line: string): { location: string; price: number } | null {
  if (!line.includes('Rp')) return null;
  const match = line.match(/(.+?)Rp\s?([\d.]+)/);
  if (!match) return null;

  const location = match[1].trim().replace(/[:\-\d.]/g, '').trim();
  const priceText = match[2].trim();
  const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

  if (!location || Number.isNaN(price)) return null;

  if (!location.startsWith('Kabupaten') && !location.startsWith('Kota') && !location.startsWith('Propinsi') && !location.startsWith('Jawa Timur')) {
    return null;
  }

  return { location, price };
}

export async function fetchAndSavePrice() {
  const todayObj = new Date();
  const today = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000))
    .toISOString()
    .split('T')[0];

  const supabase = getSupabaseAdmin();

  let scrapedData: Array<{ location: string; price: number }> = [];
  let jatimAverage = 68800;

  try {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto('https://siskaperbapo.jatimprov.go.id/', { waitUntil: 'networkidle2' });

    await page.select('#komoditas', '50');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      page.click('#refresh'),
    ]);

    await page.waitForTimeout(3000);

    const rawLines = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr, .list-group-item')) as HTMLElement[];
      return rows.map((row) => row.textContent?.trim() || '').filter(Boolean);
    });

    await browser.close();

    rawLines.forEach((line) => {
      const parsed = parsePriceLine(line);
      if (parsed) {
        scrapedData.push(parsed);
        if (parsed.location === 'Propinsi Jawa Timur' || parsed.location === 'Jawa Timur') {
          jatimAverage = parsed.price;
        }
      }
    });
  } catch (err: any) {
    console.warn(`[Price Scraper] Scraping gagal (${err.message}).`);
    scrapedData = [];
  }

  if (scrapedData.length === 0) {
    console.warn('[Price Scraper] Tidak ada data riil yang didapat, operasi simpan dibatalkan.');
    return;
  }

  const hasJatim = scrapedData.find((d) => d.location === 'Propinsi Jawa Timur' || d.location === 'Jawa Timur');
  let actualJatimAvg = jatimAverage;

  if (!hasJatim) {
    const validPrices = scrapedData.filter((d) => d.price > 0);
    if (validPrices.length > 0) {
      const sum = validPrices.reduce((acc, curr) => acc + curr.price, 0);
      actualJatimAvg = Math.round(sum / validPrices.length);
    }
    scrapedData.push({ location: 'Jawa Timur', price: actualJatimAvg });
  } else if (hasJatim) {
    actualJatimAvg = hasJatim.price;
  }

  ALL_REGIONS.forEach((region) => {
    if (!scrapedData.find((d) => d.location === region)) {
      scrapedData.push({ location: region, price: actualJatimAvg });
    }
  });

  const uniqueData = Array.from(new Map(scrapedData.map((item) => [item.location, item])).values());

  const rowsToInsert = uniqueData.map((d) => ({
    date: today,
    commodity: 'Cabe Rawit Merah',
    location: d.location,
    price: d.price,
  }));

  const { error } = await supabase
    .from('commodity_prices')
    .upsert(rowsToInsert, { onConflict: 'date, commodity, location' });

  if (error) {
    console.error('[Price Scraper] Gagal menyimpan ke Supabase:', error.message);
  }
}
```

- [ ] **Step 4: Add price cron endpoint**

```ts
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/server/cron/auth';
import { fetchAndSavePrice } from '@/lib/server/prices/scraper';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (auth) return auth;

  try {
    await fetchAndSavePrice();
    return NextResponse.json({ success: true, message: 'Price cron completed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Update Vercel cron schedules**

```json
{
  "crons": [
    { "path": "/api/cron/news", "schedule": "0 6,12,18,0 * * *" },
    { "path": "/api/cron/notifications", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/prices", "schedule": "0 9 * * *" }
  ]
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest tests/server/priceParser.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/server/prices/scraper.ts app/api/cron/prices/route.ts tests/server/priceParser.test.ts vercel.json

git commit -m "feat: add price scraper cron"
```

---

### Task 6: Dependency + Script Cleanup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update scripts and dependencies**

Replace the scripts and dependencies in `package.json` with:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
  "dependencies": {
    "@emotion/cache": "^11.14.0",
    "@emotion/react": "^11.14.0",
    "@emotion/server": "^11.11.0",
    "@emotion/styled": "^11.14.1",
    "@google/generative-ai": "^0.24.1",
    "@hookform/resolvers": "^5.2.2",
    "@mui/icons-material": "^9.0.0",
    "@mui/material": "^9.0.0",
    "@mui/material-nextjs": "^9.0.1",
    "@mui/x-charts": "^9.0.2",
    "@sparticuz/chromium": "^131.0.0",
    "@supabase/supabase-js": "^2.104.1",
    "d3-scale": "^4.0.2",
    "exceljs": "^4.4.0",
    "file-saver": "^2.0.5",
    "firebase": "^12.12.1",
    "firebase-admin": "^13.8.0",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7",
    "mongodb": "^7.2.0",
    "next": "16.2.4",
    "next-intl": "^4.9.1",
    "puppeteer-core": "^23.10.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-hook-form": "^7.72.1",
    "react-markdown": "^10.1.0",
    "react-simple-maps": "^3.0.0",
    "rss-parser": "^3.13.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/d3-scale": "^4.0.9",
    "@types/file-saver": "^2.0.7",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/react-simple-maps": "^3.0.6",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json

git commit -m "chore: simplify scripts and update deps for serverless"
```

---

### Task 7: Final Verification

**Files:**
- None

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: Next.js build completes without errors.

---

## Self-Review Checklist (run after writing)

- Spec coverage: news/notifications/ai/price cron endpoints all have tasks above.
- Placeholder scan: no TBD/TODO or vague steps.
- Type consistency: function names and payload shapes align across handlers and client API.
