# Panduan Perbaikan Aplikasi Arina Agri (Post-Login)

Dokumen ini berisi panduan komprehensif untuk memperbaiki isu antarmuka pengguna (UI), pengalaman pengguna (UX), serta fungsionalitas di dalam aplikasi Arina Agri (area *post-login*). Panduan ini disusun berdasarkan evaluasi yang dilakukan untuk memastikan konsistensi desain dan kelancaran interaksi.

---

## 1. Konsistensi UI/UX & Komponen Visual

Penyelarasan komponen dasar akan meningkatkan persepsi profesional dan mengurangi kebingungan visual.

### 1.1. Proporsi dan *Spacing* Komponen
*   **Masalah:** Kontainer (termasuk *skeleton loading*) pada halaman *Dashboard* dan menu lainnya terlalu menempel dengan tepi layar.
*   **Tindakan:**
    *   Tambahkan *global padding* atau *margin* pada *container wrapper* utama (misalnya `padding: 24px` atau kelas margin Tailwind yang relevan).
    *   Pastikan *spacing* konsisten di semua ukuran layar (responsif).

### 1.2. Aksesibilitas dan Kontras Warna
*   **Masalah:** Pada *Dark Mode*, tombol *action* (seperti edit/hapus pada tabel Pencatatan Keuangan) sulit dilihat karena warnanya (hijau) membaur dengan warna latar yang gelap.
*   **Tindakan:**
    *   Gunakan palet warna dengan rasio kontras yang memenuhi standar WCAG (minimal 4.5:1).
    *   Pertimbangkan penggunaan *background* tombol dengan *opacity* ringan (misal: hijau terang dengan *alpha* 20%) atau buat teks/ikon menjadi putih solid agar lebih menonjol di *Dark Mode*.

### 1.3. Standarisasi *Border Radius*
*   **Masalah:** Ketidakkonsistenan bentuk sudut komponen. Terdapat tombol yang sangat melengkung (*pill-shaped*), namun di menu lain berbentuk kotak bersudut tajam (*sharp corners*).
*   **Tindakan:**
    *   Tetapkan satu variabel CSS *global* untuk *border-radius* (misalnya: `border-radius: 8px` untuk tombol dan kartu).
    *   Terapkan variabel ini pada semua komponen agar seragam di seluruh aplikasi.

### 1.4. Tipografi Header & Ikon
*   **Masalah:** Ukuran font dan *styling* pada judul (*Title*) dan sub-judul (*Subtitle*) halaman belum memiliki acuan pasti. Penggunaan ikon pada judul halaman juga tidak konsisten.
*   **Tindakan:**
    *   Buat komponen *Header* standar yang dapat digunakan ulang (*reusable component*).
    *   Atur hierarki font (H1, H2, dst.) yang baku.
    *   Putuskan satu aturan: gunakan ikon untuk semua judul halaman, atau hilangkan sama sekali agar bersih.

### 1.5. Pembaruan *Toast Notification*
*   **Masalah:** Komponen *toast* (notifikasi seperti "Masukan terkirim") terlalu sempit, menyebabkan teks terpotong atau sulit dibaca cepat.
*   **Tindakan:** Perlebar ukuran *min-width* dari komponen *toast* agar pesan notifikasi dapat tampil dengan leluasa.

---

## 2. Logika *Rendering* & Perbaikan *Layout*

Fokus perbaikan pada alur *rendering* komponen agar tidak membingungkan pengguna saat memuat data.

### 2.1. Sinkronisasi *Onboarding Guide* (*Tour*)
*   **Masalah:** Jendela *highlight* panduan sering muncul sebelum komponen utama (misal: peta Berita BMKG) selesai di-*render*.
*   **Tindakan:**
    *   Ubah logika *trigger tour*.
    *   Tambahkan kondisi (*state*) yang memastikan *guide* hanya muncul jika komponen target memiliki status `isLoaded = true`.

### 2.2. Formulir Input *Multiline* (Laporan *Bug*)
*   **Masalah:** Input teks yang menggunakan tombol 'Enter' untuk baris baru (*newline*) dirender menjadi satu baris memanjang saat ditampilkan.
*   **Tindakan:**
    *   Pastikan *output* teks menggunakan CSS `white-space: pre-wrap;` atau terapkan fungsi pembacaan/penggantian `
` menjadi `<br />` di sisi *frontend* saat merender hasil input.

### 2.3. Perombakan Layout Tombol "Nyalakan GPS"
*   **Masalah:** Tombol ini memakan satu baris penuh (*full-width*), menyisakan ruang kosong yang sangat besar. Teks status lokasi juga muncul berulang kali secara redundan.
*   **Tindakan:**
    *   Integrasikan tombol "Nyalakan GPS" ke dalam *header* fitur cuaca atau buat ukurannya menjadi *inline-block* agar tidak memonopoli satu baris penuh.
    *   Bersihkan informasi lokasi yang redundan (cukup tampilkan satu kali status lokasi aktif secara jelas).

### 2.4. Pembersihan Redundansi di Smart Kalender
*   **Masalah:** Terdapat dua tombol "Tambah Jadwal" dengan fungsi yang sama di satu layar.
*   **Tindakan:**
    *   Hapus salah satu tombol (pertahankan yang posisinya lebih strategis/utama).
    *   Untuk area yang ditinggalkan, berikan *empty state* yang komunikatif, seperti teks: "Belum ada jadwal kegiatan ke depan. Klik 'Tambah Jadwal' untuk memulai."

### 2.5. Perbaikan *Tooltip* Menu Berita
*   **Masalah:** Kotak *highlight* panduan terpotong atau berjarak (*gap*) tidak rapi. Tombol "Berikutnya" di dalam *tooltip* mengalami *overflow* (keluar dari kotak).
*   **Tindakan:** Perbaiki *z-index*, *padding*, dan penempatan absolut (*absolute positioning*) pada komponen *tooltip* khusus halaman ini agar *bounding box*-nya tepat.

---

## 3. Peningkatan Fitur AI Chat & Navigasi

Perbaikan fungsionalitas asisten virtual dan pengelompokan menu agar lebih intuitif.

### 3.1. Dukungan *Markdown* & *LaTeX* pada AI Chat
*   **Masalah:** Respons AI tidak dapat merender teks berformat (*bold*, *italic*, kode) atau rumus matematika, membuat jawaban sulit dibaca.
*   **Tindakan:**
    *   Integrasikan *library* parser Markdown (seperti `react-markdown` jika menggunakan React).
    *   Tambahkan dukungan plugin *LaTeX* (misalnya menggunakan `remark-math` dan `rehype-katex`) agar asisten AI dapat merender formula/perhitungan agribisnis dengan benar.

### 3.2. Penyesuaian *Alignment* Area Chat
*   **Masalah:** Tombol saran (*quick prompt*) dan gelembung pesan (*chat bubble*) pada halaman awal tidak benar-benar berada di tengah layar (*center-aligned*).
*   **Tindakan:** Perbaiki pengaturan Flexbox atau CSS Grid pada wadah utama area *chat* agar posisi elemen sempurna di tengah secara vertikal dan horizontal.

### 3.3. Restrukturisasi Hierarki *Sidebar Menu*
*   **Masalah:** Urutan menu tidak mengikuti alur logika penggunaan harian.
*   **Tindakan:** Rombak dan kelompokkan susunan sidebar menu sebagai berikut:
    1.  **Informasi:**
        *   Dashboard
        *   Cuaca
        *   Berita
    2.  **Operasional / Alat:**
        *   Pencatatan Keuangan
        *   Manajemen Stok
        *   Smart Kalender
    3.  **Asisten:**
        *   AI Chat (Tempatkan di posisi akhir, bila perlu pisahkan dengan garis visual / *divider*).
