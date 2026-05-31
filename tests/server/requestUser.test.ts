import { afterEach, describe, expect, it } from 'vitest';
import { getBearerToken, resolveRequestUserId } from '@/lib/server/auth/requestUser';

const originalEnv = { ...process.env };

function makeRequest(auth?: string) {
  return new Request('http://localhost/api/dashboard/summary', {
    headers: auth ? { authorization: auth } : {},
  });
}

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
  it('uses a UUID-shaped development user id for the development mock token', async () => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    const userId = await resolveRequestUserId(makeRequest('Bearer mock-token'));

    expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(userId).not.toBe('dev-user-id');
  });

  it('returns null when no token is present', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    await expect(resolveRequestUserId(makeRequest())).resolves.toBeNull();
  });
});
