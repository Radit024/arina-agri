import { describe, expect, it, vi, beforeEach } from 'vitest';

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const getSupabaseAdmin = vi.fn(() => ({ from }));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

describe('recordEvent', () => {
  beforeEach(() => {
    insert.mockReset();
    from.mockClear();
    getSupabaseAdmin.mockClear();
  });

  it('inserts a row with the given fields', async () => {
    insert.mockResolvedValue({ error: null });
    const { recordEvent } = await import('@/lib/analytics/recordEvent');

    await recordEvent({
      userId: 'user-1',
      feature: 'keuangan',
      eventType: 'action',
      eventName: 'transaction_created',
    });

    expect(from).toHaveBeenCalledWith('usage_events');
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      feature: 'keuangan',
      event_type: 'action',
      event_name: 'transaction_created',
      metadata: null,
    });
  });

  it('does not throw when the insert returns an error', async () => {
    insert.mockResolvedValue({ error: { message: 'insert failed' } });
    const { recordEvent } = await import('@/lib/analytics/recordEvent');

    await expect(recordEvent({
      userId: 'user-1',
      feature: 'stok',
      eventType: 'action',
      eventName: 'stock_entry_created',
    })).resolves.toBeUndefined();
  });

  it('does not throw when getSupabaseAdmin itself throws', async () => {
    getSupabaseAdmin.mockImplementation(() => {
      throw new Error('missing credentials');
    });
    const { recordEvent } = await import('@/lib/analytics/recordEvent');

    await expect(recordEvent({
      userId: null,
      feature: 'kalender',
      eventType: 'page_view',
      eventName: 'page_view',
    })).resolves.toBeUndefined();
  });
});
