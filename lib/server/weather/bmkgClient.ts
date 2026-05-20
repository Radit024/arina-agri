
import {
  BMKG_ATTRIBUTION,
  DEFAULT_BMKG_ADM4,
  DEFAULT_BMKG_LOCATION_LABEL,
  DEFAULT_BMKG_PROVINCE_CODE,
  DEFAULT_BMKG_PROVINCE_NAME,
  type BmkgForecastResponse,
  type BmkgWarningsResponse,
} from './bmkgTypes';
import {
  normalizeBmkgForecast,
  normalizeBmkgWarningsFromCap,
  parseBmkgWarningRssItems,
} from './bmkgNormalize';

const cacheTtlMinutes = Number(process.env.BMKG_FORECAST_CACHE_MINUTES || 30);
const fetchTimeoutMs = Number(process.env.BMKG_FETCH_TIMEOUT_MS || 8000);

const CACHE_TTL_MS = Number.isFinite(cacheTtlMinutes) && cacheTtlMinutes > 0
  ? cacheTtlMinutes * 60 * 1000
  : 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = Number.isFinite(fetchTimeoutMs) && fetchTimeoutMs > 0
  ? fetchTimeoutMs
  : 8000;

const cache = new Map<string, { expiresAt: number; value: unknown }>();

function shouldUseCache() {
  return process.env.NODE_ENV !== 'test';
}

function readCache<T>(key: string): T | null {
  if (!shouldUseCache()) return null;
  const item = cache.get(key);
  if (!item || item.expiresAt < Date.now()) return null;
  return item.value as T;
}

function writeCache<T>(key: string, value: T) {
  if (shouldUseCache()) {
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return value;
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackForecast(adm4: string, locationLabel: string): BmkgForecastResponse {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const slots = [
    {
      utc_datetime: `${dateStr} 00:00:00`,
      local_datetime: `${dateStr} 07:00:00`,
      t: 28,
      hu: 75,
      weather_desc: 'Cerah',
      ws: 10,
    }
  ];

  return normalizeBmkgForecast({ data: [{ cuaca: [slots] }] }, { adm4, locationLabel, isFallback: true });
}

export async function getBmkgForecast(params?: { adm4?: string; locationLabel?: string }): Promise<BmkgForecastResponse> {
  const adm4 = params?.adm4 || DEFAULT_BMKG_ADM4;
  const locationLabel = params?.locationLabel || DEFAULT_BMKG_LOCATION_LABEL;
  const cacheKey = `forecast:${adm4}`;
  const cached = readCache<BmkgForecastResponse>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchWithTimeout(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`);
    if (!response.ok) throw new Error(`BMKG forecast HTTP ${response.status}`);
    const raw: unknown = await response.json();
    return writeCache(cacheKey, normalizeBmkgForecast(raw, { adm4, locationLabel, isFallback: false }));
  } catch {
    return fallbackForecast(adm4, locationLabel);
  }
}

export async function getBmkgWarnings(params?: { provinceCode?: string; provinceName?: string }): Promise<BmkgWarningsResponse> {
  const provinceCode = params?.provinceCode || DEFAULT_BMKG_PROVINCE_CODE;
  const provinceName = params?.provinceName || DEFAULT_BMKG_PROVINCE_NAME;
  const cacheKey = `warnings:${provinceCode}`;
  const cached = readCache<BmkgWarningsResponse>(cacheKey);
  if (cached) return cached;

  try {
    const rssResponse = await fetchWithTimeout('https://www.bmkg.go.id/alerts/nowcast/id');
    if (!rssResponse.ok) throw new Error(`BMKG warnings RSS HTTP ${rssResponse.status}`);
    const rss = await rssResponse.text();
    const matching = parseBmkgWarningRssItems(rss).find((item) => item.link.includes(`/${provinceCode}_alert.xml`));
    if (!matching) {
      return writeCache(cacheKey, {
        provinceCode,
        provinceName,
        warnings: [],
        updatedAt: new Date().toISOString(),
        attribution: BMKG_ATTRIBUTION,
        isFallback: false,
      });
    }

    const capResponse = await fetchWithTimeout(matching.link);
    if (!capResponse.ok) throw new Error(`BMKG warning CAP HTTP ${capResponse.status}`);
    const cap = await capResponse.text();
    return writeCache(cacheKey, normalizeBmkgWarningsFromCap(cap, {
      provinceCode,
      provinceName,
      provinceTitle: matching.title,
      isFallback: false,
    }));
  } catch {
    return {
      provinceCode,
      provinceName,
      warnings: [],
      updatedAt: new Date().toISOString(),
      attribution: BMKG_ATTRIBUTION,
      isFallback: true,
    };
  }
}
