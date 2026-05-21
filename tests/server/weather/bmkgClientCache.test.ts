import { afterEach, describe, expect, it, vi } from 'vitest';

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('BMKG forecast cache', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('keeps the requested manual location label when reusing cached forecast data', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const fixture = await import('../../fixtures/bmkgForecast.json');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(fixture.default));
    vi.stubGlobal('fetch', fetchMock);

    const { getBmkgForecast } = await import('@/lib/server/weather/bmkgClient');

    const first = await getBmkgForecast({ adm4: '35.07.22.2008', locationLabel: 'Mulyoagung, Dau, Kabupaten Malang' });
    const second = await getBmkgForecast({ adm4: '35.07.22.2008', locationLabel: 'Kota Batu, Jawa Timur' });

    expect(first.current.locationLabel).toBe('Mulyoagung, Dau, Kabupaten Malang');
    expect(second.locationLabel).toBe('Kota Batu, Jawa Timur');
    expect(second.current.locationLabel).toBe('Kota Batu, Jawa Timur');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
