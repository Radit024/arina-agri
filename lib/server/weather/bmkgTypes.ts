export type BmkgWeatherCondition = 'cerah' | 'berawan' | 'hujan' | 'gerimis' | 'mendung';

export interface BmkgForecastSnapshot {
  utcDatetime: string;
  localDatetime: string;
  temperatureC: number;
  humidityPercent: number;
  weatherCode?: number;
  condition: BmkgWeatherCondition;
  conditionText: string;
  conditionTextEn?: string;
  windSpeedKmh: number;
  windDirection?: string;
  cloudCoverPercent?: number;
  visibilityText?: string;
  rainfallMm: number;
  locationLabel: string;
  adm4: string;
  source: 'BMKG';
}

export interface BmkgForecastDay {
  date: string;
  minTemperatureC: number;
  maxTemperatureC: number;
  dominantCondition: BmkgWeatherCondition;
  totalRainfallMm: number;
  slots: BmkgForecastSnapshot[];
}

export interface BmkgWeatherWarning {
  id: string;
  event: string;
  headline: string;
  description: string;
  severity?: string;
  urgency?: string;
  certainty?: string;
  effective?: string;
  expires?: string;
  senderName?: string;
  web?: string;
  affectedAreas: string[];
  provinceTitle?: string;
  source: 'BMKG';
}

export interface BmkgForecastResponse {
  adm4: string;
  locationLabel: string;
  current: BmkgForecastSnapshot;
  days: BmkgForecastDay[];
  updatedAt: string;
  attribution: string;
  isFallback: boolean;
}

export interface BmkgWarningsResponse {
  provinceCode: string;
  provinceName: string;
  warnings: BmkgWeatherWarning[];
  updatedAt: string;
  attribution: string;
  isFallback: boolean;
}

export const DEFAULT_BMKG_ADM4 = '35.07.22.2008';
export const DEFAULT_BMKG_LOCATION_LABEL = 'Desa Wonorejo, Malang';
export const DEFAULT_BMKG_PROVINCE_CODE = 'jatim';
export const DEFAULT_BMKG_PROVINCE_NAME = 'Jawa Timur';
export const BMKG_ATTRIBUTION = 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)';
