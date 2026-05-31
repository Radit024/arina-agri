<div align="center">
  <img src="public/logo arina.svg" width="100" height="100" alt="Arina Agri Logo"/>

  <h1 align="center">Arina Agri</h1>

  <p align="center">
    <strong>Asisten digital untuk petani dan pelaku agribisnis UMKM</strong><br>
    <em>Dashboard tani modern untuk keuangan, stok panen, cuaca BMKG, kalender kerja, berita pasar, dan konsultasi AI.</em>
  </p>

  <p align="center">
    <a href="#status-aplikasi">Status</a> |
    <a href="#fitur-utama">Fitur</a> |
    <a href="#arsitektur">Arsitektur</a> |
    <a href="#panduan-instalasi">Instalasi</a> |
    <a href="#deployment">Deployment</a>
  </p>

  <div align="center">
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-20232a?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Material_UI-9-007FFF?style=for-the-badge&logo=mui&logoColor=white" alt="MUI" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/TypeScript-Strict-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </div>
</div>

<br>
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" alt="" />

## Status Aplikasi

Arina Agri saat ini berjalan sebagai **monolit Next.js App Router**. UI, autentikasi, API internal, integrasi AI, fetch cuaca, fetch berita, scraper harga, webhook, dan cron endpoint berada di dalam aplikasi Next.js.

Folder `backend/` masih ada sebagai sumber Express/Node lama dan referensi layanan, tetapi jalur utama development dan deployment sekarang adalah root project Next.js. Script root `npm run dev`, `npm run build`, dan `npm run ci` tidak menjalankan folder `backend/`.

Status runtime saat ini:

| Area | Status |
| :--- | :--- |
| Frontend dashboard | Aktif di `app/dashboard/**` |
| API utama | Aktif di `app/api/**/route.ts` |
| Auth | Supabase Auth, dengan mock session otomatis saat `NODE_ENV=development` |
| Database | Supabase/Postgres |
| AI | Gemini untuk chat ensiklopedia dan analisis laporan keuangan |
| Cuaca | BMKG Open Data, lokasi manual/GPS, cache server |
| Harga komoditas | Siskaperbapo Jawa Timur untuk Cabai Rawit Merah |
| Berita | Google News RSS pertanian/komoditas, disimpan ke Supabase |
| Notifikasi | WhatsApp Cloud API atau Telegram Bot API, dengan decision engine cuaca |
| Deployment | GitHub Actions + Vercel, termasuk preview dan production deploy |

## Sekilas Tentang Arina Agri

**Arina Agri** membantu petani dan pelaku agribisnis UMKM mengelola aktivitas operasional harian. Fokus aplikasi saat ini adalah budidaya cabai rawit, terutama untuk pencatatan biaya, stok hasil panen, pemantauan cuaca, pengingat kegiatan lahan, dan pembacaan kondisi pasar.

Aplikasi ini menggabungkan data operasional pengguna, data cuaca BMKG, berita pertanian, harga komoditas Jawa Timur, dan bantuan AI agar keputusan tani bisa dibuat lebih cepat dan lebih rapi.

## Fitur Utama

### Dashboard Ringkasan

- KPI pengeluaran bulan ini, estimasi laba bersih, status cuaca, dan harga cabai terbaru.
- Grafik tren keuangan dan distribusi kategori pengeluaran.
- Widget berita terbaru dari modul Kabar Pasar.
- Pull-to-refresh di mobile dan skeleton loading.
- Banner risiko cuaca berdasarkan prakiraan dan peringatan BMKG.

### Manajemen Keuangan

- CRUD transaksi pemasukan dan pengeluaran.
- Filter transaksi berdasarkan bulan dan jenis transaksi.
- Ringkasan pemasukan, pengeluaran, laba bersih, dan distribusi kategori biaya.
- Ekspor buku besar ke `.xlsx` memakai ExcelJS.
- Ekspor laporan PDF memakai jsPDF.
- Laporan PDF AI dengan analisis dan rekomendasi Gemini, dibatasi 3 laporan AI per bulan per user.
- Kalkulator HPP dan BEP untuk membaca harga pokok produksi dan titik impas.

### Manajemen Stok Panen

- Input batch panen dengan grade, berat masuk, harga modal, harga jual, lokasi gudang, dan estimasi kadaluarsa.
- Catat stok keluar untuk penjualan atau distribusi.
- Riwayat mutasi stok masuk/keluar.
- KPI stok siap jual, estimasi nilai stok, stok terjual, dan batch hampir kadaluarsa.
- Sinyal risiko cuaca untuk membantu prioritas penyimpanan dan distribusi.

### Cuaca dan Lokasi

- Prakiraan 3 hari dari BMKG berdasarkan kode wilayah `adm4`.
- Peringatan dini BMKG untuk Jawa Timur.
- Lokasi bisa dipilih manual lewat pencarian wilayah atau lewat GPS.
- Reverse geocoding internal untuk memetakan koordinat ke wilayah BMKG.
- Refresh data berkala setiap 5 menit di halaman cuaca.
- Notifikasi cuaca harian dan pesan uji coba via WhatsApp/Telegram.

### Smart Kalender

- Kalender aktivitas tani bulanan.
- Tambah, edit, dan hapus jadwal pemupukan, penyemprotan, irigasi, pemetikan/panen, atau kegiatan lain.
- Daftar agenda 7 hari ke depan.
- Catatan perencanaan berbasis risiko cuaca BMKG.

### Kabar Pasar

- Feed berita pertanian, komoditas, cuaca, kebijakan, tips budidaya, dan pasar.
- Pagination dan filter kategori.
- Grafik harga Cabai Rawit Merah.
- Peta distribusi harga kabupaten/kota Jawa Timur dengan pembanding rata-rata provinsi.
- Cron harian untuk menarik berita terbaru dan membersihkan artikel lama.

### Ensiklopedia AI

- Chat Gemini untuk penyakit, hama, dan budidaya cabai rawit.
- Riwayat percakapan tersimpan di browser per user.
- Konteks cuaca BMKG dikirim sebagai konteks tambahan agar jawaban lebih relevan.
- Referensi cepat penyakit seperti antraknosa, virus kuning, ulat grayak, dan kutu kebul.

### Pengaturan, Navigasi, dan UX

- Bahasa Indonesia dan English melalui `next-intl`.
- Pengaturan profil, notifikasi, dan informasi sistem.
- Sidebar desktop yang bisa diciutkan.
- Bottom navigation mobile dengan menu "Lainnya".
- Onboarding guide per halaman.
- Dark mode/light mode melalui sistem tema MUI.
- Skip-to-main-content link untuk aksesibilitas keyboard/screen reader.

## Arsitektur

```text
arina-agri/
+-- app/                  # Next.js App Router: pages, layouts, API routes
|   +-- api/              # Route handlers untuk AI, cuaca, berita, cron, notifikasi
|   +-- dashboard/        # Modul dashboard utama
|   +-- login/            # Auth email/password dan Google OAuth
|   +-- register/
+-- components/           # Komponen UI reusable
+-- controllers/          # Controller/hook presentational boundary per fitur
+-- hooks/                # Hook data dan state client
+-- lib/                  # API client, formatter, Supabase, PDF, server modules
|   +-- server/           # Modul server-only untuk AI, BMKG, cron, news, notifikasi
+-- messages/             # Terjemahan id/en untuk next-intl
+-- tests/                # Vitest, Testing Library, server/unit/component tests
+-- docs/                 # Deployment, database, dan catatan desain
+-- public/               # Logo dan asset publik
+-- backend/              # Express runtime lama/opsional, bukan jalur utama Next.js
```

Alur data utama:

```text
UI Dashboard
  -> controllers/hooks
  -> lib/api.ts atau Supabase client
  -> app/api/** route handlers
  -> lib/server/**
  -> Supabase, Gemini, BMKG, Siskaperbapo, Google News RSS, WhatsApp/Telegram
```

## Route dan Endpoint Penting

| Route | Fungsi |
| :--- | :--- |
| `/` | Redirect ke `/login` |
| `/login`, `/register`, `/forgot-password` | Autentikasi pengguna |
| `/dashboard` | Ringkasan KPI, cuaca, harga, chart, berita |
| `/dashboard/keuangan` | Keuangan, HPP/BEP, Excel/PDF/AI report |
| `/dashboard/stok` | Batch panen dan mutasi stok |
| `/dashboard/cuaca` | BMKG forecast, warning, lokasi, notifikasi |
| `/dashboard/kabar-pasar` | Berita dan harga komoditas |
| `/dashboard/ensiklopedia` | Chat AI penyakit/hama/budidaya |
| `/dashboard/kalender` | Jadwal aktivitas tani |
| `/dashboard/pengaturan` | Profil, notifikasi, sistem |

Endpoint API utama:

| Endpoint | Method | Fungsi |
| :--- | :--- | :--- |
| `/api/health` | GET | Health check |
| `/api/dashboard/summary` | GET | Ringkasan dashboard dari transaksi, cuaca, harga, dan berita |
| `/api/ai/gemini` | POST | Chat ensiklopedia AI |
| `/api/ai/financial-report` | POST | Analisis laporan keuangan AI |
| `/api/weather/forecast` | GET | Prakiraan BMKG per `adm4` |
| `/api/weather/warnings` | GET | Peringatan dini BMKG |
| `/api/location/search` | GET | Pencarian wilayah manual |
| `/api/location/reverse` | GET | Koordinat GPS ke wilayah BMKG |
| `/api/news` | GET | Artikel berita tersimpan |
| `/api/news/trigger` | POST | Trigger fetch berita manual |
| `/api/notification/send` | POST | Kirim notifikasi langsung |
| `/api/notification/decide` | POST | Hitung keputusan notifikasi tanpa kirim |
| `/api/notification/decide-send` | POST | Hitung keputusan dan kirim jika layak |
| `/api/notification/schedule` | GET/POST | Baca/simpan jadwal notifikasi |
| `/api/webhook/n8n` | POST | Webhook n8n untuk input transaksi/stok |
| `/api/cron/news` | GET | Cron fetch berita |
| `/api/cron/prices` | GET | Cron fetch harga Siskaperbapo |
| `/api/cron/notifications` | GET | Cron notifikasi terjadwal |

## Database dan Integrasi

Tabel Supabase yang dipakai aplikasi:

- `profiles`
- `transactions`
- `calendar_events`
- `harvest_batches`
- `stock_mutations`
- `commodity_prices`
- `news_articles`
- `notification_schedules`

Indeks performa dashboard tersedia di:

```text
docs/database/dashboard-performance-indexes.sql
```

Integrasi eksternal:

- **Supabase** untuk Auth, database, dan server admin client.
- **Gemini** untuk chat pertanian dan laporan keuangan AI.
- **BMKG Open Data** untuk prakiraan cuaca dan peringatan dini.
- **wilayah.id** untuk pencarian dan reverse lookup wilayah.
- **Siskaperbapo Jawa Timur** untuk harga Cabai Rawit Merah.
- **Google News RSS** untuk berita pertanian dan komoditas.
- **WhatsApp Cloud API / Telegram Bot API** untuk notifikasi.
- **n8n** untuk webhook input otomatis, misalnya dari workflow Telegram.

## Teknologi Yang Digunakan

| Bagian | Teknologi |
| :--- | :--- |
| Framework | Next.js 16 App Router, React 19 |
| Bahasa | TypeScript strict |
| UI | Material UI 9, MUI Icons, MUI X Charts, Tailwind CSS 4 |
| Styling dan motion | Emotion, Framer Motion, CSS variables |
| Form dan validasi | React Hook Form, Zod |
| Auth dan data | Supabase JS |
| AI | `@google/generative-ai` |
| Dokumen dan export | ExcelJS, jsPDF, jspdf-autotable, file-saver |
| News/scraping | rss-parser, cheerio |
| Testing | Vitest, Testing Library, jsdom |
| Deployment | GitHub Actions, Vercel CLI, Vercel Cron |

## Panduan Instalasi

Prasyarat:

- Node.js 20.x
- npm
- Project Supabase aktif
- API key Gemini jika ingin memakai fitur AI

Langkah lokal:

1. **Clone repository**

   ```bash
   git clone https://github.com/Radit024/arina-agri.git
   cd arina-agri
   ```

2. **Install dependencies root**

   ```bash
   npm install
   ```

3. **Buat file environment**

   ```bash
   cp .env.example .env.local
   ```

   Di PowerShell Windows:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. **Isi konfigurasi minimal**

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   BMKG_FORECAST_CACHE_MINUTES=30
   BMKG_FETCH_TIMEOUT_MS=8000
   CRON_SECRET=change_me_to_a_random_secret
   ```

5. **Jalankan development server**

   ```bash
   npm run dev
   ```

6. **Buka aplikasi**

   ```text
   http://localhost:3000
   ```

Catatan development:

- Di development, `AuthProvider` membuat mock user otomatis sehingga halaman login akan mengarahkan ke dashboard.
- Fitur yang membaca/menulis Supabase tetap membutuhkan environment Supabase valid.
- Folder `backend/` tidak perlu dijalankan untuk flow utama Next.js.

## Environment Variables

Variabel utama:

| Variable | Keterangan |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase untuk client dan server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key untuk route server dan cron |
| `GEMINI_API_KEY` | API key Gemini |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `GOOGLE_API_KEY` | Fallback key Gemini opsional |
| `GEMINI_MODEL` | Model Gemini, default `gemini-2.5-flash` |
| `BMKG_FORECAST_CACHE_MINUTES` | TTL cache forecast BMKG |
| `BMKG_FETCH_TIMEOUT_MS` | Timeout fetch BMKG |
| `CRON_SECRET` | Bearer token untuk endpoint `/api/cron/**` di production |
| `N8N_WEBHOOK_SECRET` | Secret validasi webhook n8n |

Variabel notifikasi opsional:

| Variable | Keterangan |
| :--- | :--- |
| `WHATSAPP_CLOUD_TOKEN` | Token WhatsApp Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID WhatsApp Cloud |
| `WHATSAPP_CLOUD_API_VERSION` | Versi API, default `v19.0` |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram |
| `TELEGRAM_API_URL` | Override base URL Telegram API |
| `ALERT_HEAVY_RAIN_MM` | Ambang hujan lebat, default `20` |
| `ALERT_STRONG_WIND_KMH` | Ambang angin kuat, default `12` |
| `ALERT_EXTREME_TEMP_C` | Ambang suhu ekstrem, default `32` |
| `ALERT_LOW_HUMIDITY_PERCENT` | Ambang kelembapan rendah, default `50` |

Variabel deployment/smoke check:

| Variable | Keterangan |
| :--- | :--- |
| `VERCEL_TOKEN` | Token deploy Vercel dari GitHub Actions |
| `VERCEL_ORG_ID` | ID organisasi Vercel |
| `VERCEL_PROJECT_ID` | ID project Vercel |
| `DEPLOYMENT_URL` | URL target untuk smoke check |
| `SMOKE_TIMEOUT_MS` | Timeout smoke check |
| `PRODUCTION_URL` | URL production untuk smoke check GitHub Actions |

## Perintah Development

```bash
# Development server Next.js
npm run dev

# Lint
npm run lint

# Type generation Next.js + TypeScript check
npm run typecheck

# Unit/component/server tests
npm run test

# Cek kelengkapan key i18n id/en
npm run i18n:check

# Build production
npm run build

# Quality gate lokal seperti CI
npm run ci

# Ringkasan ukuran bundle setelah build
npm run perf:bundles

# Smoke check deployment, butuh DEPLOYMENT_URL
npm run smoke:deploy
```

Backend Express lama dapat dijalankan terpisah hanya jika memang dibutuhkan untuk eksperimen legacy:

```bash
cd backend
npm install
npm run dev
```

## Testing

Test berada di folder `tests/` dan mencakup:

- server logic untuk BMKG, dashboard summary, cron auth, Gemini validator, news, notification schedule, dan price parser.
- component tests untuk mobile navigation, guide provider, dan halaman cuaca.
- hook tests untuk dashboard summary.
- script tests untuk CI/CD, bundle summary, dan smoke deploy.
- basic smoke test aplikasi.

Quality gate penuh:

```bash
npm run ci
```

## Deployment

Deployment utama memakai **GitHub Actions + Vercel CLI**.

Workflow `.github/workflows/ci-cd.yml` menjalankan:

1. Install dependencies.
2. Lint.
3. Typecheck.
4. Vitest.
5. i18n check.
6. Next.js build.
7. Bundle summary.
8. Preview deploy untuk pull request dari repo yang sama.
9. Production deploy saat push ke `main` atau `workflow_dispatch`.
10. Smoke check terhadap deployment.

Dokumentasi deployment lebih detail ada di:

```text
docs/deployment/github-actions.md
```

Vercel Cron dikonfigurasi di `vercel.json`:

| Path | Schedule UTC | Perkiraan WIB | Fungsi |
| :--- | :--- | :--- | :--- |
| `/api/cron/news` | `0 0 * * *` | 07:00 | Fetch berita dan cleanup artikel lama |
| `/api/cron/notifications` | `0 0 * * *` | 07:00 | Proses notifikasi terjadwal |
| `/api/cron/prices` | `0 2 * * *` | 09:00 | Fetch harga Cabai Rawit Merah |

Di production, endpoint cron mewajibkan header:

```text
Authorization: Bearer <CRON_SECRET>
```

## Catatan Data dan Fallback

- Data cuaca memakai BMKG. Jika fetch gagal, UI menampilkan state error/fallback sesuai modul.
- Data transaksi, kalender, dan stok memiliki mock fallback saat tidak ada session pengguna.
- Development auth memakai mock user, sehingga untuk menguji multi-user atau policy RLS perlu menjalankan mode production-like dengan Supabase Auth asli.
- `docs/database/dashboard-performance-indexes.sql` hanya berisi indeks, bukan schema lengkap.

<br>
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/grass.png" width="100%" alt="" />

<p align="center"><em>Copyright (c) 2026 Arina Agri</em></p>
