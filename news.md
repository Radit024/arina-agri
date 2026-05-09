# Arsitektur & Spesifikasi Fitur Berita (*Kabar Pasar*) Arina Agri

Dokumen ini berisi panduan implementasi untuk menambahkan fitur Agregator Berita (Kabar Pasar) ke dalam platform Arina Agri. Sistem akan menarik berita pertanian terbaru secara otomatis dan menyimpannya ke Supabase untuk ditampilkan di Next.js frontend.

## TECH STACK & TOOLS

- **Database**: Supabase (PostgreSQL).
- **Backend Fetcher**: Express.js (menggunakan Node.js).
- **Scheduling**: node-cron (berjalan di backend Express.js).
- **RSS Parser**: `rss-parser` (NPM library untuk membaca link XML/RSS).
- **Frontend**: Next.js 14 (App Router) + Material UI (MUI).

## SKEMA DATABASE (SUPABASE)

Buat tabel baru di Supabase melalui SQL Editor atau Table Editor.

**Table Name:** `news_articles`

| Column Name | Data Type | Properties | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, Default: `gen_random_uuid()` | ID unik artikel |
| `title` | `text` | Not Null | Judul artikel berita |
| `snippet` | `text` | Nullable | Potongan/ringkasan berita (maks ~200 karakter) |
| `link` | `text` | Not Null, Unique | URL asli artikel (Unique constraint untuk cegah duplikasi) |
| `source` | `text` | Nullable | Nama media (contoh: *Antara News*, *Bisnis.com*) |
| `image_url` | `text` | Nullable | Tautan gambar thumbnail berita |
| `pub_date` | `timestamptz` | Not Null | Tanggal publikasi dari sumber asli |
| `created_at` | `timestamptz` | Default: `now()` | Waktu data disimpan ke Supabase |

**SQL Query untuk membuat tabel:**

```sql
CREATE TABLE public.news_articles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    snippet text,
    link text UNIQUE NOT NULL,
    source text,
    image_url text,
    pub_date timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Buat index pada kolom pub_date agar query sorting di frontend lebih cepat
CREATE INDEX idx_news_articles_pub_date ON public.news_articles(pub_date DESC);
```

## BACKEND FETCHING LOGIC (EXPRESS.JS)

Logika ini berjalan di server Express.js menggunakan penjadwalan.

### Alur Kerja (Workflow)

1. **Cron job tereksekusi**: Misal setiap jam 06:00 dan 18:00.
2. **Fetch RSS**: Backend memanggil `rss-parser` untuk membaca beberapa URL RSS (contoh: Antara News, BeritaJatim).
3. **Iterasi**: Backend melakukan iterasi terhadap item berita (limit 5 berita terbaru per sumber).
4. **Filtering**: Mengecek apakah judul berita mengandung kata kunci (cabai, pupuk, cuaca, dll).
5. **UPSERT**: Jika relevan, backend melakukan proses UPSERT (Insert, jika ada konflik URL abaikan) ke tabel `news_articles` di Supabase.

### Daftar Sumber RSS Target

- **Antara News (Ekonomi)**: [https://www.antaranews.com/rss/ekonomi.xml](https://www.antaranews.com/rss/ekonomi.xml)
- **Bisnis.com (Ekonomi)**: [https://ekonomi.bisnis.com/rss](https://ekonomi.bisnis.com/rss)
- **BeritaJatim**: [https://beritajatim.com/feed/](https://beritajatim.com/feed/)

## FRONTEND IMPLEMENTATION (NEXT.JS & MUI)

### 4.1 Layout & Penempatan

- **Sidebar**: Tambahkan menu baru *Kabar Pasar* (Ikon: `NewspaperIcon` atau `FeedIcon`).
- **Dashboard**: Tampilkan juga 3 berita terbaru (ringkasan) di halaman beranda `/dashboard` bagian bawah.

### 4.2 Desain Komponen (UI)

- **Gaya**: News Aggregator (Cuplikan + Redirect).
- **Komponen MUI**: `Card`, `CardMedia`, `CardContent`, `Typography`, `Button`.
- **Fair Use**: Batasi snippet teks maksimal 2-3 baris. Jangan tampilkan isi teks secara penuh.
- **CTA**: Tombol *Baca Selengkapnya di Sumber* harus menggunakan `<a target="_blank" rel="noopener noreferrer">`.

### 4.3 Data Fetching di Frontend

- Gunakan Supabase Client untuk melakukan select dari tabel `news_articles`.
- Urutkan: `.order('pub_date', { ascending: false })`.
- Gunakan paginasi (misal: 10 berita per halaman).

## CATATAN PENTING (SECURITY & PERFORMANCE)

- **API Keys**: Gunakan `service_role_key` di backend (bypass RLS) dan `anon_key` di frontend (read-only).
- **Error Handling**: Pasang `try-catch` yang kuat saat membaca RSS (antisipasi timeout/XML rusak).
- **Cleanup Data**: Buat Cron Job bulanan untuk menghapus berita yang usianya > 30 hari agar database tetap ringan.

