import { beforeEach, describe, expect, it } from 'vitest';
import {
  RATE_LIMIT_RULES,
  checkRateLimit,
  getRateLimitRule,
  hitRateLimit,
  resetRateLimitStore,
  resolveClientKey,
} from '@/lib/server/rateLimit';

function makeRequest(ip = '10.0.0.1', headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/location/search', {
    headers: { 'x-vercel-forwarded-for': ip, ...headers },
  });
}

describe('getRateLimitRule', () => {
  it('memberikan aturan untuk endpoint yang dilindungi', () => {
    expect(getRateLimitRule('/api/ai/gemini')).toEqual(RATE_LIMIT_RULES['/api/ai/gemini']);
    expect(getRateLimitRule('/api/location/search')).toEqual(RATE_LIMIT_RULES['/api/location/search']);
    expect(getRateLimitRule('/api/feedback')).toEqual(RATE_LIMIT_RULES['/api/feedback']);
  });

  it('memberikan null untuk endpoint yang tidak dilindungi', () => {
    expect(getRateLimitRule('/api/news')).toBeNull();
    expect(getRateLimitRule('/api/health')).toBeNull();
    expect(getRateLimitRule('/dashboard')).toBeNull();
  });
});

describe('resolveClientKey', () => {
  it('mengambil IP pertama dari x-vercel-forwarded-for', () => {
    expect(resolveClientKey(makeRequest('203.0.113.9'))).toBe('203.0.113.9');
  });

  it('mengabaikan IP kedua dan seterusnya', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-vercel-forwarded-for': '1.1.1.1, 2.2.2.2' },
    });
    expect(resolveClientKey(req)).toBe('1.1.1.1');
  });

  it('memakai x-real-ip sebagai cadangan', () => {
    const req = new Request('http://localhost', { headers: { 'x-real-ip': '5.5.5.5' } });
    expect(resolveClientKey(req)).toBe('5.5.5.5');
  });

  it('tidak mempercayai x-forwarded-for karena bisa dipalsukan klien', () => {
    const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '6.6.6.6' } });
    expect(resolveClientKey(req)).toBe('unknown');
  });

  it('tidak melempar saat header kosong', () => {
    expect(resolveClientKey(new Request('http://localhost'))).toBe('unknown');
  });
});

describe('rate limit', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('mengizinkan sampai batas maksimum', () => {
    const rule = { max: 3, windowMs: 60_000 };
    const results = [1, 2, 3].map(() => hitRateLimit('/api/test', 'user:a', rule).result);
    expect(results.map((r) => r.allowed)).toEqual([true, true, true]);
    expect(results[2].remaining).toBe(0);
  });

  it('menolak permintaan setelah batas terlampaui', () => {
    const rule = { max: 2, windowMs: 60_000 };
    hitRateLimit('/api/test', 'user:a', rule);
    hitRateLimit('/api/test', 'user:a', rule);
    const third = hitRateLimit('/api/test', 'user:a', rule);
    expect(third.result.allowed).toBe(false);
    expect(third.result.retryAfterMs).toBeGreaterThan(0);
  });

  it('memisahkan jatah antar identitas', () => {
    const rule = { max: 1, windowMs: 60_000 };
    expect(hitRateLimit('/api/test', 'user:a', rule).result.allowed).toBe(true);
    expect(hitRateLimit('/api/test', 'user:a', rule).result.allowed).toBe(false);
    // Pengguna lain tidak terpengaruh oleh jatah pengguna pertama.
    expect(hitRateLimit('/api/test', 'user:b', rule).result.allowed).toBe(true);
  });

  it('memisahkan jatah antar endpoint', () => {
    const rule = { max: 1, windowMs: 60_000 };
    expect(hitRateLimit('/api/ai/gemini', 'user:a', rule).result.allowed).toBe(true);
    expect(hitRateLimit('/api/location/search', 'user:a', rule).result.allowed).toBe(true);
  });

  it('memakai userId bila tersedia, bukan IP', () => {
    const pathname = '/api/feedback';
    const max = RATE_LIMIT_RULES[pathname].max;
    for (let i = 0; i < max; i += 1) {
      expect(checkRateLimit(makeRequest(), pathname, 'user-1')?.result.allowed).toBe(true);
    }
    expect(checkRateLimit(makeRequest(), pathname, 'user-1')?.result.allowed).toBe(false);
    // Pengguna berbeda pada IP yang sama tetap punya jatah sendiri.
    expect(checkRateLimit(makeRequest(), pathname, 'user-2')?.result.allowed).toBe(true);
  });

  it('memakai IP bila userId tidak tersedia', () => {
    const pathname = '/api/feedback';
    const max = RATE_LIMIT_RULES[pathname].max;
    for (let i = 0; i < max; i += 1) {
      expect(checkRateLimit(makeRequest('8.8.8.8'), pathname, null)?.result.allowed).toBe(true);
    }
    expect(checkRateLimit(makeRequest('8.8.8.8'), pathname, null)?.result.allowed).toBe(false);
    // IP berbeda tidak terpengaruh.
    expect(checkRateLimit(makeRequest('9.9.9.9'), pathname, null)?.result.allowed).toBe(true);
  });

  it('mengembalikan null untuk endpoint tanpa aturan', () => {
    expect(checkRateLimit(makeRequest(), '/api/news', null)).toBeNull();
  });
});