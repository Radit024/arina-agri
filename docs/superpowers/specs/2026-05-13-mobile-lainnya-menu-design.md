# Mobile "Lainnya" Bottom Sheet Menu - Design Spec

## 1. Ringkasan
Menambahkan akses fitur yang tidak ditampilkan pada bottom nav melalui menu "Lainnya" berbentuk bottom sheet full-screen di mobile. Tujuannya agar semua fitur tetap terjangkau tanpa membuat bottom nav padat, dan tanpa menambah beban di dashboard.

## 2. Tujuan
- Menyediakan akses cepat ke fitur di luar bottom nav pada perangkat mobile.
- Menjaga bottom nav tetap ringkas (4 item utama + 1 item Lainnya).
- Menampilkan fitur tambahan secara terstruktur dan rapi melalui pengelompokan.

## 3. Non-Goal
- Tidak mengubah struktur rute utama selain penambahan akses via Lainnya.
- Tidak menambah fitur baru di luar kebutuhan navigasi.
- Tidak mengubah konten halaman fitur yang sudah ada.

## 4. Informasi Arsitektur Navigasi
### 4.1 Bottom Nav (Mobile)
- Item yang ditampilkan:
  1) Dashboard
  2) Keuangan (Pencatatan)
  3) AI (mengarah ke Ensiklopedia)
  4) Kalender
  5) Lainnya

### 4.2 Behavior Aktif
- Saat berada di rute yang **bukan** bagian bottom nav (mis. /dashboard/stok, /dashboard/cuaca, /dashboard/kabar-pasar, /dashboard/pengaturan), status aktif bottom nav adalah **Lainnya**.

## 5. Struktur Menu Lainnya
### 5.1 Kelompok
- Operasional
  - Stok
- Informasi
  - Cuaca
  - Kabar Pasar
- Pengaturan
  - Pengaturan

### 5.2 Interaksi
- Menekan "Lainnya" membuka bottom sheet full-screen.
- Menekan item menu menutup sheet dan melakukan navigasi ke rute terkait.
- Sheet bisa ditutup dengan:
  - swipe down
  - tap di backdrop
  - tombol tutup pada header sheet

## 6. Komponen UI
- MobileBottomNav: menambahkan item Lainnya dan mengatur state aktif.
- MobileFeatureSheet (baru): bottom sheet full-screen dengan list item terkelompok.
- Reuse ikon dari sidebar untuk konsistensi visual.

## 7. Data Flow
- Tidak ada data fetch baru.
- Menu Lainnya hanya memicu navigasi client-side.

## 8. Error Handling
- Jika rute tidak tersedia, tampilkan toast sederhana: "Fitur belum tersedia".

## 9. i18n
- Label bottom nav, judul kelompok, dan item diambil dari existing translation keys jika tersedia.
- Jika belum tersedia, tambahkan key baru untuk: Lainnya, Operasional, Informasi, Pengaturan, Stok, Cuaca, Kabar Pasar.

## 10. Aksesibilitas
- Sheet memiliki judul yang terbaca screen reader.
- Tombol tutup memiliki aria-label.
- Fokus dikurung di dalam sheet saat terbuka, dan kembali ke tombol pemicu saat ditutup.

## 11. Testing
- Unit test: bottom nav menampilkan 5 item, termasuk Lainnya.
- Unit test: saat rute non-bottom-nav aktif, bottom nav menunjuk Lainnya.
- Interaction test: membuka sheet, memilih item, navigasi berhasil dan sheet tertutup.

## 12. Catatan Implementasi
- Implementasi mengikuti pola MUI Bottom Sheet/Drawer pada mobile.
- Gunakan Suspense boundary bila membutuhkan hooks search params di lingkungan App Router.
