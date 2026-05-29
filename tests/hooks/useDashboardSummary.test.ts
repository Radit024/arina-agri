import { describe, expect, it } from 'vitest';
import { buildDashboardSummaryUrl } from '@/hooks/useDashboardSummary';

describe('buildDashboardSummaryUrl', () => {
  it('adds encoded location params when present', () => {
    expect(buildDashboardSummaryUrl({
      adm4: '35.07.22.2008',
      locationLabel: 'Desa Sumber, Malang',
    })).toBe('/api/dashboard/summary?adm4=35.07.22.2008&locationLabel=Desa+Sumber%2C+Malang');
  });

  it('omits empty params', () => {
    expect(buildDashboardSummaryUrl({ adm4: '', locationLabel: undefined })).toBe('/api/dashboard/summary');
  });
});
