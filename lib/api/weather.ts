// Akses data domain: weather.

import type {
  BmkgForecastResponse,
  BmkgWarningsResponse,
} from '@/lib/server/weather/bmkgTypes';
import type {
  LocationSearchResult,
} from './types';
import { apiGet } from './client';

export const weatherApi = {
  getForecast: (params: { adm4: string; locationLabel?: string }) => {
    const search = new URLSearchParams();
    search.set('adm4', params.adm4);
    if (params.locationLabel) search.set('locationLabel', params.locationLabel);
    const query = search.toString();
    return apiGet<BmkgForecastResponse>(`/api/weather/forecast?${query}`);
  },

  getWarnings: (params?: { province?: string; provinceName?: string }) => {
    const search = new URLSearchParams();
    if (params?.province) search.set('province', params.province);
    if (params?.provinceName) search.set('provinceName', params.provinceName);
    const query = search.toString();
    return apiGet<BmkgWarningsResponse>(`/api/weather/warnings${query ? `?${query}` : ''}`);
  },
};


export const locationApi = {
  search: (params: { query: string; limit?: number }) => {
    const search = new URLSearchParams();
    search.set('q', params.query);
    if (params.limit) search.set('limit', String(params.limit));
    return apiGet<LocationSearchResult[]>(`/api/location/search?${search.toString()}`);
  },
  reverse: (params: { lat: number; lon: number }) => {
    const search = new URLSearchParams();
    search.set('lat', String(params.lat));
    search.set('lon', String(params.lon));
    return apiGet<LocationSearchResult>(`/api/location/reverse?${search.toString()}`);
  },
};

// ─── Transaction Category API ─────────────────────────────────────