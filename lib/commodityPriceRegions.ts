export interface CommodityRegionPriceRow {
  location: string;
  price: number;
  date: string;
  created_at?: string | null;
}

export interface RegionPrice {
  name: string;
  price: number;
  date?: string;
}

const PROVINCE_LOCATION_PATTERN = /^(propinsi\s+)?jawa timur$/i;

export function isProvincePriceLocation(location: string) {
  return PROVINCE_LOCATION_PATTERN.test(location.trim());
}

export function normalizeRegionName(name: string) {
  const normalized = name.toLowerCase().replace(/\s+/g, ' ').trim();
  const withoutRegencyPrefix = normalized.replace(/^kabupaten\s+/, '');

  // The GeoJSON labels Batu as "Batu", while Siskaperbapo returns "Kota Batu".
  if (withoutRegencyPrefix === 'kota batu') return 'batu';

  return withoutRegencyPrefix;
}

export function buildLatestRegionPrices(rows: CommodityRegionPriceRow[]) {
  const latestByRegion = new Map<string, RegionPrice>();

  const sortedRows = [...rows].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  for (const row of sortedRows) {
    if (isProvincePriceLocation(row.location)) continue;

    const key = normalizeRegionName(row.location);
    if (latestByRegion.has(key)) continue;

    latestByRegion.set(key, {
      name: row.location,
      price: row.price,
      date: row.date,
    });
  }

  return [...latestByRegion.values()];
}
