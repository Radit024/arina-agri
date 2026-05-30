import { describe, expect, it, vi } from 'vitest';
import { checkDeployment, normalizeDeploymentUrl } from '@/scripts/smoke-deploy.mjs';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('normalizeDeploymentUrl', () => {
  it('adds https when the value has no protocol', () => {
    expect(normalizeDeploymentUrl('arina-agri.vercel.app')).toBe('https://arina-agri.vercel.app');
  });

  it('removes a trailing slash', () => {
    expect(normalizeDeploymentUrl('https://arina-agri.vercel.app/')).toBe('https://arina-agri.vercel.app');
  });
});

describe('checkDeployment', () => {
  it('passes when health is OK and cron is protected', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    await expect(
      checkDeployment({
        deploymentUrl: 'https://preview.vercel.app',
        fetchImpl,
        timeoutMs: 50,
      }),
    ).resolves.toEqual({
      healthUrl: 'https://preview.vercel.app/api/health',
      cronUrl: 'https://preview.vercel.app/api/cron/news',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails when health endpoint is not successful', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ success: false }, { status: 500 }));

    await expect(
      checkDeployment({
        deploymentUrl: 'https://preview.vercel.app',
        fetchImpl,
        timeoutMs: 50,
      }),
    ).rejects.toThrow('Health check failed with HTTP 500');
  });

  it('fails when cron endpoint is publicly accessible', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    await expect(
      checkDeployment({
        deploymentUrl: 'https://preview.vercel.app',
        fetchImpl,
        timeoutMs: 50,
      }),
    ).rejects.toThrow('Cron protection check failed: expected HTTP 401, got 200');
  });
});
