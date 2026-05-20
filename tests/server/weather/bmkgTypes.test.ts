import { describe, expect, it } from 'vitest';
import {
  BMKG_ATTRIBUTION,
  DEFAULT_BMKG_ADM4,
  DEFAULT_BMKG_LOCATION_LABEL,
  type BmkgForecastResponse,
} from '@/lib/server/weather/bmkgTypes';

describe('BMKG weather types', () => {
  it('keeps default prototype location and attribution stable', () => {
    const response: BmkgForecastResponse = {
      adm4: DEFAULT_BMKG_ADM4,
      locationLabel: DEFAULT_BMKG_LOCATION_LABEL,
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
        locationLabel: DEFAULT_BMKG_LOCATION_LABEL,
        adm4: DEFAULT_BMKG_ADM4,
        source: 'BMKG',
      },
      days: [],
    };

    expect(response.adm4).toBe('35.07.22.2008');
    expect(response.attribution).toContain('BMKG');
  });
});
