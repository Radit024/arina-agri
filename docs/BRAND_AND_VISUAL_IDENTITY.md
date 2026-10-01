# 🌾 Arina Agri — Brand Context & Visual Identity System

> **Versi Dokumentasi**: 1.0  
> **Terakhir Diperbarui**: 27 Agustus 2026  
> **Kategori**: Brand Identity, Design System & Social Media Guidelines

---

## 📖 Bagian 1: Tentang Arina Agri (Brand Context)

### 1.1. Profil & Definisi Produk
**Arina Agri** adalah platform digital berbasis kecerdasan buatan (AI) dan asisten cerdas yang dirancang khusus untuk membantu **petani dan pelaku agribisnis UMKM di Indonesia**. Aplikasi ini mendigitalkan seluruh siklus operasional pertanian harian—mulai dari perencanaan anggaran, pencatatan transaksi harian, manajemen inventaris hasil panen, pemantauan cuaca ekstrem, jadwal kerja lapangan, hingga konsultasi penyakit tanaman.

### 1.2. Visi & Misi
* **Visi**: Mewujudkan modernisasi dan kedaulatan ekonomi petani Indonesia melalui teknologi digital yang inklusif, mudah digunakan, dan berbasis data presisi.
* **Misi**:
  1. Memudahkan tata kelola keuangan pertanian secara transparan (perhitungan HPP, BEP, laba/rugi, dan proyeksi arus kas).
  2. Mengurangi risiko gagal panen melalui integrasi peringatan dini cuaca BMKG dan pemantauan pasar berkala.
  3. Menyediakan akses konsultasi budidaya dan proteksi tanaman yang cepat melalui AI Ensiklopedia.

### 1.3. Target Pengguna
* **Petani Komoditas Bernilai Tinggi (High-Value Crops)**: Terutama petani cabai rawit merah, hortikultura, dan sayur-mayur.
* **Pelaku Agribisnis & Pengepul UMKM**: Pelaku usaha yang mengelola stok gudang, distribusi panen, dan pencatatan kas multi-lahan/proyek.
* **Kelompok Tani (Poktan / Gapoktan)**: Organisasi petani yang membutuhkan visibilitas jadwal kerja dan transparansi RAB.

### 1.4. Fitur Utama Platform
1. **📊 Dashboard Operasional**: Ringkasan KPI keuangan bulanan, tren kas, peringatan risiko cuaca, serta pantauan harga komoditas terkini.
2. **💰 Manajemen Keuangan & Analisis AI**: Pencatatan pemasukan/pengeluaran, simulasi Rencana Anggaran Biaya (RAB) vs Realisasi, kalkulator HPP & BEP, ekspor Excel/PDF, serta laporan audit keuangan otomatis berbasis Gemini AI.
3. **📦 Manajemen Stok Panen**: Pencatatan batch hasil panen (grade, bobot, modal, harga jual), lokasi gudang, masa kadaluarsa, dan mutasi keluar/masuk.
4. **🌦️ Cuaca BMKG & Lokasi**: Prakiraan cuaca 3 hari per level kecamatan/desa, radar peringatan dini bencana cuaca, serta notifikasi otomatis via WhatsApp/Telegram.
5. **📅 Smart Kalender Tani**: Perencanaan dan penjadwalan aktivitas pemupukan, penyemprotan pestisida, irigasi, dan panen dengan rekomendasi berbasis cuaca.
6. **📈 Kabar Pasar**: Feed berita pertanian terverifikasi dan peta persebaran harga komoditas (Siskaperbapo) se-Jawa Timur.
7. **🤖 Ensiklopedia AI**: Chatbot pertanian cerdas berbasis AI Gemini untuk diagnosis penyakit tanaman, rekomendasi penanganan hama, dan panduan budidaya.

### 1.5. Nilai & Karakter Brand (*Brand Persona*)
* **Earthy & Grounded**: Terhubung kuat dengan tanah, alam, dan kehidupan petani.
* **Reliable & Precise**: Data cuaca, kalkulasi keuangan, dan rekomendasi AI yang akurat dan dapat dipercaya.
* **Empowering & Friendly**: Mudah dipahami oleh petani dari berbagai latar belakang tanpa jargon teknologi yang rumit.
* **Modern & Clean**: Antarmuka bersih, cepat, ramah layar ponsel (*mobile-first*), dan nyaman di mata.

---

## 🎨 Bagian 2: Identitas Visual (*Visual Identity System*)

### 2.1. Filosofi Desain: *Earthy & Organic Modern*
Menghindari tampilan "korporat kaku" atau "abu-abu monokrom standar AI". Desain Arina Agri memadukan **warna hijau hutan alami, tanah liat hangat (terracotta), dan bulir padi emas** di atas kanvas **off-white hangat** yang bebas silau saat digunakan petani di luar ruangan.

---

### 2.2. Sistem Tipografi (Font Hierarchy)

Aplikasi menggunakan kombinasi dua Google Fonts resmi:

```
┌────────────────────────────────────────────────────────────────────────┐
│  HEADINGS & ACCENTS : SORA (Geometric, Modern, Bold & Distinct)       │
│  BODY & INTERFACE   : PLUS JAKARTA SANS (Clean, Humanist, High Legibility)│
└────────────────────────────────────────────────────────────────────────┘
```

| Tingkatan Teks | Font Family | Bobot (*Weight*) | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Display / Title H1–H2** | **Sora** | Bold (700) | Judul halaman utama, hero section, headline cover |
| **Section Header H3–H6** | **Sora** | SemiBold (600) | Judul kartu, sub-bagian modul, angka KPI besar |
| **Body Text / Paragraf** | **Plus Jakarta Sans** | Regular (400) | Penjelasan, teks artikel berita, deskripsi form |
| **UI Action / Button** | **Plus Jakarta Sans** | SemiBold (600) | Label tombol, tab navigasi, item menu |
| **Caption & Badges** | **Plus Jakarta Sans** | Medium (500) / SemiBold (600) | Status transaksi, tanggal, label data, watermark |

---

### 2.3. Palet Warna Resmi (Light Mode Palette)

#### A. Palet Utama (Brand & Status)

| Nama Token | Hex Code | RGB | Swatch | Fungsi / Makna |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Main** | `#2D6A4F` | `45, 106, 79` | 🟢 *Forest Green* | Warna utama aksi (CTA), navbar aktif, branding |
| **Primary Dark** | `#1B4332` | `27, 67, 50` | 🌲 *Deep Pine* | State hover, teks kontras tinggi di atas latar terang |
| **Primary Light** | `#D8F3DC` | `216, 243, 220` | 🍃 *Pale Mint* | Background chip/badge aktif, hover list |
| **Secondary / Terracotta** | `#E07A5F` | `224, 122, 95` | 🟠 *Terracotta* | Pengeluaran kas (*expense*), peringatan, tombol bahaya |
| **Secondary Light** | `#FCDACF` | `252, 218, 207` | 🌸 *Soft Terracotta* | Background alert error, badge status pengeluaran |
| **Success Main** | `#52B788` | `82, 183, 136` | 💚 *Meadow Green* | Pemasukan kas (*income*), status sukses/lunas |
| **Success Light** | `#D8F3DC` | `216, 243, 220` | 🍃 *Mint Cream* | Background badge status pemasukan |
| **Warning / Wheat** | `#F4E285` | `244, 226, 133` | 🟡 *Wheat Gold* | Status stok menipis, peringatan jadwal, cuaca |
| **Warning Dark** | `#B08C2C` | `176, 140, 44` | 🍯 *Ochre Gold* | Teks warning agar jelas terbaca di atas latar kuning |
| **Info / Sage** | `#74A57F` | `116, 165, 127` | 🌿 *Sage Green* | Status informasi netral, kategori tenaga kerja |

#### B. Palet Kanvas & Teks Netral (Warm Canvas)

| Nama Token | Hex Code | RGB | Swatch | Fungsi |
| :--- | :--- | :--- | :--- | :--- |
| **Background Canvas** | `#FAFAF8` | `250, 250, 248` | 📜 *Warm Off-White* | Kanvas latar belakang layar / halaman |
| **Card / Paper Surface** | `#FFFFFF` | `255, 255, 255` | ⚪ *Pure White* | Permukaan kartu, modal dialog, pop-up |
| **Text Primary** | `#2C2A29` | `44, 42, 41` | 🪵 *Dark Charcoal* | Warna teks utama, nominal uang, judul konten |
| **Text Secondary** | `#6B6866` | `107, 104, 102` | 🩶 *Warm Slate* | Teks sekunder, label formulir, timestamp |
| **Divider & Border** | `#EBEBE6` | `235, 235, 230` | 🥖 *Soft Sand* | Garis pemisah tabel, outline kartu & input field |

---

### 2.4. Palet Domain & Kategori Biaya Pertanian (Charts)

Digunakan pada visualisasi data diagram lingkaran (*pie chart*) dan grafik distribusi pengeluaran:

* 💧 **Irigasi & Pengairan**: `#2D6A4F` *(Forest Green)*
* 🌿 **Pupuk & Nutrisi Tanaman**: `#52B788` *(Meadow Green)*
* 👷 **Tenaga Kerja & Upah**: `#74A57F` *(Sage Green)*
* 🚜 **Alat, Mesin & Sewa Lahan**: `#F4E285` *(Wheat Gold)*
* 🧪 **Pestisida & Proteksi Tanaman**: `#E07A5F` *(Terracotta)*

---

### 2.5. Bentuk Geometris & Sudut (*Shape & Elevation*)
* **Radius Sudut (*Border Radius*)**:
  - Tombol / Aksi Input: `8px` (`rounded-lg`)
  - Badge / Chip: `8px – 12px`
  - Kartu Metrik & Widget: `16px – 24px`
  - Dialog / Modal: `24px`
* **Bayangan (*Elevation / Shadow*)**:
  - Halus dan natural: `0 8px 24px rgba(44, 42, 41, 0.04), 0 2px 8px rgba(44, 42, 41, 0.02)`

---

## 📱 Bagian 3: Panduan Desain Konten Media Sosial (Instagram)

### 3.1. Spesifikasi Format Kanvas

| Jenis Konten | Rasio Aspek | Resolusi Pixel | Keperluan |
| :--- | :--- | :--- | :--- |
| **Carousel / Single Post** | **4:5 (Portrait)** | **1080 × 1350 px** | **Pilihan Utama**. Mengisi layar ponsel maksimal saat scrolling feed. |
| **Square Post** | **1:1 (Kotak)** | **1080 × 1080 px** | Infografis ringkas, kutipan singkat, atau kuis tani. |
| **Story / Reels Cover** | **9:16 (Vertikal)** | **1080 × 1920 px** | Pengumuman cepat, live update harga pasar, teaser reels. |

---

### 3.2. Formula Komposisi Warna (Aturan 60-30-10)

```
┌────────────────────────────────────────────────────────────────────────┐
│  60% WARNA DOMINAN  : Warm Off-White (#FAFAF8) atau Putih (#FFFFFF)    │
│  30% STRUKTUR & TEKS: Dark Charcoal (#2C2A29) & Forest Green (#2D6A4F)│
│  10% WARNA AKSEN    : Terracotta (#E07A5F) atau Wheat Gold (#F4E285)   │
└────────────────────────────────────────────────────────────────────────┘
```
*(Catatan: Khusus slide cover/hook pertama, warna dominan 60% dapat dibalik menjadi Forest Green `#1B4332` untuk menciptakan kontras tinggi dan efek 'stop-scrolling').*

---

### 3.3. Panduan Ukuran Tipografi (Kanvas 1080 × 1350 px)

* **Hook / Judul Slide 1 (Sora Bold)**: `56px – 72px` *(Line height: 1.15 – 1.2)*
* **Sub-Header Poin Slide (Sora SemiBold)**: `36px – 44px`
* **Isi / Paragraf Edukasi (Plus Jakarta Sans Regular/Medium)**: `24px – 28px` *(Line height: 1.4 – 1.5)*
* **Badge Kategori / Tagar (Plus Jakarta Sans SemiBold)**: `18px – 22px`
* **Footer / Watermark Akun (Plus Jakarta Sans Medium)**: `16px – 20px`

---

### 3.4. Struktur Konten Carousel Instagram (Blueprint 5 Slide)

#### Slide 1 — Cover / Hook (Penarik Perhatian)
* **Tujuan**: Menghentikan jempol audiens (*stop scrolling*) dalam 3 detik pertama.
* **Elemen**:
  - Badge kategori di atas (misal: `💡 TIPS KEUANGAN TANI`).
  - Headline besar & provokatif menjawab masalah petani (misal: *"Modal Tanam Cabai 1 Hektar: Berapa Biaya Riil vs Potensi Untungnya?"*).
  - Mockup UI aplikasi atau foto berkualitas tinggi petani cabai dengan cahaya alami hangat (*warm golden hour*).
  - Logo Arina Agri di sudut atas.

#### Slide 2 s/d 4 — Konten Edukasi / Solusi (Isi Utama)
* **Tujuan**: Memberikan *value* nyata, data terstruktur, atau langkah praktis.
* **Elemen**:
  - Format kartu putih (`#FFFFFF`) di atas kanvas `#FAFAF8`.
  - Gunakan ikon duotone hijau/terracotta di samping setiap poin.
  - Teks terpecah dalam poin-poin ringkas (maksimal 3–4 baris per poin, hindari paragraf tebal).
  - Highlight kata kunci penting menggunakan warna Terracotta (`#E07A5F`) atau Forest Green (`#2D6A4F`).

#### Slide 5 — Call to Action / Penutup (CTA)
* **Tujuan**: Mengarahkan tindakan lanjutan (simpan, bagikan, coba aplikasi).
* **Elemen**:
  - Rangkuman 1 kalimat kesimpulan.
  - Ilustrasi tombol tiruan (*Pill Button*) berwarna Forest Green: **"Hitung Anggaran Tanilmu di Arina Agri"**.
  - Ikon ajakan: *Save Postingan Ini* 🔖 & *Share ke Teman Petani* ↗️.
  - Informasi akun: `@arina.agri` dan tautan website resmi.

---

### 3.5. Do's and Don'ts Desain Visual

✅ **Yang HARUS Dilakukan (Do's)**:
1. Gunakan sudut membulat (*border-radius* `24px`) pada kartu agar selaras dengan UI aplikasi.
2. Pertahankan pencahayaan foto yang hangat alami (*warm sunlight*).
3. Beri ruang kosong (*white space*) yang cukup di sekitar teks agar nyaman dibaca di layar HP kecil.
4. Gunakan logo resmi Arina Agri di setiap template secara konsisten.

❌ **Yang JANGAN Dilakukan (Don'ts)**:
1. Menggunakan warna merah neon atau hijau neon yang menyilaukan mata.
2. Menggunakan font bergaya kaligrafi dekoratif atau font kaku seperti Times New Roman / Arial.
3. Memakai latar belakang hitam pekat murni (`#000000`) atau teks hitam pekat murni.
4. Memasukkan terlalu banyak teks dalam satu slide tanpa hirarki kartu.

---
*© 2026 Arina Agri — Asisten Cerdas Petani Indonesia.*
