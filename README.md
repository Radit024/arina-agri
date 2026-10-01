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

> Dokumentasi ini mencerminkan kondisi repository per **2 Oktober 2026** — monolit Next.js App Router dengan design system reusable.

Arina Agri berjalan sebagai **monolit Next.js App Router murni**. UI, autentikasi, API internal, integrasi AI, fetch cuaca, fetch berita, scraper harga, webhook, dan cron endpoint semuanya berada di dalam satu aplikasi Next.js — tidak ada lagi backend Express terpisah.

Seluruh backend legacy sudah dihapus dari repository: `backend/` (Express/Node.js) dan `server/` (Express + MongoDB + Firebase Admin), beserta dependency yang hanya dipakai keduanya. Satu-satunya jalur development dan deployment sekarang adalah root project Next.js via `npm run dev`, `npm run build`, dan `npm run ci`.

Status runtime saat ini:

| Area | Status |
| :--- | :--- |
| Frontend dashboard | Aktif di `app/dashboard/**`, memakai design system reusable di `components/ui/**` |
| API utama | Aktif di `app/api/**/route.ts` |
| Auth | Supabase Auth, dengan mock session otomatis saat `NODE_ENV=development`; middleware terpusat di `proxy.ts` (pengganti `middleware.ts` di Next.js 16) |
| Database | Supabase/Postgres, migrasi terkelola di `supabase/migrations/**` |
| Data fetching client | `lib/api.ts` (typed API object per domain) dipanggil dari hooks di `hooks/` |
| AI | Gemini untuk chat ensiklopedia (dengan markdown+KaTeX renderer terpisah) dan analisis laporan keuangan |
| Cuaca | BMKG Open Data, lokasi manual/GPS, cache server |
| Harga komoditas | Siskaperbapo Jawa Timur untuk Cabai Rawit Merah |
| Berita | Google News RSS pertanian/komoditas, disimpan ke Supabase |
| Notifikasi | WhatsApp Cloud API atau Telegram Bot API, dengan decision engine cuaca |
| Testing | Vitest (unit/component) + Playwright (`e2e/**`) untuk smoke test end-to-end |
| Deployment | GitHub Actions (`ci-cd.yml`, `playwright.yml`) + Vercel, termasuk preview dan production deploy |

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

- CRUD transaksi pemasukan dan pengeluaran, dengan form field yang sudah disatukan (`TransactionFormFields`) antara mode tambah dan edit.
- Filter transaksi berdasarkan bulan dan jenis transaksi.
- Ringkasan pemasukan, pengeluaran, laba bersih, dan distribusi kategori biaya.
- Skenario keuangan (RAB, realisasi, perbandingan) dengan tampilan **kartu ringkas khusus mobile** untuk Arus Kas, Arus Kas Pasca Pembiayaan, dan Perbandingan — tabel desktop tetap utuh, tampilan mobile beralih ke kartu lewat `ResponsiveDataView`.
- Ekspor buku besar ke `.xlsx` memakai ExcelJS, serta import RAB dari Excel.
- Ekspor laporan PDF memakai jsPDF.
- Laporan PDF AI dengan analisis dan rekomendasi Gemini, dibatasi 3 laporan AI per bulan per user.
- Kalkulator HPP dan BEP untuk membaca harga pokok produksi dan titik impas.
- Master data kategori/satuan dikelola lewat dialog terpadu (`MasterDataDialog`) yang dipakai bersama oleh modul Keuangan dan Stok.

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
- Rendering markdown dan rumus matematika (KaTeX) pada balasan AI ditangani komponen terpisah `ChatMarkdownRenderer`, sehingga library markdown/KaTeX tidak perlu dimuat di halaman lain.

## Sistem UI Reusable (Design System)

Sejak refactor "Reusable UI Foundation", komponen presentational lintas fitur dipusatkan di dua lokasi agar Keuangan, Stok, dan modul lain tidak lagi menduplikasi UI yang sama:

| Komponen | Lokasi | Fungsi |
| :--- | :--- | :--- |
| `AppDialog` | `components/ui/AppDialog.tsx` | Dialog aksesibel dengan header, body scrollable, actions, dan mode presentasi mobile (fullscreen/bottom-sheet). `Modal.tsx` kini jadi re-export kompatibilitas dari `AppDialog`. |
| `ContentState` | `components/ui/ContentState.tsx` | Komposisi state loading/empty/error/retry/ready yang seragam, termasuk slot aksi opsional di empty state. |
| `MetricCard` | `components/ui/MetricCard.tsx` | Kartu metrik presentational (label, value, icon, intent, trend, loading) tanpa logika format angka domain. |
| `ResponsiveDataView` | `components/ui/ResponsiveDataView.tsx` | Menukar tabel desktop dan renderer kartu mobile secara otomatis berdasarkan breakpoint, dengan penanganan state bersama. |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Badge status seragam (mis. status stok, status transaksi). |
| `AppField` | `components/ui/AppField.tsx` | Wrapper field form standar (label, error, helper text) di atas komponen MUI. |
| `MasterDataDialog` | `components/shared/forms/MasterDataDialog.tsx` | Dialog kelola data master (kategori, satuan, dll) yang dipakai bersama oleh Keuangan dan Stok — dulunya milik modul Stok saja. |
| `FieldWithManageAction` | `components/shared/forms/FieldWithManageAction.tsx` | Field select dengan tombol aksi "kelola" di sampingnya (mis. buka `MasterDataDialog`). |
| `MobileTabBar` | `components/shared/navigation/MobileTabBar.tsx` | Tab bar khusus mobile. |

Prinsip arsitektur: komponen di `components/ui` dan `components/shared` bersifat **presentational-only** — semua data, mutasi, validasi, dan state scenario/project tetap dipegang penuh oleh controller masing-masing fitur (`controllers/**`).

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
|   +-- api/              # Route handlers: ai, calendar, cron, feedback, finance,
|   |                     #   health, location, news, notification, profile,
|   |                     #   stok, weather, webhook
|   +-- dashboard/        # Modul dashboard utama (keuangan, stok, cuaca, kalender,
|   |                     #   kabar-pasar, ensiklopedia, pengaturan)
|   +-- login/            # Auth email/password dan Google OAuth
|   +-- register/
+-- components/
|   +-- ui/                    # Design system primitives (AppDialog, ContentState,
|   |                          #   MetricCard, ResponsiveDataView, StatusBadge, AppField, ...)
|   +-- shared/
|   |   +-- forms/             # MasterDataDialog, FieldWithManageAction
|   |   +-- navigation/        # MobileTabBar
|   |   +-- guide/             # Onboarding tour provider
|   |   +-- page/              # Page-level layout helper
|   +-- dashboard/, news/      # Komponen spesifik fitur (chart, peta, kartu berita)
+-- controllers/          # Controller/hook presentational boundary per fitur
+-- hooks/                # Hook data dan state client
+-- lib/
|   +-- server/           # Modul server-only untuk AI, BMKG, cron, news, notifikasi
|   +-- finance/           # Kalkulasi RAB, cashflow, import/export Excel
+-- messages/             # Terjemahan id/en untuk next-intl
+-- supabase/
|   +-- migrations/       # Migrasi schema Postgres terkelola
|   +-- config.toml
+-- tests/                # Vitest, Testing Library, server/unit/component tests
+-- e2e/                  # Playwright end-to-end smoke test
+-- docs/                 # specs, plans, reports, deployment, database, audit
|   +-- specs/            # Spesifikasi fitur (kabar pasar, notifikasi, harga, ...)
|   +-- plans/            # Rencana implementasi yang belum selesai
|   +-- reports/          # Hasil audit dan laporan evaluasi
+-- public/               # Logo dan asset publik
+-- scripts/              # Tooling Node (i18n check, bundle report, smoke deploy)
+-- proxy.ts              # Middleware Next.js 16 (proteksi route /dashboard dan /api)
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
| `/api/finance/transactions` | POST | Buat transaksi keuangan |
| `/api/stok/batches` | POST | Buat batch stok panen |
| `/api/calendar/events` | GET/POST/PATCH/DELETE | CRUD jadwal Smart Kalender |
| `/api/feedback` | GET/POST | Baca/kirim feedback pengguna |
| `/api/profile` | GET/PATCH | Baca/perbarui profil pengguna |
| `/api/analytics/events` | POST | Catat page view/event penggunaan fitur |
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
| `/api/webhook/telegram` | POST | Webhook Telegram Bot API untuk input transaksi/stok |
| `/api/webhook/whatsapp` | GET/POST | Verifikasi dan webhook WhatsApp Cloud API untuk input transaksi/stok |
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
- `finance_scenarios` — skenario RAB/realisasi/perbandingan per proyek keuangan
- `migration_audit_log` — audit trail migrasi schema
- `user_feedbacks` — feedback pengguna dari menu Feedback
- Master data grade/lokasi dan enhancement form stok (lihat migrasi `grade_location_master`, `stock_form_enhancement`, `supply_management`)

Migrasi schema dikelola di `supabase/migrations/` (urut kronologis, prefix timestamp `YYYYMMDDHHMMSS`):

| Migrasi | Fungsi |
| :--- | :--- |
| `20260609000000_grade_location_master.sql` | Master data grade dan lokasi gudang |
| `20260609000001_stock_form_enhancement.sql` | Penyempurnaan form input stok |
| `20260613000000_supply_management.sql` | Manajemen bahan pendukung/supply |
| `20260617000000_finance_transaction_master.sql` | Master kategori transaksi keuangan |
| `20260730000000_usage_analytics.sql` | Tabel analytics penggunaan fitur |
| `20260802000000_finance_scenarios.sql` | Skenario RAB/realisasi/perbandingan keuangan |
| `20260804000000_migration_audit_log.sql` | Audit log migrasi schema |
| `20260821000000_user_feedbacks.sql` | Tabel feedback pengguna |
| `20260821000001_chat_input_channel_identities.sql` | Identitas channel input chat (WhatsApp/Telegram) |
| `20260821000002_dashboard_performance_indexes.sql` | Indeks performa query dashboard |

`supabase/migrations/` adalah satu-satunya sumber SQL schema. Jalankan seluruh file di sana secara berurutan.

Integrasi eksternal:

- **Supabase** untuk Auth, database, dan server admin client.
- **Gemini** untuk chat pertanian dan laporan keuangan AI.
- **BMKG Open Data** untuk prakiraan cuaca dan peringatan dini.
- **wilayah.id** untuk pencarian dan reverse lookup wilayah.
- **Siskaperbapo Jawa Timur** untuk harga Cabai Rawit Merah.
- **Google News RSS** untuk berita pertanian dan komoditas.
- **WhatsApp Cloud API / Telegram Bot API** untuk notifikasi dan input pencatatan via chat.

## Teknologi Yang Digunakan

| Bagian | Teknologi |
| :--- | :--- |
| Framework | Next.js 16 App Router, React 19 |
| Bahasa | TypeScript strict |
| UI | Material UI 9, MUI Icons, MUI X Charts, Tailwind CSS 4 |
| Styling dan motion | Emotion, Framer Motion, CSS variables |
| Form dan validasi | React Hook Form, Zod |
| Auth dan data | Supabase JS |
| Data fetching client | `lib/api.ts` |
| AI | `@google/generative-ai` |
| Markdown & math rendering | `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `katex` (khusus `ChatMarkdownRenderer`) |
| Dokumen dan export | ExcelJS, jsPDF, jspdf-autotable, file-saver |
| News/scraping | rss-parser, cheerio |
| Testing unit/component | Vitest, Testing Library, jsdom |
| Testing end-to-end | Playwright (`e2e/**`) |
| Deployment | GitHub Actions (`ci-cd.yml`, `playwright.yml`), Vercel CLI, Vercel Cron |

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

- Di development, `AuthProvider` membuat mock user otomatis (mode Tamu) sehingga halaman login akan mengarahkan ke dashboard tanpa perlu login sungguhan.
- Fitur yang membaca/menulis Supabase tetap membutuhkan environment Supabase valid.
- Proteksi route ditangani `proxy.ts` di root project (Next.js 16 mengganti `middleware.ts` konvensional dengan `proxy.ts`).
- Tidak ada lagi backend Express terpisah yang perlu dijalankan — semua API ada di `app/api/**`.

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

Variabel notifikasi opsional:

| Variable | Keterangan |
| :--- | :--- |
| `WHATSAPP_CLOUD_TOKEN` | Token WhatsApp Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID WhatsApp Cloud |
| `WHATSAPP_CLOUD_API_VERSION` | Versi API, default `v19.0` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token verifikasi webhook WhatsApp Cloud API |
| `WHATSAPP_APP_SECRET` | App secret untuk validasi signature webhook WhatsApp |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram |
| `TELEGRAM_API_URL` | Override base URL Telegram API |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token Telegram webhook |
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

# End-to-end test (Playwright) — install browser sekali sebelumnya
npx playwright install --with-deps
npx playwright test
```

> Semua backend legacy (`backend/` dan `server/`) sudah dihapus dari repository. Jika menemukan folder dengan nama serupa di root, folder itu bukan bagian dari alur development — lihat [Status Aplikasi](#status-aplikasi).

## Testing

Test berada di dua lokasi:

**`tests/`** (Vitest + Testing Library) mencakup:

- server logic untuk BMKG, dashboard summary, cron auth, Gemini validator, news, notification schedule, price parser, dan validator schema Zod.
- middleware/`proxy.ts` (proteksi route dashboard dan API).
- component tests untuk primitives design system (`AppDialog`, `ContentState`, `MetricCard`, `ResponsiveDataView`, `StatusBadge`, `MasterDataDialog`), mobile navigation, guide provider, kartu mobile Keuangan (cash flow, financing, comparison), dan halaman cuaca.
- hook tests untuk dashboard summary dan skenario RAB/transaksi.
- script tests untuk CI/CD, bundle summary, dan smoke deploy.

**`e2e/`** (Playwright) mencakup:

- `finance-cashflow-mobile.spec.ts` — smoke test tampilan mobile Arus Kas/Financing/Perbandingan dengan data terisi.
- `reusable-ui-foundation.spec.ts` — smoke test komponen UI reusable.
- `example.spec.ts` — contoh dasar Playwright.

Quality gate penuh (unit/component + lint + typecheck + build):

```bash
npm run ci
```

Quality gate end-to-end (terpisah, dijalankan workflow `playwright.yml`):

```bash
npx playwright test
```

## Deployment

Deployment utama memakai **GitHub Actions + Vercel CLI**, dengan dua workflow terpisah.

### `ci-cd.yml`

Menjalankan pada push/PR ke `main`, `feature/*`, atau `fix/*`:

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

### `playwright.yml`

Menjalankan pada push/PR ke `main`/`master`: install browser Playwright lalu `npx playwright test`, dengan laporan hasil diunggah sebagai artifact `playwright-report`.

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
- Panggilan `/api/notification/schedule` untuk sesi Tamu (mock user) akan mengembalikan `401 Unauthorized` karena token Tamu bukan token Supabase asli — ini perilaku yang diketahui, bukan bug.
- Ringkasan ukuran bundle per halaman bisa dihasilkan ulang dengan `npm run perf:bundles`.

<br>
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/grass.png" width="100%" alt="" />

<p align="center"><em>Copyright (c) 2026 Arina Agri</em></p>
