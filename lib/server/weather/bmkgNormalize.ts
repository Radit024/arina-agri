import {
  BMKG_ATTRIBUTION,
  type BmkgForecastDay,
  type BmkgForecastResponse,
  type BmkgForecastSnapshot,
  type BmkgWarningsResponse,
  type BmkgWeatherCondition,
  type BmkgWeatherWarning,
} from './bmkgTypes';

interface ForecastOptions {
  adm4: string;
  locationLabel: string;
  isFallback: boolean;
}

interface WarningOptions {
  provinceCode: string;
  provinceName: string;
  provinceTitle?: string;
  isFallback: boolean;
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

interface RawForecastSlot {
  utc_datetime?: unknown;
  local_datetime?: unknown;
  t?: unknown;
  hu?: unknown;
  weather?: unknown;
  weather_desc?: unknown;
  weather_desc_en?: unknown;
  ws?: unknown;
  wd?: unknown;
  tcc?: unknown;
  vs_text?: unknown;
}

interface RawForecastGroup {
  cuaca?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function conditionFromDescription(description: string): BmkgWeatherCondition {
  const text = description.toLowerCase();
  if (text.includes('hujan')) return 'hujan';
  if (text.includes('gerimis')) return 'gerimis';
  if (text.includes('mendung')) return 'mendung';
  if (text.includes('berawan')) return 'berawan';
  return 'cerah';
}

function rainfallFromDescription(description: string) {
  const text = description.toLowerCase();
  if (text.includes('lebat')) return 30;
  if (text.includes('sedang')) return 18;
  if (text.includes('ringan')) return 6;
  if (text.includes('hujan') || text.includes('gerimis')) return 3;
  return 0;
}

function flattenForecastSlots(raw: unknown): RawForecastSlot[] {
  const record = asRecord(raw);
  const data = Array.isArray(record?.data) ? record.data : [];
  const groups = data.flatMap((item): unknown[] => {
    const forecastGroup = asRecord(item) as RawForecastGroup | null;
    return Array.isArray(forecastGroup?.cuaca) ? forecastGroup.cuaca : [];
  });

  return groups
    .flatMap((group) => Array.isArray(group) ? group : [])
    .filter((slot): slot is RawForecastSlot => Boolean(asRecord(slot)));
}

function dateFromLocalDatetime(value: string) {
  return value.slice(0, 10);
}

function dominantCondition(slots: BmkgForecastSnapshot[]): BmkgWeatherCondition {
  const score: Record<BmkgWeatherCondition, number> = {
    hujan: 5,
    gerimis: 4,
    mendung: 3,
    berawan: 2,
    cerah: 1,
  };
  return slots.reduce<BmkgWeatherCondition>((best, slot) => score[slot.condition] > score[best] ? slot.condition : best, 'cerah');
}

export function normalizeBmkgForecast(raw: unknown, options: ForecastOptions): BmkgForecastResponse {
  const slots = flattenForecastSlots(raw);
  if (!slots.length) {
    throw new Error('BMKG forecast payload has no forecast slots');
  }

  const normalized = slots.map((slot): BmkgForecastSnapshot => {
    const conditionText = asText(slot.weather_desc) || 'Cerah';
    return {
      utcDatetime: asText(slot.utc_datetime),
      localDatetime: asText(slot.local_datetime),
      temperatureC: asNumber(slot.t),
      humidityPercent: asNumber(slot.hu),
      weatherCode: Number.isFinite(Number(slot.weather)) ? Number(slot.weather) : undefined,
      condition: conditionFromDescription(conditionText),
      conditionText,
      conditionTextEn: asText(slot.weather_desc_en) || undefined,
      windSpeedKmh: asNumber(slot.ws),
      windDirection: asText(slot.wd) || undefined,
      cloudCoverPercent: Number.isFinite(Number(slot.tcc)) ? Number(slot.tcc) : undefined,
      visibilityText: asText(slot.vs_text) || undefined,
      rainfallMm: rainfallFromDescription(conditionText),
      locationLabel: options.locationLabel,
      adm4: options.adm4,
      source: 'BMKG',
    };
  });

  const grouped = new Map<string, BmkgForecastSnapshot[]>();
  for (const slot of normalized) {
    const date = dateFromLocalDatetime(slot.localDatetime);
    grouped.set(date, [...(grouped.get(date) ?? []), slot]);
  }

  const days: BmkgForecastDay[] = Array.from(grouped.entries()).slice(0, 3).map(([date, daySlots]) => ({
    date,
    minTemperatureC: Math.min(...daySlots.map((slot) => slot.temperatureC)),
    maxTemperatureC: Math.max(...daySlots.map((slot) => slot.temperatureC)),
    dominantCondition: dominantCondition(daySlots),
    totalRainfallMm: daySlots.reduce((sum, slot) => sum + slot.rainfallMm, 0),
    slots: daySlots,
  }));

  return {
    adm4: options.adm4,
    locationLabel: options.locationLabel,
    current: normalized[0],
    days,
    updatedAt: new Date().toISOString(),
    attribution: BMKG_ATTRIBUTION,
    isFallback: options.isFallback,
  };
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function tagValues(xml: string, tag: string) {
  const pattern = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml))) {
    values.push(stripCdata(match[1].trim()));
  }
  return values;
}

function firstTag(xml: string, tag: string) {
  return tagValues(xml, tag)[0] ?? '';
}

export function parseBmkgWarningRssItems(xml: string): RssItem[] {
  const items = tagValues(xml, 'item');
  return items.map((itemXml) => ({
    title: firstTag(itemXml, 'title'),
    link: firstTag(itemXml, 'link'),
    description: firstTag(itemXml, 'description'),
    pubDate: firstTag(itemXml, 'pubDate') || undefined,
  }));
}

export function normalizeBmkgWarningsFromCap(xml: string, options: WarningOptions): BmkgWarningsResponse {
  const baseIdentifier = firstTag(xml, 'identifier') || `${options.provinceCode}-${Date.now()}`;
  const infoBlocks = tagValues(xml, 'info');
  const warningSources = infoBlocks.length ? infoBlocks : [xml];

  const warnings = warningSources
    .map((infoXml, index): BmkgWeatherWarning => {
      const areaDescriptions = tagValues(infoXml, 'areaDesc').flatMap((value) =>
        value.split(';').map((item) => item.trim()).filter(Boolean)
      );
      const id = warningSources.length > 1 ? `${baseIdentifier}-${index + 1}` : baseIdentifier;

      return {
        id,
        event: firstTag(infoXml, 'event') || 'Peringatan Dini Cuaca',
        headline: firstTag(infoXml, 'headline') || options.provinceTitle || 'Peringatan dini cuaca',
        description: firstTag(infoXml, 'description'),
        severity: firstTag(infoXml, 'severity') || undefined,
        urgency: firstTag(infoXml, 'urgency') || undefined,
        certainty: firstTag(infoXml, 'certainty') || undefined,
        effective: firstTag(infoXml, 'effective') || undefined,
        expires: firstTag(infoXml, 'expires') || undefined,
        senderName: firstTag(infoXml, 'senderName') || firstTag(xml, 'senderName') || undefined,
        web: firstTag(infoXml, 'web') || firstTag(xml, 'web') || undefined,
        affectedAreas: areaDescriptions,
        provinceTitle: options.provinceTitle,
        source: 'BMKG',
      };
    })
    .filter((warning) => warning.description || warning.affectedAreas.length);

  return {
    provinceCode: options.provinceCode,
    provinceName: options.provinceName,
    warnings,
    updatedAt: new Date().toISOString(),
    attribution: BMKG_ATTRIBUTION,
    isFallback: options.isFallback,
  };
}
