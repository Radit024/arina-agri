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

const WILAYAH_API_BASE_URL = 'https://wilayah.id/api';

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

function matchWilayahItem(items: WilayahItem[], candidates: Array<string | undefined>) {
  const normalizedCandidates = new Set(
    uniqueParts(candidates)
      .map((candidate) => normalizeName(candidate))
      .filter(Boolean),
  );

  if (!normalizedCandidates.size) return null;

  return items.find((item) => normalizedCandidates.has(normalizeName(item.name))) || null;
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

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function resolveBmkgLocation(item: NominatimSearchResult, query: string): Promise<ResolvedBmkgLocation | null> {
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
  const regency = matchWilayahItem(regencies, [
    address.county,
    address.city,
    address.municipality,
    address.state_district,
    ...displayParts,
  ]);
  if (!regency) return null;

  const districts = await fetchWilayah(`districts/${regency.code}.json`);
  const district = matchWilayahItem(districts, [
    address.city_district,
    address.district,
    address.suburb,
    address.town,
    ...displayParts,
  ]);
  if (!district) return null;

  const villages = await fetchWilayah(`villages/${district.code}.json`);
  const village = matchWilayahItem(villages, [
    address.village,
    address.hamlet,
    address.neighbourhood,
    address.suburb,
    displayParts[0],
    query,
  ]);
  if (!village) return null;

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

async function normalizeLocationResult(item: NominatimSearchResult, query: string) {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const bmkgLocation = await resolveBmkgLocation(item, query);
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