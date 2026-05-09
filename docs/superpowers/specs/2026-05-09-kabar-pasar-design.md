# Design Spec: Kabar Pasar (News Aggregator)

**Date:** 2026-05-09  
**Status:** Approved  
**Feature:** Agregator Berita Pertanian — "Kabar Pasar"

---

## 1. Overview

Fitur **Kabar Pasar** menambahkan agregator berita pertanian ke platform Arina Agri. Sistem secara otomatis mengambil berita dari RSS feed portal berita terpercaya, menyimpannya ke Supabase, dan menampilkannya di dashboard serta halaman dedikasi.

---

## 2. Arsitektur Sistem

```text
RSS Feeds (Antara / Bisnis.com / BeritaJatim)
        ↓  node-cron (4x sehari: 06:00, 12:00, 18:00, 00:00)
  backend/src/services/newsScheduler.ts
    └── rss-parser: baca XML feed
    └── filter kata kunci agri
    └── UPSERT ke Supabase (service_role_key, bypass RLS)
        ↓
  Supabase: tabel `news_articles`
        ↓  SELECT (anon_key via Next.js Supabase client)
  hooks/useNews.ts
    ├── components/dashboard/NewsWidget.tsx     → /dashboard (widget 3 card)
    └── app/dashboard/kabar-pasar/page.tsx     → halaman penuh
```

---

## 3. Database Schema (Supabase)

Tabel: `news_articles`

| Kolom       | Tipe         | Constraint             | Keterangan                         |
|-------------|--------------|------------------------|------------------------------------|
| id          | uuid         | PK, DEFAULT gen_random_uuid() | ID unik artikel                    |
| title       | text         | NOT NULL               | Judul artikel                      |
| snippet     | text         | NULLABLE               | Ringkasan ≤ 200 karakter           |
| link        | text         | UNIQUE, NOT NULL       | URL asli artikel (cegah duplikasi) |
| source      | text         | NULLABLE               | Nama media (Antara News, dll.)     |
| image_url   | text         | NULLABLE               | URL thumbnail gambar               |
| pub_date    | timestamptz  | NOT NULL               | Tanggal publikasi asli             |
| created_at  | timestamptz  | DEFAULT now()          | Waktu insert ke Supabase           |

**Index:** `idx_news_articles_pub_date ON news_articles(pub_date DESC)`

**SQL:**

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

CREATE INDEX idx_news_articles_pub_date ON public.news_articles(pub_date DESC);
```

---

## 4. Backend (Express.js)

### 4.1 New Files

**`backend/src/services/newsScheduler.ts`**

- Inisialisasi Supabase client dengan `service_role_key`
- RSS feed targets:
  - Antara News (Ekonomi): `https://www.antaranews.com/rss/ekonomi.xml`
  - Bisnis.com: `https://ekonomi.bisnis.com/rss`
  - BeritaJatim: `https://beritajatim.com/feed/`
- Limit per source: 5 artikel terbaru
- Filter kata kunci: `cabai, pupuk, hama, cuaca, panen, pertanian, harga, komoditas, agri, petani, sawah, irigasi`
- UPSERT dengan `onConflict: 'link'` (ignore duplikat)
- Error handling: try-catch per feed (satu feed gagal tidak hentikan yang lain)
- Cleanup job: cron bulanan (`0 2 1 * *`) hapus artikel > 30 hari

**`backend/src/routes/news.ts`**

- `GET /api/news?limit=10&page=1` — proxy opsional, fetch dari Supabase dan return ke frontend
- Response: `{ data: NewsArticle[], total: number, page: number }`


### 4.2 Dependencies Baru

```bash
npm install rss-parser
npm install --save-dev @types/rss-parser
```


### 4.3 Integrasi ke `server.ts`

- Import `startNewsScheduler` dari `newsScheduler.ts`, panggil di startup
- Mount route: `app.use('/api/news', newsRoutes)`


### 4.4 Cron Schedule

- Fetch berita: `0 6,12,18,0 * * *` (4x sehari)
- Cleanup: `0 2 1 * *` (tanggal 1 setiap bulan, jam 02:00)

---

## 5. Frontend (Next.js + MUI)

### 5.1 Types

**`lib/types/news.ts`**

110: ```typescript
export interface NewsArticle {
  id: string;
  title: string;
  snippet: string | null;
  link: string;
  source: string | null;
  image_url: string | null;
  pub_date: string;
  created_at: string;
}
```

### 5.2 Custom Hook

**`hooks/useNews.ts`**

- Parameter: `{ limit?: number; page?: number }`
- Fetch Supabase: `select('*').order('pub_date', { ascending: false }).range(from, to)`
- Return: `{ articles, total, isLoading, error, refetch }`
- Fallback: jika Supabase kosong/error, return mock data (3 artikel statis) agar dashboard tidak blank

### 5.3 Komponen Baru

**`components/news/NewsCard.tsx`**

- Props: `article: NewsArticle`, `variant: 'widget' | 'full'`
- `variant='widget'`: thumbnail kiri (80×80px), judul 2 baris, snippet 2 baris, chip sumber + tanggal, tombol CTA kecil
- `variant='full'`: thumbnail full-width atas (16:9), judul 3 baris, snippet 3 baris, chip sumber + tanggal bawah, tombol CTA full-width
- Tombol CTA: `<a href={link} target="_blank" rel="noopener noreferrer">Baca Selengkapnya di Sumber</a>`
- Fallback image: placeholder hijau dengan icon `NewspaperIcon` jika `image_url` null/broken

**`components/dashboard/NewsWidget.tsx`**

- Fetch 3 artikel terbaru via `useNews({ limit: 3 })`
- Header: `"Kabar Pasar 📰"` + button `"Lihat Semua →"` navigate ke `/dashboard/kabar-pasar`
- Layout: MUI Grid, 3 kolom (md) → 1 (xs)
- Loading: 3 MUI Skeleton card
- Empty state: ilustrasi + teks "Belum ada berita tersedia"

### 5.4 Halaman Penuh

**`app/dashboard/kabar-pasar/page.tsx`**

- Fetch dengan `useNews({ limit: 10, page })`
- Header: judul "Kabar Pasar" + subtitle "Berita & informasi harga komoditas pertanian terkini"
- Grid: 3 kolom (lg) → 2 (md) → 1 (xs)
- Setiap card: `<NewsCard variant='full' />`
- Pagination: MUI `Pagination` di bawah, centered
- Loading: skeleton grid 6 item

### 5.5 Perubahan Existing Files

**`components/shared/Sidebar.tsx`**

- Tambah item: `{ key: 'kabarPasar', icon: <NewspaperIcon />, path: '/dashboard/kabar-pasar' }`
- Import: `NewspaperIcon from '@mui/icons-material/Newspaper'`

**`app/dashboard/page.tsx`**

- Import & tambahkan `<NewsWidget />` setelah `<RecentTransactionsTable />`

**`messages/id.json`**

- Tambah key `Sidebar.kabarPasar: "Kabar Pasar"`
- Tambah key `MobileNav.kabarPasar: "Kabar Pasar"`
- Tambah section `News: { title, subtitle, readMore, emptyState, loadingText }`

---

## 6. Security & Error Handling

- **Backend**: gunakan `SUPABASE_SERVICE_ROLE_KEY` untuk insert (bypass RLS)
- **Frontend**: gunakan `NEXT_PUBLIC_SUPABASE_ANON_KEY` untuk read-only select
- **RLS Policy**: pastikan `news_articles` bisa di-read oleh `anon` role (SELECT public)
- **RSS Error**: setiap feed di-wrap `try-catch` terpisah — satu feed timeout tidak blokir yang lain
- **Image broken**: frontend gunakan `onError` pada `<img>` untuk fallback placeholder
- **Fair Use**: snippet dibatasi ≤ 200 karakter, tidak tampilkan full content

---

## 7. Mock Data (Fallback)

Saat Supabase belum berisi data (sebelum cron pertama jalan), `useNews` return 3 artikel mock:

```typescript
const MOCK_NEWS: NewsArticle[] = [
  {
    id: 'mock-1',
    title: 'Harga Cabai Rawit di Pasar Induk Meningkat 15% Menjelang Akhir Bulan',
    snippet: 'Harga cabai rawit merah di sejumlah pasar induk mengalami kenaikan signifikan...',
    link: '#',
    source: 'Antara News',
    image_url: null,
    pub_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  // ... 2 lainnya
];
```

---

## 8. File Index (semua file yang dibuat/diubah)


### Dibuat Baru

| File | Keterangan |
| --- | --- |
| `backend/src/services/newsScheduler.ts` | Cron job RSS fetcher |
| `backend/src/routes/news.ts` | REST endpoint proxy |
| `lib/types/news.ts` | TypeScript interface |
| `hooks/useNews.ts` | Custom hook Supabase fetch |
| `components/news/NewsCard.tsx` | Card reusable (widget + full) |
| `components/dashboard/NewsWidget.tsx` | Widget 3 card di dashboard |
| `app/dashboard/kabar-pasar/page.tsx` | Halaman penuh berita |


### Diubah

| File | Perubahan |
| --- | --- |
| `backend/src/server.ts` | Mount news route + startNewsScheduler |
| `components/shared/Sidebar.tsx` | Tambah nav item Kabar Pasar |
| `app/dashboard/page.tsx` | Tambah NewsWidget di bawah |
| `messages/id.json` | Tambah key translasi |
