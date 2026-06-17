# Design Spec: Manajemen Keuangan RAB vs Operasional

**Tanggal:** 2026-06-17
**Status:** User-approved design, pending implementation plan
**Scope:** Penyempurnaan modul Keuangan untuk RAB, buku besar operasional, laba rugi, arus kas, perbandingan rencana vs aktual, import Excel, dan export Excel.

---

## Latar Belakang

Modul Keuangan saat ini sudah memiliki buku besar transaksi, ringkasan pemasukan/pengeluaran/laba bersih, export Excel, PDF, AI report, dan kalkulator HPP/BEP. Kebutuhan baru adalah membuat manajemen keuangan yang lebih lengkap seperti workbook contoh `CATATAN KEUANGAN PADI 1 Ha ADE.xlsx`, dengan RAB sebagai perencanaan dan transaksi harian sebagai operasional aktual.

Target desain ini adalah membuat struktur yang dapat dipakai untuk:

- Membuat RAB manual atau import dari Excel.
- Mencatat transaksi operasional seperti saat ini.
- Membandingkan perencanaan RAB dengan realisasi operasional.
- Menyajikan laba rugi dan arus kas di aplikasi.
- Mengekspor workbook Excel yang familier seperti contoh, tetapi lebih rapi dan mudah dipahami.

Arus kas pinjaman dan pasca pembiayaan tidak masuk scope awal.

---

## Analisis Workbook Contoh

Workbook contoh memiliki lima sheet:

1. `1. RAB PADI 1 Ha`
2. `2. Catatan Transaksi Harian`
3. `3. Laporan laba rugi`
4. `4. Arus kas`
5. `5. Arus Kas Pasca Pembiayaan`

Sheet 5 ditunda karena terkait pinjaman.

### Struktur dan Rumus Utama

RAB berisi item biaya dan estimasi pendapatan. Rumus utamanya:

- Total item: `volume * harga_satuan`
- Subtotal kategori: `SUM(total_item_kategori)`
- Total biaya variabel: `saprodi + jasa_alsintan + tenaga_kerja`
- Sewa lahan per musim: `sewa_tahunan / 3`
- Total biaya produksi: `biaya_variabel + biaya_tetap + biaya_lain`
- Penerimaan: `produksi_kg * harga_jual_per_kg`
- Keuntungan: `penerimaan - total_biaya_produksi`
- Bagi hasil: `keuntungan * persentase_bagi_hasil`

Catatan transaksi harian berisi input manual:

- Tanggal
- Uraian transaksi
- Volume
- Satuan
- Harga satuan
- Pengeluaran
- Pemasukan

Laporan laba rugi pada workbook contoh mengambil banyak angka dari sheet RAB, bukan dari transaksi harian. Arus kas membagi pemasukan dan pengeluaran ke kolom bulan.

### Koreksi dari Workbook Contoh

Beberapa formula perlu dibakukan saat diterapkan di aplikasi:

- BEP produksi sebaiknya: `total_biaya / harga_jual_per_unit`
- B/C ratio sebaiknya: `penerimaan / total_biaya`
- Sheet arus kas tidak boleh memiliki external workbook reference.
- Transaksi operasional perlu dipisahkan dari biaya alokasi tetap agar laporan bisa menjelaskan selisih RAB vs aktual.

---

## Keputusan Produk

Pendekatan yang dipilih adalah **RAB sebagai pusat model keuangan**.

RAB menjadi sumber perencanaan. Buku besar menjadi sumber aktual. Laporan mengambil dua sumber tersebut dan menampilkan rencana, aktual, selisih, persentase selisih, serta status.

RAB bersifat hybrid:

- Memiliki nama proyek atau siklus tanam, misalnya `Padi 1 Ha MT 3`.
- Memiliki tanggal mulai dan tanggal selesai.
- Laporan tetap dapat difilter per bulan, tahun, atau periode proyek.

Transaksi operasional dapat dikaitkan ke item RAB, tetapi tidak wajib. Sistem memberi auto-saran berdasarkan uraian, kategori, dan alias item.

---

## Data Model

### `finance_projects`

Mewakili proyek atau siklus tanam.

Field utama:

- `id`
- `user_id`
- `name`
- `commodity`
- `land_area`
- `land_area_unit`
- `season_label`
- `start_date`
- `end_date`
- `status`
- `created_at`
- `updated_at`

### `rab_categories`

Mewakili kelompok RAB.

Field utama:

- `id`
- `user_id`
- `project_id`
- `name`
- `type`: `income` atau `expense`
- `sort_order`
- `created_at`
- `updated_at`

Contoh kategori:

- Saprodi
- Jasa Alsintan
- Tenaga Kerja
- Biaya Tetap
- Lain-lain
- Pendapatan

### `rab_items`

Mewakili item detail RAB.

Field utama:

- `id`
- `user_id`
- `project_id`
- `category_id`
- `name`
- `type`: `income` atau `expense`
- `volume`
- `unit`
- `unit_price`
- `planned_total`
- `planned_cash_month`
- `aliases`
- `sort_order`
- `created_at`
- `updated_at`

`planned_total` dihitung dari `volume * unit_price`. Nilai ini boleh disimpan untuk query dan export, tetapi sumber kebenaran kalkulasi tetap volume dan harga satuan.

### `transactions`

Tabel transaksi tetap menjadi buku besar aktual. Tambahan field opsional:

- `project_id`
- `rab_category_id`
- `rab_item_id`
- `volume`
- `satuan`
- `harga_satuan`

Jika `rab_item_id` kosong, transaksi tetap valid dan masuk laporan sebagai aktual yang belum terhubung ke RAB.

### `rab_imports`

Mewakili riwayat import Excel.

Field utama:

- `id`
- `user_id`
- `project_id`
- `file_name`
- `status`
- `summary`
- `errors`
- `created_at`

---

## Controller dan Separation of Concerns

Project wajib menjaga pemisahan UI dan controller. Karena controller keuangan saat ini sudah besar, fitur baru harus dipisah ke controller yang lebih kecil.

### Controller

- `KeuanganController.tsx`
  Tetap tipis. Menghubungkan controller dengan `KeuanganView`.

- `useFinanceProjectController.ts`
  Mengelola pilihan proyek, create/edit project, status project, dan filter periode.

- `useRabController.ts`
  Mengelola RAB manual, kategori, item, import Excel, dan perhitungan total rencana.

- `useFinanceLedgerController.ts`
  Mengelola buku besar aktual, tambah/edit/hapus transaksi, dan auto-saran link ke item RAB.

- `useFinanceReportController.ts`
  Mengelola laba rugi dan arus kas rencana vs aktual, drill down kategori/item, status selisih, dan filter laporan.

- `useFinanceExportController.ts`
  Mengelola export Excel.

### Helper Murni

Kalkulasi yang perlu dites ditempatkan di helper murni, misalnya:

- `financeReportCalculations.ts`
- `rabImportMapper.ts`
- `rabSuggestionMatcher.ts`
- `financeExcelExport.ts`

View hanya menerima props dan rendering. Semua state, kalkulasi, API call, import, export, dan event handler tetap berada di controller atau helper.

---

## Alur Pengguna

1. User membuka halaman Keuangan.
2. User memilih atau membuat proyek/siklus tanam.
3. User membuat RAB manual atau import Excel.
4. User meninjau dan mengedit kategori/item RAB.
5. User mencatat transaksi operasional di buku besar.
6. Saat transaksi dibuat, sistem memberi saran item RAB yang relevan.
7. User boleh menerima saran, memilih item lain, atau melewati.
8. Laporan laba rugi dan arus kas menampilkan rencana vs aktual.
9. User dapat export Excel dengan format yang mengikuti workbook contoh.

---

## UI Aplikasi

Laporan utama tidak memakai modal. Modal hanya untuk input atau aksi singkat.

Halaman `/dashboard/keuangan` menggunakan tab:

- `Ringkasan`
- `RAB`
- `Buku Besar`
- `Laba Rugi`
- `Arus Kas`
- `Export`

Toolbar atas halaman:

- Pilih proyek/siklus tanam.
- Filter periode.
- Import Excel.
- Export Excel.

### RAB

Menampilkan kategori dan item detail. Kategori dapat expand/collapse. Item dapat ditambah, diedit, dihapus, dan diberi bulan rencana kas.

### Buku Besar

Melanjutkan pola transaksi saat ini. Form transaksi menambahkan pilihan opsional `Hubungkan ke item RAB`. Auto-saran tampil sebagai pilihan ringan dan tidak memblokir submit.

### Laba Rugi

Tabel perbandingan:

- Kategori atau item
- Rencana
- Aktual
- Selisih
- Selisih %
- Status

Kategori dapat di-expand ke item detail. Desktop memakai drawer atau panel kanan untuk detail. Mobile memakai bottom sheet atau view detail.

### Arus Kas

Grid bulanan:

- Bulan
- Kas masuk rencana
- Kas masuk aktual
- Kas keluar rencana
- Kas keluar aktual
- Kas bersih rencana
- Kas bersih aktual
- Kumulatif rencana
- Kumulatif aktual

### Modal dan Dialog

Modal dipakai untuk:

- Tambah/edit transaksi.
- Tambah/edit item RAB.
- Import Excel wizard.
- Konfirmasi hapus.
- Opsi export.

---

## Laporan dan Rumus

### Laba Rugi

Rumus:

- `pendapatan_rencana = SUM(rab_items type income)`
- `pengeluaran_rencana = SUM(rab_items type expense)`
- `laba_rugi_rencana = pendapatan_rencana - pengeluaran_rencana`
- `pendapatan_aktual = SUM(transactions jenis pendapatan)`
- `pengeluaran_aktual = SUM(transactions jenis pengeluaran)`
- `laba_rugi_aktual = pendapatan_aktual - pengeluaran_aktual`
- `selisih = aktual - rencana`
- `selisih_persen = selisih / rencana`

Status:

- `Belum ada realisasi` jika aktual 0.
- `Sesuai rencana` jika selisih dalam toleransi kecil.
- `Hemat` jika biaya aktual lebih kecil dari rencana.
- `Over budget` jika biaya aktual lebih besar dari rencana.
- `Di atas target` jika pendapatan aktual lebih besar dari rencana.
- `Di bawah target` jika pendapatan aktual lebih kecil dari rencana.

### Arus Kas

Rencana dihitung dari `rab_items.planned_cash_month`.

Aktual dihitung dari `transactions.tanggal`.

Rumus:

- `kas_masuk_bulan = SUM(income)`
- `kas_keluar_bulan = SUM(expense)`
- `kas_bersih_bulan = kas_masuk_bulan - kas_keluar_bulan`
- `kas_kumulatif_bulan = kas_kumulatif_bulan_sebelumnya + kas_bersih_bulan`

Pinjaman tidak dimasukkan dalam arus kas awal.

---

## Export Excel

Export Excel mengikuti bentuk workbook contoh, tetapi dibuat lebih rapi, konsisten, dan mudah dipahami.

Sheet final:

1. `RAB`
2. `Catatan Transaksi Harian`
3. `Laporan Laba Rugi`
4. `Arus Kas`
5. `Perbandingan Rencana vs Aktual`

### `RAB`

Fokus pada perencanaan. Struktur mirip contoh:

- Header proyek.
- Kelompok biaya.
- Item, volume, satuan, harga satuan, total.
- Estimasi pendapatan.
- Kelayakan usaha.
- HPP, BEP produksi, B/C ratio, dan bagi hasil jika persentase tersedia.

### `Catatan Transaksi Harian`

Fokus pada operasional aktual:

- Tanggal
- Uraian transaksi
- Volume
- Satuan
- Harga satuan
- Pengeluaran
- Pemasukan
- Kategori RAB
- Item RAB

### `Laporan Laba Rugi`

Fokus pada laporan rencana dari RAB seperti contoh. Jika transaksi aktual tersedia, ringkasan aktual boleh tampil sebagai informasi tambahan, tetapi perbandingan detail tetap berada di sheet khusus.

### `Arus Kas`

Fokus pada arus kas rencana dari RAB seperti contoh. Ini menjaga sheet arus kas tetap bersih ketika user belum menginput transaksi operasional.

### `Perbandingan Rencana vs Aktual`

Sheet khusus untuk analisis modern.

Isi:

- KPI ringkas: total biaya rencana, total biaya aktual, selisih biaya, pendapatan rencana, pendapatan aktual, laba rencana, laba aktual.
- Tabel laba rugi per kategori dan item.
- Tabel arus kas per bulan.
- Status realisasi.

Jika belum ada transaksi operasional, nilai aktual tampil `0` dan status tampil `Belum ada realisasi`, tanpa mengganggu sheet `Arus Kas`.

### Format Visual Excel

- Heading besar dan subheading proyek.
- Warna hijau untuk pendapatan.
- Warna amber atau merah untuk biaya dan over budget.
- Warna biru untuk perbandingan.
- Subtotal dan total diberi font tebal dan border.
- Format Rupiah, tanggal Indonesia, dan persen konsisten.
- Freeze pane pada tabel panjang.
- Formula tetap aktif agar dapat diaudit.
- Tidak ada external workbook reference.

---

## Import Excel

Import Excel mendukung file dengan pola seperti workbook contoh.

Alur import:

1. User memilih file Excel.
2. Sistem membaca sheet RAB.
3. Sistem mendeteksi header proyek, kategori, item, volume, satuan, harga satuan, dan total.
4. Sistem menampilkan preview hasil mapping.
5. User mengonfirmasi import.
6. Sistem membuat project, RAB categories, dan RAB items.

Jika struktur file tidak cocok, sistem menampilkan error yang menjelaskan bagian mana yang tidak terbaca. Import tidak boleh membuat data parsial tanpa konfirmasi.

---

## Auto-Saran Link Transaksi ke RAB

Auto-saran menggunakan pencocokan deterministic, bukan AI.

Sumber pencocokan:

- Nama item RAB.
- Alias item RAB.
- Kategori transaksi.
- Uraian transaksi.

Contoh:

- `Pembelian pupuk NPK` disarankan ke item `Pupuk NPK`.
- `Pembayaran jasa panen combine` disarankan ke item `Jasa Panen`.
- `Sewa lahan` disarankan ke item `Sewa Lahan`.

User tetap dapat memilih item lain atau melewati saran.

---

## Error Handling

- Jika tidak ada project, halaman menampilkan empty state untuk membuat atau import RAB.
- Jika project ada tetapi RAB kosong, tab RAB menampilkan CTA manual entry dan import Excel.
- Jika transaksi tidak terhubung ke RAB, laporan tetap memasukkannya ke kategori `Belum terhubung`.
- Jika nilai rencana 0, persentase selisih tidak dihitung dan ditampilkan sebagai `-`.
- Jika import Excel gagal, data lama tidak berubah.
- Jika export Excel gagal, user mendapat pesan gagal dengan aksi coba lagi.

---

## Testing

Unit test:

- Kalkulasi total RAB.
- Kalkulasi laba rugi rencana vs aktual.
- Kalkulasi arus kas rencana vs aktual.
- Status variance.
- Auto-saran transaksi ke item RAB.
- Mapping import Excel dari contoh workbook.

Component/controller test:

- Tab Keuangan dapat berpindah tanpa kehilangan filter project.
- RAB kosong menampilkan empty state.
- Transaksi dapat disimpan tanpa link RAB.
- Transaksi dengan link RAB muncul di perbandingan item.
- Export action disabled atau menampilkan error saat data belum siap.

Regression test:

- Fitur buku besar saat ini tetap berjalan.
- Dashboard summary yang memakai transaksi tidak rusak.
- PDF/AI report lama tidak berubah sampai masuk scope berikutnya.

---

## Out of Scope

- Arus kas pasca pembiayaan.
- Pinjaman, bunga, KUR, dan pembayaran pinjaman.
- Multi-currency.
- Akuntansi double-entry.
- Integrasi stok otomatis ke RAB.
- AI untuk parsing import atau pencocokan item.

---

## Implementasi Bertahap

1. Data model dan API untuk project, RAB category, RAB item, dan field link transaksi.
2. Controller baru untuk project, RAB, ledger, report, dan export.
3. UI tab Keuangan dengan RAB dan buku besar yang sudah bisa link ke RAB.
4. Laporan laba rugi dan arus kas rencana vs aktual.
5. Import Excel.
6. Export Excel final dengan lima sheet.

Implementasi dilakukan setelah user menyetujui spec tertulis ini dan implementation plan dibuat.
