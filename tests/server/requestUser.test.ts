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
  it('uses dev-user-id for the development mock token', async () => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    await expect(resolveRequestUserId(makeRequest('Bearer mock-token'))).resolves.toBe('dev-user-id');
  });

  it('returns null when no token is present', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    await expect(resolveRequestUserId(makeRequest())).resolves.toBeNull();
  });
});
