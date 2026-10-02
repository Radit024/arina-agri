import { describe, expect, it } from 'vitest';
import { getModeLabel, getModeSlug, MODE_LABELS, MODE_SLUGS } from '@/lib/finance/scenarioLabels';

describe('scenarioLabels', () => {
  it('returns correct Indonesian labels for scenario modes', () => {
    expect(getModeLabel('PROJECTION')).toBe('Proyeksi');
    expect(getModeLabel('REALIZATION')).toBe('Realisasi');
    expect(MODE_LABELS.PROJECTION).toBe('Proyeksi');
    expect(MODE_LABELS.REALIZATION).toBe('Realisasi');
  });

  it('returns URL and filename-safe slugs for scenario modes', () => {
    expect(getModeSlug('PROJECTION')).toBe('proyeksi');
    expect(getModeSlug('REALIZATION')).toBe('realisasi');
    expect(MODE_SLUGS.PROJECTION).toBe('proyeksi');
    expect(MODE_SLUGS.REALIZATION).toBe('realisasi');
  });
});
