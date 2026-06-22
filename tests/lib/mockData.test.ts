import { describe, expect, it } from 'vitest';

import * as mockData from '@/lib/mockData';

describe('mockData', () => {
  it('does not export placeholder weather data or weather alerts', () => {
    expect('currentWeather' in mockData).toBe(false);
    expect('weatherForecast' in mockData).toBe(false);
    expect('weatherAlerts' in mockData).toBe(false);
  });
});
