# Design Spec: Usage Analytics Dashboard

**Tanggal:** 2026-07-30
**Status:** User-approved design
**Scope:** Instrumentasi event pemakaian di app utama Arina Agri, plus dashboard analytics internal yang berjalan sebagai aplikasi terpisah.

---

## Latar Belakang

Saat ini tidak ada mekanisme apa pun untuk memantau pertumbuhan pengguna atau tren pemakaian tiap fitur di aplikasi Arina Agri (tidak ada event tracking, tidak ada tabel log, tidak ada tool analytics pihak ketiga). Tim internal butuh visibilitas terhadap:

- Pertumbuhan basis pengguna (growth & retensi)
- Fitur mana yang paling/paling tidak dipakai dan bagaimana trennya dari waktu ke waktu

Karena aplikasi sudah punya struktur Controller/View yang tegas (lihat `AGENTS.md`), instrumentasi dirancang agar menempel di layer Controller/server yang sudah ada, bukan di komponen View.

Keputusan produk utama:

- Dibangun sendiri (custom event log di Supabase), tidak memakai tool pihak ketiga.
- v1 hanya mencakup 4 fitur inti: **Keuangan, Stok, Kalender, AI Chat**. Fitur lain (Cuaca, Kabar Pasar, Ensiklopedia, Feedback, Pengaturan) menyusul di iterasi berikutnya.
- Granularitas event: page view + aksi kunci (bukan page view saja, bukan semua klik).
- Metrik dihitung on-demand (query langsung saat dashboard dibuka), tanpa rollup harian terjadwal di v1.
- Dashboard analytics dibangun sebagai **aplikasi Next.js terpisah** di repo baru `D:\Arina Agri\arina-agri-analytics`, bukan bagian dari repo `arina-agri`. Kedua aplikasi terhubung ke **Supabase project yang sama**.

---

## Pembagian Tanggung Jawab Antar Repo

### Repo `arina-agri` (existing) — sisi pencatatan

Event terjadi di app utama, jadi instrumentasi dan schema data tetap di sini:

- Migration SQL untuk tabel `usage_events` dan kolom `profiles.is_admin`.
- Util `lib/analytics/trackPageView.ts` (client) dan `lib/analytics/recordEvent.ts` (server).
- Endpoint `POST /api/analytics/events` untuk mencatat page view.
- Pemanggilan instrumentasi di controller/modul server 4 fitur inti.

### Repo `arina-agri-analytics` (baru) — sisi baca & tampilan

- Aplikasi Next.js baru, berdiri sendiri: git repo sendiri, `package.json` sendiri, deployment sendiri.
- Terhubung ke Supabase project yang sama via env var (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- Login sendiri lewat Supabase Auth (akun sama dengan app utama), lalu memverifikasi `profiles.is_admin` sebelum menampilkan dashboard.
- Semua query ke `usage_events` dan `profiles` dilakukan di server route/server component memakai `SUPABASE_SERVICE_ROLE_KEY` (secret khusus deployment repo ini), tidak pernah dari browser.

---

## Data Model

### Tabel baru: `usage_events`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid, pk, default `gen_random_uuid()` | |
| `user_id` | uuid, references `profiles.id`, nullable | |
| `feature` | text | `'keuangan' \| 'stok' \| 'kalender' \| 'ai_chat'` |
| `event_type` | text | `'page_view' \| 'action'` |
| `event_name` | text | mis. `'page_view'`, `'transaction_created'`, `'stock_entry_created'`, `'calendar_event_created'`, `'chat_message_sent'` |
| `metadata` | jsonb, nullable | detail ringan non-sensitif, mis. `{"amount_bucket": "small"}` |
| `created_at` | timestamptz, default `now()` | |

Index: `(feature, created_at)`, `(user_id, created_at)`, `(event_name, created_at)`.

### Kolom baru di `profiles`

- `is_admin boolean not null default false` — allowlist admin, diubah manual lewat SQL/Supabase dashboard (tidak ada UI untuk toggle ini di v1).

---

## Instrumentasi (Repo `arina-agri`)

### Page view (client-side)

- `lib/analytics/trackPageView.ts` mengekspos fungsi `trackPageView(feature: Feature)` yang melakukan `POST /api/analytics/events` dengan `event_type: 'page_view'`, `event_name: 'page_view'`.
- Dipanggil sekali di `useEffect` pada mount di masing-masing controller: `useKeuanganController`, `useStokController`, `useKalenderController`, controller AI chat yang relevan.
- Fire-and-forget: gagal kirim tidak memengaruhi UI, tidak ada retry, tidak ada loading state terkait tracking.

### Aksi kunci (server-side)

- `lib/analytics/recordEvent.ts` mengekspos fungsi `recordEvent({ userId, feature, eventName, metadata })` yang insert ke `usage_events` lewat Supabase admin client.
- Dipanggil tepat setelah mutasi utama sukses di modul server yang sudah ada (bukan di View):
  - Keuangan: setelah transaksi berhasil dibuat → `event_name: 'transaction_created'`
  - Stok: setelah entri stok berhasil dibuat → `event_name: 'stock_entry_created'`
  - Kalender: setelah jadwal berhasil dibuat → `event_name: 'calendar_event_created'`
  - AI Chat: setelah pesan berhasil dikirim/diproses → `event_name: 'chat_message_sent'`
- `recordEvent` dibungkus try/catch internal — kegagalan insert event di-log ke console server, **tidak pernah** melempar error ke pemanggil atau membatalkan transaksi utama.

### Endpoint `/api/analytics/events`

- Menerima `POST` dari client untuk page view.
- Memverifikasi user via `resolveRequestUserId` (util yang sudah ada di `lib/server/auth/requestUser.ts`).
- Insert satu baris ke `usage_events`, balas `204 No Content`.
- Tidak ada logika bisnis lain di endpoint ini.

---

## Metrik Dashboard (Repo `arina-agri-analytics`)

### Growth & Retensi Pengguna

- Total pengguna terdaftar (all-time), dari `auth.users` lewat Supabase Admin API (`auth.admin.listUsers`) — **bukan** dari tabel `profiles`. `profiles` baru terisi lazy saat user menyimpan sesuatu di halaman Pengaturan app utama, jadi tidak mencerminkan seluruh user terdaftar dan tidak selalu punya kolom `created_at`. Koreksi ini ditemukan setelah implementasi awal sempat memakai `profiles` dan gagal dengan error `column profiles.created_at does not exist` di lingkungan production.
- Pengguna baru per hari/minggu/bulan dalam rentang filter, dari `auth.users.created_at` (sumber yang sama seperti di atas).
- DAU / WAU / MAU: jumlah distinct `user_id` di `usage_events` dalam jendela 1 hari / 7 hari / 30 hari terakhir dari tanggal referensi.
- Retensi week-over-week: % user yang aktif minggu ini yang juga aktif minggu sebelumnya.
- Stickiness ratio: DAU rata-rata periode dibagi MAU periode yang sama.

### Adopsi & Tren per Fitur (4 fitur inti)

- Page view per fitur per hari dalam rentang filter (untuk tren chart).
- Unique users per fitur per periode, dan persentasenya terhadap total user aktif periode tsb (adoption reach).
- Jumlah aksi kunci per fitur per periode.
- Perbandingan antar fitur: share % dari total page view semua fitur, dan % perubahan dibanding periode sebelumnya yang sama panjang.

Semua metrik dihitung on-demand lewat query Supabase saat dashboard dibuka/filter tanggal berubah, tidak ada tabel rollup terpisah di v1.

---

## UI Dashboard

Satu halaman utama di repo baru, dengan struktur:

1. **Header**: judul dashboard + filter rentang tanggal (opsi: 7 hari, 30 hari, 90 hari, custom range).
2. **Baris KPI**: Total User, User Baru (periode terpilih), DAU, WAU, MAU, Retensi WoW — masing-masing sebagai kartu angka.
3. **Chart tren growth**: line chart harian untuk user baru dan user aktif, sepanjang rentang filter.
4. **Chart tren pemakaian fitur**: multi-line atau stacked area chart, page view per fitur per hari.
5. **Tabel breakdown per fitur**: kolom nama fitur, page views, unique users, jumlah aksi kunci, % perubahan vs periode sebelumnya (dengan indikator naik/turun).

Semua chart memakai `@mui/x-charts` untuk konsistensi dengan library yang sudah dipakai di ekosistem project ini.

### Autentikasi & Akses

- Halaman login sendiri di repo baru, memakai Supabase Auth (akun sama dengan app utama).
- Setelah login, server component/route memverifikasi `profiles.is_admin`. Jika `false` atau tidak ditemukan, redirect ke halaman "akses ditolak" tanpa menampilkan data apa pun.

---

## Error Handling

- Insert event gagal (baik dari endpoint page view maupun `recordEvent`) → di-log, tidak melempar error, tidak membatalkan aksi utama user.
- Dashboard tanpa data pada periode terpilih → setiap chart/tabel menampilkan empty state, bukan crash atau angka kosong yang membingungkan.
- User non-admin mengakses dashboard langsung via URL → redirect ke halaman akses ditolak.
- Kegagalan koneksi Supabase dari repo analytics → tampilkan pesan error umum di level halaman, dengan opsi retry manual (reload).

---

## Testing

### Repo `arina-agri`

- `trackPageView` dan `recordEvent`: unit test memastikan keduanya fire-and-forget dan tidak melempar error saat request/insert gagal (mis. network mock gagal, Supabase mock gagal).
- Endpoint `/api/analytics/events`: test untuk kasus user terautentikasi (insert sukses, balas 204) dan tidak terautentikasi (401, tidak insert).
- Test integrasi ringan di masing-masing modul server 4 fitur inti: memastikan `recordEvent` terpanggil dengan `event_name` yang benar setelah mutasi sukses, dan mutasi tetap sukses walau `recordEvent` di-mock gagal.

### Repo `arina-agri-analytics`

- Test fungsi agregasi metrik (growth, DAU/WAU/MAU, retensi, breakdown fitur) dengan data dummy `usage_events`, mencakup kasus data kosong.
- Test guard akses: user tanpa `is_admin` diarahkan ke halaman akses ditolak; user dengan `is_admin` bisa melihat dashboard.
- Test komponen dashboard untuk state loading, empty, dan error pada chart/tabel.
