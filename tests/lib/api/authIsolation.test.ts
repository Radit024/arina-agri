import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const getSession = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser,
      getSession,
    },
    from,
  },
}));

const originalEnv = { ...process.env };

describe('Supabase API auth isolation', () => {
  beforeEach(() => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    window.localStorage.clear();
    getUser.mockResolvedValue({ data: { user: null } });
    getSession.mockResolvedValue({ data: { session: null } });
    from.mockImplementation(() => {
      throw new Error('direct Supabase query should not run without an authenticated or local user');
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    window.localStorage.clear();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('does not query with the shared development user when local mode is inactive', async () => {
    const { transactionApi } = await import('@/lib/api');

    await expect(transactionApi.getAll()).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
