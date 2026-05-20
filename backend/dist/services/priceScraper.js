"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndSavePrice = fetchAndSavePrice;
exports.startPriceScraper = startPriceScraper;
// @ts-nocheck
const node_cron_1 = __importDefault(require("node-cron"));
const supabase_1 = require("./supabase");
const puppeteer_1 = __importDefault(require("puppeteer"));
async function fetchAndSavePrice() {
    const todayObj = new Date();
    const today = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    console.log(`[Price Scraper] Mulai scraping Siskaperbapo untuk tanggal ${today}...`);
    const allRegions = [
        'Kabupaten Bangkalan', 'Kabupaten Banyuwangi', 'Kabupaten Bojonegoro', 'Kabupaten Bondowoso', 'Kabupaten Gresik',
        'Kabupaten Jember', 'Kabupaten Jombang', 'Kabupaten Kediri', 'Kabupaten Lamongan', 'Kabupaten Lumajang',
        'Kabupaten Madiun', 'Kabupaten Magetan', 'Kabupaten Malang', 'Kabupaten Mojokerto', 'Kabupaten Nganjuk',
        'Kabupaten Ngawi', 'Kabupaten Pacitan', 'Kabupaten Pamekasan', 'Kabupaten Pasuruan', 'Kabupaten Ponorogo',
        'Kabupaten Probolinggo', 'Kabupaten Sampang', 'Kabupaten Sidoarjo', 'Kabupaten Situbondo', 'Kabupaten Sumenep',
        'Kabupaten Trenggalek', 'Kabupaten Tuban', 'Kabupaten Tulungagung',
        'Kota Batu', 'Kota Blitar', 'Kota Kediri', 'Kota Madiun', 'Kota Malang', 'Kota Mojokerto', 'Kota Pasuruan',
        'Kota Probolinggo', 'Kota Surabaya'
    ];
    let scrapedData = [];
    let jatimAverage = 68800; // Harga dasar rata-rata Siskaperbapo (Cabe Rawit Merah)
    try {
        const browser = await puppeteer_1.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        // Buka halaman Beranda (lebih stabil untuk ringkasan wilayah)
        await page.goto('https://siskaperbapo.jatimprov.go.id/', { waitUntil: 'networkidle2' });
        // Pilih komoditas Cabe Rawit Merah (value = 50)
        await page.select('#komoditas', '50');
        // Klik tombol Refresh/Tampilkan
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => { }), // Kadang tidak navigasi penuh, hanya AJAX
            page.click('#refresh') // Selector ID tombol refresh di home
        ]);
        // Tunggu tabel/list muncul (biasanya ada delay AJAX)
        await new Promise(r => setTimeout(r, 3000));
        // Ekstrak data dari list/tabel yang muncul di home
        const rawData = await page.evaluate(() => {
            const doc = window.document;
            // Di home siskaperbapo, data biasanya ada di list atau tabel detail
            const rows = Array.from(doc.querySelectorAll('table tr, .list-group-item'));
            return rows.map((r) => {
                const text = r.textContent?.trim() || '';
                // Format biasanya: "Nama Daerah: Rp 65.000" atau kolom terpisah
                return { text };
            });
        });
        await browser.close();
        // Parse data (Logic disesuaikan untuk format baris teks atau kolom)
        rawData.forEach(item => {
            const line = item.text;
            // Cari baris yang mengandung Rp
            if (line.includes('Rp')) {
                // Regex untuk memisahkan Nama Daerah dan Harga
                const match = line.match(/(.+?)Rp\s?([\d.]+)/);
                if (match) {
                    const loc = match[1].trim().replace(/[:\-\d.]/g, '').trim();
                    const priceText = match[2].trim();
                    const parsedPrice = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
                    if (loc && !isNaN(parsedPrice)) {
                        // Validasi nama daerah
                        if (loc.startsWith('Kabupaten') || loc.startsWith('Kota') || loc.startsWith('Propinsi')) {
                            scrapedData.push({ location: loc, price: parsedPrice });
                            if (loc === 'Propinsi Jawa Timur' || loc === 'Jawa Timur')
                                jatimAverage = parsedPrice;
                        }
                    }
                }
            }
        });
        console.log(`[Price Scraper] Berhasil mendapatkan ${scrapedData.length} baris data dari web.`);
    }
    catch (err) {
        console.warn(`[Price Scraper] Scraping dengan Puppeteer gagal (${err.message}). Menggunakan fallback data simulasi untuk 38 kabupaten.`);
        scrapedData = [];
    }
    // JIKA GAGAL SCRAPE, JANGAN SIMPAN DATA SIMULASI (Sesuai instruksi: ambil hanya dari database riil)
    if (scrapedData.length === 0) {
        console.warn('[Price Scraper] Tidak ada data riil yang didapat, operasi simpan dibatalkan untuk menjaga integritas data.');
        return;
    }
    // Calculate actual jatim average if not found from the website
    let actualJatimAvg = jatimAverage;
    const hasJatim = scrapedData.find(d => d.location === 'Propinsi Jawa Timur' || d.location === 'Jawa Timur');
    if (!hasJatim && scrapedData.length > 0) {
        const validPrices = scrapedData.filter(d => d.price > 0);
        if (validPrices.length > 0) {
            const sum = validPrices.reduce((acc, curr) => acc + curr.price, 0);
            actualJatimAvg = Math.round(sum / validPrices.length);
        }
        scrapedData.push({ location: 'Jawa Timur', price: actualJatimAvg });
    }
    else if (hasJatim) {
        actualJatimAvg = hasJatim.price;
    }
    // ISI DATA KOSONG DENGAN RATA-RATA PROVINSI JIKA ADA KOTA YANG TIDAK ADA HARGANYA ("-")
    allRegions.forEach(region => {
        if (!scrapedData.find(d => d.location === region)) {
            scrapedData.push({ location: region, price: actualJatimAvg });
        }
    });
    // 3. Simpan semua data ke Supabase (Upsert berdasarkan Unique Constraint)
    const uniqueData = Array.from(new Map(scrapedData.map(item => [item.location, item])).values());
    const rowsToInsert = uniqueData.map(d => ({
        date: today,
        commodity: 'Cabe Rawit Merah',
        location: d.location,
        price: d.price
    }));
    const { error } = await supabase_1.supabaseAdmin.from('commodity_prices').upsert(rowsToInsert, { onConflict: 'date, commodity, location' });
    if (error) {
        console.error('[Price Scraper] Gagal menyimpan ke Supabase:', error.message);
    }
    else {
        console.log(`[Price Scraper] Berhasil menyimpan ${rowsToInsert.length} data harga cabai untuk tanggal ${today}`);
    }
}
function startPriceScraper() {
    console.log('[Price Scraper] Scheduler aktif. Dijalankan setiap 09:00 pagi.');
    // Cron berjalan setiap jam 09:00 pagi
    node_cron_1.default.schedule('0 9 * * *', () => {
        console.log('[Price Scraper] Menjalankan task harian...');
        fetchAndSavePrice();
    });
    // Untuk keperluan development/demo, jalankan scraper 5 detik setelah server menyala
    // agar data hari ini langsung terisi.
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        setTimeout(() => {
            fetchAndSavePrice();
        }, 5000);
    }
}
