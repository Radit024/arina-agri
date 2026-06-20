import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      getUser: vi.fn(),
    },
    from: vi.fn(() => {
      throw new Error('calendar event API should use the BFF route, not direct Supabase from the browser');
    }),
  },
}));

const originalEnv = { ...process.env };

describe('eventApi calendar BFF client', () => {
  beforeEach(() => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    window.localStorage.clear();
    window.localStorage.setItem('arina_auth_mode', 'local');
    window.localStorage.setItem('arina_local_user_id', '22222222-2222-4222-8222-222222222222');
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      success: true,
      data: {
        _id: 'event-1',
        judul: 'Pemupukan blok A',
        tanggal: '2026-06-01',
        jenis: 'pemupukan',
        waktu: '07:00',
        catatan: '',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    window.localStorage.clear();
    vi.resetModules();
    getSession.mockReset();
  });

  it('creates events through the calendar BFF route with the isolated local development token', async () => {
    const { eventApi } = await import('@/lib/api');

    const created = await eventApi.create({
      judul: 'Pemupukan blok A',
      tanggal: '2026-06-01',
      jenis: 'pemupukan',
      waktu: '07:00',
      catatan: '',
    });

    expect(created._id).toBe('event-1');
    expect(fetch).toHaveBeenCalledWith('/api/calendar/events', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token:22222222-2222-4222-8222-222222222222',
      },
      body: JSON.stringify({
        judul: 'Pemupukan blok A',
        tanggal: '2026-06-01',
        jenis: 'pemupukan',
        waktu: '07:00',
        catatan: '',
      }),
    }));
  });

  it('does not send a development token when local mode is not active', async () => {
    window.localStorage.clear();
    const { eventApi } = await import('@/lib/api');

    await eventApi.create({
      judul: 'Pemupukan blok A',
      tanggal: '2026-06-01',
      jenis: 'pemupukan',
      waktu: '07:00',
      catatan: '',
    });

    expect(fetch).toHaveBeenCalledWith('/api/calendar/events', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }));
  });
});
