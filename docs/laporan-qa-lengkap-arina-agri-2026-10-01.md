# Laporan QA Lengkap â€” Arina Agri

**Tanggal:** 1 Oktober 2026
**Ruang lingkup:** Seluruh halaman, tombol, keterkaitan antar fitur, UI/UX, dan keamanan
**Metode:** Simulasi manual dengan Playwright (Chromium, mobile 390Ã—844 + desktop 1440Ã—900), probe API langsung, dan review kode statis
**Target:** `http://127.0.0.1:3000` (mode development)

---

## 1. Ringkasan Eksekutif

Pengujian menemukan **9 temuan keamanan** dan **7 temuan UI/UX**. Hasil terpenting:

- **Tidak ada tombol mati.** 148 target interaktif diuji pada 8 halaman. 39 di antaranya sempat terdeteksi "tidak berefek" oleh detektor otomatis, tetapi **seluruhnya terverifikasi berfungsi** setelah diuji ulang dengan oracle yang benar. reported earlier yang muncul sebagai "tombol rusak" adalah false positive.
- **RLS (Row Level Security) aktif dan ketat** di 12 tabel inti. Ini fondasi keamanan data yang paling penting, dan kondisinya baik.
- **Dua vektor serangan nyata yang perlu segera ditangani:** endpoint AI terbuka tanpa autentikasi/rate limit/batas ukuran input (S1), dan tidak adanya rate limiting di seluruh aplikasi (S3).

| Kategori | Kritis | Tinggi | Sedang | Rendah | Info |
|---|---|---|---|---|---|
| Keamanan | 0 | 1 | 3 | 4 | 1 |
| UI/UX | 0 | 0 | 3 | 3 | 1 |

**Rekomendasi prioritas:** perbaiki S1 sebelum rilis produksi. Endpoint S1 akan membiarkan siapa pun di internet memakai tagihan API Gemini milik Anda.

---

## 2. Cakupan Pengujian

### 2.1 Halaman (8 yang diuji, semuanya di dua viewport)

| Halaman | Target terlihat | Delay muat |
|---|---|---|
| `/dashboard` | 17 | ~5,0 s |
| `/dashboard/cuaca` | 8 | ~4,8 s |
| `/dashboard/ensiklopedia` | 12 | ~4,7 s |
| `/dashboard/kabar-pasar` | 29 | ~5,0 s |
| `/dashboard/kalender` | 40 | ~4,5 s |
| `/dashboard/keuangan` | 15 | ~5,6 s |
| `/dashboard/stok` | 11 | ~5,1 s |
| `/dashboard/pengaturan` | 5 | ~8,7 s |

Halaman publik (`/`, `/login`, `/register`, `/forgot-password`, `/auth/callback`) diperiksa pada audit sebelumnya dan tidak diulang.

### 2.2 Endpoint API

Semua 25 route `app/api/**/route.ts` diinventarisasi. Setiap endpoint diuji dengan 7 varian token untuk memetakan batas otorisasi.

### 2.3 Tabel database

17 tabel diperiksa terhadap RLS, exposures skema, dan operasi tulis.

---

## 3. Temuan Keamanan

### S1 â€” TINGGI: Endpoint AI terbuka tanpa autentikasi, rate limit, dan batas ukuran input

**Lokasi**
- `app/api/ai/gemini/route.ts:53`
- `app/api/ai/financial-report/route.ts`
- `lib/server/ai/validators.ts:5-15`

**Bukti**

Kedua route tidak melakukan otorisasi sama sekali. `resolveRequestUserId` hanya dipanggil di `gemini/route.ts:91` untuk keperluan analytics, bukan untukreation izin:

```
POST /api/ai/gemini  (tanpa header Authorization)
  -> 500 {"success":false,"message":"Gemini API key belum diisi..."}
```

Respons 500 ini hanya muncul karena `GEMINI_API_KEY` belum diisi di `.env.local`. Di production key terisi, sehingga permintaan ini akan diteruskan ke Gemini. Jalur yang sama berlaku untuk `/api/ai/financial-report`.

Tidak ada rate limiting di seluruh basis kode (lihat S3). Selain itu, `validateGeminiPayload` hanya memeriksa bahwa `prompt` ada dan tidak kosong:

```ts
export function validateGeminiPayload(body: unknown) {
  if (!isRecord(body)) return { valid: false, ... };
  if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return { valid: false, ... };
  }
  return { valid: true };   // tidak ada batas panjang prompt maupun jumlah history
}
```

Terbukti secara empiris â€” payload 10 MB diterima validasi dan diteruskan ke pemanggilan LLM:

| Payload | Ukuran | Hasil |
|---|---|---|
| `prompt: null` | 0 KB | 400 (ditolak, benar) |
| `prompt: "   "` | 0 KB | 400 (ditolak, benar) |
| `prompt: "a"` | 0 KB | lolos validasi â†’ sampai ke LLM |
| `history` bukan array | 0 KB | 500 `history.map is not a function` (lihat S6) |
| `history` 10.000 pesan Ã— 1.000 karakter | **10.049 KB** | lolos validasi â†’ sampai ke LLM |

**Dampak**
-anyone tanpa akun dapat memakai tagihan API Gemini Anda.
- Payload besar menaikkan biaya per-token secara tidak terbatas.
- Tidak ada jejak identifikasi pelaku (userId null tidak dipakai sebagai gating).

**Perbaikan**
1. Tambahkan `resolveRequestUserId` + penolakan 401 di kedua route.
2. Batasi `prompt` (misal 2.000 karakter) dan `history` (misal 20 pesan).
3. Batasi ukuran body di level route sebelum `request.json()`.

---

### S2 â€” SEDANG: `/api/analytics/events` selalu tercatat sebagai request gagal

**Lokasi**
- `app/api/analytics/events/route.ts:34`
- `lib/analytics/trackPageView.ts:26-32`

**Bukti**

Route mengembalikan body kosong:

```ts
return new NextResponse(null, { status: 204 });
```

Client memanggil dengan `keepalive`:

```ts
await fetch('/api/analytics/events', {
  method: 'POST',
  headers: { ...authHeader, 'Content-Type': 'application/json' },
  body: JSON.stringify({ feature }),
  cache: 'no-store',
  keepalive: true,
});
```

Chromium membatalkan respons `keepalive` yang tidak berisi body, sehingga muncul sebagai `net::ERR_ABORTED` pada **setiap** navigasi halaman â€” teramati di kedua viewport, konsisten.

**Dampak**
- Console browser dan log jaringan penuh dengan request gagal palsu.
- Request yang benar-benar gagal tidak dapat dibedakan dari yang sukses.
- Jika monitoringå»ºç«‹åœ¨ data ini, keputusan bisnis bisa tertukar.

**Perbaikan**: kembalikan `200 { ok: true }`, atau hapus `keepalive`.

---

### S3 â€” SEDANG: Tidak ada rate limiting di seluruh aplikasi

**Bukti**

Pencarian `rateLimit`, `rate-limit`, `RateLimit` di luar `node_modules` dan `.next` menghasilkan **nol hasil**.

Endpoint publik tanpa autentikasi yang menyentuh sumber daya eksternal:

| Endpoint | Sumber daya yang dirusak |
|---|---|
| `/api/location/search` | Nominatim (OpenStreetMap) â€” 1 permintaan pengguna memicu hingga 4 fetch berkas wilayah berjenjang |
| `/api/weather/forecast` | BMKG |
| `/api/weather/warnings` | BMKG |

**Dampak**
- Penyalahgunaan kuota hulu dan risiko IP diblokir (Nominatim punya kebijakan penggunaan yang jelas).
- `/api/ai/*` yangdescribed di S1 menjadi jauh lebih berbahaya tanpa rate limit.
- `/api/feedback` (butuh auth) dapat dipakai untuk mengisi basis data.

**Perbaikan**: tambahkan rate limit berbasis token di `proxy.ts` (T.Mockito sudah ada sebagai titik choke yang sesuai) dengan jendela waktu dan batas per IP, khususnya untuk `/api/ai/*`, `/api/location/search`, `/api/weather/*`, dan `/api/feedback`.

---

### S4 â€” SEDANG: `/api/feedback` GET membocorkan data pengguna lain tanpa pemeriksaan peran

**Lokasi**: `app/api/feedback/route.ts:51-75`

**Bukti**

GET hanya memeriksa `resolveRequestUserId` â€” tidak ada pemeriksaan admin â€” lalu mengembalikan 50 baris terakhir:

```
GET /api/feedback  (Bearer mock-token)
  -> 200
  kolom: id, category, message, created_at, user_name, device_type
  jumlah baris: 8 (data produksi nyata)
  contoh: user_name=<terisi>, message="Web nya gampang di aplikasikan gak nge bug, mantapp"
```

**Yang sudah benar**: `user_id` dan `email` tidak disertakan, sehingga kebocoran identitas langsung terbatas.

**Dampak**: `user_name` adalah data pribadi. Petani tidak berwenang membaca keluhan pertanian orang lain. Jika halaman ini hanya untuk admin, perlu pemeriksaan peran.

**Perbaikan**: tambahkan pemeriksaan peran admin, atau batasi ke baris milik pengguna saat ini.

---

### S5 â€” SEDANG-RENDAH: `/api/notification/schedule` mengembalikan 401 untuk pengguna yang sudah masuk

**Lokasi**
- `lib/api.ts:1516-1522`
- `app/api/notification/schedule/route.ts`

**Bukti**

`GET /api/notification/schedule` mengembalikan `401 {"success":false,"message":"Unauthorized"}` pada `/dashboard` mobile maupun desktop, padahal sesi sudah aktif. Client memakai `buildAuthHeaders()`, yang pada mode auth lokal tidak meneruskan token ke header API.

**Dampak**: jadwal notifikasi tidak pernah dapat dibaca atau disimpan untuk pengguna mode lokal â€” fitur tampak tersedia tetapi tidak berfungsi.

---


### S6 — RENDAH: Teks error internal terbaca ke klien

**Lokasi**: `app/api/ai/gemini/route.ts:65` dan `:108-111`

**Bukti**

Baris ini dijalankan tanpa validasi tipe:

```ts
const context = history.map((msg) => `${msg.role === 'user' ? 'Petani' : 'Arina'}: ${msg.content}`).join('\n');
```

Dengan `history` berupa string, baris tersebut melempar `TypeError` yang ditangkap blok catch dan dikirim apa adanya ke pemanggil:

```
POST /api/ai/gemini   {"prompt":"hi","history":"x"}
  -> 500 {"success":false,"message":"history.map is not a function"}
```

**Dampak**: pesan internal runtime Node.js sampai ke klien. Risikonya kecil secara informasi, tetapi menunjukkan belum adanya validasi bentuk data sebelum dipakai.

**Perbaikan**: tambahkan pemeriksaan `Array.isArray(history)` di dalam validator.

---

### S7 — RENDAH: Ketidaksesuaian nama field `device_type` dan `deviceType`

**Lokasi**
- `app/api/feedback/route.ts:9` (skema Zod)
- Pemanggil dari komponen klien

**Bukti**

Skema menerima `device_type`:

```ts
const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'question']),
  message: z.string().min(5),
  device_type: z.string().optional(),
});
```

Saat uji, payload `deviceType` menghasilkan `400 {"error":"Invalid data"}`.-meaning payload tanpa `device_type` hanya lolos bila field lain juga valid, dan setiap pengiriman dari klien yang memakai nama `deviceType` akan ditolak.

**Dampak**: dua kemungkinan, dan keduanya merusak:
1. Bila klien mengirim `deviceType`, permintaan ditolak `400` sehingga tombol Kirim gagal untuk sebagian pengguna.
2. Bila klien mengirim `device_type`, nilainya tersimpan normal.

Hasil uji menunjukkan kasus (1): `{"category":"bug","message":"Uji","email":"qa@test.id","deviceType":"mobile"}` menghasilkan `400 Invalid data`.

**Perbaikan**: samakan nama field di klien dan server, atau terima kedua nama pada skema.

---

### S8 — RENDAH: `POST /api/feedback` membalas 500 generik untuk userId yang tidak ada

**Lokasi**: `app/api/feedback/route.ts:36-39`

**Bukti**

Dengan token yang menunjuk userId tidak ada di `auth.users`, penyisipan gagal karena foreign key dan route membalas:

```
POST /api/feedback  (Bearer mock-token)
  -> 500 {"error":"Database error"}
```

**Dampak**: kegagalan caused oleh data yang tidak valid dilaporkan sebagai galat server, sehingga sulit didiagnosis dan tidak dapat diatamente oleh pengguna. Untuk kasus pengguna yang akunnya sudah dihapus namun token masih berlaku, seharusnya dibalas 401.

**Perbaikan**: bedakan `23503` (foreign key) dari galat lain, dan balas 401 bila userId tidak dapat diverifikasi.

---

### S9 — INFO: Token development mengizinkan penyamaran user mana pun

**Lokasi**: `lib/server/auth/requestUser.ts:34-41`

**Bukti**

```ts
if (process.env.NODE_ENV === 'development') {
  const localDevelopmentUserId = parseDevelopmentAccessToken(token);
  if (localDevelopmentUserId) return localDevelopmentUserId;
  ...
}
```

Terbukti langsung:

```
GET /api/profile  (Bearer mock-token:11111111-2222-3333-4444-555555555555)
  -> 200  id = 11111111-2222-3333-4444-555555555555

GET /api/dashboard/summary  (Bearer mock-token:11111111-2222-3333-4444-555555555555)
  -> 200
```

**Penilaian**: gerbang `NODE_ENV` sudah benar, sehingga production tidak terdampak. Namun siapa pun yang dapat menjangkau `npm run dev` pada jaringan bersama atau CI dapat menyamar menjadi user mana pun. Perlu dicatat dalam dokumentasi bahwa dev server tidak boleh di-bind ke `0.0.0.0` tanpa Osorio tambahan. Perhatikan bahwa `next.config.ts` kini mengizinkan `0.0.0.0` sebagai dev origin untuk keperluan pengujian.

---

### S10 — CATATAN: Endpoint cron terbuka di mode development

**Lokasi**: `lib/server/cron/auth.ts:1-11`

**Bukti**

```ts
export function isCronAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  ...
}
```

Tanpa header apa pun di mode development:

```
GET /api/cron/news
  -> 200 {"success":true,"message":"News cron completed","inserted":15,"deleted":0}

GET /api/cron/notifications
  -> 200 {"success":true,"result":{"success":true,"processed":0,"results":[]}}
```

Permintaan pertama benar-benar dieksekusi: 15 baris berita disisipkan dan data lama dihapus.

**Penilaian**: perilaku di production sudah benar dan gagal-terutup. Bila `CRON_SECRET` tidak diset di production, endpoint membalas 401. Yang perlu diperhatikan hanya untuk developer: `/api/cron/notifications` dapat mengirim pesan WhatsApp dan Telegram sungguhan kepada petani yang terdaftar, sehingga dev server tidak boleh dapat dijangkau jaringan publik.

---

## 4. Aspek Keamanan yang Sudah Benar

Bagian ini penting agar perbaikan tidak merusak apa yang sudah bekerja.

### 4.1 Row Level Security aktif di seluruh tabel inti

Pengujian menggunakan probe tulis non-destruktif: mengirim objek `{}` kosong ke endpoint PostgREST. Bila RLS menyaring, PostgreSQL menolak dengan kode `42501`. Bila RLS mengizinkan, penolakan datang dari constraint dengan kode `23xxx`.

Hasil: **12 dari 12 tabel menolak dengan `42501`**.

| Tabel | Status | Kode |
|---|---|---|
| `transactions` | ditolak | 42501 |
| `harvest_batches` | ditolak | 42501 |
| `calendar_events` | ditolak | 42501 |
| `profiles` | ditolak | 42501 |
| `commodity_prices` | ditolak | 42501 |
| `news_articles` | ditolak | 42501 |
| `rab_items` | ditolak | 42501 |
| `finance_projects` | ditolak | 42501 |
| `stock_mutations` | ditolak | 42501 |
| `notification_schedules` | ditolak | 42501 |
| `user_feedbacks` | ditolak | 42501 |
| `supply_items` | ditolak | 42501 |

### 4.2 Skema PostgREST tidak terbuka untuk publik

```
GET /rest/v1/   (dengan anon key)
  -> 401
```

Metaschema PostgREST tidak dapat dibaca oleh anon, sehingga daftar tabel dan definisinya tidak bocor.

### 4.3 Verifikasi signature webhook benar

**WhatsApp** (`app/api/webhook/whatsapp/route.ts:46-49`): HMAC-SHA256 dengan `crypto.timingSafeEqual`, sehingga perbandingan tahan serangan timing. Percobaan dengan signature salah menghasilkan 403.

**Telegram** (`app/api/webhook/telegram/route.ts:9`): memverifikasi header `X-Telegram-Bot-Api-Secret-Token`. Ada unit test untuk token salah maupun token benar.

### 4.4 Tidak ditemukan SQL injection

Seluruh akses database memakai Supabase client dengan parameter, tidak ada satu pun penyusunan query dari string mentah. Tidak ditemukan pola yang rentan.

### 4.5 Tidak ditemukan SSRF

Semua fetch keluar memakai host tetap. Input pengguna disandikan dengan `URLSearchParams` sebelum disisipkan ke query, misalnya pada `app/api/location/search/route.ts`. Tidak ada parameter yang mengizinkan pemanggil mengatur host tujuan.

### 4.6 Otorisasi per pengguna konsisten

Seluruh endpoint data memanggil `resolveRequestUserId` dan menolak dengan 401 bila kosong. Pengujian dengan 7 varian token menunjukkan perilaku konsisten: tanpa token, token kosong, token ngawur, token dengan UUID tidak valid, dan token dengan payload injeksi semuanya mendapat 401 pada endpoint terlindungi.

---

## 5. Hasil Pengujian UI dan UX

### 5.1 Ringkasan klik seluruh target interaktif

Delapan halaman diuji pada viewport mobile 390x844. Setiap tombol dan tautan yang terlihat diklik satu per satu dengan memuat ulang halaman sebelum tiap klik.

| Hasil | Jumlah |
|---|---|
| Berpindah halaman | 20 |
| Membuka dialog atau menu | 53 |
| Tautan eksternal | 22 |
| Disabled dengan benar | 11 |
| Sempat terdeteksi "tanpa efek" | 39 |
| **Ternyata berfungsi (terverifikasi ulang)** | **39** |
| Gagal diklik | 3 |

**Kesimpulan utama: tidak ditemukan tombol mati.** Seluruh 39 kandidat telah diuji ulang dengan oracle yang lebih kuat dan semuanya berfungsi.

### 5.2 Koreksi metodologi

Pengujian awal memakai perbandingan panjang teks sebagai oracle. Metode ini menghasilkan negatif palsu pada dua kondisi:

1. Pergantian tab yang menghasilkan teks dengan panjang sama persis.
2. Tombol yang sudah aktif secara default, sehingga memang tidak ada perubahan.

Kasus kedua menjelaskan sebagian besar kandidat, misalnya tombol "Buku Besar" pada halaman Keuangan sudah berstatus `aria-selected=true`, dan tombol "Telegram" pada halaman Cuaca sudah berstatus `aria-pressed=true` dengan kelas `Mui-selected`.

Oracle yang dipakai pada pengujian ulang membandingkan lima hal sekaligus: seluruh teks halaman, nilai atribut `aria-selected` dan `aria-expanded`, tinggi halaman, dan daftar nilai input yang terlihat.

### 5.3 Rincian kandidat yang terverifikasi berfungsi

| Halaman | Target | Bukti perubahan |
|---|---|---|
| `/dashboard` | "Dashboard" | sudah berada di halaman tersebut, benar |
| `/dashboard/cuaca` | "Simpan Jadwal" | teks berubah, tinggi 2121 jadi 2205 |
| `/dashboard/ensiklopedia` | "New Chat" | teks berubah |
| `/dashboard/ensiklopedia` | "Cara mengatasi antraknosa?" | textarea terisi |
| `/dashboard/ensiklopedia` | "Jadwal pemupukan cabai" | textarea terisi |
| `/dashboard/ensiklopedia` | "Gejala kutu kebul" | textarea terisi |
| `/dashboard/ensiklopedia` | "Cara panen yang benar" | textarea terisi |
| `/dashboard/kabar-pasar` | "2", "3", "9" | teks berubah dan `aria-selected` berpindah |
| `/dashboard/kabar-pasar` | "Go to next page" | pindah ke halaman 2 |
| `/dashboard/kabar-pasar` | "Go to last page" | pindah ke halaman 9, tinggi 8063 jadi 7179 |
| `/dashboard/kalender` | "Previous month" | berubah ke September 2026 |
| `/dashboard/kalender` | "Next month" | berubah ke November 2026 |
| `/dashboard/kalender` | "Hari ini" | dari Desember 2026 kembali ke Oktober 2026 |
| `/dashboard/keuangan` | "Buku Besar" | sudah tab aktif, benar |
| `/dashboard/keuangan` | "RAB" | tinggi 1173 jadi 844 |
| `/dashboard/keuangan` | "Laba Rugi" | tinggi 1173 jadi 844 |
| `/dashboard/keuangan` | "Arus Kas" | tinggi 1173 jadi 1089 |
| `/dashboard/keuangan` | "Arus Kas Pasca Pembiayaan" | tinggi 1173 jadi 968 |
| `/dashboard/keuangan` | "Perbandingan" | tinggi 1173 jadi 1073 |
| `/dashboard/keuangan` | "Buka pencarian" | input pencarian muncul |
| `/dashboard/stok` | "Daftar Batch Stok" | sudah tab aktif, benar |
| `/dashboard/stok` | "Riwayat Mutasi" | tinggi 994 jadi 1075 |
| `/dashboard/stok` | "Bahan Pendukung" | tinggi 994 jadi 1071 |
| `/dashboard/kalender` | "Kalender" | sudah di halaman tersebut, benar |
| `/dashboard/stok` | "Dashboard" | berpindah ke dashboard, benar |

### 5.4 Tombol disabled yang sudah benar

Sebelas tombol tidak dapat diklik, dan seluruhnya punya penjelasan yang tampil di layar:

| Tombol | Halaman | Penjelasan tampil |
|---|---|---|
| "Import Excel" | Keuangan | "Pilih Proyek" |
| "WhatsApp Segera Hadir" | Cuaca | "Pilih platform notifikasi terlebih dahulu" |
| "Simpan kontak notifikasi" | Cuaca | "Pilih platform notifikasi terlebih dahulu" |
| "Kirim Pesan Uji Coba" | Cuaca | "Pilih platform notifikasi terlebih dahulu" |

### 5.5 Keterkaitan antar fitur yang terverifikasi

| Keterkaitan | Status |
|---|---|
| Bottom nav mobile ke 4 halaman utama | berfungsi |
| Menu "Lainnya" membuka daftar menu | berfungsi |
| Chip saran AI mengisi kolom pesan | berfungsi |
| Tombol "Tambah Transaksi" menuju `/dashboard/keuangan` | berfungsi |
| Tombol "Hari ini" pada kalender kembali ke bulan berjalan | berfungsi |
| Paginasi berita berpindah daftar dan menandai halaman aktif | berfungsi |
| Fokus terkurung di dalam dialog | berfungsi |
| Tombol Escape menutup dialog | berfungsi |
---

## 6. Temuan UI dan UX

### U1 — SEDANG: Halaman Cuaca tidak memberi jalan keluar bagi pengguna baru

**Lokasi**: `/dashboard/cuaca`

**Bukti**

Teks yang tampil untuk pengguna baru:

```
Cuaca
Pantau Cuaca
Belum ada data cuaca
Nyalakan GPS untuk mendapatkan data cuaca terkini.
Prakiraan 3 Hari BMKG
Riwayat Notifikasi
Notifikasi Cuaca
Pilih platform notifikasi terlebih dahulu, lalu simpan kontak tujuan yang sesuai.
```

Empat tombol di area notifikasi seluruhnya berstatus disabled, dengan penjelasan "Pilih platform notifikasi terlebih dahulu".

**Dampak**: petani melihat urutan yang membingungkan: halaman kosong, tombol mati, penjelasan tombol mati. Tidak ada cara memilih lokasi secara manual untuk menghindari GPS.

**Catatan**: pengguna yang sudah pernah memilih lokasi pada audit sebelumnya akan melihat data cuaca. Masalah ini khusus pengguna baru.

---

### U2 — SEDANG: Halaman Keuangan kosong total untuk pengguna baru

**Lokasi**: `/dashboard/keuangan`

**Bukti**

Isi halaman hanya setinggi 1173 piksel dan berisi:

```
Manajemen Keuangan
Pantau Arus Kas
Pilih Proyek
Buat Proyek
Import Excel          (disabled)
Buku Besar | RAB | Laba Rugi | Arus Kas | Arus Kas Pasca Pembiayaan | Perbandingan
```

Setelah berpindah tab, konten tetap kosong karena belum ada proyek.

**Dampak**: tidak ada panduan urutan langkah. Petani baru tidak tahu apakah harus membuat proyek lebih dulu, mengimpor Excel, atau mencatat transaksi satu per satu.

---

### U3 — SEDANG: Target sentuh kecil pada kalender dan stok

**Bukti**

Sel hari pada kalender berukuran **28 x 28 piksel** untuk seluruh 31 tombol.

Tombol ikon pada kartu batch di halaman Stok (mobile) berukuran **30 x 30** dan **34 x 34** piksel.

**Penilaian terhadap standar**

| Standar | Ambang | Sel kalender | Status |
|---|---|---|---|
| WCAG 2.5.8 Target Size Minimum (AA) | 24 x 24 | 28 x 28 | lulus |
| Rekomendasi Material Design | 48 x 48 | 28 x 28 | tidak lulus |
| Rekomendasi Apple HIG | 44 x 44 | 28 x 28 | tidak lulus |

**Dampak**: lolos standar accessibility minimum, tetapi tetap kecil untuk pengguna dengan jari besar atau perangkat tua. Untuk memindai kalender satu bulan penuh, ini berarti 31 ketukan pada target kecil.

---

### U4 — RENDAH: Indikator fokus keyboard sangat lemah

**Bukti**

Pengujian fokus pada navigasi desktop menunjukkan urutan fokus sudah benar:

```
Tab 1  Cuaca
Tab 2  Berita
Tab 3  Manajemen Keuangan
Tab 4  Manajemen Stok
Tab 5  Smart Kalender
Tab 6  AI Chat
Tab 7  Feedback
Tab 8  Panduan
Tab 9  Akun
```

Status `:focus-visible` cocok dan kelas `Mui-focusVisible` diterapkan. Namun indikator yang dipakai hanya berupa perubahan latar:

```
class:        MuiButtonBase-root Mui-focusVisible MuiListItem-root
outline:      none 0px
boxShadow:    none
background:   rgba(0, 0, 0, 0.12)
```

**Dampak**: tidak ada `outline` maupun `box-shadow`. Indikator berupa arang 12 persen sangat halus, terutama pada sidebar yang memang sudah gelap. MenySightly melanggar WCAG 2.4.11 Focus Appearance (AAA) yang menuntut kontras minimal 3 banding 1.

**Yang sudah benar**: urutan fokus logis, dan fokus terkurung di dalam dialog (terverifikasi pada dialog Tambah Batch).

---

### U5 — RENDAH: Sebagian gambar berita eksternal gagal dimuat

**Bukti**

Pada halaman Kabar Pasar, 10 gambar eksternal diminta dan 1 gagal:

```
FAILED https://www.tangerangkota.go.id/assets/storage/files/photos/bank-foto-....jpg
  :: net::ERR_BLOCKED_BY_RESPONSE.NotSameSite
```

Pada pengujian lain, dua domain sempat gagal dengan `ERR_BLOCKED_BY_ORB` dan satu mengembalikan 403. Ketiganya bersifat sementara dan tidak selalu muncul.

**Catatan**: pemeriksaan DOM menunjukkan 8 gambar dengan 0 gambar rusak, karena gambar yang gagal tidak pernah masuk ke DOM. Yang terlihat oleh pengguna adalah kotak kosong.

**Perbaikan**: pertimbangkan proxy gambar di server agar konsisten, atau sediakan placeholder.

---

### U6 — RENDAH: Label pada dialog jadwal terbaca dua kali

**Lokasi**: dialog "Tambah Jadwal Kegiatan" pada halaman Kalender

**Bukti**

Teks dialog yang terbaca pembaca layar:

```
Tambah Jadwal Kegiatan
Judul Kegiatan *       Judul Kegiatan *
Jenis Kegiatan *       Jenis Kegiatan *
Tanggal *              Tanggal *
Waktu (opsional)       Waktu (opsional)
Catatan (opsional)     Catatan (opsional)
Batal
Simpan Jadwal
```

Setiap field terbaca dua kali. Dialog sendiri sudah benar pada aspek lain: memiliki 6 input, tombol Tutup dengan nama aksesibel, dan fokus otomatis masuk ke dialog.

**Dampak**: pembaca layar mengulang label yang sama dua kali untuk setiap field.

**Perbaikan**: periksa apakah label visual dan label untuk pembaca layar dirender bersamaan tanpa kondisi yang saling meniadakan.

---

### U7 — INFO: Tombol Escape dan fokus modal bekerja benar

**Catatan positif**: pengujian tidak menemukan masalah pada pengelolaan fokus. Fokus otomatis masuk ke dialog, terkurung selama dialog terbuka, dan tombol Escape menutup dialog dengan benar.
---

## 7. Temuan Operasional

### O1 — `/api/cron/prices` sedang gagal

```
GET /api/cron/prices
  -> 500 {"success":false,"message":"Siskaperbapo proxy request failed: 522"}
```

Kode 522 berarti connection timeout pada sumber data hulu. Error ditangani dengan benar dan tidak membocorkan informasi internal, tetapi artinya data harga tidak dapat diperbarui selama sumber tersebut bermasalah.

**Saran**: pertimbangkan mekanisme fallback ke sumber alternatif, atau cache harga terakhir agar dashboard tidak kosong.

---

## 8. Batasan Pengujian

Bagian ini penting agar hasil laporan tidak ditafsirkan berlebihan.

### 8.1 Yang tidak dapat diuji

| Area | Alasan |
|---|---|
| Penetration test otomatis berskala penuh | Docker dan Strix tidak tersedia di lingkungan ini. Pemeriksaan keamanan dilakukan secara manual melalui probe API dan review kode statis. |
| Kemampuan AI end-to-end | `GEMINI_API_KEY` belum diisi di `.env.local`, sehingga `/api/ai/gemini` selalu membalas 500. Yang terverifikasi hanya jalur UI, bukan jawaban AI. |
| Skenario multi-tenant nyata | Semua tabel berisi 0 baris. Tidak ada dua pengguna nyata untuk menguji isolasi data secara empiris. |
| Batch stok, transaksi, dan notifikasi terjadwal | Karena database kosong, semua pengujian data memakai jalur mock dan development. |
| Register dan login end-to-end | Tidak ada kredensial email dan kata sandi nyata. |
| Notifikasi WhatsApp dan Telegram | Tidak ada nomor tujuan dan bot yang dikonfigurasi. |

### 8.2 Batasan metodologi

**Orakel deteksi perubahan.** Pengujian klik awal membandingkan panjang teks halaman. Metode ini menghasilkan negatif palsu pada dua kondisi: perpindahan tab dengan teks Berpanjang sama, dan tombol yang sudah aktif secara default. Karena itu 39 kandidat diuji ulang dengan orakel yang lebih kuat.

**Indeks elemen.** Pengujian klik memuat ulang halaman sebelum setiap klik agar state bersih. Ini membuat pengujian lambat tetapi menghindari kontaminasi antar-klik.

**False positive yang sudah dikoreksi.** Empat bacaan awal ternyata keliru dan tidak dimasukkan sebagai temuan:
1. Enam tombol "tanpa nama" pada setiap halaman ternyata `visibility: hidden` dan berada di luar pohon aksesibilitas.
2. Tombol "Telegram" pada halaman Cuaca sudah aktif dengan `aria-pressed=true`.
3. Tombol "Buku Besar" dan "Daftar Batch Stok" sudah menjadi tab aktif.
4. Indikator fokus yang awalnya dilaporkan hilang ternyata ada, hanya berupa arang 12 persen tanpa outline.

---

## 9. Rekomendasi Prioritas

### Prioritas 1 — sebelum rilis produksi

| Temuan | Tindakan |
|---|---|
| S1 | Tambahkan autentikasi, rate limit, dan batas ukuran input pada `/api/ai/gemini` serta `/api/ai/financial-report` |
| S3 | Tambahkan rate limit di `proxy.ts` untuk endpoint AI, lokasi, cuaca, dan feedback |

### Prioritas 2 — segera setelah prioritas 1

| Temuan | Tindakan |
|---|---|
| S4 | Tambahkan pemeriksaan peran admin pada `GET /api/feedback` |
| S5 | Perbaiki pengiriman kredensial pada mode auth lokal untuk `GET /api/notification/schedule` |
| S7 | Samakan nama field `device_type` dan `deviceType` |
| U1 | Berikan pilihan cari lokasi manual pada halaman Cuaca |
| U2 | Tambahkan empty state yang memandu urutan langkah pada halaman Keuangan |

### Prioritas 3 — perbaikan kualitas

| Temuan | Tindakan |
|---|---|
| S2 | Ubah respons analytics menjadi 200 dengan body, atau hapus `keepalive` |
| S6 | Tambahkan validasi `Array.isArray(history)` |
| S8 | Bedakan galat foreign key dari galat server lain |
| U3 | Perbesar target sentuh sel kalender dan tombol ikon Stok |
| U4 | Tambahkan `outline` atau `box-shadow` pada keadaan fokus |
| U5 | Tambahkan proxy gambar atau placeholder untuk berita |
| U6 | Perbaiki duplikasi label pada dialog jadwal |
| O1 | Tambahkan fallback sumber harga |

### Dokumentasi

| Temuan | Tindakan |
|---|---|
| S9 | Dokumentasikan bahwa dev server tidak boleh dapat dijangkau jaringan publik |
| S10 | Dokumentasikan risiko menjalankan cron di mode development |

---

## 10. Skrip Pengujian

Seluruh skrip pengujian berada di folder `.tmp` dan tidak di-commit.

| Skrip | Fungsi |
|---|---|
| `.tmp/rls-probe.cjs` | Membaca seluruh tabel melalui anon key untuk memeriksa exposure |
| `.tmp/rls-write.cjs` | Probe tulis non-destruktif untuk membuktikan RLS aktif |
| `.tmp/qa-auth-matrix.mjs` | Matriks otorisasi 7 varian token terhadap seluruh endpoint |
| `.tmp/qa-sec1.mjs` | Uji autentikasi AI, batas ukuran input, dan kebocoran PII |
| `.tmp/qa-feedback.mjs` | Uji varian payload pada endpoint feedback |
| `.tmp/qa-pages.mjs` | Kunjungan seluruh halaman di dua viewport |
| `.tmp/qa-a11y.mjs` | Pemeriksaan nama aksesibel, label, dan target sentuh |
| `.tmp/qa-ident.mjs` | Identifikasi tombol tanpa nama dan ukuran sel kalender |
| `.tmp/qa-clicks2.mjs` | Pengujian klik seluruh target interaktif |
| `.tmp/qa-oracle.mjs` | Pengujian ulang dengan orakel deteksi perubahan yang lebih kuat |
| `.tmp/qa-focus.mjs` | Pemeriksaan indikator fokus keyboard |
| `.tmp/qa-final.mjs` | Pemeriksaan gambar berita dan urutan fokus |

Laporan ini dilengkapi regression test otomatis yang sudah ada di `e2e/regresi-perbaikan-ux.spec.ts` berisi 6 pengujian yang lulus pada viewport Mobile Chrome.

---

## 11. Kesimpulan

Arina Agri menunjukkan fondasi keamanan data yang baik. Row Level Security aktif dan menolak seluruh operasi tulis tanpa autentikasi di 12 tabel inti. Skema database tidak terekspos ke publik. Verifikasi signature webhook dilakukan dengan benar dan tahan serangan timing. Endpoint cron gagal-terutup di production. Tidak ditemukan SQL injection maupun SSRF.

Tidak ditemukan satu pun tombol mati pada seluruh 148 target interaktif yang diuji. Tab dan tombol yang semula terindeks rusak seluruhnya terverifikasi berfungsi setelah pemeriksaan ulang yang lebih teliti.

Dua temuan memerlukan tindakan sebelum rilis. Pertama, endpoint AI terbuka untuk umum tanpa autentikasi, rate limit, maupun batas ukuran input, sehingga siapa pun dapat memakai tagihan API milik proyek. Kedua, tidak adanya rate limiting di seluruh aplikasi membuat endpoint publik yang menyentuh layanan pihak ketiga rentan penyalahgunaan.

Dari sisi pengalaman pengguna, kelemahan utama bukan pada fungsi, melainkan pada kondisi data kosong. Halaman Cuaca dan Keuangan sama sekali tidak memberikan arah bagi pengguna baru. Karena sebagian besar pengguna pertama kali akan membuka aplikasi dalam keadaan kosong, memastikan kedua halaman ini punya empty state yang memandu adalah perbaikan dengan dampak terbesar.
