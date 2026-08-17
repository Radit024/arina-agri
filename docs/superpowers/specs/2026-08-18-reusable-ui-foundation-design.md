# Reusable UI Foundation - Design

Tanggal: 18 Agustus 2026  
Status: Disetujui untuk perencanaan dan implementasi

## Tujuan

Membangun fondasi komponen UI yang konsisten untuk aplikasi mobile-first Arina Agri, lalu memigrasikan titik duplikasi terbesar pada Keuangan dan Stok. Hasilnya harus menjaga tampilan dan perilaku bisnis yang ada, sembari membuat perbaikan mobile dari audit lebih mudah diterapkan pada halaman lain.

## Ruang lingkup

Termasuk:

- `AppDialog` dengan struktur header, konten, dan aksi yang konsisten serta perilaku fullscreen/bottom-sheet mobile.
- `TransactionFormFields` sebagai View bersama untuk input dan edit transaksi Keuangan.
- Ekstraksi `MasterDataDialog` dari folder Stok ke komponen shared.
- `ResponsiveDataView<T>` sebagai fondasi tabel desktop dan daftar/kartu mobile.
- `ContentState` dan `MetricCard` sebagai primitive state async dan metrik.
- Migrasi pilot pada Keuangan dan Stok, termasuk RAB/Buku Besar jika kontraknya sudah dapat dipakai tanpa mengubah data atau skenario.
- Test typecheck, lint, dan Playwright pada viewport mobile untuk alur pilot.

Tidak termasuk:

- Perubahan logika impor Excel, persistence, atau kontrak skenario (FIN-01/FIN-02).
- Migrasi massal seluruh Dashboard, Cuaca, Kalender, Kabar Pasar, atau Ensiklopedia.
- Desain ulang visual/branding, perubahan endpoint, atau perubahan model data.

## Keputusan arsitektur

### 1. Batas UI dan Controller

Komponen di `components/ui` dan `components/shared` bersifat presentasional. Mereka menerima data siap-render dan callback; tidak memanggil API, router, Supabase, atau menghitung hasil bisnis.

Controller `useXxxController.ts` tetap memiliki fetch, mutasi, validasi, pemilihan skenario/proyek, state submit, serta state seleksi data. Feature View merangkai controller dan component UI. State visual yang sangat lokal, misalnya accordion terbuka, boleh tetap lokal bila tidak mengubah data bisnis.

### 2. `AppDialog`

`AppDialog` dibangun di atas MUI `Dialog` dan menyediakan:

- title, subtitle opsional, tombol close dengan `aria-label`;
- area konten scrollable dan action footer yang konsisten;
- default mobile `fullScreen` atau bottom-sheet melalui prop eksplisit;
- target sentuh tombol close minimum 44 px;
- slot/props untuk kasus domain yang memang membutuhkan ukuran, icon, atau footer khusus.

`AppDialog` tidak mengatur form state atau submit. Dialog Keuangan/Stok menyuplai content, action, open, dan callback dari View/controller masing-masing.

### 3. Form transaksi

`TransactionFormFields` menerima `TransactionDraft`, daftar kategori/satuan, error, suggestion RAB, dan callback perubahan. Komponen ini hanya merender field yang saat ini identik antara form input dan edit.

`TransactionEntryForm` tetap mengelola presentasi bantuan auto-link RAB untuk draft. `TransactionEditForm` tetap mengelola elemen `<form>` dan aksi simpan/batal. Kedua wrapper memakai field bersama sehingga tidak ada perubahan schema controller atau payload transaksi.

### 4. Shared master-data dialog

`MasterDataDialog` dipindahkan ke `components/shared/forms`. API props dipertahankan (`items`, add/rename/delete, error, close) agar Stok dan Keuangan dapat memakainya tanpa deep import lintas fitur. Semua state item dan mutasi tetap berasal dari controller pemanggil.

### 5. Tampilan data responsif

`ResponsiveDataView<T>` adalah composition component, bukan tabel universal. Ia menyediakan:

- `columns` dan desktop table renderer;
- `renderMobileItem(item)` untuk kartu atau accordion domain;
- state `loading`, `empty`, `error`, dengan retry optional;
- surface, scroll cue, dan aksesibilitas table/list yang konsisten.

Keuangan mempertahankan format dan aksi RAB/Buku Besar yang ada, tetapi menyediakan renderer kartu pada mobile. Tabel laporan yang sangat spesifik tidak dipaksa migrasi pada tahap ini.

### 6. Primitive status dan metrik

`ContentState` membedakan loading, empty, dan error di atas `EmptyState`. `MetricCard` menyamakan label, value, icon, intent, trend, dan loading. Primitive ini tidak memformat rupiah atau menghitung nilai; formatter/domain View menyuplai value yang siap ditampilkan.

Pilot memakai primitive hanya pada beberapa surface Keuangan/Stok yang setara. Kartu berita, chat, chart, dan kalender tetap komponen domain.

## Rencana migrasi

1. Buat primitive shared beserta test unit/presentasi yang sesuai.
2. Ekstrak master-data dialog dan pastikan Stok serta Keuangan memakai import shared baru.
3. Refactor form transaksi menjadi field bersama; uji create/edit tidak mengubah payload, validasi, maupun linking RAB.
4. Migrasikan satu dialog Keuangan dan satu dialog Stok ke `AppDialog`, kemudian perluas ke dialog yang benar-benar mengikuti struktur standar.
5. Terapkan `ResponsiveDataView` pada RAB dan Buku Besar dengan renderer kartu mobile.
6. Terapkan `ContentState`/`MetricCard` pada surface pilot yang setara dan jalankan regresi mobile.

## Penanganan error dan aksesibilitas

- Semua state async menyediakan pembeda eksplisit loading, kosong, dan gagal memuat.
- Error business tetap berasal dari controller dan diteruskan sebagai props ke View.
- Aksi interaktif baru memiliki label aksesibel dan hit-area minimal 44 x 44 px.
- Renderer mobile tidak boleh menghilangkan jumlah, kategori, nilai, status, atau aksi penting dari tabel desktop.

## Kriteria penerimaan

- Tidak ada deep import `MasterDataDialog` dari folder Stok di Keuangan.
- Field transaksi identik hanya memiliki satu implementasi, sementara create/edit tetap berfungsi.
- RAB dan Buku Besar dapat ditinjau pada 320 px dan 390 px tanpa kolom penting terpotong.
- Dialog pilot memiliki title, close affordance, body scroll, dan footer aksi konsisten.
- Typecheck, lint, dan tes Playwright terkait lulus; tidak ada perubahan endpoint maupun payload bisnis.
