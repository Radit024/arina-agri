import { describe, expect, it } from 'vitest';
import {
  BMKG_ATTRIBUTION,
  type BmkgForecastResponse,
} from '@/lib/server/weather/bmkgTypes';

describe('BMKG weather types', () => {
  it('keeps forecast response shape and attribution stable', () => {
    const response: BmkgForecastResponse = {
      adm4: '35.07.22.2008',
      locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
      updatedAt: '2026-05-20T00:00:00.000Z',
      attribution: BMKG_ATTRIBUTION,
      isFallback: false,
      current: {
        utcDatetime: '2026-05-20 00:00:00',
        localDatetime: '2026-05-20 07:00:00',
        temperatureC: 24,
        humidityPercent: 82,
        condition: 'hujan',
        conditionText: 'Hujan Ringan',
        windSpeedKmh: 8,
        rainfallMm: 0,
        locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
        adm4: '35.07.22.2008',
        source: 'BMKG',
      },
      days: [],
    };

    expect(response.adm4).toBe('35.07.22.2008');
    expect(response.attribution).toContain('BMKG');
  });
});
