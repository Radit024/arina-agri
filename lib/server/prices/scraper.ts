import { setTimeout as delay } from 'node:timers/promises';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

const ALL_REGIONS = [
  'Kabupaten Bangkalan', 'Kabupaten Banyuwangi', 'Kabupaten Bojonegoro', 'Kabupaten Bondowoso', 'Kabupaten Gresik',
  'Kabupaten Jember', 'Kabupaten Jombang', 'Kabupaten Kediri', 'Kabupaten Lamongan', 'Kabupaten Lumajang',
  'Kabupaten Madiun', 'Kabupaten Magetan', 'Kabupaten Malang', 'Kabupaten Mojokerto', 'Kabupaten Nganjuk',
  'Kabupaten Ngawi', 'Kabupaten Pacitan', 'Kabupaten Pamekasan', 'Kabupaten Pasuruan', 'Kabupaten Ponorogo',
  'Kabupaten Probolinggo', 'Kabupaten Sampang', 'Kabupaten Sidoarjo', 'Kabupaten Situbondo', 'Kabupaten Sumenep',
  'Kabupaten Trenggalek', 'Kabupaten Tuban', 'Kabupaten Tulungagung',
  'Kota Batu', 'Kota Blitar', 'Kota Kediri', 'Kota Madiun', 'Kota Malang', 'Kota Mojokerto', 'Kota Pasuruan',
  'Kota Probolinggo', 'Kota Surabaya'
];

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

export async function fetchAndSavePrice() {
  const todayObj = new Date();
  const today = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000))
    .toISOString()
    .split('T')[0];

  const supabase = getSupabaseAdmin();

  let scrapedData: Array<{ location: string; price: number }> = [];
  let jatimAverage = 68800;

  try {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
      defaultViewport: {
        deviceScaleFactor: 1,
        hasTouch: false,
        height: 1080,
        isLandscape: true,
        isMobile: false,
        width: 1920,
      },
      executablePath,
      headless: 'shell',
    });

    const page = await browser.newPage();
    await page.goto('https://siskaperbapo.jatimprov.go.id/', { waitUntil: 'networkidle2' });

    await page.select('#komoditas', '50');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      page.click('#refresh'),
    ]);

    await delay(3000);

    const rawLines = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr, .list-group-item')) as HTMLElement[];
      return rows.map((row) => row.textContent?.trim() || '').filter(Boolean);
    });

    await browser.close();

    rawLines.forEach((line) => {
      const parsed = parsePriceLine(line);
      if (parsed) {
        scrapedData.push(parsed);
        if (parsed.location === 'Propinsi Jawa Timur' || parsed.location === 'Jawa Timur') {
          jatimAverage = parsed.price;
        }
      }
    });
  } catch (err: any) {
    console.warn(`[Price Scraper] Scraping gagal (${err.message}).`);
    scrapedData = [];
  }

  if (scrapedData.length === 0) {
    console.warn('[Price Scraper] Tidak ada data riil yang didapat, operasi simpan dibatalkan.');
    return;
  }

  const hasJatim = scrapedData.find((d) => d.location === 'Propinsi Jawa Timur' || d.location === 'Jawa Timur');
  let actualJatimAvg = jatimAverage;

  if (!hasJatim) {
    const validPrices = scrapedData.filter((d) => d.price > 0);
    if (validPrices.length > 0) {
      const sum = validPrices.reduce((acc, curr) => acc + curr.price, 0);
      actualJatimAvg = Math.round(sum / validPrices.length);
    }
    scrapedData.push({ location: 'Jawa Timur', price: actualJatimAvg });
  } else if (hasJatim) {
    actualJatimAvg = hasJatim.price;
  }

  ALL_REGIONS.forEach((region) => {
    if (!scrapedData.find((d) => d.location === region)) {
      scrapedData.push({ location: region, price: actualJatimAvg });
    }
  });

  const uniqueData = Array.from(new Map(scrapedData.map((item) => [item.location, item])).values());

  const rowsToInsert = uniqueData.map((d) => ({
    date: today,
    commodity: 'Cabe Rawit Merah',
    location: d.location,
    price: d.price,
  }));

  const { error } = await supabase
    .from('commodity_prices')
    .upsert(rowsToInsert, { onConflict: 'date, commodity, location' });

  if (error) {
    console.error('[Price Scraper] Gagal menyimpan ke Supabase:', error.message);
  }
}
