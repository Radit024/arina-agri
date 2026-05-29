import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as searchLocation } from '@/app/api/location/search/route';

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('location search route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns BMKG adm4 codes for manual weather location suggestions', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('nominatim.openstreetmap.org/search')) {
        return jsonResponse([{
          place_id: 1,
          lat: '-7.9201',
          lon: '112.5899',
          display_name: 'Mulyoagung, Dau, Kabupaten Malang, Jawa Timur',
          address: {
            village: 'Mulyoagung',
            city_district: 'Dau',
            county: 'Malang',
            state: 'Jawa Timur',
          },
        }]);
      }

      if (url.endsWith('/api/provinces.json')) {
        return jsonResponse({ data: [{ code: '35', name: 'Jawa Timur' }] });
      }

      if (url.endsWith('/api/regencies/35.json')) {
        return jsonResponse({ data: [{ code: '35.07', name: 'Kabupaten Malang' }] });
      }

      if (url.endsWith('/api/districts/35.07.json')) {
        return jsonResponse({ data: [{ code: '35.07.22', name: 'Dau' }] });
      }

      if (url.endsWith('/api/villages/35.07.22.json')) {
        return jsonResponse({ data: [{ code: '35.07.22.2008', name: 'Mulyoagung' }] });
      }

      throw new Error(`Unexpected URL ${url}`);
    }));

    const response = await searchLocation(new Request('http://localhost/api/location/search?q=mulyoagung'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data[0]).toMatchObject({
      adm4: '35.07.22.2008',
      label: 'Mulyoagung, Kec. Dau, Kabupaten Malang, Jawa Timur',
      name: 'Mulyoagung',
    });
  });
});
