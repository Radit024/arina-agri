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

  it('resolves GPS locations when Nominatim returns a village without a district', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('nominatim.openstreetmap.org/reverse')) {
        return jsonResponse({
          place_id: 4,
          lat: '-7.9467',
          lon: '112.6064',
          display_name: 'Tlogomas, Kota Malang, Jawa Timur, Indonesia',
          address: {
            suburb: 'Tlogomas',
            city: 'Kota Malang',
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
        return jsonResponse({
          data: [
            { code: '35.73.04', name: 'Sukun' },
            { code: '35.73.05', name: 'Lowokwaru' },
          ],
        });
      }

      if (url.endsWith('/api/villages/35.73.04.json')) {
        return jsonResponse({ data: [{ code: '35.73.04.1001', name: 'Sukun' }] });
      }

      if (url.endsWith('/api/villages/35.73.05.json')) {
        return jsonResponse({ data: [{ code: '35.73.05.1007', name: 'Tlogomas' }] });
      }

      throw new Error(`Unexpected URL ${url}`);
    }));

    const response = await reverseLocation(new Request('http://localhost/api/location/reverse?lat=-7.9467&lon=112.6064'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      adm4: '35.73.05.1007',
      label: 'Tlogomas, Kec. Lowokwaru, Kota Malang, Jawa Timur',
      name: 'Tlogomas',
    });
  });

  it('uses the district to disambiguate Kota Malang from Kabupaten Malang GPS results', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('nominatim.openstreetmap.org/reverse')) {
        return jsonResponse({
          place_id: 5,
          lat: '-7.946701',
          lon: '112.6063994',
          display_name: 'Puri Nirwana Gajayana, Merjosari, Sengkaling, Malang, Lowokwaru, Jawa Timur, Indonesia',
          address: {
            residential: 'Puri Nirwana Gajayana',
            suburb: 'Merjosari',
            town: 'Sengkaling',
            city: 'Malang',
            district: 'Lowokwaru',
            country: 'Jawa Timur',
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

      if (url.endsWith('/api/districts/35.07.json')) {
        return jsonResponse({ data: [{ code: '35.07.22', name: 'Dau' }] });
      }

      if (url.endsWith('/api/villages/35.07.22.json')) {
        return jsonResponse({ data: [{ code: '35.07.22.2008', name: 'Mulyoagung' }] });
      }

      if (url.endsWith('/api/districts/35.73.json')) {
        return jsonResponse({
          data: [
            { code: '35.73.04', name: 'Sukun' },
            { code: '35.73.05', name: 'Lowokwaru' },
          ],
        });
      }

      if (url.endsWith('/api/villages/35.73.05.json')) {
        return jsonResponse({ data: [{ code: '35.73.05.1002', name: 'Merjosari' }] });
      }

      throw new Error(`Unexpected URL ${url}`);
    }));

    const response = await reverseLocation(new Request('http://localhost/api/location/reverse?lat=-7.946701&lon=112.6063994'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      adm4: '35.73.05.1002',
      label: 'Merjosari, Kec. Lowokwaru, Kota Malang, Jawa Timur',
      name: 'Merjosari',
    });
  });

  it('falls back to the nearest BMKG village in the matched regency when GPS lacks district and village details', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('nominatim.openstreetmap.org/reverse')) {
        return jsonResponse({
          place_id: 6,
          lat: '-7.2088',
          lon: '107.8992',
          display_name: 'Kawasan Perkebunan, Garut, Jawa Barat, Indonesia',
          address: {
            county: 'Garut',
            state: 'Jawa Barat',
          },
        });
      }

      if (url.endsWith('/api/provinces.json')) {
        return jsonResponse({ data: [{ code: '32', name: 'Jawa Barat' }] });
      }

      if (url.endsWith('/api/regencies/32.json')) {
        return jsonResponse({ data: [{ code: '32.05', name: 'Kabupaten Garut' }] });
      }

      if (url.endsWith('/api/districts/32.05.json')) {
        return jsonResponse({
          data: [
            { code: '32.05.01', name: 'Tarogong Kidul' },
            { code: '32.05.02', name: 'Samarang' },
          ],
        });
      }

      if (url.endsWith('/api/villages/32.05.01.json')) {
        return jsonResponse({ data: [{ code: '32.05.01.2001', name: 'Haurpanggung' }] });
      }

      if (url.endsWith('/api/villages/32.05.02.json')) {
        return jsonResponse({ data: [{ code: '32.05.02.2002', name: 'Sukakarya' }] });
      }

      if (url.includes('api.bmkg.go.id/publik/prakiraan-cuaca') && url.includes('adm4=32.05.01.2001')) {
        return jsonResponse({
          lokasi: {
            adm4: '32.05.01.2001',
            desa: 'Haurpanggung',
            lat: -7.211,
            lon: 107.9,
          },
        });
      }

      if (url.includes('api.bmkg.go.id/publik/prakiraan-cuaca') && url.includes('adm4=32.05.02.2002')) {
        return jsonResponse({
          lokasi: {
            adm4: '32.05.02.2002',
            desa: 'Sukakarya',
            lat: -7.3,
            lon: 107.82,
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    }));

    const response = await reverseLocation(new Request('http://localhost/api/location/reverse?lat=-7.2088&lon=107.8992'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      adm4: '32.05.01.2001',
      label: 'Haurpanggung, Kec. Tarogong Kidul, Kabupaten Garut, Jawa Barat',
      name: 'Haurpanggung',
    });
  });

  it('falls back to the nearest BMKG village when GPS reverse geocoding misses the village name', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('nominatim.openstreetmap.org/reverse')) {
        return jsonResponse({
          place_id: 3,
          lat: '-7.93690',
          lon: '112.65020',
          display_name: 'Jalan Simpang Candi Panggung, Perumahan Dinoyo, Lowokwaru, Kota Malang, Jawa Timur, Indonesia',
          address: {
            road: 'Jalan Simpang Candi Panggung',
            neighbourhood: 'Perumahan Dinoyo',
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
        return jsonResponse({
          data: [
            { code: '35.73.05.1008', name: 'Tunjungsekar' },
            { code: '35.73.05.1009', name: 'Mojolangu' },
          ],
        });
      }

      if (url.includes('api.bmkg.go.id/publik/prakiraan-cuaca') && url.includes('adm4=35.73.05.1008')) {
        return jsonResponse({
          lokasi: {
            adm4: '35.73.05.1008',
            desa: 'Tunjungsekar',
            lat: -7.92912,
            lon: 112.63313,
          },
        });
      }

      if (url.includes('api.bmkg.go.id/publik/prakiraan-cuaca') && url.includes('adm4=35.73.05.1009')) {
        return jsonResponse({
          lokasi: {
            adm4: '35.73.05.1009',
            desa: 'Mojolangu',
            lat: -7.937,
            lon: 112.65,
          },
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    }));

    const response = await reverseLocation(new Request('http://localhost/api/location/reverse?lat=-7.93690&lon=112.65020'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      adm4: '35.73.05.1009',
      label: 'Mojolangu, Kec. Lowokwaru, Kota Malang, Jawa Timur',
      name: 'Mojolangu',
    });
  });
});
