import { afterEach, describe, expect, it } from 'vitest';
import { isCronAuthorized } from '@/lib/server/cron/auth';

const originalEnv = { ...process.env };

function makeRequest(auth?: string) {
  return new Request('http://localhost', {
    headers: auth ? { authorization: auth } : {},
  });
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('isCronAuthorized', () => {
  it('allows requests in development without auth header', () => {
    process.env.NODE_ENV = 'development';
    expect(isCronAuthorized(makeRequest())).toBe(true);
  });

  it('denies in production when secret is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(makeRequest())).toBe(false);
  });

  it('denies in production with wrong header', () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'secret';
    expect(isCronAuthorized(makeRequest('Bearer wrong'))).toBe(false);
  });

  it('allows in production with correct header', () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'secret';
    expect(isCronAuthorized(makeRequest('Bearer secret'))).toBe(true);
  });
});
