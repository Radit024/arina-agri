Arsitektur & Spesifikasi Fitur Berita (*Kabar Pasar*) Arina Agri

Dokumen ini berisi panduan implementasi untuk menambahkan fitur Agregator Berita (Kabar Pasar) ke dalam platform Arina Agri. Sistem akan menarik berita pertanian terbaru secara otomatis dan menyimpannya ke Supabase untuk ditampilkan di Next.js frontend.

## TECH STACK & TOOLS

Database: Supabase (PostgreSQL).

Backend Fetcher: Express.js (menggunakan Node.js).

Scheduling: node-cron (berjalan di backend Express.js).

**RSS** Parser: rss-parser (**NPM** library untuk membaca link **XML**/**RSS**).

Frontend: Next.js 16 (App Router) + Material UI (**MUI**).

## SKEMA DATABASE (SUPABASE)

Buat tabel baru di Supabase Anda melalui **SQL** Editor atau Table Editor.

Table Name: news_articles

### Column Name

### Data Type

Properties

Description

id

uuid

Primary Key, Default: gen_random_uuid()

ID unik artikel

title

text

### Not Null

Judul artikel berita

snippet

text

Nullable

Potongan/ringkasan isi berita (maksimal ~**200** karakter)

link

text

Not Null, Unique

**URL** asli artikel (Unique constraint penting untuk cegah duplikasi data)

source

text

Nullable

Nama media (contoh: *Antara News*, *Bisnis.com*)

image_url

text

Nullable

Tautan gambar thumbnail berita

pub_date

timestamptz

### Not Null

Tanggal publikasi dari sumber asli

created_at

timestamptz

Default: now()

Waktu data disimpan ke Supabase

**SQL** Query untuk membuat tabel (Jalankan di Supabase **SQL** Editor):

**CREATE** **TABLE** public.news_articles (
    id uuid **DEFAULT** gen_random_uuid() **PRIMARY** **KEY**,
    title text **NOT** **NULL**,
    snippet text,
    link text **UNIQUE** **NOT** **NULL**,
    source text,
    image_url text,
    pub_date timestamp with time zone **NOT** **NULL**,
    created_at timestamp with time zone **DEFAULT** now()
);

-- Buat index pada kolom pub_date agar query sorting di frontend lebih cepat **CREATE** **INDEX** idx_news_articles_pub_date ON public.news_articles(pub_date **DESC**);

## BACKEND FETCHING LOGIC (EXPRESS.JS)

Logika ini berjalan di server Express.js menggunakan penjadwalan.

Alur Kerja (Workflow):

Cron job tereksekusi (misal: setiap jam 06:00 dan 18:00).

Backend memanggil rss-parser untuk membaca beberapa **URL** **RSS** (contoh: Antara News, BeritaJatim).

Backend melakukan iterasi terhadap item berita (limit 5 berita terbaru per sumber).

Backend melakukan filtering: mengecek apakah judul berita mengandung kata kunci (cabai, pupuk, cuaca, dll).

Jika relevan, backend melakukan proses **UPSERT** (Insert, jika ada konflik **URL** abaikan) ke tabel news_articles di Supabase menggunakan @supabase/supabase-js.

Daftar Sumber **RSS** Target:

Antara News (Ekonomi): [https://[www.antaranews.com/rss/ekonomi.xml](https://www.antaranews.com/rss/ekonomi.xml](https://www.antaranews.com/rss/ekonomi.xml](https://www.antaranews.com/rss/ekonomi.xml))

Bisnis.com (Ekonomi): [https://ekonomi.bisnis.com/rss](https://ekonomi.bisnis.com/rss)

BeritaJatim: [https://beritajatim.com/feed/](https://beritajatim.com/feed/)

## FRONTEND IMPLEMENTATION (NEXT.JS & MUI)

4.1 Layout & Penempatan

Tambahkan menu baru di Sidebar: *Kabar Pasar* (Ikon: NewspaperIcon atau FeedIcon).

Tampilkan juga 3 berita terbaru (ringkasan) di halaman beranda /dashboard bagian bawah.

4.2 Desain Komponen (UI)

Gunakan gaya News Aggregator (Cuplikan + Redirect).

**MUI** Components: Card, CardMedia (untuk thumbnail), CardContent, Typography, Button.

Aturan Hak Cipta (Fair Use): Aplikasi tidak boleh menampilkan isi teks secara penuh. Batasi snippet teks maksimal 2-3 baris.

Tombol **CTA** (Call to Action): Tombol *Baca Selengkapnya di Sumber* harus menggunakan atribut <a target=*_blank* rel=*noopener noreferrer*> agar pengguna diarahkan ke website portal berita aslinya di tab baru.

4.3 Data Fetching di Frontend

Di Next.js, gunakan Supabase Client untuk melakukan select dari tabel news_articles.

Urutkan data berdasarkan tanggal publikasi terbaru: .order('pub_date', { ascending: false }).

Gunakan limit paginasi (misal: memuat 10 berita setiap kali scroll atau per halaman).

## CATATAN PENTING (SECURITY & PERFORMANCE)

**API** Keys: Pastikan menggunakan service_role_key Supabase di backend Express.js untuk melakukan insert data (bypass **RLS**), sedangkan di Next.js (klien) gunakan anon_key untuk membaca data.

Error Handling: Pasang blok try-catch yang kuat saat membaca **RSS** di backend, karena **URL** eksternal (portal berita) sering mengalami timeout atau struktur **XML** yang rusak sewaktu-waktu.

Cleanup Data: Pertimbangkan untuk membuat Cron Job kedua (misalnya jalan sebulan sekali) untuk menghapus baris berita yang usianya sudah lebih dari 30 hari dari tabel news_articles agar ukuran database Supabase tetap ringan.
