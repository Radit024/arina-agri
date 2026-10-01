/**
 * Rate limit untuk endpoint yang menyentuh sumber daya mahal atau publik.
 *
 * Penyimpanan bawaan adalah Map in-memory. Ini cukup untuk satu instance Node,
 * tetapi TIDAK konsisten antar instance pada Vercel. Untuk production
 * multi-instance, ganti `createMemoryStore` dengan store Upstash Redis.
 */

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
  hit(key: string, rule: RateLimitRule): RateLimitResult;
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
    hit(key, rule) {
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

const store = createMemoryStore();

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
export function hitRateLimit(
  pathname: string,
  identity: string,
  rule: RateLimitRule,
): { rule: RateLimitRule; result: RateLimitResult } {
  return { rule, result: store.hit(`${pathname}|${identity}`, rule) };
}

/**
 * Rate limit dengan identitas pengguna bila token tersedia, supaya satu
 * pengguna tidak bisa menghabiskan jatah seluruh pengguna lain di IP yang sama.
 */
export function checkRateLimit(
  request: Request,
  pathname: string,
  userId: string | null,
): { rule: RateLimitRule; result: RateLimitResult } | null {
  const rule = getRateLimitRule(pathname);
  if (!rule) return null;

  const identity = userId ? `user:${userId}` : `ip:${resolveClientKey(request)}`;
  return hitRateLimit(pathname, identity, rule);
}

/** Dipakai oleh unit test untuk Isolation antar skenario. */
export function resetRateLimitStore() {
  buckets.clear();
}