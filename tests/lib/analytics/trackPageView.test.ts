import { describe, expect, it, vi, beforeEach } from 'vitest';

const getSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

vi.mock('@/lib/devAuth', () => ({
  readLocalDevelopmentUserId: () => null,
  buildDevelopmentAccessToken: (id: string) => `dev-token-${id}`,
}));

describe('trackPageView', () => {
  beforeEach(() => {
    getSession.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('does nothing when there is no session or dev user', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { trackPageView } = await import('@/lib/analytics/trackPageView');

    await trackPageView('keuangan');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts the feature with a bearer token when a session exists', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    const { trackPageView } = await import('@/lib/analytics/trackPageView');

    await trackPageView('stok');

    expect(fetch).toHaveBeenCalledWith('/api/analytics/events', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }),
      body: JSON.stringify({ feature: 'stok' }),
    }));
  });

  it('does not throw when fetch rejects', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { trackPageView } = await import('@/lib/analytics/trackPageView');

    await expect(trackPageView('kalender')).resolves.toBeUndefined();
  });
});
