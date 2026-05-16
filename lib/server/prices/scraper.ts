import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

const SISKAPERBAPO_API_URL = 'https://siskaperbapo.jatimprov.go.id/home2/getDataMap/';
const CABE_RAWIT_MERAH_ID = 50;
const COMMODITY_NAME = 'Cabe Rawit Merah';
const PROVINCE_AVERAGE_LOCATION = 'Jawa Timur';

interface SiskaperbapoRegionPrice {
  nama?: string;
  hrg?: number | string | null;
}

interface SiskaperbapoMapResponse {
  data?: Record<string, SiskaperbapoRegionPrice>;
  avg?: number | string | null;
  tanggal?: string;
  tgl?: string;
  komoditas_nama?: string;
}

interface PriceRow {
  date: string;
  commodity: string;
  location: string;
  price: number;
}

export function parsePriceLine(line: string): { location: string; price: number } | null {
  if (!line.includes('Rp')) return null;
  const match = line.match(/(.+?)Rp\s?([\d.]+)/);
  if (!match) return null;

  const location = match[1].trim().replace(/[:\-\d.]/g, '').trim();
  const priceText = match[2].trim();
  const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

  if (!location || Number.isNaN(price)) return null;

  if (!location.startsWith('Kabupaten') && !location.startsWith('Kota') && !location.startsWith('Propinsi') && !location.startsWith('Jawa Timur')) {
    return null;
  }

  return { location, price };
}

function getJakartaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function toPrice(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;
  if (typeof value !== 'string') return null;

  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function parseSiskaperbapoMapResponse(response: SiskaperbapoMapResponse, fallbackDate: string): PriceRow[] {
  const sourceDate = response.tanggal || response.tgl || fallbackDate;
  const date = sourceDate.slice(0, 10);
  const rows: PriceRow[] = [];

  Object.values(response.data || {}).forEach((entry) => {
    const location = entry.nama?.trim();
    const price = toPrice(entry.hrg);
    if (!location || price === null || price <= 0) return;

    rows.push({
      date,
      commodity: COMMODITY_NAME,
      location,
      price,
    });
  });

  const average = toPrice(response.avg);
  if (average !== null && average > 0) {
    rows.push({
      date,
      commodity: COMMODITY_NAME,
      location: PROVINCE_AVERAGE_LOCATION,
      price: average,
    });
  }

  return Array.from(new Map(rows.map((row) => [`${row.date}:${row.commodity}:${row.location}`, row])).values());
}

async function fetchSiskaperbapoPriceMap(date: string) {
  const url = new URL(SISKAPERBAPO_API_URL);
  url.searchParams.set('tanggal', date);
  url.searchParams.set('komoditas', String(CABE_RAWIT_MERAH_ID));

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://siskaperbapo.jatimprov.go.id/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Siskaperbapo request failed: ${response.status}`);
  }

  return JSON.parse((await response.text()).trim()) as SiskaperbapoMapResponse;
}

export async function fetchAndSavePrice() {
  const requestedDate = getJakartaDate();
  const response = await fetchSiskaperbapoPriceMap(requestedDate);
  const rowsToInsert = parseSiskaperbapoMapResponse(response, requestedDate);

  if (rowsToInsert.length === 0) {
    throw new Error('Siskaperbapo tidak mengembalikan data harga Cabai Rawit Merah.');
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('commodity_prices')
    .upsert(rowsToInsert, { onConflict: 'date, commodity, location' });

  if (error) {
    throw new Error(`Gagal menyimpan harga ke Supabase: ${error.message}`);
  }

  return {
    date: rowsToInsert[0]?.date || requestedDate,
    inserted: rowsToInsert.length,
    average: rowsToInsert.find((row) => row.location === PROVINCE_AVERAGE_LOCATION)?.price ?? null,
    source: 'siskaperbapo-json',
  };
}
