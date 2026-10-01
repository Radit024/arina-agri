import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy as middleware } from '@/proxy';
import { getRateLimitRule, resetRateLimitStore } from '@/lib/server/rateLimit';

describe('Next.js Global Auth Middleware', () => {
  it('allows public pages like login, register, forgot-password', async () => {
    const reqLogin = new NextRequest('http://localhost:3000/login');
    const resLogin = await middleware(reqLogin);
    expect(resLogin.status).toBe(200);

    const reqRegister = new NextRequest('http://localhost:3000/register');
    const resRegister = await middleware(reqRegister);
    expect(resRegister.status).toBe(200);
  });

  it('allows public api routes like health, news, and cron endpoints', async () => {
    const reqHealth = new NextRequest('http://localhost:3000/api/health');
    const resHealth = await middleware(reqHealth);
    expect(resHealth.status).toBe(200);

    const reqNews = new NextRequest('http://localhost:3000/api/news');
    const resNews = await middleware(reqNews);
    expect(resNews.status).toBe(200);

    const reqCron = new NextRequest('http://localhost:3000/api/cron/news');
    const resCron = await middleware(reqCron);
    expect(resCron.status).toBe(200);
  });

  it('redirects unauthenticated user visiting /dashboard to /login in production', async () => {
    const reqDashboard = new NextRequest('http://localhost:3000/dashboard/keuangan');
    const resDashboard = await middleware(reqDashboard);

    expect(resDashboard.status).toBe(307);
    expect(resDashboard.headers.get('location')).toContain('/login?returnUrl=%2Fdashboard%2Fkeuangan');
  });

  it('allows guest session accessing /dashboard when arina_guest_session cookie is present', async () => {
    const reqGuest = new NextRequest('http://localhost:3000/dashboard/keuangan', {
      headers: {
        cookie: 'arina_guest_session=1',
      },
    });
    const resGuest = await middleware(reqGuest);
    expect(resGuest.status).toBe(200);
  });

  it('rejects guest session cookie on protected API routes', async () => {
    const reqApi = new NextRequest('http://localhost:3000/api/finance/transactions', {
      method: 'POST',
      headers: { cookie: 'arina_guest_session=1' },
    });

    const resGuestApi = await middleware(reqApi);
    expect(resGuestApi.status).toBe(401);
  });

  it('does not expose /api/news/trigger as a public route', async () => {
    const reqTrigger = new NextRequest('http://localhost:3000/api/news/trigger', {
      method: 'POST',
    });

    const resTrigger = await middleware(reqTrigger);
    expect(resTrigger.status).toBe(401);
  });

  it('allows authenticated user accessing /dashboard when Supabase auth cookie is present', async () => {
    const reqAuth = new NextRequest('http://localhost:3000/dashboard/keuangan', {
      headers: {
        cookie: 'sb-localhost-auth-token=test-token',
      },
    });
    const resAuth = await middleware(reqAuth);
    expect(resAuth.status).toBe(200);
  });

  it('rejects protected API request without auth header or session cookie in production', async () => {
    const reqApi = new NextRequest('http://localhost:3000/api/finance/transactions', {
      method: 'POST',
    });
    const resApi = await middleware(reqApi);
    expect(resApi.status).toBe(401);
  });

  it('allows protected API request when Authorization header is provided', async () => {
    const reqApi = new NextRequest('http://localhost:3000/api/finance/transactions', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-user-token',
      },
    });
    const resApi = await middleware(reqApi);
    expect(resApi.status).toBe(200);
  });

  it('returns 429 once the rate limit is exhausted', async () => {
    const rule = getRateLimitRule('/api/feedback');
    if (!rule) throw new Error('Aturan rate limit /api/feedback tidak ditemukan');

    resetRateLimitStore();

    for (let i = 0; i < rule.max; i += 1) {
      const res = await middleware(new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'x-vercel-forwarded-for': '203.0.113.7' },
      }));
      expect(res.status).toBe(200);
    }

    const rejected = await middleware(new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'x-vercel-forwarded-for': '203.0.113.7' },
    }));

    expect(rejected.status).toBe(429);
    expect(rejected.headers.get('retry-after')).toBeTruthy();
    resetRateLimitStore();
  });
});
