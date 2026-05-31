import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as reverseLocation } from '@/app/api/location/reverse/route';
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

  it('keeps Kota Malang distinct from Kabupaten Malang when resolving GPS locations', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('nominatim.openstreetmap.org/reverse')) {
        return jsonResponse({
          place_id: 2,
          lat: '-7.9316959',
          lon: '112.6378254',
          display_name: 'Jalan Ikan Piranha Atas, Tunjungsekar, Kota Malang, Lowokwaru, Jawa Timur, Jawa, 65141, Indonesia',
          address: {
            road: 'Jalan Ikan Piranha Atas',
            village: 'Tunjungsekar',
            city: 'Kota Malang',
            district: 'Lowokwaru',
            state: 'Jawa Timur',
          },
        });
      }

      if (url.endsWith('/api/provinces.json')) {
        return jsonResponse({ data: [{ code: '35', name: 'Jawa Timur' }] });
      }

      if (url.endsWith('/api/regencies/35.json')) {
        return jsonResponse({
          data: [
            { code: '35.07', name: 'Kabupaten Malang' },
            { code: '35.73', name: 'Kota Malang' },
          ],
        });
      }

      if (url.endsWith('/api/districts/35.73.json')) {
        return jsonResponse({ data: [{ code: '35.73.05', name: 'Lowokwaru' }] });
      }

      if (url.endsWith('/api/villages/35.73.05.json')) {
        return jsonResponse({ data: [{ code: '35.73.05.1008', name: 'Tunjungsekar' }] });
      }

      throw new Error(`Unexpected URL ${url}`);
    }));

    const response = await reverseLocation(new Request('http://localhost/api/location/reverse?lat=-7.93167&lon=112.63784'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      adm4: '35.73.05.1008',
      label: 'Tunjungsekar, Kec. Lowokwaru, Kota Malang, Jawa Timur',
      name: 'Tunjungsekar',
    });
  });
});
