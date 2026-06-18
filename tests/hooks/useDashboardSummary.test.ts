import { describe, expect, it } from 'vitest';
import { buildDashboardSummaryHeaders, buildDashboardSummaryUrl } from '@/hooks/useDashboardSummary';

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
});
