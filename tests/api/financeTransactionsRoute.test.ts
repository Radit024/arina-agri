import { describe, expect, it, vi, beforeEach } from 'vitest';

const from = vi.fn();
const resolveRequestUserId = vi.fn();
const recordEvent = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

vi.mock('@/lib/analytics/recordEvent', () => ({
  recordEvent: (input: unknown) => recordEvent(input),
}));

const transactionRow = {
  id: 'tx-1',
  jenis: 'pengeluaran',
  kategori: 'Pupuk',
  nominal: 150000,
  tanggal: '2026-07-30',
  keterangan: 'Beli pupuk',
  project_id: null,
  rab_category_id: null,
  rab_item_id: null,
  volume: null,
  satuan: null,
  harga_satuan: null,
  created_at: '2026-07-30T00:00:00.000Z',
  updated_at: '2026-07-30T00:00:00.000Z',
};

describe('finance transactions route', () => {
  beforeEach(() => {
    from.mockReset();
    resolveRequestUserId.mockReset();
    recordEvent.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/finance/transactions/route');

    const response = await POST(new Request('http://localhost/api/finance/transactions', {
      method: 'POST',
      body: JSON.stringify({ jenis: 'pengeluaran', kategori: 'Pupuk', nominal: 1000, tanggal: '2026-07-30' }),
    }));

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('creates a transaction and records a usage event', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const single = vi.fn().mockResolvedValue({ data: transactionRow, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    from.mockReturnValue({ insert });
    const { POST } = await import('@/app/api/finance/transactions/route');

    const response = await POST(new Request('http://localhost/api/finance/transactions', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({
        jenis: 'pengeluaran',
        kategori: 'Pupuk',
        nominal: 150000,
        tanggal: '2026-07-30',
        keterangan: 'Beli pupuk',
      }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      jenis: 'pengeluaran',
      kategori: 'Pupuk',
      nominal: 150000,
    }));
    expect(json.data).toMatchObject({ _id: 'tx-1', jenis: 'pengeluaran', nominal: 150000 });
    expect(recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'keuangan',
      eventType: 'action',
      eventName: 'transaction_created',
    });
  });

  it('returns 500 and does not record an event when the insert fails', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    from.mockReturnValue({ insert });
    const { POST } = await import('@/app/api/finance/transactions/route');

    const response = await POST(new Request('http://localhost/api/finance/transactions', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({
        jenis: 'pengeluaran',
        kategori: 'Pupuk',
        nominal: 150000,
        tanggal: '2026-07-30',
      }),
    }));

    expect(response.status).toBe(500);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid payload', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const { POST } = await import('@/app/api/finance/transactions/route');

    const response = await POST(new Request('http://localhost/api/finance/transactions', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ jenis: 'bukan-jenis-valid' }),
    }));

    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
