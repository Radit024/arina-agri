import { NextResponse } from 'next/server';

interface NominatimSearchResult {
  place_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  type?: string;
  address?: Record<string, string | undefined>;
}

interface WilayahItem {
  code: string;
  name: string;
}

interface ResolvedBmkgLocation {
  adm4: string;
  label: string;
  name: string;
  detail: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface BmkgLocationMetadata extends Coordinates {
  adm4: string;
  name: string;
}

interface BmkgVillageCandidate {
  district?: WilayahItem;
  village: WilayahItem;
}

interface NearestBmkgVillageCandidate extends BmkgVillageCandidate {
  distance: number;
}

const WILAYAH_API_BASE_URL = 'https://wilayah.id/api';
const BMKG_FORECAST_API_URL = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
const NEAREST_BMKG_LOOKUP_CONCURRENCY = 6;
const NEAREST_BMKG_REGIONAL_VILLAGE_LIMIT = Number(process.env.NEAREST_BMKG_REGIONAL_VILLAGE_LIMIT || 500);
const BMKG_LOCATION_METADATA_TIMEOUT_MS = Number(process.env.BMKG_LOCATION_METADATA_TIMEOUT_MS || 3000);
const bmkgLocationMetadataCache = new Map<string, BmkgLocationMetadata>();
const bmkgLocationMetadataRequests = new Map<string, Promise<BmkgLocationMetadata | null>>();

function uniqueParts(parts: Array<string | undefined>) {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => {
      if (!part || seen.has(part.toLowerCase())) return false;
      seen.add(part.toLowerCase());
      return true;
    });
}

function getDisplayParts(item: NominatimSearchResult) {
  return (item.display_name || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripAdministrativeAffixes(value: string) {
  return value
    .replace(/^(provinsi|province)\s+/i, '')
    .replace(/^(kabupaten|kab\.|kota|city|regency)\s+/i, '')
    .replace(/^(kecamatan|district)\s+/i, '')
    .replace(/^(desa|kelurahan|village)\s+/i, '')
    .replace(/\s+(province|regency|city|district|village)$/i, '')
    .trim();
}

function normalizeName(value: string) {
  return stripAdministrativeAffixes(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeStrictName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchWilayahItems(items: WilayahItem[], candidates: Array<string | undefined>) {
  const cleanCandidates = uniqueParts(candidates);
  const strictCandidates = new Set(cleanCandidates.map((candidate) => normalizeStrictName(candidate)).filter(Boolean));
  const strictMatches = items.filter((item) => strictCandidates.has(normalizeStrictName(item.name)));
  if (strictMatches.length) return strictMatches;

  const normalizedCandidates = new Set(cleanCandidates.map((candidate) => normalizeName(candidate)).filter(Boolean));
  if (!normalizedCandidates.size) return [];

  return items.filter((item) => normalizedCandidates.has(normalizeName(item.name)));
}

function matchWilayahItem(items: WilayahItem[], candidates: Array<string | undefined>) {
  return matchWilayahItems(items, candidates)[0] || null;
}

function prioritizeWilayahItems(items: WilayahItem[], preferred: WilayahItem | WilayahItem[]) {
  const preferredItems = Array.isArray(preferred) ? preferred : [preferred];
  const seen = new Set<string>();
  return [
    ...preferredItems,
    ...items,
  ].filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

async function findVillageAcrossDistricts(districts: WilayahItem[], candidates: Array<string | undefined>) {
  const cleanCandidates = uniqueParts(candidates);
  if (!cleanCandidates.length) return null;

  for (const district of districts) {
    const villages = await fetchWilayah(`villages/${district.code}.json`);
    const village = matchWilayahItem(villages, cleanCandidates);
    if (village) return { district, village };
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

async function fetchWilayah(path: string) {
  const response = await fetch(`${WILAYAH_API_BASE_URL}/${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Wilayah search failed with HTTP ${response.status}`);
  }

  const raw = (await response.json()) as { data?: unknown };
  if (!Array.isArray(raw.data)) return [];

  return raw.data
    .map((item) => item as Partial<WilayahItem>)
    .filter((item): item is WilayahItem => Boolean(item.code && item.name));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getBmkgRawLocation(raw: unknown) {
  const root = asRecord(raw);
  if (!root) return null;

  const directLocation = asRecord(root.lokasi);
  if (directLocation) return directLocation;

  if (!Array.isArray(root.data)) return null;
  const firstDataItem = asRecord(root.data[0]);
  return asRecord(firstDataItem?.lokasi);
}

async function fetchBmkgLocationMetadata(village: WilayahItem): Promise<BmkgLocationMetadata | null> {
  try {
    const response = await fetchWithTimeout(
      `${BMKG_FORECAST_API_URL}?adm4=${encodeURIComponent(village.code)}`,
      {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      },
      BMKG_LOCATION_METADATA_TIMEOUT_MS,
    );
    if (!response.ok) return null;

    const raw = await response.json();
    const location = getBmkgRawLocation(raw);
    if (!location) return null;

    const latitude = asNumber(location.lat);
    const longitude = asNumber(location.lon);
    if (latitude === null || longitude === null) return null;

    return {
      adm4: asText(location.adm4) || village.code,
      name: asText(location.desa) || village.name,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

async function getBmkgLocationMetadata(village: WilayahItem) {
  const cached = bmkgLocationMetadataCache.get(village.code);
  if (cached) return cached;

  const pending = bmkgLocationMetadataRequests.get(village.code);
  if (pending) return pending;

  const request = fetchBmkgLocationMetadata(village)
    .then((metadata) => {
      if (metadata) bmkgLocationMetadataCache.set(village.code, metadata);
      return metadata;
    })
    .finally(() => {
      bmkgLocationMetadataRequests.delete(village.code);
    });

  bmkgLocationMetadataRequests.set(village.code, request);
  return request;
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function distanceKm(from: Coordinates, to: Coordinates) {
  const radiusKm = 6371;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * radiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

async function findNearestBmkgVillageCandidate(
  candidates: BmkgVillageCandidate[],
  coordinates: Coordinates,
  maxCandidates = candidates.length,
) {
  const candidateSlice = candidates.slice(0, Math.max(0, maxCandidates));
  const rankedCandidates = await mapWithConcurrency(candidateSlice, NEAREST_BMKG_LOOKUP_CONCURRENCY, async (candidate) => {
    const metadata = await getBmkgLocationMetadata(candidate.village);
    if (!metadata) return null;

    return {
      ...candidate,
      distance: distanceKm(coordinates, metadata),
    };
  });

  return rankedCandidates
    .filter((candidate): candidate is NearestBmkgVillageCandidate => Boolean(candidate))
    .sort((a, b) => a.distance - b.distance)[0];
}

async function findNearestBmkgVillage(villages: WilayahItem[], coordinates: Coordinates) {
  const nearest = await findNearestBmkgVillageCandidate(
    villages.map((village) => ({ village })),
    coordinates,
  );
  return nearest?.village || null;
}

async function getVillageCandidatesAcrossDistricts(districts: WilayahItem[]) {
  const districtVillageGroups = await mapWithConcurrency(districts, NEAREST_BMKG_LOOKUP_CONCURRENCY, async (district) => {
    const villages = await fetchWilayah(`villages/${district.code}.json`);
    return villages.map((village) => ({ district, village }));
  });

  return districtVillageGroups.flat();
}

async function findNearestBmkgVillageAcrossDistricts(districts: WilayahItem[], coordinates: Coordinates) {
  const candidates = await getVillageCandidatesAcrossDistricts(districts);
  return findNearestBmkgVillageCandidate(
    candidates,
    coordinates,
    NEAREST_BMKG_REGIONAL_VILLAGE_LIMIT,
  );
}

async function findNearestBmkgVillageAcrossRegencies(regencies: WilayahItem[], coordinates: Coordinates) {
  let nearest: (NearestBmkgVillageCandidate & { regency: WilayahItem }) | null = null;

  for (const regency of regencies) {
    const districts = await fetchWilayah(`districts/${regency.code}.json`);
    const candidate = await findNearestBmkgVillageAcrossDistricts(districts, coordinates);
    if (!candidate?.district) continue;

    if (!nearest || candidate.distance < nearest.distance) {
      nearest = {
        ...candidate,
        regency,
      };
    }
  }

  return nearest;
}

function createResolvedBmkgLocation(
  province: WilayahItem,
  regency: WilayahItem,
  district: WilayahItem,
  village: WilayahItem,
) {
  const districtName = district.name.toUpperCase().startsWith('KECAMATAN')
    ? toTitleCase(district.name)
    : `Kec. ${toTitleCase(district.name)}`;

  const regencyName = toTitleCase(regency.name);
  const provinceName = toTitleCase(province.name);

  const detail = uniqueParts([districtName, regencyName, provinceName]).join(', ');
  const villageName = toTitleCase(village.name);

  return {
    adm4: village.code,
    label: uniqueParts([villageName, detail]).join(', '),
    name: villageName,
    detail,
  };
}

async function resolveBmkgLocation(
  item: NominatimSearchResult,
  query: string,
  coordinates?: Coordinates,
): Promise<ResolvedBmkgLocation | null> {
  const address = item.address || {};
  const displayParts = getDisplayParts(item);

  const provinces = await fetchWilayah('provinces.json');
  const province = matchWilayahItem(provinces, [
    address.state,
    address.province,
    ...displayParts,
  ]);
  if (!province) return null;

  const regencies = await fetchWilayah(`regencies/${province.code}.json`);
  const regencyCandidates = [
    address.county,
    address.city,
    address.municipality,
    address.state_district,
    ...displayParts,
  ];
  const matchedRegencies = matchWilayahItems(regencies, regencyCandidates);
  const regenciesToTry = matchedRegencies.length
    ? prioritizeWilayahItems(regencies, matchedRegencies)
    : regencies;
  if (!regenciesToTry.length) return null;

  const districtCandidates = [
    address.city_district,
    address.district,
    address.suburb,
    address.town,
    ...displayParts,
  ];
  const hasDistrictHint = uniqueParts([address.city_district, address.district]).length > 0;
  const villageCandidates = [
    address.village,
    address.hamlet,
    address.neighbourhood,
    address.suburb,
    displayParts[0],
    query,
  ];

  for (const regency of regenciesToTry) {
    const districts = await fetchWilayah(`districts/${regency.code}.json`);
    let district = matchWilayahItem(districts, districtCandidates);
    let village: WilayahItem | null = null;

    if (district) {
      const villages = await fetchWilayah(`villages/${district.code}.json`);
      village = matchWilayahItem(villages, villageCandidates)
        || (coordinates ? await findNearestBmkgVillage(villages, coordinates) : null);
    } else if (!hasDistrictHint) {
      const crossDistrictMatch = await findVillageAcrossDistricts(districts, villageCandidates);
      if (crossDistrictMatch) {
        district = crossDistrictMatch.district;
        village = crossDistrictMatch.village;
      }
    }

    if (!district || !village) continue;

    return createResolvedBmkgLocation(province, regency, district, village);
  }

  if (coordinates && matchedRegencies.length) {
    const nearest = await findNearestBmkgVillageAcrossRegencies(matchedRegencies, coordinates);
    if (nearest?.district) {
      return createResolvedBmkgLocation(province, nearest.regency, nearest.district, nearest.village);
    }
  }

  return null;
}

async function normalizeLocationResult(item: NominatimSearchResult, query: string) {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const bmkgLocation = await resolveBmkgLocation(item, query, { latitude, longitude });
  if (!bmkgLocation) return null;

  return {
    id: String(item.place_id || bmkgLocation.adm4),
    ...bmkgLocation,
    latitude,
    longitude,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ success: false, message: 'Missing lat or lon parameters' }, { status: 400 });
  }

  try {
    const search = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      lat: lat,
      lon: lon,
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${search.toString()}`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'id,en;q=0.8',
        'User-Agent': 'ArinaAgri/0.1 location-reverse',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: `Location reverse failed with HTTP ${response.status}` },
        { status: response.status },
      );
    }

    const raw = (await response.json()) as NominatimSearchResult;
    
    // We try to normalize it into a BMKG-compatible location
    // We pass the display_name or a generic string as the query to resolveBmkgLocation
    const normalized = await normalizeLocationResult(raw, raw.display_name || '');

    if (!normalized) {
       // If it fails to resolve fully to a village level with adm4, we can still return partial data
       // But let's check if the client can use it. The client needs adm4.
       return NextResponse.json({ 
         success: true, 
         data: {
           id: String(raw.place_id || Date.now()),
           adm4: '', // Missing adm4 means we couldn't map it
           label: raw.address?.village || raw.address?.suburb || raw.address?.city || raw.display_name || 'Unknown',
           name: raw.address?.village || raw.address?.city || 'Unknown',
           detail: raw.display_name || '',
           latitude: Number(raw.lat || lat),
           longitude: Number(raw.lon || lon)
         }
       });
    }

    return NextResponse.json({ success: true, data: normalized });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Location reverse failed.' },
      { status: 500 },
    );
  }
}
