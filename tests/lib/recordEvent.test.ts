import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { recordEvent } from '@/lib/analytics/recordEvent';

describe('recordEvent', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('silently ignores FK violations (guest user not in users table)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { code: '23503', message: 'insert or update on table "usage_events" violates foreign key constraint' } }),
    });

    await expect(
      recordEvent({ userId: '00000000-0000-4000-8000-000000000009', feature: 'keuangan', eventType: 'page_view', eventName: 'test' }),
    ).resolves.toBeUndefined();
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('still logs other insert errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } }),
    });

    await recordEvent({ userId: 'user-1', feature: 'keuangan', eventType: 'action', eventName: 'test' });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
