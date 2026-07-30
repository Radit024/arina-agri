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

const batchRow = {
  id: 'batch-1',
  batch_code: 'BATCH-001-A',
  tanggal_panen: '2026-07-30',
  grade: 'A',
  berat_masuk: 100,
  stok_tersisa: 100,
  harga_modal: 10000,
  harga_jual: 20000,
  lokasi_penyimpanan: 'Gudang Utama',
  estimasi_kadaluarsa: '2026-08-13',
  catatan: '',
  status: 'aman',
  created_at: '2026-07-30T00:00:00.000Z',
  updated_at: '2026-07-30T00:00:00.000Z',
};

function validPayload() {
  return {
    tanggalPanen: '2026-07-30',
    grade: 'A',
    beratMasuk: 100,
    hargaModal: 10000,
    hargaJual: 20000,
    lokasiPenyimpanan: 'Gudang Utama',
    estimasiKadaluarsa: '2026-08-13',
  };
}

describe('stok batches route', () => {
  beforeEach(() => {
    from.mockReset();
    resolveRequestUserId.mockReset();
    recordEvent.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/stok/batches/route');

    const response = await POST(new Request('http://localhost/api/stok/batches', {
      method: 'POST',
      body: JSON.stringify(validPayload()),
    }));

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('creates a batch, logs the initial mutation, and records a usage event', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');

    const countSelect = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ count: 0 }) }));

    const batchSingle = vi.fn().mockResolvedValue({ data: batchRow, error: null });
    const batchSelect = vi.fn(() => ({ single: batchSingle }));
    const batchInsert = vi.fn(() => ({ select: batchSelect }));

    const mutationInsert = vi.fn().mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === 'harvest_batches') {
        return { select: countSelect, insert: batchInsert };
      }
      if (table === 'stock_mutations') {
        return { insert: mutationInsert };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { POST } = await import('@/app/api/stok/batches/route');
    const response = await POST(new Request('http://localhost/api/stok/batches', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify(validPayload()),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(batchInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      batch_code: 'BATCH-001-A',
      status: 'aman',
    }));
    expect(mutationInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      batch_id: 'batch-1',
      tipe: 'masuk',
    }));
    expect(json.data).toMatchObject({ _id: 'batch-1', batchCode: 'BATCH-001-A' });
    expect(recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'stok',
      eventType: 'action',
      eventName: 'stock_entry_created',
    });
  });

  it('returns 500 and does not record an event when the batch insert fails', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');

    const countSelect = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ count: 0 }) }));
    const batchSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const batchSelect = vi.fn(() => ({ single: batchSingle }));
    const batchInsert = vi.fn(() => ({ select: batchSelect }));

    from.mockImplementation((table: string) => {
      if (table === 'harvest_batches') {
        return { select: countSelect, insert: batchInsert };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { POST } = await import('@/app/api/stok/batches/route');
    const response = await POST(new Request('http://localhost/api/stok/batches', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify(validPayload()),
    }));

    expect(response.status).toBe(500);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid payload', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const { POST } = await import('@/app/api/stok/batches/route');

    const response = await POST(new Request('http://localhost/api/stok/batches', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ grade: 'A' }),
    }));

    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
