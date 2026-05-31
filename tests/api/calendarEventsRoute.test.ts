import { describe, expect, it, vi, beforeEach } from 'vitest';

const from = vi.fn();
const resolveRequestUserId = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

const eventRow = {
  id: 'event-1',
  title: 'Pemupukan blok A',
  date: '2026-06-01',
  category: 'pemupukan',
  waktu: '07:00',
  description: 'Pupuk organik',
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
};

describe('calendar events route', () => {
  beforeEach(() => {
    from.mockReset();
    resolveRequestUserId.mockReset();
  });

  it('returns 401 when authorization is missing', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/calendar/events/route');

    const response = await POST(new Request('http://localhost/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify({ judul: 'Pemupukan', jenis: 'pemupukan', tanggal: '2026-06-01' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ success: false, message: 'Unauthorized' });
    expect(from).not.toHaveBeenCalled();
  });

  it('creates calendar events with the resolved request user id', async () => {
    resolveRequestUserId.mockResolvedValue('00000000-0000-4000-8000-000000000001');
    const single = vi.fn().mockResolvedValue({ data: eventRow, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    from.mockReturnValue({ insert });
    const { POST } = await import('@/app/api/calendar/events/route');

    const response = await POST(new Request('http://localhost/api/calendar/events', {
      method: 'POST',
      headers: { authorization: 'Bearer mock-token' },
      body: JSON.stringify({
        judul: 'Pemupukan blok A',
        jenis: 'pemupukan',
        tanggal: '2026-06-01',
        waktu: '07:00',
        catatan: 'Pupuk organik',
      }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({
      user_id: '00000000-0000-4000-8000-000000000001',
      title: 'Pemupukan blok A',
      date: '2026-06-01',
      category: 'pemupukan',
      waktu: '07:00',
      description: 'Pupuk organik',
    });
    expect(json.data).toMatchObject({
      _id: 'event-1',
      judul: 'Pemupukan blok A',
      tanggal: '2026-06-01',
    });
  });

  it('updates only events owned by the resolved user id', async () => {
    resolveRequestUserId.mockResolvedValue('00000000-0000-4000-8000-000000000001');
    const single = vi.fn().mockResolvedValue({ data: eventRow, error: null });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ eq, select }));
    const update = vi.fn(() => ({ eq }));
    from.mockReturnValue({ update });
    const { PATCH } = await import('@/app/api/calendar/events/route');

    const response = await PATCH(new Request('http://localhost/api/calendar/events', {
      method: 'PATCH',
      headers: { authorization: 'Bearer mock-token' },
      body: JSON.stringify({ id: 'event-1', judul: 'Pemupukan blok A' }),
    }));

    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith('id', 'event-1');
    expect(eq).toHaveBeenCalledWith('user_id', '00000000-0000-4000-8000-000000000001');
  });
});
