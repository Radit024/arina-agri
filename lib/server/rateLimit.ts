/**
 * Rate limit untuk endpoint yang menyentuh sumber daya mahal atau publik.
 *
 * Penyimpanan ada tiga backend, dipilih berurutan saat pertama kali dipakai:
 *
 * 1. Redis (Upstash REST) bila `UPSTASH_REDIS_REST_URL` dan
 *    `UPSTASH_REDIS_REST_TOKEN` ter-set.
 * 2. Supabase Postgres lewat RPC `hit_rate_limit` bila service role key tersedia.
 *    Ini default production saat ini: latency satu round-trip per request yang
 *    dilindungi, dan tabel rate limit mendapat write traffic yang biasanya kecil.
 * 3. In-memory untuk local development dan unit test. TIDAK konsisten antar
 *    instance Vercel, jadi hanya boleh dipakai tanpa credential.
 *
 * Rate limit hanya boleh dijalankan di satu tempat. Saat ini penerapannya ada
 * di `proxy.ts`, sebelum handler dieksekusi. Proxy berjalan di Node.js runtime,
 * jadi store berbasis HTTP (bukan socket) aman dipakai di sana.
 */

import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

interface RateLimitRule {
  /** Jumlah permintaan maksimum dalam satu jendela waktu. */
  max: number;
  /** Panjang jendela waktu dalam milidetik. */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Waktu dalam milidetik sampai jendela berikutnya dimulai. */
  retryAfterMs: number;
}

interface Store {
  hit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function pruneExpired(now: number) {
  if (buckets.size < 512) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function createMemoryStore(): Store {
  return {
    async hit(key, rule) {
      const now = Date.now();
      pruneExpired(now);

      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const next = { count: 1, resetAt: now + rule.windowMs };
        buckets.set(key, next);
        return { allowed: true, remaining: rule.max - 1, retryAfterMs: rule.windowMs };
      }

      existing.count += 1;
      const allowed = existing.count <= rule.max;
      return {
        allowed,
        remaining: Math.max(0, rule.max - existing.count),
        retryAfterMs: Math.max(0, existing.resetAt - now),
      };
    },
  };
}

interface RedisPipelineResponse {
  result?: unknown;
}

function createRedisStore(url: string, token: string): Store {
  /**
   * `INCR` lalu `PEXPIRE ... NX` dikirim sebagai satu pipeline agar hanya satu
   * round-trip. `NX` membuat TTL hanya dipasang saat counter pertama dibuat;
   * tanpa itu setiap request akan memperpanjang jendela tanpa batas.
   */
  async function runPipeline(key: string, rule: RateLimitRule): Promise<unknown[]> {
    const commands = [
      ['INCR', key],
      ['PEXPIRE', key, String(rule.windowMs), 'NX'],
    ];
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Upstash pipeline gagal dengan HTTP ${response.status}`);
    }

    const payload = (await response.json()) as RedisPipelineResponse;
    return Array.isArray(payload.result) ? payload.result : [];
  }

  /** Mengembalikan nilai `TTL` (ms) yang dibaca dari pipeline terpisah. */
  async function runPttl(key: string): Promise<number> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([['PTTL', key]]),
      cache: 'no-store',
    });

    if (!response.ok) return 0;
    const payload = (await response.json()) as RedisPipelineResponse;
    const ttl = Array.isArray(payload.result) ? payload.result[0] : payload.result;
    const parsed = Number(ttl);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  return {
    async hit(key, rule) {
      const counter = Number((await runPipeline(key, rule))[0]);
      if (!Number.isFinite(counter)) {
        throw new Error('Respons Upstash tidak berisi counter yang valid.');
      }

      // Jendela yang tersisa dibaca dari Redis, bukan dari clock instance ini:
      // jam tiap instance Vercel bisa berbeda beberapa detik.
      const retryAfterMs = await runPttl(key);

      return {
        allowed: counter <= rule.max,
        remaining: Math.max(0, rule.max - counter),
        retryAfterMs,
      };
    },
  };
}

interface SupabaseRpcRow {
  hit_count?: unknown;
  retry_after_ms?: unknown;
}

/**
 * Store Postgres lewat RPC. `hit_rate_limit` melakukan satu INSERT dengan
 * ON CONFLICT dalam satu pernyataan, jadi atomik tanpa lock eksplisit.
 * Jendela dihitung dari clock database sehingga konsisten antar instance.
 */
function createSupabaseStore(): Store {
  return {
    async hit(key, rule) {
      const supabase = getSupabaseAdmin();

      // Housekeeping berjalan di sini: satu operasi kecil per hit. Menunda satu
      // hit demi cleanup tidak sebanding dengan tabel yang tumbuh tanpa batas.
      await supabase.rpc('purge_rate_limit_buckets');

      const { data, error } = await supabase.rpc('hit_rate_limit', {
        p_bucket_key: key,
        p_window_ms: rule.windowMs,
        p_max_hits: rule.max,
      });

      if (error) {
        throw new Error(`RPC hit_rate_limit gagal: ${error.message}`);
      }

      const row = (Array.isArray(data) ? data[0] : null) as SupabaseRpcRow | null;
      const counter = Number(row?.hit_count);
      const retryAfterMs = Number(row?.retry_after_ms);

      if (!Number.isFinite(counter)) {
        throw new Error('Respons hit_rate_limit tidak berisi counter yang valid.');
      }

      return {
        allowed: counter <= rule.max,
        remaining: Math.max(0, rule.max - counter),
        retryAfterMs: Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : rule.windowMs,
      };
    },
  };
}

function createStore(): Store {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return createRedisStore(url, token);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    return createSupabaseStore();
  }

  return createMemoryStore();
}

let store: Store | null = null;

function getStore(): Store {
  if (!store) store = createStore();
  return store;
}

/**
 * True bila rate limit memakai store yang konsisten antar instance Vercel.
 * False berarti in-memory: limit hanya berlaku per instance, jadi nilainya
 * efektif `max x jumlah instance`.
 */
export function isRateLimitDistributed(): boolean {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return true;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  return Boolean(supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Aturan bawaan per path. Pers purposely dibuat ketat untuk endpoint yang
 * incurring biaya (AI) atau menyentuh kuota pihak ketiga (Nominatim, BMKG).
 */
export const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  '/api/ai/gemini': { max: 20, windowMs: 60_000 },
  '/api/ai/financial-report': { max: 10, windowMs: 60_000 },
  '/api/location/search': { max: 30, windowMs: 60_000 },
  '/api/location/reverse': { max: 30, windowMs: 60_000 },
  '/api/weather/forecast': { max: 60, windowMs: 60_000 },
  '/api/weather/warnings': { max: 60, windowMs: 60_000 },
  '/api/feedback': { max: 5, windowMs: 60_000 },
};

export function getRateLimitRule(pathname: string): RateLimitRule | null {
  if (RATE_LIMIT_RULES[pathname]) return RATE_LIMIT_RULES[pathname];

  const longestMatch = Object.keys(RATE_LIMIT_RULES)
    .filter((path) => pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];

  return longestMatch ? RATE_LIMIT_RULES[longestMatch] : null;
}

/**
 * Identitas klien untuk rate limit endpoint publik.
 *
 * Hanya header yang dipasang platform (Vercel) yang dipercaya. `x-forwarded-for`
 * di-set oleh klien dan bisa dipalsukan, sehingga memakainya membuat rate limit
 * dapat dielusi dengan mengarang nilai baru setiap request.
 */
export function resolveClientKey(request: Request): string {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

/**
 * Mendaftarkan satu hit pada bucket tertentu. Dipakai oleh proxy yang sudah
 * memiliki pathname, token, dan aturan sehingga tidak perlu membuat Request.
 */
export async function hitRateLimit(
  pathname: string,
  identity: string,
  rule: RateLimitRule,
): Promise<{ rule: RateLimitRule; result: RateLimitResult }> {
  const activeStore = getStore();
  try {
    const result = await activeStore.hit(`${pathname}|${identity}`, rule);
    return { rule, result };
  } catch (error) {
    // Rate limiter tidak boleh membuat aplikasi mati total. Kalau store
    // bermasalah, request diizinkan lewat supaya layanan tetap berfungsi.
    // Memblokir semua traffic karena Redis down adalah kegagalan yang lebih buruk.
    console.error('[rateLimit] Store bermasalah, request diizinkan:', error);
    return { rule, result: { allowed: true, remaining: rule.max, retryAfterMs: 0 } };
  }
}

/** Dipakai oleh unit test untuk Isolation antar skenario. */
export function resetRateLimitStore() {
  buckets.clear();
  store = null;
}