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

export interface CommodityPriceKpi {
  todayPrice: number | null;
  yesterdayPrice: number | null;
  priceDelta: number | null;
  priceDeltaPct: string | null;
  isTrendingUp: boolean | null;
}

export const PROVINCE_PRICE_LOCATIONS = ['Jawa Timur', 'Propinsi Jawa Timur', 'Pasar Induk Malang'] as const;

const PROVINCE_LOCATION_PATTERN = /^(propinsi\s+)?jawa timur$/i;

export function isProvincePriceLocation(location: string) {
  return PROVINCE_LOCATION_PATTERN.test(location.trim());
}

export function preferProvincePrice<TPrice extends CommodityRegionPriceRow>(
  current: TPrice | undefined,
  candidate: TPrice
) {
  if (!current) return candidate;

  const currentRank = PROVINCE_PRICE_LOCATIONS.indexOf(current.location as (typeof PROVINCE_PRICE_LOCATIONS)[number]);
  const candidateRank = PROVINCE_PRICE_LOCATIONS.indexOf(candidate.location as (typeof PROVINCE_PRICE_LOCATIONS)[number]);

  return candidateRank !== -1 && (currentRank === -1 || candidateRank < currentRank) ? candidate : current;
}

export function buildProvincePriceTrend<TPrice extends CommodityRegionPriceRow>(rows: TPrice[], limit: number) {
  const byDate = new Map<string, TPrice>();

  for (const row of rows) {
    if (!PROVINCE_PRICE_LOCATIONS.includes(row.location as (typeof PROVINCE_PRICE_LOCATIONS)[number])) continue;
    if (!Number.isFinite(row.price) || row.price <= 0) continue;
    byDate.set(row.date, preferProvincePrice(byDate.get(row.date), row));
  }

  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);
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
    if (!Number.isFinite(row.price) || row.price <= 0) continue;
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

export function calculateRegionAveragePrice(regionPrices: Array<Pick<RegionPrice, 'price'>>) {
  const validPrices = regionPrices
    .map((region) => region.price)
    .filter((price) => Number.isFinite(price) && price > 0);

  if (validPrices.length === 0) return null;

  const total = validPrices.reduce((sum, price) => sum + price, 0);
  return Math.round(total / validPrices.length);
}

function latestRegionDate(rows: CommodityRegionPriceRow[]) {
  return rows
    .filter((row) => !isProvincePriceLocation(row.location) && Number.isFinite(row.price) && row.price > 0)
    .map((row) => row.date)
    .sort((a, b) => b.localeCompare(a))[0];
}

export function buildLatestRegionAveragePriceKpi(rows: CommodityRegionPriceRow[]): CommodityPriceKpi {
  const todayPrice = calculateRegionAveragePrice(buildLatestRegionPrices(rows));
  const currentDate = latestRegionDate(rows);
  const previousRows = currentDate ? rows.filter((row) => row.date < currentDate) : [];
  const yesterdayPrice = calculateRegionAveragePrice(buildLatestRegionPrices(previousRows));
  const priceDelta = todayPrice !== null && yesterdayPrice !== null ? todayPrice - yesterdayPrice : null;
  const priceDeltaPct = yesterdayPrice && priceDelta !== null ? ((priceDelta / yesterdayPrice) * 100).toFixed(1) : null;

  return {
    todayPrice,
    yesterdayPrice,
    priceDelta,
    priceDeltaPct,
    isTrendingUp: priceDelta !== null ? priceDelta >= 0 : null,
  };
}
