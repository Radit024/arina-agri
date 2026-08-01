import { describe, expect, it, vi, beforeEach } from 'vitest';

const resolveRequestUserId = vi.fn();
const recordEvent = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/analytics/recordEvent', () => ({
  recordEvent: (input: unknown) => recordEvent(input),
}));

describe('analytics events route', () => {
  beforeEach(() => {
    resolveRequestUserId.mockReset();
    recordEvent.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/analytics/events/route');

    const response = await POST(new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ feature: 'keuangan' }),
    }));

    expect(response.status).toBe(401);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid feature', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const { POST } = await import('@/app/api/analytics/events/route');

    const response = await POST(new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ feature: 'not-a-feature' }),
    }));

    expect(response.status).toBe(400);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('records a page_view event and returns 204', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    recordEvent.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/analytics/events/route');

    const response = await POST(new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ feature: 'stok' }),
    }));

    expect(response.status).toBe(204);
    expect(recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'stok',
      eventType: 'page_view',
      eventName: 'page_view',
    });
  });
});
