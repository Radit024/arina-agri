import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeBmkgForecast } from '@/lib/server/weather/bmkgNormalize';
import { weatherSnapshotFromBmkgForecast } from '@/lib/server/notifications/weatherSnapshot';

const fixture = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), 'tests', 'fixtures', name), 'utf8');

describe('weatherSnapshotFromBmkgForecast', () => {
  it('maps BMKG current forecast into notification weather input', () => {
    const forecast = normalizeBmkgForecast(JSON.parse(fixture('bmkgForecast.json')), {
      adm4: '35.07.22.2008',
      locationLabel: 'Mulyoagung, Dau, Kabupaten Malang',
      isFallback: false,
    });

    const snapshot = weatherSnapshotFromBmkgForecast(forecast);

    expect(snapshot).toEqual({
      kondisi: 'hujan',
      suhu: 24,
      kelembapan: 82,
      curahHujan: 6,
      kecepatanAngin: 8,
      lokasi: 'Mulyoagung, Dau, Kabupaten Malang',
    });
  });

  it('prefers an explicit schedule location label when provided', () => {
    const forecast = normalizeBmkgForecast(JSON.parse(fixture('bmkgForecast.json')), {
      adm4: '35.07.22.2008',
      locationLabel: 'BMKG Label',
      isFallback: false,
    });

    const snapshot = weatherSnapshotFromBmkgForecast(forecast, 'Kebun Cabai Pak Budi');

    expect(snapshot.lokasi).toBe('Kebun Cabai Pak Budi');
  });
});
