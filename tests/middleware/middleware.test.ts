import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy as middleware } from '@/proxy';

describe('Next.js Global Auth Middleware', () => {
  it('allows public pages like login, register, forgot-password', () => {
    const reqLogin = new NextRequest('http://localhost:3000/login');
    const resLogin = middleware(reqLogin);
    expect(resLogin.status).toBe(200);

    const reqRegister = new NextRequest('http://localhost:3000/register');
    const resRegister = middleware(reqRegister);
    expect(resRegister.status).toBe(200);
  });

  it('allows public api routes like health, news, and cron endpoints', () => {
    const reqHealth = new NextRequest('http://localhost:3000/api/health');
    const resHealth = middleware(reqHealth);
    expect(resHealth.status).toBe(200);

    const reqNews = new NextRequest('http://localhost:3000/api/news');
    const resNews = middleware(reqNews);
    expect(resNews.status).toBe(200);

    const reqCron = new NextRequest('http://localhost:3000/api/cron/news');
    const resCron = middleware(reqCron);
    expect(resCron.status).toBe(200);
  });

  it('redirects unauthenticated user visiting /dashboard to /login in production', () => {
    const reqDashboard = new NextRequest('http://localhost:3000/dashboard/keuangan');
    const resDashboard = middleware(reqDashboard);

    expect(resDashboard.status).toBe(307);
    expect(resDashboard.headers.get('location')).toContain('/login?returnUrl=%2Fdashboard%2Fkeuangan');
  });

  it('allows guest session accessing /dashboard when arina_guest_session cookie is present', () => {
    const reqGuest = new NextRequest('http://localhost:3000/dashboard/keuangan', {
      headers: {
        cookie: 'arina_guest_session=1',
      },
    });
    const resGuest = middleware(reqGuest);
    expect(resGuest.status).toBe(200);
  });

  it('rejects guest session cookie on protected API routes', () => {
    const reqApi = new NextRequest('http://localhost:3000/api/finance/transactions', {
      method: 'POST',
      headers: { cookie: 'arina_guest_session=1' },
    });

    expect(middleware(reqApi).status).toBe(401);
  });

  it('does not expose /api/news/trigger as a public route', () => {
    const reqTrigger = new NextRequest('http://localhost:3000/api/news/trigger', {
      method: 'POST',
    });

    expect(middleware(reqTrigger).status).toBe(401);
  });

  it('allows authenticated user accessing /dashboard when Supabase auth cookie is present', () => {
    const reqAuth = new NextRequest('http://localhost:3000/dashboard/keuangan', {
      headers: {
        cookie: 'sb-localhost-auth-token=test-token',
      },
    });
    const resAuth = middleware(reqAuth);
    expect(resAuth.status).toBe(200);
  });

  it('rejects protected API request without auth header or session cookie in production', () => {
    const reqApi = new NextRequest('http://localhost:3000/api/finance/transactions', {
      method: 'POST',
    });
    const resApi = middleware(reqApi);
    expect(resApi.status).toBe(401);
  });

  it('allows protected API request when Authorization header is provided', () => {
    const reqApi = new NextRequest('http://localhost:3000/api/finance/transactions', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-user-token',
      },
    });
    const resApi = middleware(reqApi);
    expect(resApi.status).toBe(200);
  });
});
