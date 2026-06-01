import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBearerToken, resolveRequestUserId } from '@/lib/server/auth/requestUser';

const { listUsers } = vi.hoisted(() => ({
  listUsers: vi.fn(),
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        listUsers,
      },
    },
  }),
}));

const originalEnv = { ...process.env };

function makeRequest(auth?: string) {
  return new Request('http://localhost/api/dashboard/summary', {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  listUsers.mockReset();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('getBearerToken', () => {
  it('returns null when authorization header is missing', () => {
    expect(getBearerToken(makeRequest())).toBeNull();
  });

  it('extracts the bearer token', () => {
    expect(getBearerToken(makeRequest('Bearer abc123'))).toBe('abc123');
  });
});

describe('resolveRequestUserId', () => {
  it('uses a configured development user id for the development mock token', async () => {
    Object.assign(process.env, {
      DEV_USER_ID: '11111111-1111-4111-8111-111111111111',
      NODE_ENV: 'development',
    });
    const userId = await resolveRequestUserId(makeRequest('Bearer mock-token'));

    expect(userId).toBe('11111111-1111-4111-8111-111111111111');
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('uses an existing Supabase auth user for the development mock token when no dev id is configured', async () => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    listUsers.mockResolvedValue({
      data: {
        users: [{ id: '22222222-2222-4222-8222-222222222222' }],
      },
      error: null,
    });
    const userId = await resolveRequestUserId(makeRequest('Bearer mock-token'));

    expect(userId).toBe('22222222-2222-4222-8222-222222222222');
    expect(listUsers).toHaveBeenCalledWith({ page: 1, perPage: 1 });
  });

  it('returns null when no token is present', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    await expect(resolveRequestUserId(makeRequest())).resolves.toBeNull();
  });
});
