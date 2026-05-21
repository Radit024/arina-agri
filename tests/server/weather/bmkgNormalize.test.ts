import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  normalizeBmkgForecast,
  normalizeBmkgWarningsFromCap,
  parseBmkgWarningRssItems,
} from '@/lib/server/weather/bmkgNormalize';

const fixture = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), 'tests', 'fixtures', name), 'utf8');

describe('BMKG forecast normalizer', () => {
  it('maps BMKG forecast JSON into current and 3 grouped days', () => {
    const raw = JSON.parse(fixture('bmkgForecast.json'));
    const result = normalizeBmkgForecast(raw, {
      adm4: '35.07.22.2008',
      locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
      isFallback: false,
    });

    expect(result.current.condition).toBe('hujan');
    expect(result.current.temperatureC).toBe(24);
    expect(result.days).toHaveLength(3);
    expect(result.days[0].date).toBe('2026-05-20');
    expect(result.days[0].maxTemperatureC).toBe(29);
    expect(result.attribution).toContain('BMKG');
  });

  it('throws a clear error when forecast slots are absent', () => {
    expect(() =>
      normalizeBmkgForecast({ lokasi: {}, data: [] }, {
        adm4: '35.07.22.2008',
        locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
        isFallback: false,
      })
    ).toThrow('BMKG forecast payload has no forecast slots');
  });
});

describe('BMKG warning normalizer', () => {
  it('parses RSS warning detail links', () => {
    const items = parseBmkgWarningRssItems(fixture('bmkgWarningsRss.xml'));

    expect(items).toEqual([
      {
        title: 'Peringatan Dini Cuaca Jawa Timur',
        link: 'https://www.bmkg.go.id/alerts/nowcast/id/jatim_alert.xml',
        description: 'Malang, Batu, Pasuruan berpotensi hujan sedang hingga lebat.',
        pubDate: 'Wed, 20 May 2026 06:45:00 +0700',
      },
    ]);
  });

  it('maps CAP warning XML into affected areas and severity', () => {
    const warnings = normalizeBmkgWarningsFromCap(fixture('bmkgWarningCap.xml'), {
      provinceCode: 'jatim',
      provinceName: 'Jawa Timur',
      provinceTitle: 'Peringatan Dini Cuaca Jawa Timur',
      isFallback: false,
    });

    expect(warnings.warnings[0]).toMatchObject({
      id: 'bmkg-jatim-202605200645',
      event: 'Hujan Sedang-Lebat',
      severity: 'Severe',
      urgency: 'Immediate',
      certainty: 'Likely',
      affectedAreas: ['Malang', 'Batu', 'Pasuruan'],
      source: 'BMKG',
    });
  });
});
