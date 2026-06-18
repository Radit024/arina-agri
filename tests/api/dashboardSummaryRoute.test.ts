import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/dashboard/summary', () => ({
  getDashboardSummary: vi.fn().mockResolvedValue({
    generatedAt: '2026-05-15T08:00:00.000Z',
    kpi: { totalPengeluaran: 0, labaBersih: 0, expTrend: 0, profitTrend: 0 },
    trend: [],
    category: [],
    price: { todayPrice: null, yesterdayPrice: null, priceDelta: null, priceDeltaPct: null, isTrendingUp: null },
    weather: { currentWeather: null },
    news: { articles: [] },
  }),
}));

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: vi.fn().mockImplementation(async (request: Request) => {
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader === 'Bearer mock-token') {
      return '00000000-0000-4000-8000-000000000001';
    }
    return null;
  }),
}));

describe('dashboard summary route', () => {
  it('returns 401 when authorization is missing', async () => {
    const { GET } = await import('@/app/api/dashboard/summary/route');

    const response = await GET(new Request('http://localhost/api/dashboard/summary'));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ success: false, message: 'Unauthorized' });
  });

  it('returns summary data for the development mock token', async () => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    const { GET } = await import('@/app/api/dashboard/summary/route');
    const { getDashboardSummary } = await import('@/lib/server/dashboard/summary');

    const response = await GET(new Request('http://localhost/api/dashboard/summary?adm4=35.07.22.2008&financeProjectId=project-padi-1', {
      headers: { authorization: 'Bearer mock-token' },
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.generatedAt).toBe('2026-05-15T08:00:00.000Z');
    expect(getDashboardSummary).toHaveBeenCalledWith({
      userId: '00000000-0000-4000-8000-000000000001',
      adm4: '35.07.22.2008',
      financeProjectId: 'project-padi-1',
      locationLabel: undefined,
    });
  });
});
