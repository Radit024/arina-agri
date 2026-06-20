import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildDashboardSummaryHeaders, buildDashboardSummaryUrl } from '@/hooks/useDashboardSummary';

const originalEnv = { ...process.env };

beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: 'development' });
  window.localStorage.clear();
});

afterEach(() => {
  process.env = { ...originalEnv };
  window.localStorage.clear();
});

describe('buildDashboardSummaryUrl', () => {
  it('adds encoded location params when present', () => {
    expect(buildDashboardSummaryUrl({
      adm4: '35.07.22.2008',
      locationLabel: 'Desa Sumber, Malang',
    })).toBe('/api/dashboard/summary?adm4=35.07.22.2008&locationLabel=Desa+Sumber%2C+Malang');
  });

  it('adds the finance project scope when present', () => {
    expect(buildDashboardSummaryUrl({
      financeProjectId: 'project-padi-1',
    })).toBe('/api/dashboard/summary?financeProjectId=project-padi-1');
  });

  it('omits empty params', () => {
    expect(buildDashboardSummaryUrl({ adm4: '', financeProjectId: '', locationLabel: undefined })).toBe('/api/dashboard/summary');
  });
});

describe('buildDashboardSummaryHeaders', () => {
  it('uses the provided session token without requiring another auth lookup', () => {
    expect(buildDashboardSummaryHeaders('session-token')).toEqual({
      Authorization: 'Bearer session-token',
    });
  });

  it('does not send a development token when local mode is inactive', () => {
    expect(buildDashboardSummaryHeaders(null)).toEqual({});
  });

  it('uses the isolated local development token when local mode is active', () => {
    window.localStorage.setItem('arina_auth_mode', 'local');
    window.localStorage.setItem('arina_local_user_id', '22222222-2222-4222-8222-222222222222');

    expect(buildDashboardSummaryHeaders(null)).toEqual({
      Authorization: 'Bearer mock-token:22222222-2222-4222-8222-222222222222',
    });
  });
});
