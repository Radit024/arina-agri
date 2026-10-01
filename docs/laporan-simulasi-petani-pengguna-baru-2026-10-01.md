# Laporan Simulasi Pengguna Baru — Petani Awam (Arina Agri)

- **Tanggal simulasi**: 1 Oktober 2026 (WIB)
- **Bagian I** — Tur seluruh aplikasi (login, dashboard, cuaca, stok, berita, pengaturan): §1–§9
- **Bagian II** — Simulasi mendalam fitur **Manajemen Keuangan** dengan file Excel nyata (§10–§17)
- **Bagian III** — **Rencana perbaikan terpusat**: 27 temuan dikelompokkan jadi 6 klaster akar masalah + urutan pengerjaan (§18)
- **Bagian IV** — **Status perbaikan**: apa yang sudah dikerjakan & diverifikasi, apa yang masih tersisa (§19)
- **Persona**: petani non-teknis yang belum pernah memakai aplikasi seperti ini. Tidak tahu istilah "produk", "scope", "batch", "BEP", "RAB". Hanya tahu cara pakai WhatsApp.
- **Metode**: end-to-end automation Playwright (Chromium), storage kosong di awal (pengguna sungguhan baru)
- **Perangkat**: Mobile 390×844 & 360×740 (touch emulation) → Desktop 1440×900
- **Server**: `next dev` (Turbopack) di `127.0.0.1:3000`, state `.next/dev` dibersihkan sebelum pengujian
- **Skrip**: `e2e/ux-simulation/*.mjs` (lihat §9)
- **Artefak screenshot**: `.tmp/sim/`, `.tmp/final-mobile/`, `.tmp/desktop-shots/`, `.tmp/verify6/`

> **Catatan metode yang penting**: selama simulasi ditemukan bahwa `127.0.0.1` membuat Next.js 16 memblokir dev resource sehingga React **tidak pernah hydrate** — seluruh aplikasi jadi diam (tombol mati total, tanpa error console). Semua temuan di bawah diuji ulang lewat `localhost` **atau** setelah dev server di-restart dan diikat ke `127.0.0.1`. Detail di §7 (BLOCKER-DEV).

---

## 1. Ringkasan Eksekutif

| Kategori | Jumlah | Keterangan |
| :--- | :---: | :--- |
| **Blocker** | 3 | Petani tidak bisa menjalankan fungsi inti aplikasi |
| **High** | 5 | Fitur ada tapi tidak berguna / kosong / edgy |
| **Medium** | 10 | Rusak halus yang mengikis kepercayaan |
| **Low / DX** | 3 | Tidak merusak pengguna, tapi mengunci developer |
| **Bagian II — Blocker** | 2 | Data yang sudah ada di file Excel petition tidak terimpor |
| **Bagian II — High** | 4 | Angka/FITUR yang tampil berbeda dari file asli |
| **Bagian II — Medium** | 3 | Peringatan & istilah yang membingungkan |
| **Bagian II — Akurasi terverifikasi** | 12 | Yang terbukti benar dan tidak perlu diubah |

**Kesimpulan utama:** arsitektur informasinya sudah bagus - sidebar/bottom-nav jelas, ada empty state, ada guide 8 langkah, ada validasi form. Yang belum selesai adalah **kemampuannya dipakai dengan benar**: beberapa fitur inti benar-benar tidak bisa dipakai dari HP, dan beberapa panel menampilkan angka atau data yang bertentangan satu sama lain. Untuk petani, dua masalah itu lebih merusak daripada tidak ada fiturnya sama sekali — yang pertama membuat petani berhenti memakai, yang kedua membuat petani berhenti percaya.

---

## 2. Alur yang Diterima Petani (User Flow Saat Ini)

| # | Langkah-petani | Hasil nyata | Catatan |
|---|---|---|---|
| 1 | Buka `localhost:3000` | Redirect ke `/login` | ✅ |
| 2 | Tekan **Masuk** dengan form kosong | Tidak ada pesan Indonesia; muncul bubble browser **bahasa Inggris** | ⚠️ M2 |
| 3 | Tekan **Masuk sebagai Tamu** | Masuk ke dashboard (±4 dtk), tapi kadang mentok di `/login` | ⚠️ M4 |
| 4 | Landing di Dashboard | Guide "Kenalan dengan Arina Agri" 8 langkah muncul sendiri | ✅ (tapi lihat H4) |
| 5 | Baca ringkasan | "Rp 0", "Rp 0", "HARGA CABAI RAWIT —/kg", "STATUS CUACA HARI INI: Belum ada data", 2× "Belum ada data transaksi" | 🔴 H2 |
| 6 | Sapaan di judul | **"Akun."** | 🔴 M1 |
| 7 | Cari Cuaca (yang pertama dicek petani) | Harus lewat Lainnya → Cuaca. Hanya bisa GPS. Hasil: "Belum ada data cuaca" | 🔴 H1 |
| 8 | Buka Stok | KPI 0 kg / Rp 0 / 0 batch, tapi tabel isi 2 batch dummy. **Tidak ada tombol Tambah Batch** | 🔴 B1, B2, B3 |
| 9 | Buka Keuangan | Empty state bagus, tombol Buat Proyek ada & jalan | ✅ |
| 10 | Tambah Jadwal di Kalender | Dialog → Simpan → event muncul di kalender. Berhasil | ✅ |
| 11 | Tanya AI Chat | Error: "Gemini API key belum diisi…" | ⚠️ M7 |
| 12 | Buka Berita | Peta harga kosong, judul berita dobel | 🔴 H3, M2 |
| 13 | Buka Pengaturan | Sheet bawah 60vh; isi panel perlu di-scroll | ✅ (⚠️ M8) |

---

## 3. BLOCKER — Alur inti tidak bisa dipakai

### 🔴 BLOCKER-1 — Di HP, tombol "Tambah Batch" (catat panen) **tidak ada sama sekali**

- **Severity**: Kritis
- **Bukti langsung**: pada 390×844 dan 360×740,
  `page.getByRole('button', { name: /Tambah Batch/i }).count() === 0`.
  Tidak ada di DOM, bukan sekadar tersembunyi. Screenshot `.tmp/verify6/01-stok.png` — hanya ada 4 kartu KPI, lalu tab, lalu daftar batch.
- **Akar masalah**: `components/shared/page/PageHeader.tsx:40`
  ```tsx
  <Box component="header" sx={mergeSx(pageHeaderSx, { display: { xs: 'none', md: 'flex' } }, sx)}>
  ```
  Header disembunyikan penuh di mobile — **termasuk `actions`**. Sementara `app/dashboard/stok/_components/StokView.tsx:262-271` menaruh kedua aksi modul Stok di dalam `PageHeader actions`:
  ```tsx
  actions={(
    <>
      <PageActionButton data-guide-target="stock-stock-out" ...>{t('buttons.stockOut')}</PageActionButton>
      <PageActionButton data-guide-target="stock-add-batch" ...>{t('buttons.addBatch')}</PageActionButton>
    </>
  )}
  ```
  `StokView` **tidak punya** fallback mobile untuk aksi ini.
- **Dampak**: modul "Manajemen Stok" adalah tempat petani mencatat hasil panen. Di HP, fungsi inti modul itu tidak bisa dipakai. ("Catat Keluar" masih bisa dijangkau lewat tombol per-kartu di dalam daftar, jadi hanya "Tambah Batch" yang hilang total.)
- **Perbaikan**: pindahkan aksi ke `PageShell`/toolbar yang punya varian mobile, atau tambahkan FAB `+ Tambah Batch` di `StokView` (pola yang sudah dipakai Keuangan — lihat `data-guide-target="finance-add-transaction-mobile"`).

> Audit yang sama perlu dijalankan untuk halaman lain yang menaruh CTA di `PageHeader actions`: `CuacaView.tsx:124`, `KalenderView.tsx:122` (✅ sudah punya fallback mobile di baris 256), `KabarPasarView.tsx:65`, `FinanceProjectToolbar.tsx:441,475`.

---

### 🔴 BLOCKER-2 — Data dummy bocor ke pengguna baru, KPI dan tabel saling bertentangan

- **Severity**: Kritis (merusak kepercayaan)
- **Bukti langsung** (mobile & desktop, `/dashboard/stok`):

  | Yang ditampilkan KPI | Yang ditampilkan tabel |
  |---|---|
  | Total Stok Siap Jual: **0 kg** | BATCH-001-A — 280 kg / 400 kg |
  | Estimasi Nilai Stok: **Rp 0** | BATCH-002-B — 60 kg / 350 kg, Rp 38.000 |
  | Batch Hampir Kadaluarsa: **0 batch** | (tapi date-nya sudah lewat, lihat BLOCKER-3) |

- **Akar masalah**: `hooks/useStok.ts:98-105`
  ```ts
  const [batches, setBatches] = useSessionStorage<ApiHarvestBatch[]>(`${storageKey}-batches`, MOCK_BATCHES);
  const [summary,  setSummary ] = useSessionStorage<StokSummary>(`${storageKey}-summary`, {
    totalStokSiapJual: 0, stokTerjualMingguIni: 0, estimasiNilaiStok: 0, batchHampirKadaluarsa: 0,
  });
  ```
  `batches` di-seed dengan `MOCK_BATCHES` (batch-ID `BATCH-001-A`, `Gudang Utama`, Rp 45.000 — jelas data demo), sementara `summary` tetap nol. Untuk pengguna tanpa session, `loadData` (`:116-119`) **return awal tanpa mengubah apa pun**:
  ```ts
  if (!user || isGuestMode) { setLoading(false); return; }
  ```
  Yang lebih menyebalkan: `computeLocalSummary()` sudah ada di file yang sama (`:84-92`) dan akan menghitung 340 kg + nilai yang benar — **tapi tidak pernah dipakai**.
- **Dampak**: petani baru melihat data milik orang lain, lalu concludes app-nya rusak atau datanya hilang. Either way dia berhenti percaya pada angkanya.
- **Perbaikan**: untuk kondisi belum login → `batches = []` + `summary = computeLocalSummary([])`, plus empty state yang jujur ("Belum ada batch Tercatat") dengan CTA "Tambah Batch".

---

### 🔴 BLOCKER-3 — Batch yang sudah kedaluwarsa tetap berstatus **"Aman"**

- **Severity**: Kritis (riska keselamatan pangan)
- **Bukti langsung**: `BATCH-001-A` → `estimasiKadaluarsa: '2026-04-26'`, `status: 'aman'`. Tanggal simulasi **1 Oktober 2026** → sudah **±5 bulan** lewat, tapi badge hijau "Aman" tetap tampil, KPI "Batch Hampir Kadaluarsa" tetap `0 batch`, dan banner error `alertBatches` (`StokView.tsx:275-283`) tidak pernah muncul.
- **Akar masalah**: `lib/stok/computeStatus.ts` benar-benar benar (`:11-13`):
  ```ts
  if (stokTersisa === 0) return 'habis';
  if (daysLeft <= 3) return 'hampir_kadaluarsa';
  ```
  Tapi fungsi ini hanya dipanggil di **dua tempat**: saat membuat batch (`lib/server/stok/batches.ts:106`) dan saat mencatat stok keluar (`lib/api.ts:1234`). **Tidak pernah saat membaca daftar** — `lib/api.ts:1349` dan `:1417` mengambil `status` apa adanya dari baris DB.
  Artinya: status membeku di nilai saat batch dibuat, lalu tidak pernah dihitung ulang.
- **Dampak**: petani diarahkan untuk menjual cabai yang sudah kedaluwarsa. Ini bukan cosmetic bug.
- **Perbaikan**: hitung status saat serialisasi/list (atau kolom generated `days_left` + view), jangan bergantung pada nilai yang disimpan saat write.

---

## 4. HIGH — Fitur ada tapi tidak berguna / kosong / bikin buntu

### 🔴 HIGH-1 — Tidak ada pencarian lokasi manual di halaman Cuaca

- **Bukti**: seluruh `<input>` di `/dashboard/cuaca` (mobile) hanya berisi: 2 checkbox (jenis peringatan), 1 input "Telegram Chat ID", 1 input time. **Tidak ada field pencarian wilayah.** Satu-satunya jalan masuk adalah tombol "Nyalakan GPS".
- **Yang sudah ada tapi tidak dipasang**: `GET /api/location/search` (route-nya ada, `curl` balas `200` dengan data wilayah) dan `locationApi.search` di `lib/api.ts:1553`. Ripgrep seluruh `app/`, `components/`, `controllers/`: **tidak ada satu pun pemanggil**. Hanya `locationApi.reverse` yang dipakai (`controllers/cuaca/useCuacaController.tsx:172, 215, 473`).
- **Yang menjanjikan fitur ini**:
  - `README.md:98` — "Lokasi bisa dipilih manual lewat pencarian wilayah atau lewat GPS."
  - `messages/id.json:160` — step guide *"Pilih lokasi kebun: Nyalakan GPS **atau cari lokasi manual** agar prakiraan BMKG sesuai dengan area kerja Anda."*
- **Dampak**: petani yang HP-nya tidak punya GPS, atau yang menolak izin lokasi, atau yang pakai desktop tanpa GPS → **prakiraan cuaca tidak akan pernah muncul**, dan tidak ada jalan lain. Guide onboarding justru menjanjikan jalan yang tidak ada.
- **Perbaikan**: pasang `locationApi.search` di `CuacaView` sebagai Autocomplete wilayah (sudah tersedia endpoint + test server `tests/server/locationSearch.test.ts`).

### 🔴 HIGH-2 — Kartu "HARGA CABAI RAWIT" selalu `—/kg`, padahal server sudah punya datanya

- **Bukti**: `GET /api/dashboard/summary` (dengan token yang sama) balas:
  ```json
  "price": { "todayPrice": 65530, "yesterdayPrice": 66873, "priceDelta": -1343, "priceDeltaPct": "-2.0" }
  ```
  Tapi UI menampilkan `—/kg` dengan sub-teks `vs kemarin`.
- **Akar masalah**: dua sumber data untuk satu angka.
  - `controllers/dashboard-home/useDashboardHomeController.ts:46-52` mengambil seluruh ringkasan (termasuk `price`) dari `/api/dashboard/summary`.
  - Tapi `:53-60` mengambil harga **lagi** dari `useCommodityPrices(30)`, dan hook itu query Supabase **langsung dari browser** (`hooks/useCommodityPrices.ts:54`, `.from('commodity_prices')`) — tanpa RLS/session yang benar → kosong.
  - `summary.price` yang benar **tidak pernah dipakai** di view.
- **Dampak**: dua sumber kebenaran → yang salah selalu menang. Bug yang sama muncul di Kabar Pasar (HIGH-3).
- **Perbaikan**: buang `useCommodityPrices` dari dashboard, pakai `summary.price`. Untuk peta (yang butuh data per-region) tetap query server lewat route, bukan Supabase dari client.

### 🔴 HIGH-3 — Peta harga di Kabar Pasar kosong 100%

- **Bukti** (screenshot `.tmp/desktop-shots/02-kabar-pasar.png`): peta menampilkan outline Indonesia, **tidak satu pun wilayah** berwarna. Semua region masuk kelas abu-abu "Tidak ada data". Angka "HARGA RATA-RATA JAWA TIMUR" tampil sebagai `—`.
- **Akar masalah**: sama dengan HIGH-2 — `useCommodityPrices` query Supabase dari client.
- **Dampak**: panel setinggi ~400 px di posisi paling dominan di halaman tidak menyampaikan informasi apa pun. Untuk petani yang tujuan membuka app ini adalah "cek harga cabai hari ini", ini kegagalan total.
- **Perbaikan**: sama — pindahkan query region price ke route server (`/api/dashboard/summary` sudah mengembalikannya), atau perbaiki sesi/RLS untuk query client.

### 🔴 HIGH-4 — Guide onboarding yang terbuka memblokir **setiap** tap, dan elemen yang disorot tidak bisa ditekan

- **Bukti**: saat tur 8 langkah terbuka, Playwright `click()` (tanpa `force`, posisi=center) **timeout** pada kelima item bottom navigation:
  ```
  nav-dashboard: GAGAL    nav-keuangan: OK*    nav-ensiklopedia: GAGAL
  nav-kalender: GAGAL      nav-lainnya: GAGAL
  ```
  Hit-test `document.elementFromPoint()` di tengah setiap tombol mengembalikan overlay full-screen:
  ```
  <div aria-hidden="true" class="MuiBox-root mui-1uj6r5s">  position: fixed; 0,0,390,844; pointer-events: auto
    └ parent: <div class="MuiBox-root mui-domm1e"> position: fixed; z-index: 1500
  ```
  Petani yang mengetuk-ngetuk sambil menunggu data akan mendapat **nol respons** tanpa penjelasan apa pun.
- **Akar masalah**: `components/shared/guide/GuideDialog.tsx`
  - `:425` — blocker full-screen `pointerEvents: 'auto'` yang menutupi seluruh layar.
  - `:465` — elemen spotlight justru `pointerEvents: 'none'`, jadi **target yang disorot pun tidak bisa diklik** (harus lewat tombol popover).
- **Bug kedua di tur yang sama — muncul tidak stabil**: `GuideProvider.tsx:66-68` + `:90`
  ```ts
  void waitForGuideInitialTarget(nextGuide, { timeoutMs: 4000 }).then((ready) => {
    if (options.requireReady && !ready) return;   // ← tur dibatalkan diam-diam
  ```
  dengan `queueGuideOpen(nextGuide, { requireReady: true })`. Di 3 kali kunjungan pertama, tur **muncul 1 kali** dan **tidak muncul 2 kali** — karena dashboard belum selesai render dalam 4 detik. Petani yang butuh bantuan justru tidak pernah melihat petunjuknya.
- **Bug ketiga**: tur muncul 3–8 detik setelah landing, yaitu **setelah** petani mulai berinteraksi.
- **Perbaikan**: (a) terapkan focus-trap + `aria-modal` yang benar dan beri tahu pengguna apa yang terjadi; (b) biarkan spotlight `pointer-events: auto` + `onClick` advance; (c) naikkan `timeoutMs` atau jadikan `requireReady: false` dengan fallback spotlight; (d) tampilkan tur sebelum interaksi dimulai.

### 🔴 HIGH-5 — Halaman Cuaca kosong total: dua panel besar tanpa isi

- **Bukti** (screenshot `.tmp/desktop-shots/03-cuaca.png`):
  - **"Prakiraan 3 Hari BMKG"** → judul saja, tanpa kartu apa pun di bawahnya.
  - **"Riwayat Notifikasi"** → header tabel (`Tanggal | Jenis Peringatan | Pesan | Status`) lalu **±500 px ruang kosong** tanpa empty state, tanpa CTA.
  - Hero "Belum ada data cuaca" memakai **gradien oranye/merah** dengan ilustrasi matahari + awan — secara visual terbaca sebagai **peringatan cuaca ekstrem**, bukan "belum ada data". Men.grpceduct rasa takut tanpa alasan.
- **Dampak**: halaman yang paling sering dibuka pertama kali oleh petani terlihat seperti gagal load.
- **Perbaikan**: (a) satu(empty state) yang jelas + tombol "Pilih lokasi"; (b) ganti palet hero oranye-merah dengan netral; (c) "Riwayat Notifikasi" dapat empty state "Belum ada riwayat peringatan".

---

## 5. MEDIUM — Rusak halus yang mengikis kepercayaan

### 🔴 M1 — Judul utama Dashboard menampilkan **"Akun."**

- **Bukti**: screenshot `.tmp/desktop-shots/01-dashboard.png` → `<h1>Akun.</h1>` di kiri atas.
- **Akar masalah**: `controllers/dashboard-home/useDashboardHomeController.ts:39`
  ```ts
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  ```
  User guest punya `full_name: 'Akun Demo'` (`context/AuthContext.tsx:39`) → `firstName = 'Akun'`. Untuk user Supabase yang `full_name`-nya kosong, yang muncul justru prefix email.
- **Perbaikan**: pakai nama lengkap atau sapaan netral ("Halo, Selamat pagi"); jangan pernah menurunkan `email.split('@')[0]` ke heading utama.

### 🔴 M2 — Judul berita **dobel** di setiap kartu Kabar Pasar

- **Bukti**: 16 dari 16 kartu menampilkan judul dua kali — bold sebagai judul, lalu teks yang sama persis sebagai subtitle (`Disperindag Cilegon Pastikan Stok Aman, Harg…` / `Disperindag Cilegon Pastikan`). Lihat `.tmp/desktop-shots/02-kabar-pasar.png`.
- **Akar masalah**: `snippet` dari Google News RSS == `title`, dan keduanya dirender.
- **Perbaikan**: render `snippet` hanya jika berbeda dari `title` (setelah normalisasi), atau potong `snippet` ke 1 baris.

### 🔴 M3 — Validasi form login tidak pernah tampil untuk email

- **Bukti**: klik **Masuk** dengan form kosong → `aria-invalid = 0`, `.Mui-error = 0`, `.MuiFormHelperText-root` kosong. Yang aktif adalah validasi native browser:
  ```
  email.validationMessage = "Please fill out this field."              (form kosong)
  email.validationMessage = "Please include an '@' in the email address. 'bukan-email' is missing an '@'."
  ```
  Pesan **bahasa Inggris** dari browser, gaya bubble browser — bukan pesan app "Format email tidak valid".
- **Akar masalah**: `app/login/_components/LoginView.tsx:113-124` memakai `required` + `type="email"` di `FormInput`, sehingga validasi native browser memblokir submit sebelum Zod pernah dipanggil.
- **Yang justru benar**: validasi **password** jalan (`Password minimal 6 karakter` tampil ✅, karena tidak ada atribut `minlength` native).
- **Tidak konsisten dengan halaman Daftar**: `RegisterView` tidak memakai `required`, sehingga semua pesan Zod berbahasa Indonesia muncul dengan benar (`Nama lengkap minimal 3 karakter`, `Format email tidak valid`, `Password minimal 6 karakter`, `Konfirmasi password minimal 6 karakter`).
- **Perbaikan**: samakan dengan form Daftar — hapus `required` native, andalkan Zod + `aria-invalid` + `aria-describedby`.

### 🔴 M4 — "Masuk sebagai Tamu" (guest login) hard-enabled, dan kadang mentok

- **Bukti (a) —risiko produksi**: `controllers/login/useLoginController.ts:30` (perubahan lokal yang belum di-commit):
  ```ts
  const localLoginEnabled = true;
  ```
  Tombol "Masuk sebagai Tamu" tampil untuk siapa pun di halaman login produksi. Kalau ikut ter-deploy, siapa pun bisa masuk ke aplikasi tanpa akun.
- **Bukti (b) — intermittent**: dari 4 percobaan, 1 kali klik "Masuk sebagai Tamu" **tidak** pindah ke dashboard:
  ```
  URL tetap http://127.0.0.1:3000/login
  localStorage = { arina_auth_mode: "local", arina_user_id: "befa6db0-…", arina_theme_mode: "light" }
  ```
  Sesi sudah ditulis tapi redirect tidak terjadi, tanpa pesan error apa pun → **dead end** untuk pengguna baru.
- **Perbaikan**: gate `localLoginEnabled` dengan `process.env.NODE_ENV === 'development'` (atau feature flag), dan tambahkan timeout + pesan jelas kalau redirect gagal.

### 🔴 M5 — Label tombol terpotong: "Kirim Pesan Uji Coba (Telegram"

- **Bukti**: `/dashboard/cuaca` → teks tombol: `Kirim Pesan Uji Coba (Telegram` — kurung penutup hilang. Di DOM terbaca sebagai satu baris nyambung: `Simpan kontak notifikasiKirim Pesan Uji Coba (Telegram)`.
- **Perbaikan**: perbaiki string i18n (`messages/id.json` & `en.json`), cek juga `Jam Kirim` yang label-nya menempel ke input.

### 🔴 M6 — Badge "Grade A" tampil dua kali di kartu batch (mobile)

- **Bukti**: screenshot `.tmp/verify6/01-stok.png` → dua chip hijau identik "Grade A" bertumpuk di dalam kartu `BATCH-001-A`. Sama terjadi untuk "Menipis" / "Aman" (badge status + label grade memakai slot yang sama).
- **Perbaikan**: render grade sekali (hapus chip grade pada baris yang sudah menaruh badge status).

### 🔴 M7 — Pesan error AI membocorkan istilah teknis ke pengguna

- **Bukti**: `/api/ai/gemini` → `500`
  ```json
  { "success": false, "message": "Gemini API key belum diisi. Set salah satu: GEMINI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, atau GOOGLE_API_KEY." }
  ```
  UI menampilkannya persis: *"Arina AI gagal merespons. Gemini API key belum diisi. Set salah satu: GEMINI_API_KEY, …"*.
- **Penilaian**: **error handling-nya justru bagus** — muncul pesan + tombol "Coba lagi". Yang salah hanya isi pesannya: nama variabel lingkungan tidak bisa ditindaklanjuti petani.
- **Perbaikan**: pesan ramah pengguna ("Layanan AI sedang belum tersedia. Coba lagi nanti.") di UI; nama env var hanya di log server.

### 🔴 M8 — Tombol kembali di panel Pengaturan mobile tanpa nama aksesibel

- **Bukti**: `app/dashboard/pengaturan/_components/PengaturanView.tsx:355-360`
  ```tsx
  <IconButton onClick={onBackToMenu} sx={{ display: { xs: activeTab !== null ? 'inline-flex' : 'none', ... } }}>
    <ArrowBackIcon />
  </IconButton>
  ```
  Tidak ada `aria-label`. Tombol ini adalah **satu-satunya** cara kembali ke menu pengaturan setelah memilih tab (`:381` menyembunyikan daftar menu saat `activeTab !== null`).
- **Perbaikan**: `<IconButton aria-label={t('backToMenu')}>`.

### 🔴 M9 — Panel notifikasi mati tanpa penjelasan (`401` di mode guest)

- **Bukti**: `GET /api/notification/schedule` → `401` di setiap halaman. Akibatnya **"Simpan kontak notifikasi"**, **"Kirim Pesan Uji Coba"**, dan **"Simpan Jadwal"** tampil disabled permanen di `/dashboard/cuaca`, tanpa teks yang menjelaskan kenapa.
- **Catatan**: sudah didokumentasikan di `README.md:541` sebagai perilaku yang diketahui — tapi efek ke pengguna ini belum pernah ditangani di UI.
- **Perbaikan**: tampilkan empty state "Fitur notifikasi memerlukan akun" + tombol menuju login/daftar.

### 🔴 M10 — `POST /api/analytics/events` selalu gagal

- **Bukti**: setiap pergantian halaman → `FAILED POST /api/analytics/events :: net::ERR_ABORTED`. Tidak ada efek ke pengguna, tapi artinya **analitik penggunaan fitur tidak pernah terecord** — jadi data untuk keputusan produk berikutnya berbasis "fitur mana yang benar-benar dipakai petani" kosong.
- **Perbaikan**: request-nya batal sebelum sampai ke route. Periksa `proxy.ts` (`PUBLIC_API_PREFIXES`) dan cara request di-call (kemungkinan `fetch` tanpa `keepalive` di-abort oleh navigasi client-side).

---

## 6. Yang Sudah Bagus (Tidak Perlu Diubah)

1. **Struktur navigasi jelas.** Sidebar desktop (7 menu) dan bottom-nav mobile (4 menu + "Lainnya") konsisten. Sheet "Lainnya" berisi pengelompokan rapi: *Operasional → Stok; Informasi → Cuaca, Berita; Lainnya → Panduan, Pengaturan, Feedback*.
2. **Onboarding guide 8 langkah** dalam bahasa Indonesia, dengan progres "1/8", tombol Lewati/Kembali/Berikutnya, dan pen spotlight yang benar-benar menunjuk elemen.
3. **Kalender bekerja end-to-end di mobile**: Tambah Jadwal → isi judul → Simpan → event langsung muncul di grid kalender dan di "Jadwal Mendatang".
4. **Light/Dark mode bekerja** dan persist (`arina_theme_mode` = `dark`, body bg `rgb(30,38,32)`).
5. **Form "Buat Proyek Baru" sangat baik** — tiap field punya helper hint yang konkret ("Isi tanaman utama tanpa format tabel.", "Format: dd-MM-yyyy, contoh 05-06-2026.", "Contoh: Ha, m2, bedeng, polybag.").
6. **Empty state Keuangan benar** — "Buat proyek terlebih dahulu untuk mulai mencatat transaksi." + tombol Buat Proyek, dan tombol Export/Catat Transaksi benar-benar nonaktif.
7. **Tidak ada horizontal overflow** di satu pun halaman yang diuji (390, 360, dan 1440) — layout-nya solid.
8. **Tidak ada `pageerror` (JS exception)** di halaman mana pun yang diuji. Credential salah juga memberi pesan Indonesia yang tepat: "Email atau password salah. Silakan coba lagi."

---

## 7. BLOCKER-DEV — Dua jebakan yang membuat aplikasi terlihat "mati total"

### 🔴 BLOCKER-DEV-1 — Akses lewat `127.0.0.1` membuat React tidak pernah hydrate

- **Bukti**: dev server di-bind ke `localhost` saja, lalu diakses via `http://127.0.0.1:3000`.
  ```
  [server] Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "127.0.0.1".
            Cross-origin access to Next.js dev resources is blocked by default for safety.
            To allow this host in development, add it to "allowedDevOrigins" in next.config.js
  ```
  Gejalanya: **HTML tampil sempurna, tapi 0 element punya `__reactFiber`** setelah 6 detik.
  ```
  fiber count after 6s: 0        (via localhost: 269)
  ```
  Akibatnya **seluruh aplikasi tidak interaktif**: klik "Masuk" tidak validasi, klik "Masuk dengan Google" tidak melakukan redirect, klik "Masuk sebagai Tamu" **tidak menulis localStorage sama sekali** (0 request, 0 event) — semuanya *dead button* yang **tidak menghasilkan satu pun error di console**.
- **Perbaikan**: tambahkan `allowedDevOrigins: ['127.0.0.1', 'localhost']` di `next.config.ts`, **dan/atau** pastikan `npm run dev` selalu dijalankan dengan `--hostname 127.0.0.1` (seperti `playwright.config.ts:79` sudah lakukan).
- **Kenapa ini prioritas tinggi**: ini kondisi yang biasanya ditemui orang yang mau menilai aplikasi secara lokal. Gejalanya "seluruh aplikasi mati tanpa pesan error" — sangat mudah disalahartikan sebagai "aplikasinya rusak fundamental", dan butuh waktu berjam-jam untuk ditelusuri.

### 🔴 BLOCKER-DEV-2 — `.next/dev` yang korup membuat **semua** route API membalas 404 tanpa pesan error

- **Bukti**: dengan dev server yang sudah berjalan semalaman, **seluruh** route API berikut membalas `404` + halaman 404 HTML dalam ~0,1 detik:

  | Endpoint | Status | Body |
  | :--- | :---: | :--- |
  | `/api/health` | 200 | JSON ✅ |
  | `/api/news?limit=1` | 200 | JSON ✅ |
  | `/api/feedback` | 401 | JSON ✅ |
  | `/api/profile` | 401 | JSON ✅ |
  | `/api/dashboard/summary` | **404** | `<!DOCTYPE html>…` |
  | `/api/weather/forecast` | **404** | `<!DOCTYPE html>…` |
  | `/api/weather/warnings` | **404** | `<!DOCTYPE html>…` |
  | `/api/location/search` | **404** | `<!DOCTYPE html>…` |
  | `/api/calendar/events` | **404** | `<!DOCTYPE html>…` |
  | `/api/stok/batches` | **404** | `<!DOCTYPE html>…` |
  | `/api/finance/transactions` | **404** | `<!DOCTYPE html>…` |
  | `/api/notification/schedule` | **404** | `<!DOCTYPE html>…` |
  | `/api/analytics/events` | **404** | `<!DOCTYPE html>…` |

  Route-nya **sudah ter-compile** dengan benar (`.next/dev/server/app/api/weather/forecast/route.js` + `app-paths-manifest.json` berisi `/api/weather/forecast/route`). Tidak ada satu pun error di terminal maupun di `next-development.log`.
- **Perbaikan**: `Remove-Item -Recurse -Force .next\dev` lalu restart. Setelah itu semua endpoint benar (`/api/weather/forecast` balas `200` dengan data BMKG asli, `/api/dashboard/summary` balas `401` tanpa token — itu memang perilaku yang benar).
- **Saran**: dokumentasikan di README / `CONTRIBUTING`: *"Jika semua endpoint `/api/**` membalas 404 dengan halaman HTML, hapus `.next/dev` lalu restart dev server."*

---

## 8. Rekomendasi Prioritas

| Prioritas | Item | Estimasi effort |
| :--- | :--- | :--- |
| P0 | BLOCKER-1 — sediakan "Tambah Batch" di mobile | S |
| P0 | BLOCKER-3 — hitung status kadaluarsa saat list | S |
| P0 | BLOCKER-2 — hentikan kebocoran mock data | S |
| P0 | HIGH-1 — pasang pencarian lokasi manual | M |
| P1 | HIGH-2/HIGH-3 — satu sumber harga (server) | M |
| P1 | HIGH-4 — perbaiki interaksi & kestabilan guide | M |
| P1 | HIGH-5 — isi halaman Cuaca | S |
| P1 | BLOCKER-DEV-1/2 — `allowedDevOrigins` + catatan `.next/dev` | S |
| P2 | M1–M3, M5–M6 — polish teks & greeting | S |
| P2 | M4 — gate guest login + retry redirect | S |
| P2 | M7, M9, M10 — pesan error ramah pengguna | S |
| P3 | M8 — aria-label tombol kembali | XS |

### Bug tambahan yang layak masuk test regresi
- `e2e/` **tidak punya** project Playwright untuk viewport mobile (`playwright.config.ts:56-62` men-comment-out `Mobile Chrome` / `Mobile Safari`). Karena BLOCKER-1 (dan sebagian besar temuan layout) hanya muncul di mobile, gate ini tidak akan pernah menangkapnya. **Rekomendasi: aktifkan minimal satu project mobile.**
- Inkonsistensi penamaan target: `nav-kabarPasar` (camelCase) berdampingan dengan `nav-keuangan`, `nav-ensiklopedia`, `nav-kalender` (kebab-case). Konsistenkan agar selector test tidak mudah salah ketik.

---

## 9. Cara Menjalankan Ulang

```powershell
# 1. Pastikan dev server berjalan pada 127.0.0.1 (WAJIB — lihat BLOCKER-DEV-1)
npm run dev -- --hostname 127.0.0.1 --port 3000

# 2. Bersihkan cache dev bila endpoint /api/** tiba-tiba 404 (BLOCKER-DEV-2)
Remove-Item -Recurse -Force .next\dev

# 3. Jalankan simulasi
node e2e\ux-simulation\01-walkthrough-mobile-desktop.mjs   # tur lengkap mobile + desktop
node e2e\ux-simulation\02-mobile-nav-guide.mjs             # bottom nav, sheet Lainnya, guide
node e2e\ux-simulation\03-login-validation.mjs             # validasi form login vs daftar
node e2e\ux-simulation\04-stok-dan-ai-chat.mjs             # stok (mock vs KPI) + AI chat
node e2e\ux-simulation\05-hydration-check.mjs              # deteksi hydrate/mati (BLOCKER-DEV-1)
```

Screenshot dihasilkan di `.tmp/sim/`, `.tmp/final-mobile/`, `.tmp/desktop-shots/`, `.tmp/verify*/`.

---

# BAGIAN II — SIMULASI MANAJEMEN KEUANGAN (IMPORT EXCEL NYATA)

## 10. Ringkasan Eksekutif Bagian II

Simulasi kedua Difokuskan ke **Manajemen Keuangan**, diuji dengan file milik/user asli:
`references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx` — RAB usahatani **padi 1 Ha, MT 3 (Ags–Des 2026)**, berisi 5 sheet, 22 item RAB, dan 37 catatan transaksi harian.

**Headline: akurasi angkanya sempurna. Yang rusak adalah data yang tidak ikut terbawa, dan keputusan yang tidak dijelaskan.**

| Yang diuji | Hasil |
| :--- | :--- |
| Item RAB terbaca | **22 / 22 ✅** |
| Transaksi terbaca | **38 / 38 ✅** (37 dari ledger + 1 suntikan "Sewa lahan") |
| Rekonsiliasi per kelompok biaya | Semua selisih **Rp 0** ✅ |
| Total Pemasukan | **Rp 45.500.000** ✅ cocok persis |
| Total Pengeluaran | **Rp 22.159.000** ✅ cocok persis |
| Estimasi Laba Bersih / Laba Rugi | **Rp 23.341.000** ✅ cocok persis |
| Arus Kas bulanan (Ags→Des) | −13.464.000 / −1.330.000 / −840.000 / −3.235.000 / **+42.210.000** ✅ **cocok persis dengan sheet "Arus Kas Pasca Pembiayaan" di Excel** |
| Subtotal antar tab (RAB ↔ Laba Rugi) | Konsisten ✅ |
| Linking transaksi ↔ item RAB otomatis | Berjalan ("RAB: Penerimaan", "RAB: Karung", …) ✅ |
| Export Excel + Export Laporan PDF | Keduanya menghasilkan file ✅ |
| Guard sebelum ada proyek | Tombol Catat Transaksi / Export disabled ✅ |
| Ponsel (390×844) | Import & seluruh 6 tab jalan, angka benar ✅ |

Import ini **jauh lebih akurat dari bagian I**. Yang tidak berjalan justru lapisan yang tidak kelihatan di KPI: kelayakan usaha, pembiayaan, dan penentuan mode skenario.

---

## 11. Alur yang Dilewati Petani (Tombol per Tombol)

| # | Aksi petani | Hasil nyata | Verdict |
|---|---|---|---|
| 1 | Buka app → "Masuk sebagai Tamu" | Masuk dashboard | ✅ |
| 2 | Klik sidebar "Manajemen Keuangan" | Halaman terbuka | ✅ |
| 3 | Baca halaman | 6 tab: Buku Besar, RAB, Laba Rugi, Arus Kas, Arus Kas Pasca Pembiayaan, Perbandingan. Semua jargon, tanpa penjelasan | ⚠️ K-MED-2 |
| 4 | Coba "Catat Transaksi" / "Export Excel" / "Export Laporan" | Ketiganya **disabled** | ✅ benar |
| 5 | Klik "Buat Proyek" → isi → "Buat Proyek" | Submit disabled saat kosong; proyek otomatis terpilih | ✅ |
| 6 | Klik "Import Excel" | Dialog muncul, tapi **tidak menjelaskan format file** | ⚠️ K-HIGH-4 |
| 7 | Pilih "Target Mode Skenario" → default "Rencana (Proyeksi)" | Tidak ada penjelasan apa bedanya | 🔴 K-BLOCKER-1 |
| 8 | Unggah file, klik "Lanjutkan Impor" | Pratinjau: "Ditemukan 22 item RAB dan 38 transaksi" | ✅ |
| 9 | Baca tabel rekonsiliasi | 5 kelompok biaya, semua selisih Rp 0. **Sisi pendapatan tidak dicek sama sekali** | 🔴 K-HIGH-3 |
| 10 | Baca peringatan | "Sewa lahan: Rp7000000 berbeda dengan Rp21000000" | ⚠️ K-MED-1 |
| 11 | Klik "Konfirmasi & Simpan ke Sistem" | 22 item, 38 transaksi, "14 baris dilewati" | ⚠️ K-HIGH-2 |
| 12 | Cek Buku Besar | Rp 45.500.000 / Rp 22.159.000 / Rp 23.341.000 | ✅ |
| 13 | Cek tab RAB | 22 item dengan subtotal konsisten | ✅ |
| 14 | Cek tab Laba Rugi | SURPLUS (LABA) Rp 23.341.000 ✅ — tapi "Asumsi Produksi **Belum Dikonfigurasi**" | 🔴 K-BLOCKER-2 |
| 15 | Cek tab Arus Kas | Bulanan cocok persis dengan Excel | ✅ |
| 16 | Cek tab Arus Kas Pasca Pembiayaan | "Bunga Belum diatur", "Kas Akhir Belum diatur" | 🔴 K-BLOCKER-2 |
| 17 | Cek tab Perbandingan | "Skenario Realisasi belum memiliki data" | 🔴 K-BLOCKER-1 |
| 18 | Cek donut "Distribusi Pengeluaran" | "Pupuk Rp 1.944.000", "Jasa Alsintan Rp 6.650.000" | 🔴 K-HIGH-1 |
| 19 | Export Excel | `laporan-keuangan-...-proyeksi.xlsx` | ✅ |
| 20 | Export Laporan → "Buat Laporan" | `Laporan_Keuangan_Arina_2026_08_sd_2026-12_proyeksi.pdf` | ✅ |

> **Dua catatan biar laporan ini tidak disalahbaca:**
>
> 1. Di §11 baris "Catat Transaksi" pada kondisi **belum ada proyek** memang tidak ada di DOM — itu benar (empty state-nya "Buat proyek terlebih dahulu"). Begitu proyek dibuat, FAB `finance-add-transaction-mobile` muncul dan bisa dipakai (§15 butir 8). Jadi ini **bukan** bug.
> 2. **Export Laporan butuh dua klik.** Tombol "Export Laporan" hanya membuka dialog "Ekspor Laporan Keuangan"; file PDF baru-forming setelah klik "Buat Laporan" di dalam dialog. Sudah diverifikasi berhasil di desktop. Bukan bug — tapi nama tombolnya menyesatkan sehingga layak diperjelas jadi "Export Laporan…".

---

## 12. Blocker — Data yang Sudah Ada di File Petani Tidak Terimpor

### 🔴 K-BLOCKER-1 — Petani mengimpor transaksi NYATA ke mode "Rencana", lalu laporan bilang "tidak punya data"

**Severity**: Kritis

**Yang terjadi.** Petani punya catatan transaksi nyata Agustus–Desember 2026 (sudah lewat/terjadi). App membuka dialog import dengan **default "Rencana (Proyeksi)"**. Petani — yang wajar — tidak tahu bedanya dan klik lanjut.

Konsekuensinya terlihat di tiga tempat sekaligus:

```
Tab RAB        → "Pendapatan Rencana Rp 45.500.000"  +  "Pendapatan Terealisasi Rp 45.500.000"
                  (dua kolom identik, karena semua data ada di skenario Proyeksi)

Tab Perbandingan → "Skenario Realisasi belum memiliki data.
                   Catat transaksi atau realisasi di lapangan pada mode Realisasi
                   terlebih dahulu."
                  "Mode Rencana (Proyeksi) ✓ Data RAB / anggaran rencana telah terisi.
                   Mode Aktual (Realisasi) ✗ Belum ada catatan transaksi aktual."

Ringkasan → tombol "Catat Transaksi Aktual" (satu-satunya jalan keluar dari dead-end ini)
```

**Kenapa ini yang paling merusak.** Petani sudah melakukan **semua** langkah dengan benar — buat proyek, pilih file, konfirmasi import. Di akhir dia diberi tahu datanya "belum ada". Ini pola yang paling merusak kepercayaan, karena Marguerite(errors) ada di kepalanya sendiri, bukan di aplikasi.

**Akar masalah.**
1. `RabImportDialog.tsx:235-250` — Select "Target Mode Skenario" hanya berisi dua label ("Rencana (Proyeksi)", "Aktual (Realisasi)") tanpa satu kalimat pun penjelasan.
2. `useRabController.ts:44-50` — `targetScenarioId` di-set dari `activeScenarioId`, dan mode default proyek adalah `PROJECTION`.
3. Tidak ada heuristik "file ini berisi transaksi bertanggal lampau → sarankan mode Realisasi", padahal informasinya **sudah ada** di hasil parse (`referenceYear` + tanggal transaksi).

**Perbaikan.**
- Tambahkan helper text satu kalimat di bawah Select: *"Rencana = target biaya yang direncanakan. Aktual = catatan yang sudah benar-benar terjadi. Kalau Anda mengimpor catatan transaksi yang sudah lewat, pilih Aktual."*
- Deteksi otomatis: jika min(tanggal transaksi) < hari ini, pre-select **Aktual** dan beri tahu: *"38 transaksi terdaterai sebelum hari ini — sebaiknya dicatat ke mode Aktual."*
- Di tab Perbandingan, kalau Proyeksi terisi dan Realisasi kosong, tawarkan tombol **"Pindahkan semua data ke mode Aktual"** satu klik — jauh lebih baik daripada memaksa isi ulang 38 transaksi.

---

### 🔴 K-BLOCKER-2 — HPP, BEP, B/C Ratio, dan seluruh asumsi pembiayaan ada di Excel-nya, tapi dibuang

**Severity**: Kritis

#### (a) Asumsi Produksi — `lib/finance/rabExcel.ts:307-314`

File Excel_baris 50–58 berisi:

| Baris | Isi | Nilai |
|---|---|---|
| 50 | Produksi | 7.000 kg |
| 51 | Harga pasar | 6.500 |
| 52 | Penerimaan | 7.000 kg × 6.500 = **Rp 45.500.000** |
| 53 | Keuntungan | **Rp 23.341.000** |
| 56 | HPP | **Rp 3.165.571** |
| 57 | BEP Produksi | **3.409,08** |
| 58 | B/C ratio | **1,053** |

Baris 50, 51, 56, 57, 58 semuanya punya `plannedTotal === 0`, jadi kena cabang:

```ts
// Rows without a planned total are derivation helpers (e.g. "Produksi", "Harga pasar")
// that feed the real income row rather than standalone transactions.
if (plannedTotal === 0) {
  skippedRows.push({ rowNumber, description, reason: `...total biayanya kosong...` });
  return;
}
```

.Hasilnya, farmer melihat:

```
Kelayakan Usaha
Asumsi Produksi & Penjualan (HPP, BEP, B/C Ratio)     [Sembunyikan]
Asumsi Produksi        Belum Dikonfigurasi
Masukkan proyeksi volume panen dan harga jual untuk menghitung HPP, BEP,
dan rasio kelayakan usaha secara otomatis.                    [Atur Asumsi Sekarang]
```

**Dan saatUNTIME farmer mencoba mengisinya**, jawabannya:

```
[helper text dialog] "Fitur asumsi tidak tersedia di mode tamu"
```

Artinya: **petani yang sedang mencoba/demo tidak akan pernah bisa melihat HPP/BEP sama sekali**, padahal angkanya sudah ada di file yang dia unggah. Pada mode tamu, gate `production_sales:false` menutup aksesnya.

#### (b) Asumsi Pembiayaan — sheet "Arus Kas Pasca Pembiayaan" **tidak pernah dibaca** sama sekali

`parseRabWorkbook` hanya membaca **satu** sheet RAB (`workbook.worksheets.find(ws => /rab/i.test(ws.name))`) dan **satu** sheet ledger (`/catatan|transaksi harian|buku besar|ledger/i`). Sheet 3 (Laba Rugi), sheet 4 (Arus Kas), sheet 5 (Arus Kas Pasca Pembiayaan) **diabaikan total** — dan dua di antaranya berisi data yang tidak ada di sheet RAB.

Isi sheet 5 yang diabaikan:

```
Kebutuhan modal kerja yang dibutuhkan   18.869.000
Modal sendiri dari BP                    3.869.000
Pinjaman bersubsidi - KUR                15.000.000
Suku bunga pinjaman tahunan               6%
Suku bunga per musim tanam                 3%
Bunga yang harus dibayar                  450.000
Sumber dana lain yang harus dibayar    15.450.000
Jangka waktu modal kerja                   6 bulan
```

Hasil di app:

```
Arus Kas Pasca Pembiayaan
Kebutuhan Modal Kerja  Rp 18.869.000     ← ✅ benar (diturunkan dari arus kas, bukan diimpor)
Bunga                  Belum diatur
Kas Akhir Pasca Pembiayaan  Belum diatur
                        [Atur Asumsi Pembiayaan]
```

Petani harus isi ulang 7 angka yang sudah ada di file-nya.

**Perbaikan.**
1. `parseRabWorkbook`: tambahkan sheet reader untuk "Arus Kas Pasca Pembiayaan" → isi `FinancingAssumptions` (modal kerja, modal sendiri, nilai pinjaman, bunga per periode, tanggal pencairan).
2. Ubah cabang `plannedTotal === 0` agar **mendeteksi baris turunan** dan menyimpannya sebagai data turunan, bukan membuangnya: `Produksi` → `productionVolume`, `Harga pasar` → `pricePerUnit`. Baris `HPP`/`BEP`/`B/C ratio` bisa dipakai sebagai **validasi**: jika hasil hitung app berbeda jauh dari angka 파일, tampilkan sebagai peringatan (bukan.symmetric dengan peringatan Sewa lahan yang menyesatkan).
3. Ganti pesan "Fitur asumsi tidak tersedia di mode tamu" dengan empty state yang jujur + CTA "Daftar akun gratis untuk mengaktifkan".

---

## 13. High — Angka yang Tampil Berbeda dari File Asli

### 🔴 K-HIGH-1 — Donut "Distribusi Pengeluaran" salah jumlah dan salah label

**Severity**: Tinggi — ini grafik yang pertama dilihat petani untuk memahami "ke mana uang saya pergi".

**Dua masalah yang bisa dibuktikan dengan aritmetika.**

**Masalah 1 — label sama, angka berbeda antar tab:**

| Kategori | Tab RAB & Laba Rugi | Donut "Distribusi Pengeluaran" |
|---|---:|---:|
| SAPRODI | Rp 2.449.000 | *(tidak ada sebagai label)* |
| JASA ALSINTAN | **Rp 8.150.000** | **Rp 6.650.000** ❌ |
| TENAGA KERJA | Rp 3.360.000 | Rp 3.360.000 ✅ |
| BIAYA TETAP | Rp 7.000.000 | Rp 7.000.000 ✅ |
| LAIN-LAIN | Rp 1.200.000 | Rp 1.200.000 ✅ |
| Pupuk | — | Rp 1.944.000 *(label baru)* |
| Irigasi & Air | — | Rp 1.500.000 *(label baru)* |
| Pestisida | — | Rp 505.000 *(label baru)* |

Rp 1.500.000 "Jasa Pompa Air" dipindah ke slice "Irigasi & Air", sehingga "Jasa Alsintan" di donut menjadi 8.150.000 − 1.500.000 = **6.650.000**. Petani yang mencocokkan dua angka itu akan benar-benar bingung: *"kenapa di sini 6 juta, di sana 8 juta?"*

**Masalah 2 — label "Pupuk" tidak mewakili isi potongannya.**

Pengeluaran pupuk yang sebenarnya terjadi: **NPK Rp 322.000 + Urea Rp 517.500 = Rp 839.500**.

Tapi donut menampilkan **"Pupuk Rp 1.944.000"** — lebih dari **2,3× lipat**. Yang dihitung sebagai "Pupuk":

```
NPK Subsidi    322.000
Urea Subsidi   517.500
Benih padi     412.500   ← bukan pupuk
Herbisida      300.000   ← bukan pupuk
Dolomit        112.000   ← bukan pupuk
Karung gabah   280.000   ← bukan'avenir pupuk
              ---------
              1.944.000
```

Petani yang sedang menyusun anggaran pupuk musim depan akan melihat angka yang lebih dari dua kali lipat dari kenyataan, dan mengambil keputusan beli-verifikasi yang salah. Ini kesalahan yang costing uang, bukan sekadar kosmetik.

**Akar masalah.** `controllers/keuangan/financeCategoryChart.ts:45-52` memanggil `resolveFinanceCategory({ kategori, keterangan })`, yangultures fuzzy-mencocokkan **isi keterangan transaksi** ke alias kategori bawaan (`lib/finance/categories.ts:165-217`). Karena kategori transaksi = kategori RAB ("SAPRODI"), tapi alias bawaan juga bisa match via kata kunci di keterangan ("pupuk" di "Pembelian pupuk NPK subsidi"), hasil akhirnya **campuran dua taksonomi** dalam satu donut — dan SAPRODI pecah jadi "Pupuk" + "Pestisida".

**Perbaikan.**
1. **Gunakan satu sumber kebenaran.** Kalau transaksi sudah punya relasi ke item RAB (`rabItemId`), grupkan donut berdasarkan **kategori RAB** — supaya angkanya identik dengan tab RAB & Laba Rugi. Gunakan taksonomi bawaan hanya kalau relasi RAB tidak tersedia.
2. Kalau tetap memakai auto-kategorisasi, **jangan** memakai label generik yang menyesatkan: "Pupuk" hanya boleh memuat batch yang benar-benar مسؤول legalize pupuk.

---

### 🔴 K-HIGH-2 — "14 baris dilewati" tanpa satu pun rincian

**Severity**: Tinggi

Dialog hasil import hanya melaporkan:

```
Item RAB Dibuat  22   |  Transaksi Dicatat  38  |  Baris Dilewati  14
```

Tidak ada daftar, tidak ada alasan. Padahal `skippedRows` **sudah lengkap di memory** — `useRabController.ts:606` menyimpannya, tapi `RabImportDialog.tsx` tidak pernah merendernya (hanya `summary.skippedCount` di baris 442).

Rekonstruksi 14 baris itu (dari `lib/finance/rabExcel.ts`):

| # | Baris | Isi | Penting? |
|---|---|---|---|
| 1,2,3,4,5,6,7 | TOTAL / TOTAL TETAP / TOTAL BIAYA VARIABLE / TOTAL BIAYA LAIN-LAIN / TOTAL BIAYA PRODUKSI | Baris rekap | ✅ wajar dilewati |
| 8 | `Produksi` | 7.000 kg | ⚠️ **data** |
| 9 | `Harga pasar` | Rp 6.500 | ⚠️ **data** |
| 10 | `Keuntungan` | Rp 23.341.000 | ⚠️ **data** |
| 11 | `HPP` | Rp 3.165.571 | ⚠️ **data** |
| 12 | `BEP Produksi` | 3.409,08 | ⚠️ **data** |
| 13 | `B/C ratio` | 1,053 | ⚠️ **data** |
| 14 | `BAGI HASIL` (40% pemilik / 60% BP) | Rp 9.336.400 / Rp 14.004.600 | ⚠️ **data** |

Jadi **8 dari 14 baris yang "dilewati" sebenarnya berisi angka yang mungkinwanted petani** — dan farmer diberi tahu hanya lewat angka "14" yang tidak bisa ditelusuri.

**Perbaikan.** Render `skippedRows` sebagai tabel collapsible di tahap hasil (dan di pratinjau): kolom Baris | Uraian | Alasan. Pisahkan dua kategori visual: *"Baris rekap dilewati (7, wajar)"* vs *"Data tidak terbaca, perlu diperiksa (7)"* — dan bila yang tidak terbaca adalah data turunan, tawarkan quick action "Isi otomatis dari file".

---

### 🔴 K-HIGH-3 — Rekonsiliasi tidak pernah mengecek sisi pendapatan

**Severity**: Tinggi

Tabel rekonsiliasi yang tampil:

```
Kelompok              Total di Excel   Hasil Hitung    Selisih
SAPRODI               Rp 2.449.000     Rp 2.449.000    Rp 0
JASA ALSINTAN         Rp 8.150.000     Rp 8.150.000    Rp 0
TENAGA KERJA          Rp 3.360.000     Rp 3.360.000    Rp 0
BIAYA TETAP           Rp 7.000.000     Rp 7.000.000    Rp 0
LAIN - LAIN           Rp 1.200.000     Rp 1.200.000    Rp 0
```

Petani melihat "semua selisih Rp 0" dan menyimpulkan **import-nya sudah diverifikasi**. Padahal **tidak satu pun rupiah pendapatan pernah dicek**.

**Akar masalah.** `lib/finance/rabExcel.ts:246-257`, `captureDeclaredTotal()` hanya menerima baris yang diawali "Total"/"Subtotal"/"Jumlah" (`RAB_CATEGORY_TOTAL_ROW_PATTERN`). File Excel ini menutup bagian pendapatan dengan baris bernama **"Keuntungan"** — yang secara semantik adalah laba, bukan total pendapatan. Akibatnya `declaredTotals` tidak pernah punya entri untuk kategori pendapatan, dan `reconciliation` (`:361-373`) diam-diam melewatkannya.

Konsekuensi lebih luas: **untuk file Excel apa pun yang tidak punya baris "TOTAL PENDAPATAN", sisi pendapatan tidak akan pernah pernah direkonsiliasi** — regardless of apakah angkanya benar atau salah.

**Perbaikan.**
1. `captureDeclaredTotal` jangan hanya menerima "Total/Subtotal/Jumlah" — terima juga baris типа "Keuntungan"/"Laba"/"Surplus" untuk kategori income, dengan label tabel yang sesuai ("Total Pendapatan (angka STATEMENT)" vs "Laba").
2. Kalau kategori income tidak punya baris pembanding, tetap tampilkan baris dengan nilai "—" dan keterangan *"tidak ada baris total di file — tidak diperiksa"*, supaya petani tahu bagian itu **tidak diverifikasi**, bukan **lolos**.
3. Tambahkan baris **rekap** di atas tabel: `Total Pendapatan`, `Total Pengeluaran`, `Laba/Rugi` yang dibandingkan langsung dengan file — satu pandangan, paling berguna untuk orang awam.

---

### 🔴 K-HIGH-4 — Dialog import tidak menjelaskan format file, dan tidak ada template

**Severity**: Tinggi — penyebab paling mungkin dari "kenapa file saya tidak terbaca".

Teks persis yang tampil:

```
Import RAB dari Excel
Unggah file Excel RAB untuk mengisi kategori, item RAB, dan transaksi

Target Mode Skenario   [Rencana (Proyeksi) ▾]

        ⬆  Klik atau seret file .xlsx ke sini
     Item RAB dan transaksi harian akan dibaca otomatis
     dan disimpan ke target Rencana (Proyeksi).

                                        [Batal]  [Lanjutkan Impor]
```

Tidak ada satu pun info tentang:
- Nama sheet yang dicari (`/rab/i` dan `/catatan|transaksi harian|buku besar|ledger/i`)
- Kolom yang dibutuhkan (RAB: NO, URAIAN, VOLUME, SATUAN, HARGA SATUAN, TOTAL; Ledger: Tanggal, Uraian Transaksi, Volume, Satuan, Harga Satuan, Pengeluaran, Pemasukan)
- Tombol **"Unduh template"**
- Link **"Lihat contoh format"**

Kalau file petani punya susunan sedikit berbeda, satu-satunya umpan balik adalah error di `useRabController.ts:631`:

```
"Tidak ada item RAB yang terbaca dari file ini"
```

— tanpa penjelasan penyebab, tanpa contoh, tanpa tombol perbaikan.

**Perbaikan.**
1. Tambahkan link **"Unduh template Excel"** (generator-nya sudah ada sebagian di `rabExcel.ts` — `buildFinanceExportWorkbook` menulis sheet dengan header yang persis dibaca parser).
2. Tambahkan daftar syarat format dalam accordion: nama sheet + daftar kolom.
3. Kalau parse menghasilkan 0 item / banyak baris ter-skip, tampilkan **diagnosa per sheet**: *"Sheet 'RAB' tidak ditemukan — file Anda bernama: [Sheet1, Data, Catatan]"* + *"Ditemukan sheet mirip: '1. RAB PADI 1 Ha'"*.
4. Pada error, sertakan jumlah baris yang terbaca per sheet supaya petani tahu masalahnya ada di sheet mana.

---

## 14. Medium — Peringatan & Istilah yang Membingungkan

### ⚠️ K-MED-1 — Peringatan "Sewa lahan" yang secara bisnis salah, secara aritmetika benar

Dialog menampilkan:

```
Catatan untuk diperhatikan:
• Item "Sewa lahan" (Baris 38): Total biaya di excel (Rp7000000)
  berbeda dengan hasil perkalian jumlah × harga (Rp21000000)
```

Kenyataannya ini **benar secara akuntansi**: sewa Rp 21.000.000/Ha/Tahun, MT 3 adalah musim ke-3 dari 3 → 21.000.000 ÷ 3 = **Rp 7.000.000**. Petani sangat mungkin paham ini.

Masalahnya: peringatan tidak menjelaskan apa pun, dan efetiva **menuduh file-nya salah**. Reaksi alami petani: *"halah, berarti file saya yang salah ya?"* — dan banyak yang akan **membatalkan import** di titik ini, padahal tidak ada yang salah sama sekali.

**Perbaikan.**
1. Naikkan ambang deteksi: hanya beri peringatan kalau selisih **tidak** bisa dijelaskan oleh pembulatan/pembagian musim. Kalau `plannedTotal === volume × unitPrice / n` dengan n bilangan bulat > 1, tulis: *"Sewa lahan Rp 21.000.000/tahun dibagi 3 musim menjadi Rp 7.000.000/musim — sesuai. Tidak perlu tindakan."*
2. Ubah nada pesan dari "berbeda" (menuduh) menjadi "menjelaskan": tampilkan kolom `Keterangan`.
3. Tambahkan alasan kecekcoulian: nama file, sheet, dan cara hitungnya — supaya farmer bisa membandingkannya sendiri.

### ⚠️ K-MED-2 — Enam istilah keuangan tanpa penjelasan di halaman pertama

Halaman memuat 6 tab dan 2 mode, semuanya tampil tanpa tooltip:

```
Buku Besar | RAB | Laba Rugi | Arus Kas | Arus Kas Pasca Pembiayaan | Perbandingan
Proyeksi | Realisasi | Scope Keuangan | Distribusi Pengeluaran | HPP | BEP
```

Petani yang belum pernah pakai aplikasi seperti ini **tidak tahu harus mulai dari mana**. Satu-satunya bantuan yang tersedia adalah tombol "Panduan" di sidebar — yang harus ditemukan_first.

**Perbaikan.**
1. Tambahkan `aria-label` + tooltip satu kalimat di setiap tab: *"RAB — rencana anggaran biaya: daftar yang kamu siapkan sebelum|DEAH planted."*
2. Pada kunjungan pertama, beri penekanan "Mulai dari sini" pada tab: **Buku Besar** → **RAB** → **Arus Kas**, dan beri tahu farmer lewat tips yang relevan, bukan dialog modal yang memblokir (lihat §4 HIGH-4).
3. Ganti "Scope Keuangan" dengan bahasa yang konkret.

### ⚠️ K-MED-3 — Kolom "Bulan Kas" kosong di semua 22 item, padahal file punya rencana kas bulanan

Semua baris di tab RAB menunjukkan `Bulan Kas: -`, karena `lib/finance/rabExcel.ts:353` mengeset `plannedCashMonth: undefined` dan tidak pernah membacanya. Padahal sheet 4 "Arus Kas" di file berisi alokasi per bulan (Juli, Agustus, September, Oktober, November, Desember).

Dampaknya: petani kehilangan informasi paling berguna untuk menyusun anggaran — *"kapan uang keluar bulan ini?"* — padahal itu sudah ada di file.

**Perbaikan.** Baca sheet "Arus Kas" untuk mengisi `plannedCashMonth` per item, atau turunkan minimal ke tingkat kategori (bulan pertama item muncul = bulan pencairan) dengan label jelas.

---

## 15. Yang Terbukti Benar (Tidak Perlu Diubah)

1. **Akurasi headline 100%.** Pemasukan, Pengeluaran, dan Laba/Rugi cocok **persis** dengan file Excel — tidak ada pembulatan, tidak ada selisih.
2. **Arus Kas bulanan cocok persis** dengan sheet 5 Excel: Agustus −13.464.000, September −1.330.000, Oktober −840.000, November −3.235.000, Desember +42.210.000.
3. **Rekonsiliasi biaya detects nonzero error.** Semua 5 kelompok selisih Rp 0 — artinya parser benar memahami struktur RAB bertingkat.
4. **Tanggal campuran (string + object Date) tertangani.** File ini memakai `"01 Ags"` (string) untuk 21 baris dan object `Date` untuk 8 baris. Dua-duanya berhasil di-parse (semua baris sampai 25 Des 2026 muncul di Buku Besar).
5. **Linking transaksi ↔ item RAB otomatis berhasil**, lengkap dengan penghitung "(1 tx)" / "(8 tx)" per item. Importer juga menyuntik baris "Sewa lahan" Rp 7.000.000 yang tidak ada di ledger agar total sesuai Laba Rugi — **keputusan produk yang cerdas**.
6. **Baris rekap/derivasi tepat sasaran.** 7 baris "TOTAL ..." dilewati tanpa ikut terisi sebagai item — tidak ada dataTWIN.
7. **Semua 6 tab render di HP** dengan angka yang benar; tidak ada horizontal overflow di 390px.
8. **FAB "Catat Transaksi" tersedia di HP** (`finance-add-transaction-mobile`), dan Export dipindah ke menu "Aksi lainnya" — pola mobile yang benar.
9. **Guard sebelum ada proyek bekerja**: Catat Transaksi / Export Excel / Export Laporan semuanya disabled, dan submit "Buat Proyek" disabled saat form kosong.
10. **Export Excel dan Export Laporan PDF keduanya menghasilkan file** dengan nama yang informatif (termasuk rentang bulan + mode).
11. **Penanganan error asumsi jujur.** Saat farmer mencoba mengisi asumsi di mode tamu, muncul pesan jelas "Fitur asumsi tidak tersedia di mode tamu" — bukan diam-diam gagal.
12. **Tidak ada horizontal overflow** di 390px maupun 1440px pada semua tab.

---

## 16. Prioritas Perbaikan Bagian II

| Prioritas | Item | Akar masalah | Effort |
| :--- | :--- | :--- | :--- |
| **P0** | K-BLOCKER-1 — jelaskan + deteksi mode Realisasi | `RabImportDialog.tsx:235-250`, `useRabController.ts:44-50` | S |
| **P0** | K-BLOCKER-2a — import HPP/BEP/BC + asumsi pembiayaan | `rabExcel.ts:307-314`, `parseRabWorkbook` (1 sheet) | M |
| **P0** | K-HIGH-1 — donut pakai kategori RAB | `financeCategoryChart.ts:45-52` | M |
| **P1** | K-HIGH-2 — tampilkan 14 baris dilewati beserta alasannya | `RabImportDialog.tsx:442` | S |
| **P1** | K-HIGH-3 — rekonsiliasi sisi pendapatan | `rabExcel.ts:246-257` | S |
| **P1** | K-HIGH-4 — template + syarat format + diagnosis per sheet | `RabImportDialog.tsx` | M |
| **P2** | K-MED-1 — peringatan Sewa lahan yang объясн | `rabExcel.ts:332-341` | S |
| **P2** | K-MED-2 — tooltip + urutan tab "mulai dari sini" | `KeuanganView.tsx` | S |
| **P2** | K-MED-3 — isi kolom "Bulan Kas" dari sheet Arus Kas | `rabExcel.ts:353` | M |

**Rekomendasi tambahan untuk CI.** `playwright.config.ts` masih tidak punya project mobile. Empat dari enam temuan K-* di atas (K-BLOCKER-1 partly, K-HIGH-2, K-MED-3, plus guard HP) **hanya muncul di viewport mobile** — gate yang ada sekarang tidak akan menangkapnya. Tambahkan satu project `Mobile Chrome` (390×844) dengan test yang mengimpor `references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx` laluCEL.assert tiga angka (45.500.000 / 22.159.000 / 23.341.000). Test ini hanya butuh ~10 detik dan langsung mengunci akurasi impor yang sekarang sudah benar.

---

## 17. Cara Menjalankan Ulang Simulasi Keuangan

```powershell
# Prasyarat: dev server di 127.0.0.1 (lihat BLOCKER-DEV-1 di Bagian I)
npm run dev -- --hostname 127.0.0.1 --port 3000

# Simulasi lengkap: tur tombol-per-tombol + import Excel + verifikasi angka
node e2e\ux-simulation\06-keuangan-petani-awam.mjs

# Celah yang ditemukan: asumsi, skenario, PDF, mobile
node e2e\ux-simulation\07-keuangan-celah-dan-mobile.mjs

# Alur penuh di HP (390x844)
node e2e\ux-simulation\08-keuangan-mobile-petani.mjs
```

Screenshot: `.tmp/keuangan-petani/`, `.tmp/keuangan-petani-2/` … `-5/`, `.tmp/keuangan-mobile/`, `.tmp/keuangan-chart/`.

### Angka acuan (ground truth dari `references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx`)

| Item RAB | 22 | Pengeluaran hari ini | Rp 15.159.000 |
|---|---|---|---|
| — SAPRODI | 7 | + Sewa Lahan (dari RAB) | Rp 7.000.000 |
| — Jasa Alsintan | 4 | **Total Pengeluaran** | **Rp 22.159.000** |
| — Tenaga Kerja | 7 | Pemasukan (GKP) | Rp 45.500.000 |
| — Biaya Tetap | 1 | **Laba / Rugi** | **Rp 23.341.000** |
| — Lain-lain | 2 | Kebutuhan modal kerja | Rp 18.869.000 |
| — Penerimaan | 1 | HPP / BEP / B-C | 3.165.571 / 3.409,08 / 1,053 |

---

# BAGIAN III — RENCANA PERBAIKAN TERPUSAT

27 temuan dari Bagian I + Bagian II dikelompokkan jadi **6 klaster akar masalah**. Pengelompokan ini penting karena beberapa bug punya **satu penyebab yang sama** — diperbaiki sekali, beberapa item ikut tertutup.

## 18.1 Peta Klaster

| Klaster | Temuan | Jumlah | Akar masalah | viejas satu founding |
| :--- | :--- | :---: | :--- | :---: |
| **A** | Integritas data Stok | 3 | `useStok.ts`, `mapBatch`, `PageHeader` | 3 |
| **B** | Sumber data harga | 3 | Query Supabase dari browser, bukan via API | 3 |
| **C** | Kelengkapan import Excel | 4 | Parser baca 2 dari 5 sheet; baris turunan dibuang; `skippedRows` tidak dirender | 4 |
| **D** | Aplikasi tidak menjelaskan dirinya | 5 | Tidak ada helper text / empty state / template | 5 |
| **E** | Kualitas teks & aksesibilitas | 7 | Salah string, render ganda, kurang `aria` | 7 |
| **F** | Platform & infra | 5 | `next.config`, `.next/dev`, `proxy.ts`, flag produksi | 5 |

**Konsekuensi pengelompokan:** 4 klaster (C, D, E, sebagian B) bisa ditutup dengan **5–6 file** saja. Klaster A butuh 3 file. Konten bab ini berguna karena beberapa bug berasal dari satu keputusan yang sama.

---

## 18.2 Klaster A — Integritas Data Stok (3 blocker)

| # | Temuan | File | Perbaikan | Effort |
|---|---|---|---|---|
| A-1 | Batch kedaluwarsa tetap "Aman" | `lib/api.ts:459-476` (`mapBatch`) | Hitung status saat baca | **XS** |
| A-2 | Data dummy bocor + KPI nol | `hooks/useStok.ts:98-105, 116-119` | `batches=[]` + `computeLocalSummary([])` untuk guest | S |
| A-3 | "Tambah Batch" hilang di HP | `components/shared/page/PageHeader.tsx:40` + `StokView.tsx:262-271` | Beri `actions` jalur mobile | S |

**A-1 hanya satu baris, dan risikonya paling tinggi:**

```ts
// lib/api.ts — di dalam mapBatch()
const derived = computeStockBatchStatus(row.stok_tersisa, row.berat_masuk, row.estimasi_kadaluarsa);
status: row.status === 'habis' ? 'habis' : derived,
```

`mapBatch` adalah satu-satunya choke point yang dipakai `stokApi.getAll` **dan** `stokApi.getSummary`, jadi satu perbaikan menutup KPI, tabel, banner `alertBatches`, dan grafik sekaligus. Perhatikan guard `row.status === 'habis'` — tanpa itu, batch yang ditutup manual akan "hidup lagi" karena `stok_tersisa` masih > 0.

**A-3 perlu audit lanjutan.** `PageHeader` menyembunyikan seluruh header (termasuk `actions`) di `xs`. Setelah A-3 diperbaiki di `StokView`, periksa juga: `CuacaView.tsx:124` (sudah ada fallback di baris 290), `KabarPasarView.tsx:65`, `FinanceProjectToolbar.tsx:441,475`. Pola yang sudah benar ada di `KalenderView.tsx:256` (tombol kedua di luar header) dan di Keuangan (`finance-add-transaction-mobile`).

---

## 18.3 Klaster B — Sumber Data Harga (3 bug, 1 arsitektur)

Ketiganya berasal dari satu keputusan: `hooks/useCommodityPrices.ts:54` melakukan `supabase.from('commodity_prices').select()` **langsung dari browser**, bukan lewat route server.

| # | Gejala | Akar masalah |
|---|---|---|
| B-1 | Kartu "HARGA CABAI RAWIT" selalu `—/kg` | `useDashboardHomeController.ts:53-60` memakai `useCommodityPrices`, padahal `summary.price` di baris 46-52 **sudah benar** (`todayPrice: 65530`) dan tidak pernah dipakai |
| B-2 | Peta harga Kabar Pasar kosong 100% | `useCommodityPrices` yang sama |
| B-3 | Donut Keuangan salah total & salah label | `financeCategoryChart.ts:45-52` → `resolveFinanceCategory` mencocokkan isi `keterangan` ke alias kategori bawaan, hingga "Pupuk" berisi benih + herbisida + dolomit + karung |

**Urutan pengerjaan yang benar:**

1. **B-1 duluan** — hapus pemanggilan `useCommodityPrices` dari controller dashboard, pakai `summary.price`. Perubahan terkecil, dampak paling terlihat (hargaappeared di layar depan).
2. **B-2** — pindahkan query region-price ke route server. `/api/dashboard/summary` sudah mengembalikannya; cukup expose atau tambahkan field.
3. **B-3** — setelah B-2, grupkan donut berdasarkan **kategori RAB** (sumber yang sama dengan tab RAB & Laba Rugi) sehingga angkanya identik di ketiga tempat. Konsekuensi sampingnya dreaded: slice "Pupuk" yang menyesatkan hilang dengan sendirinya.

**Kenapa ini penting:** B-3 menyebabkan petani melihat pengeluaran pupuk Rp 1.944.000 padahal aslinya Rp 839.500. Ini kesalahan yang costing uang, bukan cosmetics.

---

## 18.4 Klaster C — Kelengkapan Import Excel (2 blocker, 2 high)

| # | Temuan | Akar masalah | Effort |
|---|---|---|---|
| C-1 | HPP/BEP/B-C Ratio diimpor 0 | `rabExcel.ts:307-314` membuang semua baris `plannedTotal === 0` | **M** |
| C-2 | Asumsi pembiayaan tidak diimpor | `parseRabWorkbook` hanya membuka 2 dari 5 sheet | M |
| C-3 | "14 baris dilewati" tanpa rincian | `skippedRows` tersimpan di `useRabController.ts:606` tapi tidak dirender di `RabImportDialog` | **S** |
| C-4 | Rekonsiliasi tidak cek pendapatan | `rabExcel.ts:246-257` `captureDeclaredTotal` hanya menerima baris `^(total\|subtotal\|jumlah)` | S |

**C-1 — ubah cabang `plannedTotal === 0` jadi penyimpan, bukan buang:**

```ts
// sekarang: semua baris tanpa total계획 di-skip
if (plannedTotal === 0) { skippedRows.push(...); return; }

// usulan: deteksi baris turunan berdasarkan nama, simpan sebagai data turunan
if (plannedTotal === 0) {
  if (/^(produksi|hasil panen|panen)$/i.test(description)) derived.productionVolume = volume;
  else if (/^(harga pasar|harga jual)/i.test(description)) derived.pricePerUnit = unitPrice;
  else if (/^(hpp|harga pokok)/i.test(description)) derived.hppFromFile = plannedTotal;   // untuk validasi
  skippedRows.push({ rowNumber, description, reason: 'baris turunan — disimpan untuk perhitungan HPP/BEP' });
  return;
}
```

**C-2 — tambah sheet reader ketiganya.** Sau sudah ada `buildFinanceExportWorkbook` yang menulis sheet "Arus Kas" dengan header `Bulan | Kas Masuk | Kas Keluar | Kas Bersih | Kumulatif` — jadi round-trip export→import untuk sheet itu realistis.

**C-3 — render `skippedRows` sebagai tabel collapsible** (kolom Baris | Uraian | Alasan), lalu **pisahkan dua kategori visual**:
- *"Baris rekap dilewati (7, wajar — ini baris TOTAL)"*
- *"Data tidak terbaca, perlu diperiksa (7)"* → 6 di antaranya berisi Produksi, Harga pasar, Keuntungan, HPP, BEP, B/C ratio

**C-4 — dua bagian:** (1) terima baris "Keuntungan"/"Laba"/"Surplus" sebagai pembanding kategori income; (2) kalau kategori income tidak punya pembanding, tetap tampilkan baris dengan "— / tidak diperiksa" supaya petani tahu bagian itu **tidak diverifikasi**, bukan **lolos**.

---

## 18.5 Klaster D — Aplikasi Tidak Menjelaskan Dirinya (5 temuan)

Ini klaster dengan rasio dampak/effort tertinggi. Hampir semua perbaikannya cuma **menambah kalimat**.

| # | Temuan | Perbaikan | Effort |
|---|---|---|---|
| D-1 | Skenario Proyeksi default tanpa penjelasan → hasil akhir "tidak punya data" | Helper text + auto-detect | **S** |
| D-2 | 6 jargon tanpa penjelasan | Tooltip satu kalimat per tab | S |
| D-3 | Dialog import tidak jelaskan format file, tidak ada template | Link "Unduh template" + syarat kolom + diagnosis per sheet | M |
| D-4 | Guide memblokir semua tap + muncul tidak stabil | `pointer-events` + timeout | M |
| D-5 | 2 panel Cuaca kosong ±500px, hero oranye seperti peringatan | Empty state + palet netral | S |

**D-1 adalah yang paling penting di seluruh laporan.** Petani melakukan semua langkah dengan benar, lalu diberi tahu datanya "belum ada" — dan itu karena satu dropdown yang tidak menjelaskan diri. Perbaikannya:

```tsx
// RabImportDialog.tsx — di bawah <Select>
<Typography variant="caption" color="text.secondary">
  Rencana = biaya yang kamuritiesCRIBEKN sebelum autorisation. Aktual = catatan yang sudah terjadi.
  File yang berisi transaksi bertanggal lampau sebaiknya masuk ke Aktual.
</Typography>
```

Plus deteksi otomatis di `useRabController`: kalau `min(tanggal transaksi) < hari ini`, pre-select **Aktual** dan beri tahu. Informasi itu sudah ada di hasil parse — cuma tidak dipakai.

---

## 18.6 Klaster E — Kualitas Teks & Aksesibilitas (7 temuan, semua kecil)

| # | Temuan | File | Effort |
|---|---|---|---|
| E-1 | Judul dashboard tulis "Akun." | `useDashboardHomeController.ts:39` — buang `email.split('@')[0]` dari heading utama | XS |
| E-2 | Judul berita dobel (16/16 kartu) | Render `snippet` hanya jika beda dari `title` | XS |
| E-3 | Validasi email login tak tampil (bubble Inggris) | `LoginView.tsx:113-124` — hapus `required`, andalkan Zod seperti `RegisterView` | **XS** |
| E-4 | "Kirim Pesan Uji Coba (Telegram" terpotong | `messages/id.json` + `en.json` | XS |
| E-5 | Badge "Grade A" dobel di kartu batch | Render grade sekali | XS |
| E-6 | Tombol kembali Pengaturan tanpa `aria-label` | `PengaturanView.tsx:355-360` | XS |
| E-7 | Peringatan "Sewa lahan" menyesatkan | `rabExcel.ts:332-341` — deteksi pembagian musim, ubah nada | S |

**Tujuh item ini bisa dikerjakan satu afternoon** dan masing-masing cuma beberapa baris.

**E-3 perlu hati-hati:** `required` sengaja ada di `FormInput` itu untuk semantics, jadi lebih baik tambahkan `noValidate` pada `<form>` — itu memperbaiki tanpa menghapus atribut semantik.

---

## 18.7 Klaster F — Platform & Infra (5 temuan)

| # | Temuan | Perbaikan | Effort |
|---|---|---|---|
| F-1 | `127.0.0.1` → React tidak hydrate, app mati total tanpa pesan error | `allowedDevOrigins` di `next.config.ts` | **XS** |
| F-2 | `.next/dev` korup → semua `/api/**` balas 404 HTML | Dokumentasikan di README | XS |
| F-3 | "Masuk sebagai Tamu" hard-enabled | Gate `NODE_ENV === 'development'` | XS |
| F-4 | Panel notifikasi disabled diam-diam (401) | Empty state + CTA login | S |
| F-5 | `POST /api/analytics/events` selalu batal | Cek `proxy.ts` + `keepalive` | S |

**F-1 dan F-2 adalah jebakan yang mengunci developer selama berjam-jam.** F-1 menganggap "aplikasinya rusak total" padahal cuma beda hostname. F-2 menganggap "semua API rusak" padahal cuma cache dev. Keduanya tanpa pesan error di terminal.

**F-3 adalah risiko produksi yang belum tersadar.** `const localLoginEnabled = true` adalah perubahan lokal yang belum di-commit (`useLoginController.ts:30`). Kalau ikut ter-deploy ke Vercel, siapa pun bisa masuk ke aplikasi tanpa akun. Perlu juga timeout + pesan jelas untuk kasus redirect yang mentok (1 dari 4 percobaan).

---

## 18.8 Urutan Pengerjaan yang Disarankan

**Tahap 0 — Sebelum apa pun (½ hari)**

1. **Aktifkan satu project Playwright mobile** (`playwright.config.ts:56-62` masih di-comment-out). Tanpa ini, semua temuan mobile bisa recur diam-diam.
2. Tambah 1 test: import `references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx` → assert 3 angka (45.500.000 / 22.159.000 / 23.341.000). Sekarang sudah benar; test ini mengunci akurasi yang ada.

**Tahap 1 — Bean-count yang kecil, dampak besar (1–2 hari)**

| Urutan | Item | Alasan |
|---|---|---|
| 1 | **A-1** | Satu baris, menutup risiko keselamatan pangan |
| 2 | **F-1**, **F-3** | Dua baris config, menutup jebakan dev + risiko produksi |
| 3 | **B-1** | Hapus satu hook, harga langsung tampil di dashboard |
| 4 | **E-1, E-2, E-3, E-4, E-5, E-6** | 6 item XS, satu afternoon |
| 5 | **A-2** | Hentikan kebocoran mock data |
| 6 | **A-3** | Kembalikan "Tambah Batch" ke HP |

**Tahap 2 — Petani bisa export data-nya dengan benar (2–3 hari)**

7. **D-1** (skenario) — kalau tidak, semua import jadi bermakna ganda bagi petani
8. **C-3**, **C-4** (rincian baris dilewati + rekonsiliasi pendapatan)
9. **B-2**, **B-3** (peta harga + donut satu sumber kebenaran)
10. **C-1**, **C-2** (HPP/BEP/BC + asumsi pembiayaan)

**Tahap 3 — Petani bisa menemukan jalannya sendiri (2–3 hari)**

11. **D-2**, **D-5**, **D-3**, **D-4**
12. **E-7**, **F-4**, **F-5**

---

## 18.9 Ringkasan Effort

| Bucket | Item | Total effort |
| :--- | :--- | :--- |
| **XS (≤5 baris)** | A-1, E-1, E-2, E-3, E-4, E-5, E-6, F-1, F-2, F-3 | **10 item, ~1 hari** |
| **S (1 file, ≤30 baris)** | A-2, A-3, C-3, C-4, D-1, D-2, D-5, E-7, F-4, F-5 | **10 item, ~2 hari** |
| **M (arsitektur / parser)** | B-2, B-3, C-1, C-2, D-3, D-4 | **6 item, ~4–5 hari** |
| **Total** | — | **27 item** |

**Kabar baiknya:** 20 dari 27 item (74%) bisa selesai dalam ~3 hari kerja, karena 10 di antaranya literally beberapa baris. Yang mahal hanya 6 item klaster B dan C — dan tiga di antaranya (B-1, C-3, C-4) adalah perubahan yang **menghapus** kode, bukan menambah.

## 18.10 Yang Tidak Harus Diperbaiki (dari hasil verifikasi)

Agar tidak ada yang "memperbaiki" sesuatu yang sebenarnya sudah benar:

1. **Akurasi import sudah 100%.** Pemasukan, Pengeluaran, Laba/Rugi cocok persis. Arus Kas bulanan cocok persis dengan sheet Excel. Rekonsiliasi biaya nol selisih. **Jangan diubah tanpa test pengunci.**
2. **Parser tanggal sudah menangani format campuran** (string `"01 Ags"` + object `Date`) — 37/37 baris tanpa satu pun kecekcoulian.
3. **Menyuntik "Sewa lahan" Rp 7 juta** agar total cocok Laba Rugi adalah keputusan produk yang benar, bukan bug.
4. **MUI outlined `TextField` merender label 2× di DOM** (`<label>` + `<legend>`). Itu artefak `innerText`, visualnya normal. Bukan bug — sempat saya laporkan lalu saya disprove sendiri.
5. **Tombol "Konfirmasi & Simpan" di HP bergerak 0px** selama 6,6 detik pengukuran._click timeout yang saya lihat pertama adalah kompilasi on-demand Turbopack, bukan masalah app.
6. **"Catat Transaksi" tidak ada di DOM saat belum ada proyek** itu benar (empty state-nya sudah benar). Begitu proyek dibuat, FAB-nya muncul.
7. **Error handling asumsi sudah jujur** — "Fitur asumsi tidak tersedia di mode tamu" muncul jelas, bukan diam-diam gagal. Yang perlu diubah hanya isi pesannya (E-7 pola yang sama).
---

# BAGIAN IV — STATUS PERBAIKAN

Bagian ini mencatat perbaikan yang **sudah dikerjakan dan diverifikasi**, serta yang masih tersisa. Setiap item punya bukti pengujian, bukan klaim.

## 19.1 Sudah Selesai (12 item)

| # | Temuan | File yang diubah | Bukti |
|---|---|---|---|
| **A-1** | Batch kedaluwarsa tetap "Aman" | `lib/api.ts` (`mapBatch`), `lib/server/stok/batches.ts` (`mapBatchRow`) | `computeStatus` dipanggil saat baca, bukan hanya saat tulis. Guard `row.status === 'habis'` mencegah batch yang ditutup manual "hidup lagi". |
| **F-1** | `127.0.0.1` → React tidak hydrate | `next.config.ts` (`allowedDevOrigins`) | Dev server sekarang melayani `127.0.0.1`, `localhost`, dan `0.0.0.0`. |
| **F-3** | Guest login hard-enabled + redirect mentok | `controllers/login/useLoginController.ts` | `localLoginEnabled = process.env.NODE_ENV === 'development'` + timeout 5 detik yang memunculkan pesan error kalau redirect gagal. |
| **B-1** | Harga cabai selalu `—/kg` | `controllers/dashboard-home/useDashboardHomeController.ts` | `useCommodityPrices` dihapus dari controller; harga kini dari `summary.price` yang sudah benar. |
| **E-1** | Judul dashboard tulis "Akun." | `controllers/dashboard-home/useDashboardHomeController.ts` | `email.split('@')[0]` dihapus dari heading utama. |
| **A-2** | Data dummy bocor ke pengguna baru | `hooks/useStok.ts` | `MOCK_BATCHES`/`MOCK_MUTATIONS` dihapus; state awal `[]` + `computeLocalSummary([])`. |
| **A-3** | "Tambah Batch" hilang di HP | `app/dashboard/stok/_components/StokView.tsx` | Row aksi mobile memakai `Stack` + dua `Button` penuh, tampil di bawah `md`. |
| **E-3** | Validasi email login berbahasa Inggris | `app/login/_components/LoginView.tsx` | `noValidate` pada `<form>` → pesan Zod Indonesia tampil, konsisten dengan form Daftar. |
| **E-5** | Badge "Grade A" dobel | `app/dashboard/stok/_components/StokView.tsx` | `StatusChip` dan `GradeChip` yang ter-render dua kali dihapus satu pasang. |
| **E-6** | Tombol kembali tanpa `aria-label` | `app/dashboard/pengaturan/_components/PengaturanView.tsx` + `messages/{id,en}.json` | Kunci baru `Settings.backToMenu`. |
| **E-2** | Judul berita dobel (16/16 kartu) | `components/news/NewsCard.tsx` | `snippet` yang identik dengan `title` (case-insensitive) tidak lagi dirender. |
| **C-3** | "14 baris dilewati" tanpa rincian | `app/dashboard/keuangan/_components/RabImportDialog.tsx` | Tabel **Baris \| Uraian \| Alasan** di tahap hasil, `data-testid="rab-import-skipped-rows"`. |

### C-4 dan D-1 — dua perbaikan yang akarnya lebih dalam dari dugaan awal

**C-4 (rekonsiliasi pendapatan)** ternyata punya **dua** sebab, bukan satu:

1. `captureDeclaredTotal` hanya menerima baris `^(total|subtotal|jumlah)`, dan file audit menutup bagian pendapatan dengan baris **"Keuntungan"** — jadi tidak pernah ada pembanding.
2. Cabang lebih atas di `rabExcel.ts` (**`if (/estimasi pendapatan|pendapatan|penerimaan/i.test(description) && volume === 0 && unitPrice === 0)`**) ternyata juga memanggil `return` lebih dulu — artinya baris **"TOTAL PENDAPATAN" pun ikut hilang** tanpa pernah dicatat. Konsekuensinya: untuk file Excel *apa pun* yang punya "TOTAL PENDAPATAN", sisi pendapatan tetap tidak pernah tervalidasi.

Perbaikannya: cabang tersebut kini memanggil `captureDeclaredTotal` lebih dulu (hanya kalau `currentType === 'income'`), dan `reconciliation` melaporkan **semua** kategori yang punya item dengan field baru `checked`. Kategori tanpa pembanding tampil sebagai **"— / tidak diperiksa"** — bukan disembunyikan, karena diam-diamnya itulah yang membuat tampilan seolah "sudah tervalidasi".

Terverifikasi di layar:

```
Kelompok        Total di Excel   Hasil Hitung      Selisih
SAPRODI         Rp 2.449.000     Rp 2.449.000      Rp 0
JASA ALSINTAN   Rp 8.150.000     Rp 8.150.000      Rp 0
TENAGA KERJA    Rp 3.360.000     Rp 3.360.000      Rp 0
BIAYA TETAP     Rp 7.000.000     Rp 7.000.000      Rp 0
LAIN - LAIN     Rp 1.200.000     Rp 1.200.000      Rp 0
Pendapatan      —                Rp 45.500.000     tidak diperiksa   ← baru
```

**D-1 (mode skenario)** kini punya dua lapis:

1. `FormHelperText` permanen di bawah dropdown: *"Rencana = biaya yang direncanakan sebelum mulai bertani. Aktual = catatan yang benar-benar sudah terjadi. File yang berisi transaksi bertanggal lampau sebaiknya masuk ke Aktual."*
2. Peringatan otomatis di tahap pratinjau (tempat terakhir petitions bisa berubah pikiran sebelum menekan Simpan). Data untuk ini **sudah ada** di hasil parse — `tanggal` tiap transaksi — cuma sebelumnya tidak dipakai. Terverifikasi:

> *"19 dari 38 transaksi sudah bertanggal sebelum hari ini, jadi ini catatan nyata — bukan rencana. Kalau disimpan ke 'Rencana (Proyeksi)', tab Perbandingan akan menampilkan 'Realisasi belum memiliki data'. Pilih 'Aktual (Realisasi)' lewat Batal lalu mulai ulang impor, atau lanjutkan bila memang ingin menyimpan sebagai rencana."*

## 19.2 B-3 — Donut kini satu sumber kebenaran dengan tab RAB

Sebelum:

```
Biaya Tetap 7.000.000 | Tenaga Kerja 3.360.000 | Jasa Alsintan 6.650.000 ❌
Lain Lain 1.200.000 | Pupuk 1.944.000 ❌ | Irigasi & Air 1.500.000 | Pestisida 505.000
```

Sesudah:

```
BIAYA TETAP   Rp 7.000.000  31,6%
TENAGA KERJA  Rp 3.360.000  15,2%
JASA ALSINTAN Rp 8.150.000  36,8%   ← kini sama dengan Laba Rugi
LAIN - LAIN   Rp 1.200.000   5,4%
SAPRODI       Rp 2.449.000  11,1%
Total = Rp 22.159.000 ✓
```

Slice "Pupuk Rp 1.944.000" — yang berisi benih + herbisida + dolomit + karung dan membuat anggaran
pupuk over-budget 2,3× — **hilang**. Setiap angka kini identik dengan subtotal di tab RAB maupun Laba Rugi.

Perubahan: `buildFinanceExpensePieData` (`controllers/keuangan/financeCategoryChart.ts`) kini menerima `rabCategoryNameById` dan memakai **kategori RAB** untuk transaksi yang tertaut (`rabCategoryId`), bukan fuzzy-match ke daftar kategori bawaan. Transaksi yang tidak tertaut RAB (dicatat manual) tetap memakai taksonomi bawaan.

## 19.3 Guardrail — Test Regresi Baru

`playwright.config.ts` sekarang punya project **Mobile Chrome** (sebelumnya di-comment-out), karena 4 dari 6 temuan Bagian I/II hanya muncul di viewport mobile dan tidak akan pernah tertangkap CI.

`e2e/regresi-perbaikan-ux.spec.ts` — 6 test, semua lulus di Pixel 5:

| Test | Mengunci apa |
|---|---|
| import RAB menghasilkan angka sama persis dengan file | 45.500.000 / 22.159.000 / 23.341.000 |
| rekonsiliasi menandai pendapatan "tidak diperiksa" | C-4 |
| baris dilewati tampil dengan alasannya | C-3 |
| form login pakai pesan Indonesia | E-3 |
| "Tambah Batch" tersedia di mobile | A-3 |
| Stok tidak menampilkan data dummy | A-2 |

```powershell
npx playwright test regresi-perbaikan-ux --project="Mobile Chrome"
```

Test pertama sengaja mengunci angka yang **sudah benar** — tujuannya supaya regresi pada parser/importer langsung ketahuan, bukan agar app "mulai benar".

## 19.4 Verifikasi quality gate

| Pemeriksaan | Hasil |
|---|---|
| `npm run lint` | **0 error**, 23 warning (semua pre-existing) |
| `tsc --noEmit` | **bersih** |
| `npm run i18n:check` | lulus |
| `npm run test` (vitest) | **596 / 596 lulus**, 130 file |
| `playwright test regresi-perbaikan-ux --project="Mobile Chrome"` | **6 / 6 lulus** |
| Simulasi keuangan penuh (`06-keuangan-petani-awam.mjs`) | Akurasi tetap **22/22 item, 38/38 transaksi, Rp 45.500.000 / 22.159.000 / 23.341.000** — tanpa regresi numerik |

## 19.5 Belum Selesai (15 item)

| Prioritas | Item | Alasan belum dikerjakan |
| :--- | :--- | :--- |
| P0 | **C-1** HPP/BEP/B-C Ratio diimpor 0 | Butuh kontrak baru untuk "baris turunan" di parser +-ui asumsi. Estimasi M. |
| P0 | **C-2** Asumsi pembiayaan tidak diimpor | Butuh sheet reader ketiga. Estimasi M. |
| P1 | **B-2** Peta harga Kabar Pasar kosong | Mirip B-1 tapi butuh route server untuk data per-region. Estimasi M. |
| P1 | **D-3** Dialog import tanpa format/template | Butuh generator template + diagnosis per sheet. Estimasi M. |
| P1 | **D-4** Guide memblokir tap + muncul tidak stabil | Butuh keputusan desain soal focus-trap. Estimasi M. |
| P2 | **D-2** Enam jargon tanpa tooltip | Quick win, tapi butuh naskah tooltip 6 tab. |
| P2 | **D-5** Dua panel Cuaca kosong | Butuh keputusan desain palet + empty state. |
| P2 | **E-7** Peringatan "Sewa lahan" menyesatkan | Butuh heuristik "pembagian musim". |
| P2 | **F-4** Panel notifikasi disabled diam-diam | Butuh empty state + CTA. |
| P2 | **F-5** `/api/analytics/events` selalu batal | Perlu investigasi `proxy.ts`. |
| P1 | **H-1** Tidak ada pencarian lokasi manual | Endpoint sudah ada, tinggal pasang UI. |
| P1 | **H-3** Judul berita dobel | Sudah diperbaiki (E-2). |
| P2 | **H-5** Halaman Cuaca kosong | Sama dengan D-5. |
| P1 | **H-4** Guide onboarding | Sama dengan D-4. |
| P2 | **H-2** Hargaونسatility | Sudah diperbaiki (B-1). |