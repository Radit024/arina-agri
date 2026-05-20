# BMKG Weather Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace weather mock usage with BMKG Open Data for forecast-driven planning and warning-driven risk alerts across Arina Agri.

**Architecture:** Keep the first implementation inside the Next.js app. Add a small server weather module that fetches BMKG forecast JSON and CAP/RSS XML, normalizes both into app-facing TypeScript shapes, exposes route handlers, then updates UI/API consumers to use those normalized shapes with mock fallback.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, MUI, Vitest, Testing Library, built-in `fetch`, browser `DOMParser` for tests, server XML parsing through lightweight string extraction only inside the BMKG normalizer.

---

## Source Facts

- BMKG prakiraan cuaca endpoint: `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_wilayah_tingkat_iv}`.
- BMKG prakiraan cuaca format: JSON, 3 days, 8 forecast slots per day, updated twice daily, 60 requests per minute per IP, attribution required.
- BMKG peringatan dini endpoint list: `https://www.bmkg.go.id/alerts/nowcast/id`.
- BMKG peringatan dini detail endpoint: `https://www.bmkg.go.id/alerts/nowcast/id/{kode_detail_cap}_alert.xml`.
- BMKG peringatan dini format: RSS XML list plus CAP XML details, active nowcast warnings to kecamatan level, updated continuously, 60 requests per minute per IP, attribution required.
- Official docs: `https://data.bmkg.go.id/prakiraan-cuaca/` and `https://data.bmkg.go.id/peringatan-dini-cuaca/`.

## File Structure

- Create `lib/server/weather/bmkgTypes.ts`: shared server/client-safe BMKG normalized interfaces and constants.
- Create `lib/server/weather/bmkgNormalize.ts`: pure functions for normalizing BMKG forecast JSON, RSS XML, and CAP XML.
- Create `lib/server/weather/bmkgClient.ts`: server fetch layer with timeout, in-memory cache, and mock fallback.
- Create `app/api/weather/forecast/route.ts`: Next route handler for normalized 3-day forecast.
- Create `app/api/weather/warnings/route.ts`: Next route handler for normalized active warnings.
- Modify `lib/api.ts`: add frontend weather API types and fetch wrappers.
- Modify `app/dashboard/cuaca/page.tsx`: load forecast and warnings from route handlers, show BMKG attribution, and rename forecast title to 3 days.
- Modify `lib/server/notifications/decision.ts`: allow BMKG warnings in metadata and treat active severe warnings as priority signals.
- Modify `app/api/notification/decide/route.ts` and `app/api/notification/decide-send/route.ts`: validate optional warnings metadata.
- Modify `components/dashboard/WeatherBanner.tsx` and `app/dashboard/page.tsx`: show active warning banner when available.
- Modify `app/dashboard/kalender/page.tsx`: add weather planning notes for upcoming events based on forecast and warnings.
- Modify `app/dashboard/stok/page.tsx`: show storage/logistics risk note when active warning or rain-heavy forecast exists.
- Modify `app/api/ai/gemini/route.ts` and `lib/server/ai/gemini.ts`: pass concise weather context to AI without letting AI invent weather data.
- Create tests under `tests/server/weather/`, `tests/server/notifications/`, and `tests/components/`.

## Public Interfaces

Use these names and shapes exactly:

```ts
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
```

Default prototype query values:

```ts
export const DEFAULT_BMKG_ADM4 = '35.07.22.2008';
export const DEFAULT_BMKG_LOCATION_LABEL = 'Desa Wonorejo, Malang';
export const DEFAULT_BMKG_PROVINCE_CODE = 'jatim';
export const DEFAULT_BMKG_PROVINCE_NAME = 'Jawa Timur';
export const BMKG_ATTRIBUTION = 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)';
```

## Feature Mapping Rules

- Prakiraan cuaca powers routine planning: current weather, 3-day forecast, dashboard KPI, calendar suggestions, AI context, stock and logistics preparation.
- Peringatan dini cuaca powers interruption and risk: dashboard warning banner, urgent notification decisions, calendar blocked-risk labels, stock protection notes, AI safety warning context.
- If warning and forecast disagree, warning wins for risk display and notification priority.
- If BMKG fetch fails, show cached data first. If no cache exists, show existing mock weather with `isFallback: true` and visible fallback copy.

---

### Task 1: BMKG Types and Fixtures

**Files:**
- Create: `lib/server/weather/bmkgTypes.ts`
- Create: `tests/fixtures/bmkgForecast.json`
- Create: `tests/fixtures/bmkgWarningsRss.xml`
- Create: `tests/fixtures/bmkgWarningCap.xml`
- Test: `tests/server/weather/bmkgTypes.test.ts`

- [ ] **Step 1: Inspect the local Next.js route-handler docs**

Run:

```bash
rtk rg -n "Route Handlers|route handlers|fetch" node_modules/next/dist/docs
```

Expected: output includes Next.js documentation paths. Read the matching route-handler section before editing route files.

- [ ] **Step 2: Create the type file**

Create `lib/server/weather/bmkgTypes.ts` with:

```ts
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
```

- [ ] **Step 3: Create forecast fixture**

Create `tests/fixtures/bmkgForecast.json` with:

```json
{
  "lokasi": {
    "adm4": "35.07.22.2008",
    "desa": "Wonorejo",
    "kecamatan": "Lawang",
    "kotkab": "Malang",
    "provinsi": "Jawa Timur"
  },
  "data": [
    {
      "cuaca": [
        [
          {
            "utc_datetime": "2026-05-20 00:00:00",
            "local_datetime": "2026-05-20 07:00:00",
            "t": 24,
            "hu": 82,
            "weather": 60,
            "weather_desc": "Hujan Ringan",
            "weather_desc_en": "Light Rain",
            "ws": 8,
            "wd": "Timur",
            "tcc": 78,
            "vs_text": "8 km"
          },
          {
            "utc_datetime": "2026-05-20 03:00:00",
            "local_datetime": "2026-05-20 10:00:00",
            "t": 29,
            "hu": 70,
            "weather": 3,
            "weather_desc": "Berawan",
            "weather_desc_en": "Cloudy",
            "ws": 10,
            "wd": "Tenggara",
            "tcc": 65,
            "vs_text": "10 km"
          }
        ],
        [
          {
            "utc_datetime": "2026-05-21 00:00:00",
            "local_datetime": "2026-05-21 07:00:00",
            "t": 23,
            "hu": 80,
            "weather": 1,
            "weather_desc": "Cerah Berawan",
            "weather_desc_en": "Partly Cloudy",
            "ws": 6,
            "wd": "Selatan",
            "tcc": 35,
            "vs_text": "10 km"
          }
        ],
        [
          {
            "utc_datetime": "2026-05-22 00:00:00",
            "local_datetime": "2026-05-22 07:00:00",
            "t": 25,
            "hu": 84,
            "weather": 61,
            "weather_desc": "Hujan Sedang",
            "weather_desc_en": "Rain",
            "ws": 12,
            "wd": "Barat",
            "tcc": 88,
            "vs_text": "6 km"
          }
        ]
      ]
    }
  ]
}
```

- [ ] **Step 4: Create RSS and CAP fixtures**

Create `tests/fixtures/bmkgWarningsRss.xml` with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Peringatan Dini Cuaca Indonesia</title>
    <lastBuildDate>Wed, 20 May 2026 07:00:00 +0700</lastBuildDate>
    <item>
      <title>Peringatan Dini Cuaca Jawa Timur</title>
      <link>https://www.bmkg.go.id/alerts/nowcast/id/jatim_alert.xml</link>
      <description>Malang, Batu, Pasuruan berpotensi hujan sedang hingga lebat.</description>
      <author>BMKG</author>
      <pubDate>Wed, 20 May 2026 06:45:00 +0700</pubDate>
    </item>
  </channel>
</rss>
```

Create `tests/fixtures/bmkgWarningCap.xml` with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>bmkg-jatim-202605200645</identifier>
  <sender>bmkg.go.id</sender>
  <sent>2026-05-20T06:45:00+07:00</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <language>id-ID</language>
    <category>Met</category>
    <event>Hujan Sedang-Lebat</event>
    <urgency>Immediate</urgency>
    <severity>Severe</severity>
    <certainty>Likely</certainty>
    <effective>2026-05-20T07:00:00+07:00</effective>
    <expires>2026-05-20T10:00:00+07:00</expires>
    <senderName>BMKG</senderName>
    <headline>Peringatan dini cuaca Jawa Timur</headline>
    <description>Berpotensi terjadi hujan sedang hingga lebat disertai kilat/petir dan angin kencang.</description>
    <web>https://www.bmkg.go.id/</web>
    <area>
      <areaDesc>Malang; Batu; Pasuruan</areaDesc>
    </area>
  </info>
</alert>
```

- [ ] **Step 5: Write the type smoke test**

Create `tests/server/weather/bmkgTypes.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import {
  BMKG_ATTRIBUTION,
  DEFAULT_BMKG_ADM4,
  DEFAULT_BMKG_LOCATION_LABEL,
  type BmkgForecastResponse,
} from '@/lib/server/weather/bmkgTypes';

describe('BMKG weather types', () => {
  it('keeps default prototype location and attribution stable', () => {
    const response: BmkgForecastResponse = {
      adm4: DEFAULT_BMKG_ADM4,
      locationLabel: DEFAULT_BMKG_LOCATION_LABEL,
      updatedAt: '2026-05-20T00:00:00.000Z',
      attribution: BMKG_ATTRIBUTION,
      isFallback: false,
      current: {
        utcDatetime: '2026-05-20 00:00:00',
        localDatetime: '2026-05-20 07:00:00',
        temperatureC: 24,
        humidityPercent: 82,
        condition: 'hujan',
        conditionText: 'Hujan Ringan',
        windSpeedKmh: 8,
        rainfallMm: 0,
        locationLabel: DEFAULT_BMKG_LOCATION_LABEL,
        adm4: DEFAULT_BMKG_ADM4,
        source: 'BMKG',
      },
      days: [],
    };

    expect(response.adm4).toBe('35.07.22.2008');
    expect(response.attribution).toContain('BMKG');
  });
});
```

- [ ] **Step 6: Run the focused test**

Run:

```bash
rtk npm run test -- tests/server/weather/bmkgTypes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
rtk git add lib/server/weather/bmkgTypes.ts tests/fixtures/bmkgForecast.json tests/fixtures/bmkgWarningsRss.xml tests/fixtures/bmkgWarningCap.xml tests/server/weather/bmkgTypes.test.ts
rtk git commit -m "feat: define bmkg weather contracts"
```

---

### Task 2: BMKG Normalizers

**Files:**
- Create: `lib/server/weather/bmkgNormalize.ts`
- Test: `tests/server/weather/bmkgNormalize.test.ts`

- [ ] **Step 1: Write failing normalizer tests**

Create `tests/server/weather/bmkgNormalize.test.ts` with:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  normalizeBmkgForecast,
  normalizeBmkgWarningsFromCap,
  parseBmkgWarningRssItems,
} from '@/lib/server/weather/bmkgNormalize';

const fixture = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), 'tests', 'fixtures', name), 'utf8');

describe('BMKG forecast normalizer', () => {
  it('maps BMKG forecast JSON into current and 3 grouped days', () => {
    const raw = JSON.parse(fixture('bmkgForecast.json'));
    const result = normalizeBmkgForecast(raw, {
      adm4: '35.07.22.2008',
      locationLabel: 'Desa Wonorejo, Malang',
      isFallback: false,
    });

    expect(result.current.condition).toBe('hujan');
    expect(result.current.temperatureC).toBe(24);
    expect(result.days).toHaveLength(3);
    expect(result.days[0].date).toBe('2026-05-20');
    expect(result.days[0].maxTemperatureC).toBe(29);
    expect(result.attribution).toContain('BMKG');
  });

  it('throws a clear error when forecast slots are absent', () => {
    expect(() =>
      normalizeBmkgForecast({ lokasi: {}, data: [] }, {
        adm4: '35.07.22.2008',
        locationLabel: 'Desa Wonorejo, Malang',
        isFallback: false,
      })
    ).toThrow('BMKG forecast payload has no forecast slots');
  });
});

describe('BMKG warning normalizer', () => {
  it('parses RSS warning detail links', () => {
    const items = parseBmkgWarningRssItems(fixture('bmkgWarningsRss.xml'));

    expect(items).toEqual([
      {
        title: 'Peringatan Dini Cuaca Jawa Timur',
        link: 'https://www.bmkg.go.id/alerts/nowcast/id/jatim_alert.xml',
        description: 'Malang, Batu, Pasuruan berpotensi hujan sedang hingga lebat.',
        pubDate: 'Wed, 20 May 2026 06:45:00 +0700',
      },
    ]);
  });

  it('maps CAP warning XML into affected areas and severity', () => {
    const warnings = normalizeBmkgWarningsFromCap(fixture('bmkgWarningCap.xml'), {
      provinceCode: 'jatim',
      provinceName: 'Jawa Timur',
      provinceTitle: 'Peringatan Dini Cuaca Jawa Timur',
      isFallback: false,
    });

    expect(warnings.warnings[0]).toMatchObject({
      id: 'bmkg-jatim-202605200645',
      event: 'Hujan Sedang-Lebat',
      severity: 'Severe',
      urgency: 'Immediate',
      certainty: 'Likely',
      affectedAreas: ['Malang', 'Batu', 'Pasuruan'],
      source: 'BMKG',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
rtk npm run test -- tests/server/weather/bmkgNormalize.test.ts
```

Expected: FAIL because `lib/server/weather/bmkgNormalize.ts` does not exist.

- [ ] **Step 3: Implement the normalizer**

Create `lib/server/weather/bmkgNormalize.ts` with exported functions:

```ts
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

function flattenForecastSlots(raw: any): any[] {
  const groups = raw?.data?.flatMap((item: any) => item?.cuaca ?? []) ?? [];
  return groups.flat().filter(Boolean);
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
  return slots.reduce((best, slot) => score[slot.condition] > score[best] ? slot.condition : best, 'cerah');
}

export function normalizeBmkgForecast(raw: any, options: ForecastOptions): BmkgForecastResponse {
  const slots = flattenForecastSlots(raw);
  if (!slots.length) {
    throw new Error('BMKG forecast payload has no forecast slots');
  }

  const normalized = slots.map((slot: any): BmkgForecastSnapshot => {
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
  const areaDescriptions = tagValues(xml, 'areaDesc').flatMap((value) =>
    value.split(';').map((item) => item.trim()).filter(Boolean)
  );

  const warning: BmkgWeatherWarning = {
    id: firstTag(xml, 'identifier') || `${options.provinceCode}-${Date.now()}`,
    event: firstTag(xml, 'event') || 'Peringatan Dini Cuaca',
    headline: firstTag(xml, 'headline') || options.provinceTitle || 'Peringatan dini cuaca',
    description: firstTag(xml, 'description'),
    severity: firstTag(xml, 'severity') || undefined,
    urgency: firstTag(xml, 'urgency') || undefined,
    certainty: firstTag(xml, 'certainty') || undefined,
    effective: firstTag(xml, 'effective') || undefined,
    expires: firstTag(xml, 'expires') || undefined,
    senderName: firstTag(xml, 'senderName') || undefined,
    web: firstTag(xml, 'web') || undefined,
    affectedAreas: areaDescriptions,
    provinceTitle: options.provinceTitle,
    source: 'BMKG',
  };

  return {
    provinceCode: options.provinceCode,
    provinceName: options.provinceName,
    warnings: warning.description || warning.affectedAreas.length ? [warning] : [],
    updatedAt: new Date().toISOString(),
    attribution: BMKG_ATTRIBUTION,
    isFallback: options.isFallback,
  };
}
```

- [ ] **Step 4: Run normalizer tests**

Run:

```bash
rtk npm run test -- tests/server/weather/bmkgNormalize.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
rtk git add lib/server/weather/bmkgNormalize.ts tests/server/weather/bmkgNormalize.test.ts
rtk git commit -m "feat: normalize bmkg weather data"
```

---

### Task 3: BMKG Server Fetch Layer and Route Handlers

**Files:**
- Create: `lib/server/weather/bmkgClient.ts`
- Create: `app/api/weather/forecast/route.ts`
- Create: `app/api/weather/warnings/route.ts`
- Test: `tests/server/weather/bmkgRoutes.test.ts`

- [ ] **Step 1: Write route tests**

Create `tests/server/weather/bmkgRoutes.test.ts` with:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getForecast } from '@/app/api/weather/forecast/route';
import { GET as getWarnings } from '@/app/api/weather/warnings/route';

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const xmlResponse = (body: string) => new Response(body, { status: 200 });

describe('BMKG weather routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

  it('returns fallback forecast when BMKG fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const response = await getForecast(new Request('http://localhost/api/weather/forecast'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.isFallback).toBe(true);
    expect(json.data.current.locationLabel).toBe('Desa Wonorejo, Malang');
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
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
rtk npm run test -- tests/server/weather/bmkgRoutes.test.ts
```

Expected: FAIL because route handlers and client do not exist.

- [ ] **Step 3: Implement server client**

Create `lib/server/weather/bmkgClient.ts` with:

```ts
import { currentWeather, weatherForecast } from '@/lib/mockData';
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

const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const cache = new Map<string, { expiresAt: number; value: unknown }>();

function readCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item || item.expiresAt < Date.now()) return null;
  return item.value as T;
}

function writeCache<T>(key: string, value: T) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
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
  const slots = weatherForecast.map((day) => ({
    utc_datetime: `${day.tanggal} 00:00:00`,
    local_datetime: `${day.tanggal} 07:00:00`,
    t: day.suhuMax,
    hu: currentWeather.kelembapan,
    weather_desc: day.kondisi,
    ws: currentWeather.kecepatanAngin,
  }));
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
    const raw = await response.json();
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
```

- [ ] **Step 4: Implement route handlers**

Create `app/api/weather/forecast/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { getBmkgForecast } from '@/lib/server/weather/bmkgClient';
import { DEFAULT_BMKG_LOCATION_LABEL } from '@/lib/server/weather/bmkgTypes';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adm4 = url.searchParams.get('adm4') || undefined;
  const locationLabel = url.searchParams.get('locationLabel') || DEFAULT_BMKG_LOCATION_LABEL;
  const data = await getBmkgForecast({ adm4, locationLabel });
  return NextResponse.json({ success: true, data });
}
```

Create `app/api/weather/warnings/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { getBmkgWarnings } from '@/lib/server/weather/bmkgClient';
import { DEFAULT_BMKG_PROVINCE_NAME } from '@/lib/server/weather/bmkgTypes';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provinceCode = url.searchParams.get('province') || undefined;
  const provinceName = url.searchParams.get('provinceName') || DEFAULT_BMKG_PROVINCE_NAME;
  const data = await getBmkgWarnings({ provinceCode, provinceName });
  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 5: Run route tests**

Run:

```bash
rtk npm run test -- tests/server/weather/bmkgRoutes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
rtk git add lib/server/weather/bmkgClient.ts app/api/weather/forecast/route.ts app/api/weather/warnings/route.ts tests/server/weather/bmkgRoutes.test.ts
rtk git commit -m "feat: expose bmkg weather routes"
```

---

### Task 4: Frontend Weather API and Cuaca Page

**Files:**
- Modify: `lib/api.ts`
- Modify: `app/dashboard/cuaca/page.tsx`
- Test: `tests/components/CuacaPageWeather.test.tsx`

- [ ] **Step 1: Add frontend API types and wrappers**

Modify `lib/api.ts` to export BMKG response interfaces matching `lib/server/weather/bmkgTypes.ts`, then add:

```ts
async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(endpoint);
  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `HTTP error ${res.status}`);
  }
  return json.data as T;
}

export const weatherApi = {
  getForecast: (params?: { adm4?: string; locationLabel?: string }) => {
    const search = new URLSearchParams();
    if (params?.adm4) search.set('adm4', params.adm4);
    if (params?.locationLabel) search.set('locationLabel', params.locationLabel);
    const query = search.toString();
    return apiGet<BmkgForecastResponse>(`/api/weather/forecast${query ? `?${query}` : ''}`);
  },
  getWarnings: (params?: { province?: string; provinceName?: string }) => {
    const search = new URLSearchParams();
    if (params?.province) search.set('province', params.province);
    if (params?.provinceName) search.set('provinceName', params.provinceName);
    const query = search.toString();
    return apiGet<BmkgWarningsResponse>(`/api/weather/warnings${query ? `?${query}` : ''}`);
  },
};
```

- [ ] **Step 2: Update Cuaca page behavior**

Modify `app/dashboard/cuaca/page.tsx`:

- Add `weatherApi`, `type BmkgForecastResponse`, and `type BmkgWarningsResponse` imports from `@/lib/api`.
- Add state: `forecastData`, `warningsData`, `weatherLoading`, and `weatherError`.
- Fetch forecast and warnings in `useEffect` on mount.
- Keep existing `currentWeather`, `weatherForecast`, and `weatherAlerts` as fallback values only.
- Replace forecast header copy with visible text `Prakiraan 3 Hari BMKG`.
- Render BMKG attribution below the current weather card.
- Render `Alert severity="warning"` above the forecast row when `warningsData.warnings.length > 0`.
- Use `forecastData.days` to render 3 cards; use `day.maxTemperatureC`, `day.minTemperatureC`, `day.dominantCondition`, and `day.totalRainfallMm`.
- Use `forecastData.current` for notification test payload.

- [ ] **Step 3: Write UI smoke test**

Create `tests/components/CuacaPageWeather.test.tsx` with a test that mocks `global.fetch`:

```ts
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CuacaPage from '@/app/dashboard/cuaca/page';

vi.mock('next-intl', () => ({
  useLocale: () => 'id',
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'title') return 'Notifikasi Cuaca';
    if (key === 'subtitle') return 'Pantau kondisi cuaca';
    if (key === 'current.title') return 'Cuaca Saat Ini';
    if (key === 'forecast.title') return 'Prakiraan 3 Hari BMKG';
    if (key === 'forecast.today') return 'Hari ini';
    if (key === 'history.title') return 'Riwayat Peringatan';
    if (key === 'whatsapp.title') return 'Integrasi Notifikasi';
    if (key === 'whatsapp.scheduleTitle') return 'Jadwal Notifikasi';
    if (key === 'whatsapp.scheduleSub') return 'Atur pengiriman';
    return values ? `${key} ${JSON.stringify(values)}` : key;
  },
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'budi@example.com', user_metadata: { full_name: 'Budi' } } }) }));
vi.mock('@/hooks/useCalendar', () => ({ useCalendar: () => ({ events: [] }) }));
vi.mock('@/hooks/useLocalStorage', () => ({ default: (_key: string, initial: string) => [initial, vi.fn()] }));

describe('CuacaPage BMKG data', () => {
  it('shows BMKG forecast attribution and active warning', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/api/weather/forecast')) {
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          data: {
            adm4: '35.07.22.2008',
            locationLabel: 'Desa Wonorejo, Malang',
            updatedAt: '2026-05-20T00:00:00.000Z',
            attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
            isFallback: false,
            current: {
              utcDatetime: '2026-05-20 00:00:00',
              localDatetime: '2026-05-20 07:00:00',
              temperatureC: 24,
              humidityPercent: 82,
              condition: 'hujan',
              conditionText: 'Hujan Ringan',
              windSpeedKmh: 8,
              rainfallMm: 6,
              locationLabel: 'Desa Wonorejo, Malang',
              adm4: '35.07.22.2008',
              source: 'BMKG'
            },
            days: [{
              date: '2026-05-20',
              minTemperatureC: 24,
              maxTemperatureC: 29,
              dominantCondition: 'hujan',
              totalRainfallMm: 6,
              slots: []
            }]
          }
        }), { status: 200 }));
      }
      if (url.includes('/api/weather/warnings')) {
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          data: {
            provinceCode: 'jatim',
            provinceName: 'Jawa Timur',
            updatedAt: '2026-05-20T00:00:00.000Z',
            attribution: 'Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
            isFallback: false,
            warnings: [{
              id: 'w1',
              event: 'Hujan Lebat',
              headline: 'Peringatan dini cuaca Jawa Timur',
              description: 'Malang berpotensi hujan lebat',
              affectedAreas: ['Malang'],
              source: 'BMKG'
            }]
          }
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }));
    }));

    render(<CuacaPage />);

    await waitFor(() => expect(screen.getByText(/Sumber data: BMKG/)).toBeInTheDocument());
    expect(screen.getByText(/Peringatan dini cuaca Jawa Timur/)).toBeInTheDocument();
    expect(screen.getByText(/Prakiraan 3 Hari BMKG/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run UI test**

Run:

```bash
rtk npm run test -- tests/components/CuacaPageWeather.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
rtk git add lib/api.ts app/dashboard/cuaca/page.tsx tests/components/CuacaPageWeather.test.tsx
rtk git commit -m "feat: load bmkg weather on cuaca dashboard"
```

---

### Task 5: Warning-Aware Notification Decisions

**Files:**
- Modify: `lib/server/notifications/decision.ts`
- Modify: `lib/api.ts`
- Modify: `app/api/notification/decide/route.ts`
- Modify: `app/api/notification/decide-send/route.ts`
- Test: `tests/server/notifications/notificationDecisionWarnings.test.ts`

- [ ] **Step 1: Write failing notification tests**

Create `tests/server/notifications/notificationDecisionWarnings.test.ts` with:

```ts
import { describe, expect, it, vi } from 'vitest';
import { buildNotificationDecision } from '@/lib/server/notifications/decision';

vi.mock('@/lib/server/ai/gemini', () => ({
  generateNotificationDecisionMessage: vi.fn(async ({ draftMessage }) => draftMessage),
}));

describe('notification decision with BMKG warnings', () => {
  it('sends a high-priority notification for active severe BMKG warning', async () => {
    const result = await buildNotificationDecision({
      platform: 'whatsapp',
      to: '08123456789',
      recipientName: 'Budi',
      notificationsEnabled: true,
      weather: {
        kondisi: 'berawan',
        suhu: 26,
        kelembapan: 80,
        curahHujan: 0,
        kecepatanAngin: 5,
        lokasi: 'Desa Wonorejo, Malang',
      },
      metadata: {
        bmkgWarnings: [{
          id: 'w1',
          event: 'Hujan Lebat',
          headline: 'Peringatan dini cuaca Jawa Timur',
          description: 'Malang berpotensi hujan lebat',
          severity: 'Severe',
          urgency: 'Immediate',
          certainty: 'Likely',
          affectedAreas: ['Malang'],
          source: 'BMKG',
        }],
      },
    });

    expect(result.shouldSend).toBe(true);
    expect(result.riskLevel).toMatch(/tinggi|ekstrem/);
    expect(result.triggeredRules.some((rule) => rule.code === 'BMKG_WARNING_SEVERE')).toBe(true);
    expect(result.finalMessage).toContain('Peringatan dini cuaca Jawa Timur');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
rtk npm run test -- tests/server/notifications/notificationDecisionWarnings.test.ts
```

Expected: FAIL because `bmkgWarnings` metadata is not supported.

- [ ] **Step 3: Extend decision metadata**

Modify `lib/server/notifications/decision.ts`:

- Import `type BmkgWeatherWarning` from `@/lib/server/weather/bmkgTypes`.
- Add `bmkgWarnings?: BmkgWeatherWarning[]` to `DecisionMetadataInput`.
- Extend `evaluateRules` to accept `warnings: BmkgWeatherWarning[] = []`.
- Push rule `{ code: 'BMKG_WARNING_SEVERE', reason: warning.headline, weight: 55 }` when any warning has `severity` equal to `Severe` or `Extreme`.
- Push rule `{ code: 'BMKG_WARNING_ACTIVE', reason: warning.headline, weight: 35 }` when warnings exist but none are severe/extreme.
- Extend recommendations with:
  - `Pantau peringatan dini BMKG dan tunda aktivitas lapang berisiko sampai kondisi aman.`
  - `Amankan stok panen, alat, dan jalur distribusi dari hujan lebat atau angin kencang.`
- Include warning headlines in `buildDraftMessage`.
- Store `bmkgWarnings` in payload metadata.

- [ ] **Step 4: Extend frontend API types**

Modify `lib/api.ts`:

- Add `bmkgWarnings?: BmkgWeatherWarning[]` to `NotificationDecisionInput.metadata`.
- Reuse the same `BmkgWeatherWarning` interface exported for weather API.

- [ ] **Step 5: Validate optional warnings metadata**

Modify `app/api/notification/decide/route.ts` and `app/api/notification/decide-send/route.ts`:

- Accept `body.metadata.bmkgWarnings` only when absent or an array.
- Return `400` with message `metadata.bmkgWarnings harus berupa array.` when present and not an array.
- Keep all existing validation behavior unchanged.

- [ ] **Step 6: Pass active warnings from Cuaca page test sends**

Modify `app/dashboard/cuaca/page.tsx` test notification payload:

```ts
metadata: {
  source: 'weather-dashboard-test-button',
  customMessage: scheduleMessage.trim() || undefined,
  dailyEvents: todayEvents,
  bmkgWarnings: warningsData?.warnings ?? [],
  forceSend: true,
  locale: locale === 'en' ? 'en' : 'id',
}
```

- [ ] **Step 7: Run notification tests**

Run:

```bash
rtk npm run test -- tests/server/notifications/notificationDecisionWarnings.test.ts tests/server/notificationSchedule.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
rtk git add lib/server/notifications/decision.ts lib/api.ts app/api/notification/decide/route.ts app/api/notification/decide-send/route.ts app/dashboard/cuaca/page.tsx tests/server/notifications/notificationDecisionWarnings.test.ts
rtk git commit -m "feat: prioritize bmkg weather warnings"
```

---

### Task 6: Feature Mapping UI

**Files:**
- Modify: `components/dashboard/WeatherBanner.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/kalender/page.tsx`
- Modify: `app/dashboard/stok/page.tsx`
- Modify: `app/api/ai/gemini/route.ts`
- Modify: `lib/server/ai/gemini.ts`
- Test: `tests/components/weatherFeatureMapping.test.tsx`
- Test: `tests/server/aiWeatherContext.test.ts`

- [ ] **Step 1: Write smoke tests for feature mapping**

Create `tests/components/weatherFeatureMapping.test.tsx` with tests that render the target components with fetch mocked and assert:

- Dashboard banner uses warning headline when warnings exist.
- Calendar page renders copy `Dipengaruhi prakiraan cuaca BMKG` when forecast exists.
- Stock page renders copy `Risiko cuaca untuk stok panen` when warning or rain-heavy forecast exists.

Use existing mocks from component tests for `next-intl`, auth hooks, and data hooks.

- [ ] **Step 2: Write AI context test**

Create `tests/server/aiWeatherContext.test.ts` with:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: vi.fn(async (prompt: string) => ({
        response: { text: () => prompt },
      })),
    }),
  })),
}));

describe('AI weather context', () => {
  it('keeps BMKG warning context factual and concise', async () => {
    const { generateChatResponse } = await import('@/lib/server/ai/gemini');
    const reply = await generateChatResponse({
      prompt: 'Boleh semprot pestisida hari ini?',
      history: [],
      userName: 'Budi',
      weatherContext: {
        forecastSummary: 'BMKG: hujan ringan 6 mm di Desa Wonorejo pagi ini.',
        warningSummary: 'Peringatan dini BMKG: Malang berpotensi hujan lebat sampai 10:00.',
      },
    });

    expect(reply).toContain('BMKG');
    expect(reply).toContain('Malang');
  });
});
```

- [ ] **Step 3: Update Dashboard warning banner**

Modify `components/dashboard/WeatherBanner.tsx`:

- Add props `severity?: 'info' | 'warning' | 'error'`.
- Keep default warning styling.
- Use `theme.palette.error` when severity is `error`.

Modify `app/dashboard/page.tsx`:

- Fetch warnings through `weatherApi.getWarnings()`.
- Render `WeatherBanner` above KPI when at least one warning exists.
- Use first warning headline as banner message.
- Keep page usable when fetch fails.

- [ ] **Step 4: Update Calendar weather notes**

Modify `app/dashboard/kalender/page.tsx`:

- Fetch forecast and warnings through `weatherApi`.
- For upcoming `penyemprotan` and `pemupukan`, show warning copy when matching date has rain: `Dipengaruhi prakiraan cuaca BMKG: pertimbangkan jadwal ulang jika hujan.`
- If warnings exist, show top alert: `Peringatan dini BMKG aktif. Tinjau agenda lapang hari ini.`

- [ ] **Step 5: Update Stock weather notes**

Modify `app/dashboard/stok/page.tsx`:

- Fetch warnings and forecast.
- Show `Alert severity="warning"` above KPI cards when total rainfall in the next forecast day is at least 18 mm or active warnings exist.
- Copy: `Risiko cuaca untuk stok panen: lindungi batch siap jual, cek ventilasi gudang, dan siapkan jalur distribusi alternatif.`

- [ ] **Step 6: Update AI weather context**

Modify `lib/server/ai/gemini.ts`:

- Add optional `weatherContext?: { forecastSummary?: string; warningSummary?: string }` to chat input.
- Append forecast and warning summaries to prompt only when present.
- Add instruction: `Gunakan info cuaca BMKG hanya sebagai konteks. Jangan membuat klaim cuaca baru di luar input.`

Modify `app/api/ai/gemini/route.ts`:

- Accept optional `weatherContext` object.
- Pass it to `generateChatResponse`.

- [ ] **Step 7: Run feature mapping tests**

Run:

```bash
rtk npm run test -- tests/components/weatherFeatureMapping.test.tsx tests/server/aiWeatherContext.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
rtk git add components/dashboard/WeatherBanner.tsx app/dashboard/page.tsx app/dashboard/kalender/page.tsx app/dashboard/stok/page.tsx app/api/ai/gemini/route.ts lib/server/ai/gemini.ts tests/components/weatherFeatureMapping.test.tsx tests/server/aiWeatherContext.test.ts
rtk git commit -m "feat: map bmkg weather data to planning features"
```

---

### Task 7: Full Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Document runtime behavior**

Modify `README.md` weather feature section to state:

```md
Cuaca dan Kalender Tani menggunakan BMKG Open Data untuk prakiraan 3 hari dan peringatan dini cuaca aktif. Prakiraan cuaca dipakai untuk perencanaan kegiatan, sedangkan peringatan dini dipakai untuk notifikasi risiko dan banner prioritas.
```

- [ ] **Step 2: Document optional env knobs**

Modify `.env.example` under server-only settings:

```dotenv
BMKG_FORECAST_CACHE_MINUTES=30
BMKG_FETCH_TIMEOUT_MS=8000
```

If the code in Task 3 already uses hard-coded values, update `bmkgClient.ts` to read these env vars safely:

```ts
const CACHE_TTL_MS = Number(process.env.BMKG_FORECAST_CACHE_MINUTES || 30) * 60 * 1000;
const FETCH_TIMEOUT_MS = Number(process.env.BMKG_FETCH_TIMEOUT_MS || 8000);
```

- [ ] **Step 3: Run all tests**

Run:

```bash
rtk npm run test
```

Expected: exit code 0 with all Vitest tests passing.

- [ ] **Step 4: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: exit code 0.

- [ ] **Step 5: Run build**

Run:

```bash
rtk npm run build
```

Expected: exit code 0.

- [ ] **Step 6: Commit**

Run:

```bash
rtk git add README.md .env.example lib/server/weather/bmkgClient.ts
rtk git commit -m "docs: document bmkg weather integration"
```

---

## Self-Review

- Spec coverage: forecast JSON, CAP/RSS warnings, cache/fallback, weather page, notification priority, feature mapping UI, and verification are each covered by a task.
- Placeholder scan: no unresolved placeholders are left in this plan.
- Type consistency: all BMKG public interface names match the required names: `BmkgForecastSnapshot`, `BmkgForecastDay`, `BmkgWeatherWarning`, `/api/weather/forecast`, and `/api/weather/warnings`.
- Scope control: the first implementation stays inside the Next.js app and does not expand the separate Express backend.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-20-bmkg-weather-integration-implementation.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints.
