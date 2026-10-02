import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getForecast } from '@/app/api/weather/forecast/route';
import { GET as getWarnings } from '@/app/api/weather/warnings/route';

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const xmlResponse = (body: string) => new Response(body, { status: 200 });

describe('BMKG weather routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns normalized forecast from BMKG JSON', async () => {
    const fixture = await import('../../fixtures/bmkgForecast.json');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(fixture.default)));

    const response = await getForecast(new Request('http://localhost/api/weather/forecast?adm4=35.07.22.2008'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.days).toHaveLength(3);
    expect(json.data.attribution).toContain('BMKG');
  });

  it('rejects forecast requests without a selected BMKG adm4 code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('should not fetch without adm4')));

    const response = await getForecast(new Request('http://localhost/api/weather/forecast'));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toContain('adm4');
  });

  it('returns normalized warnings from RSS and CAP XML', async () => {
    const rss = `<?xml version="1.0"?><rss><channel><item><title>Peringatan Dini Cuaca Jawa Timur</title><link>https://www.bmkg.go.id/alerts/nowcast/id/jatim_alert.xml</link><description>Malang</description><pubDate>Wed, 20 May 2026 06:45:00 +0700</pubDate></item></channel></rss>`;
    const cap = `<?xml version="1.0"?><alert><identifier>id-1</identifier><info><event>Hujan Lebat</event><severity>Severe</severity><urgency>Immediate</urgency><certainty>Likely</certainty><headline>Alert</headline><description>Hujan lebat</description><area><areaDesc>Malang; Batu</areaDesc></area></info></alert>`;

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(xmlResponse(rss))
      .mockResolvedValueOnce(xmlResponse(cap)));

    const response = await getWarnings(new Request('http://localhost/api/weather/warnings?province=jatim'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.warnings[0].affectedAreas).toEqual(['Malang', 'Batu']);
  });

  it('matches BMKG warning RSS items by province title when CAP links use opaque detail codes', async () => {
    const rss = `<?xml version="1.0"?><rss><channel>
      <item><title>Peringatan Dini Cuaca Sulawesi Tengah</title><link>https://www.bmkg.go.id/alerts/nowcast/id/CSG20260601004_alert.xml</link><description>Paleleh Barat</description></item>
      <item><title>Peringatan Dini Cuaca Jawa Timur</title><link>https://www.bmkg.go.id/alerts/nowcast/id/CJT20260601007_alert.xml</link><description>Dau, Lowokwaru</description></item>
    </channel></rss>`;
    const cap = `<?xml version="1.0"?><alert><identifier>id-jatim</identifier><info><event>Hujan Lebat</event><severity>Severe</severity><urgency>Immediate</urgency><certainty>Likely</certainty><headline>Alert Jawa Timur</headline><description>Hujan lebat di wilayah Jawa Timur</description><area><areaDesc>Dau; Lowokwaru</areaDesc></area></info></alert>`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(xmlResponse(rss))
      .mockResolvedValueOnce(xmlResponse(cap));
    vi.stubGlobal('fetch', fetchMock);

    const response = await getWarnings(new Request('http://localhost/api/weather/warnings?province=jatim&provinceName=Jawa%20Timur'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://www.bmkg.go.id/alerts/nowcast/id/CJT20260601007_alert.xml',
      expect.any(Object),
    );
    expect(json.data.warnings[0].affectedAreas).toEqual(['Dau', 'Lowokwaru']);
  });
});
