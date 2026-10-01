Arsitektur & Spesifikasi Fitur Statistik Harga Komoditas

Fitur ini bertugas melacak, menyimpan, dan memvisualisasikan tren harga cabai (dan komoditas lain) dari hari ke hari. Tujuannya adalah memberikan wawasan (insight) kepada petani mengenai pergerakan harga pasar lokal.

1. SUMBER DATA (DATA SOURCE)

Karena target awal adalah daerah Malang, sumber data yang paling akurat adalah Siskaperbapo Jawa Timur (Sistem Informasi Ketersediaan dan Perkembangan Harga Bahan Pokok).

Data diambil sehari sekali pada pagi hari (misal pukul 09:00 WIB) melalui proses Web Scraping (menggunakan axios dan cheerio) di backend Express.js.

1. SKEMA DATABASE (SUPABASE)

Kita membutuhkan tabel untuk menyimpan history harga harian.

Table Name: commodity_prices

Column Name

Data Type

Properties

Description

id

uuid

Primary Key, Default gen_random_uuid()

ID unik

date

date

Not Null

Tanggal pencatatan harga

commodity

text

Not Null

Contoh: "Cabai Rawit Merah", "Cabai Merah Besar"

location

text

Not Null

Contoh: "Pasar Gadang Malang", "Jawa Timur"

price

numeric

Not Null

Harga per Kg (contoh: 45000)

created_at

timestamptz

Default now()

Waktu data dimasukkan

Kunci Penting (Unique Constraint):
Kita harus mencegah duplikasi data jika sistem cron job berjalan dua kali di hari yang sama.

CREATE TABLE public.commodity_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  commodity text NOT NULL,
  location text NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  -- Mencegah duplikat harga untuk komoditas yang sama di lokasi dan tanggal yang sama
  UNIQUE(date, commodity, location)
);

CREATE INDEX idx_commodity_date ON public.commodity_prices(date DESC);

1. BACKEND LOGIC (EXPRESS.JS SCRAPER)

Buat satu layanan scraper khusus di Express.js yang dijalankan oleh node-cron.

Alur Kerja Backend:

Cron berjalan setiap jam 09:00 pagi.

axios mengunduh halaman HTML Siskaperbapo.

cheerio mencari elemen tabel harga untuk baris "Cabai Rawit".

Ekstrak angka harganya (misal dari "Rp 45.000" menjadi 45000).

Lakukan UPSERT ke tabel commodity_prices di Supabase.

Contoh Pseudo-code Express.js:

const cheerio = require('cheerio');
const axios = require('axios');
const supabase = require('./supabaseClient'); // Supabase client instance

async function fetchAndSavePrice() {
  // 1. Scraping HTML (Simulasi)
  const html = await axios.get('URL_TARGET_HARGA_PASAR');
  const $ = cheerio.load(html.data);
  const rawPriceText = $('#harga-cabai-rawit').text(); // Misal: "Rp 45.500"
  
  // 2. Cleaning data
  const priceNumber = parseInt(rawPriceText.replace(/[^0-9]/g, ''), 10);
  const today = new Date().toISOString().split['T'](0);

  // 3. Simpan ke Supabase (Upsert berdasarkan Unique Constraint)
  await supabase.from('commodity_prices').upsert({
    date: today,
    commodity: 'Cabai Rawit Merah',
    location: 'Malang',
    price: priceNumber
  }, { onConflict: 'date, commodity, location' });
}

1. FRONTEND VISUALIZATION (NEXT.JS + MUI)

Sesuai dengan arsitektur UI/UX Arina Agri, tampilan harga dipisah menjadi dua bagian agar halaman dashboard tetap ringkas dan grafik berat difokuskan di halaman Berita/Kabar Pasar.

A. Dashboard Utama (/dashboard) - Hanya Harga Real-time

Di halaman beranda, cukup tampilkan satu Card (KPI) kecil yang memberikan info instan.

Ambil data LIMIT 2 yang diurutkan berdasarkan date DESC.

Tampilkan Harga Hari Ini.

Hitung selisihnya: Harga Hari Ini - Harga Kemarin.

Jika naik: Tampilkan ikon panah hijau ke atas (misal: + Rp 2.000).

Jika turun: Tampilkan ikon panah merah ke bawah (misal: - Rp 1.500).

Tampilan ini di-desain sangat minimalis menyerupai widget.

B. Halaman Berita / Kabar Pasar (/dashboard/berita) - Grafik Tren Lengkap

Di halaman Berita, letakkan grafik garis di bagian atas halaman (di atas daftar artikel berita). Grafik ini memberikan konteks visual kepada petani sebelum mereka membaca artikel terkait ekonomi pertanian.

Gunakan library @mui/x-charts (LineChart) untuk memvisualisasikan data 7 atau 30 hari terakhir.

Contoh Struktur Komponen React untuk Halaman Berita:

import { LineChart } from '@mui/x-charts';
import { Card, CardHeader, CardContent, Box } from '@mui/material';

// Data didapat dari Supabase: supabase.from('commodity_prices').select('*').order('date', {ascending: true}).limit(7)
const trendData = [
  { date: '12 Apr', price: 42000 },
  { date: '13 Apr', price: 43000 },
  { date: '14 Apr', price: 45000 }, // Terus naik
  // ...
];

export default function MarketTrendChart() {
  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        title="Tren Harga Cabai Rawit (Pasar Induk Malang)"
        subheader="Pergerakan harga 7 hari terakhir"
      />
      <CardContent>
        {/*Grafik Garis Saja, Angka detail ada di Dashboard*/}
        <Box height={300}>
          <LineChart
            xAxis={[{
              scaleType: 'point',
              data: trendData.map(d => d.date)
            }]}
            series={[{
              data: trendData.map(d => d.price),
              label: 'Harga (Rp)',
              color: '#16a34a', // Arina Green
              area: true, // Beri efek gradient di bawah garis
              showMark: true
            }]}
            margin={{ left: 60, right: 20, top: 10, bottom: 30 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

1. INTEGRASI KECERDASAN BUATAN (AI INSIGHT)

Jadikan statistik ini lebih hidup dengan menggabungkannya ke Ensiklopedia AI Arina.

Kirimkan array data harga 7 hari terakhir sebagai context tambahan (System Prompt) ke OpenAI.

Hasilnya, AI Arina bisa memberikan saran proaktif:

"Harga cabai rawit merah sedang dalam tren naik selama 3 hari berturut-turut (saat ini Rp 45.000). Mengingat jadwal Anda menunjukkan panen dalam 2 hari, cuaca mendukung, saya sarankan untuk menahan panen hingga lusa untuk memaksimalkan margin keuntungan."
