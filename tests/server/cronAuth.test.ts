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
  it('denies in development when secret is missing (fail-closed)', () => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(makeRequest())).toBe(false);
  });

  it('denies in production when secret is missing', () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(makeRequest())).toBe(false);
  });

  it('denies when a stale auth header is present but secret is missing', () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(makeRequest('Bearer secret'))).toBe(false);
  });

  it('allows in development with correct header', () => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    process.env.CRON_SECRET = 'secret';
    expect(isCronAuthorized(makeRequest('Bearer secret'))).toBe(true);
  });

  it('denies in production with wrong header', () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    process.env.CRON_SECRET = 'secret';
    expect(isCronAuthorized(makeRequest('Bearer wrong'))).toBe(false);
  });

  it('allows in production with correct header', () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    process.env.CRON_SECRET = 'secret';
    expect(isCronAuthorized(makeRequest('Bearer secret'))).toBe(true);
  });
});
