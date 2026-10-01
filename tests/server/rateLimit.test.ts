import { beforeEach, describe, expect, it, vi } from 'vitest';

// Dimock di level modul supaya store Supabase terikat ke mock ini sejak awal.
const rpc = vi.fn();
vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ rpc: (name: string, params?: unknown) => rpc(name, params) }),
}));

import {
  RATE_LIMIT_RULES,
  getRateLimitRule,
  hitRateLimit,
  isRateLimitDistributed,
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

  it('mengizinkan sampai batas maksimum', async () => {
    const rule = { max: 3, windowMs: 60_000 };
    const results = [];
    for (let i = 0; i < 3; i += 1) {
      results.push((await hitRateLimit('/api/test', 'user:a', rule)).result);
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true]);
    expect(results[2].remaining).toBe(0);
  });

  it('menolak permintaan setelah batas terlampaui', async () => {
    const rule = { max: 2, windowMs: 60_000 };
    await hitRateLimit('/api/test', 'user:a', rule);
    await hitRateLimit('/api/test', 'user:a', rule);
    const third = await hitRateLimit('/api/test', 'user:a', rule);
    expect(third.result.allowed).toBe(false);
    expect(third.result.retryAfterMs).toBeGreaterThan(0);
  });

  it('memisahkan jatah antar identitas', async () => {
    const rule = { max: 1, windowMs: 60_000 };
    expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(true);
    expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(false);
    // Pengguna lain tidak terpengaruh oleh jatah pengguna pertama.
    expect((await hitRateLimit('/api/test', 'user:b', rule)).result.allowed).toBe(true);
  });

  it('memisahkan jatah antar endpoint', async () => {
    const rule = { max: 1, windowMs: 60_000 };
    expect((await hitRateLimit('/api/ai/gemini', 'user:a', rule)).result.allowed).toBe(true);
    expect((await hitRateLimit('/api/location/search', 'user:a', rule)).result.allowed).toBe(true);
  });

  it('memakai IP bila tidak ada identitas lain', async () => {
    const rule = { max: 2, windowMs: 60_000 };
    expect((await hitRateLimit('/api/test', 'ip:8.8.8.8', rule)).result.allowed).toBe(true);
    expect((await hitRateLimit('/api/test', 'ip:8.8.8.8', rule)).result.allowed).toBe(true);
    expect((await hitRateLimit('/api/test', 'ip:8.8.8.8', rule)).result.allowed).toBe(false);
    // IP berbeda tidak terpengaruh.
    expect((await hitRateLimit('/api/test', 'ip:9.9.9.9', rule)).result.allowed).toBe(true);
  });
});

describe('ketahanan store', () => {
  beforeEach(() => {
    resetRateLimitStore();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('meloloskan request ketika store tidak bisa dihubungi', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.invalid.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    resetRateLimitStore();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;

    try {
      const rule = { max: 1, windowMs: 60_000 };
      // Rate limiter tidak boleh mematikan layanan: request tetap diizinkan.
      expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(true);
      expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      resetRateLimitStore();
    }
  });

  it('melaporkan apakah rate limit terdistribusi', () => {
    // Tanpa credential apa pun: hanya in-memory, tidak konsisten antar instance.
    expect(isRateLimitDistributed()).toBe(false);

    // Hanya Supabase credential: tetap terdistribusi lewat RPC.
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    expect(isRateLimitDistributed()).toBe(true);

    // Redis selalu diprioritaskan ketika keduanya tersedia.
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    expect(isRateLimitDistributed()).toBe(true);

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(isRateLimitDistributed()).toBe(false);
  });
});

describe('store Supabase', () => {
  beforeEach(() => {
    rpc.mockReset();
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    resetRateLimitStore();
  });

  it('menghitung counter lewat RPC dan menolak di atas batas', async () => {
    let counter = 0;
    rpc.mockImplementation(async (name: string) => {
      if (name === 'purge_rate_limit_buckets') return { data: null, error: null };
      counter += 1;
      return { data: [{ hit_count: counter, retry_after_ms: 45_000 }], error: null };
    });

    const rule = { max: 2, windowMs: 60_000 };
    expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(true);
    expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(true);
    expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(false);
  });

  it('meloloskan request ketika RPC gagal', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });

    const rule = { max: 1, windowMs: 60_000 };
    // Migration belum dijalankan: aplikasi harus tetap bisa melayani traffic.
    expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(true);
    expect((await hitRateLimit('/api/test', 'user:a', rule)).result.allowed).toBe(true);
  });
});