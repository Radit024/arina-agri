# Audit UI — Simulasi Keuangan Padi 1 Ha

Tanggal audit: 18 Agustus 2026  
Viewport utama: 390 × 844 (mobile), dengan regresi 320 × 568 dan 375 × 812  
Metode: Playwright pada akun demo lokal; data hanya diimpor melalui dialog aplikasi.

## Ringkasan eksekutif

Halaman Manajemen Keuangan dapat menampilkan data transaksi secara kaya setelah impor Excel, tetapi alur impor dan pemisahan skenario belum aman untuk dipakai sebagai sumber kebenaran. Dua perbaikan P0 harus diselesaikan sebelum alur ini dipromosikan ke pengguna: data impor pada fallback demo hilang setelah refresh, dan pilihan target `Rencana (Proyeksi)` tidak konsisten dengan data yang tampil pada mode Realisasi.

Secara visual, fondasi mobile sudah baik: tidak ada overflow level dokumen pada viewport yang diuji, navigasi bawah dapat dijangkau, kartu Buku Besar mudah dibaca, dan RAB kini menampilkan kartu item lengkap pada layar 320–390 px. Toolbar proyek masih menghabiskan terlalu banyak tinggi layar, dan beberapa aksi penting berada di bawah target sentuh 44 px.

## Data simulasi dan hasil impor

Sumber: `E:/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx`.

- Workbook berisi lima sheet: RAB, Catatan Transaksi Harian, Laporan Laba/Rugi, Arus Kas, dan Arus Kas Pasca Pembiayaan.
- Proyek demo: `Padi 1 Ha - Lahan ADE`, periode MT 3 Agustus–Desember 2026.
- Dialog impor menerima file dan menampilkan 38 transaksi pada Buku Besar.
- Ringkasan yang tampil: pendapatan Rp45.500.000, pengeluaran Rp22.159.000, laba Rp23.341.000.
- Parser menampilkan peringatan material: item **Sewa lahan** memiliki total Excel Rp7.000.000, sedangkan volume × harga menghasilkan Rp21.000.000.
- Dalam simulasi akun demo lokal, request Supabase untuk transaksi dan riwayat impor mengembalikan HTTP 400. Setelah refresh, Buku Besar kembali 0 transaksi dan RAB tidak lagi berisi item impor.

## Backlog prioritas — Manajemen Keuangan

| ID | Prioritas | Area | Temuan terverifikasi | Perbaikan yang disarankan |
|---|---|---|---|---|
| FIN-01 | P0 | Import dan penyimpanan | Data impor hilang setelah refresh pada fallback demo. Saat request backend gagal, UI tidak mempertahankan kategori/item RAB; setelah reload Buku Besar kembali 0 transaksi dan RAB kosong. | Jadikan impor atomik: simpan ke backend sebelum menampilkan sukses, atau persist fallback lokal per proyek+skenario. Bila gagal, tampilkan error eksplisit dan jangan mengklaim impor selesai. Tambahkan tes refresh setelah impor. |
| FIN-02 | P0 | Skenario Proyeksi/Realisasi | Target dialog dipilih `Rencana (Proyeksi)`, tetapi 38 transaksi muncul di `Mode: Aktual`; Proyeksi menunjukkan 0 transaksi dan Perbandingan menyatakan Proyeksi belum memiliki data. | Definisikan kontrak impor per data: RAB dan transaksi masuk ke skenario yang dipilih, atau tampilkan pilihan terpisah. Tampilkan ringkasan tujuan setelah impor dan uji isolasi Proyeksi vs Realisasi. |
| FIN-03 | Selesai | RAB responsif | Temuan awal: tabel desktop terpotong pada 390 px. Implementasi sekarang mempertahankan tabel untuk desktop dan merender kartu item berisi kategori, total, volume, serta aksi pada 320–390 px; smoke Chromium mencakup dua viewport. | Tidak ada pekerjaan aktif untuk temuan ini. Pantau regresi saat kontrak kolom RAB berubah. |
| FIN-04 | P1 | Toolbar proyek | Blok mode, pemilih proyek, dan empat aksi mengambil sekitar setengah viewport sebelum konten utama. Pengguna harus melewati area ini setiap membuka tab. | Ringkas toolbar setelah proyek aktif: jadikan pemilih proyek satu baris, letakkan Import/Export dalam menu overflow, dan pertahankan CTA utama sesuai tab. |
| FIN-05 | P1 | Validasi impor | Selisih Sewa lahan Rp14 juta baru menjadi warning setelah data telah diimpor. Tidak ada layar pratinjau, keputusan nilai, atau tautan langsung ke item bermasalah. | Tambahkan preflight/review sebelum commit: tampilkan baris, nilai file, nilai hasil hitung, pilihan nilai yang dipakai, dan blokir/konfirmasi untuk selisih material. |
| FIN-06 | P1 | Buku Besar | Dengan 38 transaksi, kartu penuh membuat satu halaman sangat panjang dan hanya enam transaksi per halaman; aksi link/edit/hapus berulang pada setiap kartu. | Tambahkan mode ringkas, baris expandable, filter kategori dan status link RAB. Simpan aksi jarang pada menu overflow agar pemindaian lebih cepat. |
| FIN-07 | Sebagian selesai | Pembiayaan dan Perbandingan | Arus Kas Pasca Pembiayaan kini memiliki satu CTA dan kartu pembiayaan responsif. Perbandingan masih hanya memberi pesan kosong walaupun impor baru selesai. | Pertahankan satu CTA dan kartu responsif pada Pembiayaan; tambahkan bantuan tindakan langsung pada Perbandingan untuk mengisi skenario yang belum ada atau mengalokasikan data impor. |
| FIN-08 | P2 | Tab laporan | Enam tab laporan harus digeser horizontal. Tab aktif dapat berada di luar viewport dan pengguna tidak mendapat petunjuk bahwa masih ada tab lain. | Pertahankan scroll, tambahkan fade/gradien atau label `Geser untuk laporan lainnya`; pertimbangkan menu `Laporan` untuk tab lanjutan di layar kecil. |
| FIN-09 | P2 | Target sentuh | Tombol Buat/Import/Export setinggi 37 px, edit/hapus proyek 40 px, dan CTA asumsi serta expand baris Arus Kas sekitar 31–34 px. | Standarkan aksi primer, ikon, ekspander, dan CTA menjadi minimal 44 × 44 px; gunakan `PageActionButton` secara konsisten. |
| FIN-10 | Selesai | Aksesibilitas Arus Kas | Ekspander kartu Arus Kas reguler kini bernama `Detail transaksi <bulan>`, memiliki target sentuh minimum 44 px, dan mengekspos status expanded. | Tidak ada pekerjaan aktif untuk ekspander Arus Kas reguler; pantau regresi label, target sentuh, dan state expanded. |
| FIN-11 | P2 | Laba/Rugi | Blok Kelayakan Usaha memperlihatkan HPP, BEP, B/C Ratio, dan Status sebagai `-` tanpa menjelaskan data/asumsi yang diperlukan. | Gunakan empty state yang menjelaskan input yang kurang dan satu CTA `Atur asumsi produksi & penjualan`; jangan tampilkan metrik kosong sebagai hasil. |
| FIN-12 | P2 | Hasil impor | Setelah warning, dialog hanya menawarkan Tutup. Tidak ada jumlah item RAB/transaksi, baris yang dilewati, atau jalur langsung ke hasil. | Tampilkan ringkasan terstruktur: item dibuat, transaksi dibuat, baris dilewati, warning, dan tombol `Tinjau RAB`/`Tinjau Transaksi`. |

## Cakupan halaman dan fitur

| Rute/fitur | Status audit | Backlog terkait |
|---|---|---|
| `/` dan `/auth/callback` | Redirect ke Login berjalan. | Tidak ada blocker UI khusus. |
| `/login` | Layout pas pada mobile. Ikon tampil/sembunyikan sandi 30 px; tautan lupa sandi/daftar hanya area teks. | GEN-05 |
| `/register` | Layout pas pada mobile. Dua ikon sandi 30 px dan tautan masuk hanya area teks. | GEN-05 |
| `/forgot-password` | Layout dan CTA utama jelas; tautan kembali masih hanya setinggi teks. | GEN-05 |
| Halaman 404 | Pesan dan CTA jelas. Tautan CTA belum memenuhi target sentuh 44 px. | GEN-05 |
| `/dashboard` | Struktur ringkasan serta navigasi bawah baik; skeleton berita dapat menetap ketika sumber data gagal. | GEN-06 |
| `/dashboard/keuangan` — Buku Besar | Terisi 38 transaksi; kartu mudah dibaca tetapi terlalu panjang untuk volume tinggi. | FIN-01, FIN-02, FIN-04, FIN-06, FIN-09 |
| `/dashboard/keuangan` — RAB | Item berhasil ditampilkan saat sesi aktif. Desktop mempertahankan tabel, sementara mobile menampilkan kartu RAB lengkap. | FIN-01, FIN-02, FIN-05 |
| `/dashboard/keuangan` — Laba Rugi | Angka hasil impor dan kelompok biaya jelas; metrik kelayakan belum memiliki empty state yang memandu. | FIN-04, FIN-11 |
| `/dashboard/keuangan` — Arus Kas | Periode dan total jelas; kartu mobile memiliki ekspander detail berlabel dengan target 44 px. | FIN-09 |
| `/dashboard/keuangan` — Pasca Pembiayaan | Satu CTA dan kartu pembiayaan responsif sudah diterapkan; bantuan data-skenario pada Perbandingan masih tertunda. | FIN-07 (sebagian), FIN-09 |
| `/dashboard/keuangan` — Perbandingan | Bantuan untuk mengisi Proyeksi yang kosong setelah impor masih belum tersedia. | FIN-02, FIN-07 (sisa) |
| `/dashboard/ensiklopedia` | Toolbar aksi Chat terpotong pada 375 px dan aksi bersihkan chat hilang pada 320 px. | GEN-03 |
| `/dashboard/kalender` | Sel tanggal dan tombol event hanya 26–28 px; seluruh area sel dapat diklik tetapi tidak semantik keyboard. | GEN-04 |
| `/dashboard/stok` | Kartu stok terbaca baik. Tab riwayat/mutasi perlu affordance geser pada layar sempit. | GEN-07 |
| `/dashboard/cuaca` | Empty state menyuruh mengaktifkan GPS, tetapi CTA tidak cukup menonjol di area awal; data gagal harus dibedakan dari belum ada data. | GEN-06 |
| `/dashboard/kabar-pasar` | Chip kategori tinggi 32 px; kartu feed panjang dan gambar gagal dapat berakhir sebagai placeholder yang ambigu. | GEN-06, GEN-08 |
| `/dashboard/pengaturan` dan `Lainnya → Pengaturan` | Dua drawer berbeda untuk tugas sama; jalur dari Lainnya tidak memiliki judul/tombol tutup tegas. | GEN-02 |
| Navigasi bawah dan `Lainnya` | Lima item bawah dan grid menu memiliki target sentuh memadai. | Pertahankan pola ini. |
| Tur panduan | Tur otomatis muncul untuk setiap halaman pertama kali dan menangkap pointer event di atas navigasi. | GEN-01 |

## Backlog prioritas — lintas halaman

| ID | Prioritas | Temuan | Perbaikan yang disarankan |
|---|---|---|---|
| GEN-01 | P1 | Tur panduan otomatis muncul lagi pada setiap halaman baru dan memblokir interaksi di belakangnya. | Jadikan onboarding satu alur ringkas di Dashboard; panduan per halaman dibuka atas permintaan atau tepat saat aksi relevan. |
| GEN-02 | P1 | Pengaturan mobile memiliki dua implementasi dan dua struktur informasi berbeda. Jalur dari `Lainnya` menampilkan tab horizontal terpotong, tanpa judul maupun close affordance yang jelas. | Konsolidasikan ke satu layar/drawer, dengan judul `Pengaturan`, close button, urutan menu konsisten, dan navigasi tab yang dapat ditemukan. |
| GEN-03 | P1 | Toolbar AI Chat meluber: tombol riwayat dan hapus keluar dari viewport 375 px; hapus hilang pada 320 px. | Sisakan aksi primer, pindahkan aksi sekunder ke overflow menu, dan uji 320 px. |
| GEN-04 | P2 | Interaksi kalender berukuran 26–28 px dan parent clickable berupa `Box`, bukan kontrol semantik. | Jadikan sel hari/button event minimal 44 px dan keyboard-accessible; gunakan detail modal untuk event padat. |
| GEN-05 | P2 | Ikon password 30 px dan beberapa tautan autentikasi/404 hanya memiliki hit-area tinggi 18–21 px. | Tambahkan padding atau wrapper button/link dengan area minimal 44 px tanpa memperbesar tampilan visual. |
| GEN-06 | P2 | Pada Dashboard, Cuaca, dan Kabar Pasar, error data jaringan dapat terlihat sama dengan loading atau kosong. | Bedakan loading, kosong, dan gagal memuat; sertakan penyebab singkat serta CTA coba lagi. |
| GEN-07 | P3 | Tab Stok dan Keuangan horizontal memang berfungsi, namun sisa tab tidak cukup dapat ditemukan. | Tambahkan cue scroll konsisten; bukan hanya panah yang kadang berada di luar fokus visual. |
| GEN-08 | P3 | Filter Berita tinggi 32 px dan feed panjang memberi beban scroll besar. | Tinggikan chip menjadi 40–44 px; sediakan filter sheet/sort atau ringkasan kategori. |

## Audit komponen reusable dan konsistensi UI

Audit ini mencakup inventaris statis seluruh komponen `.tsx` di `app/` dan `components/`, lalu pembacaan khusus terhadap komponen halaman, shared shell, UI primitive, serta subkomponen Keuangan dan Stok. Rekomendasi berikut tidak meminta satu komponen generik untuk semua kasus; komponen hanya disatukan jika struktur visual, perilaku mobile, dan state datanya memang sama.

### Fondasi reusable yang telah diimplementasikan (18 Agustus 2026)

- `AppDialog` kini menjadi fondasi dialog bersama; `Modal` tetap menjadi adapter kompatibilitas untuk pemakaian lama.
- `ContentState` dan `MetricCard` tersedia sebagai primitive presentasional untuk state konten dan ringkasan metrik.
- `MasterDataDialog` dipindahkan ke `components/shared/forms` agar Keuangan dan Stok memakai kontrak dialog master data yang sama.
- `TransactionFormFields` menyatukan field presentasional entry/edit transaksi Keuangan tanpa menyatukan skema atau logika controller.
- `ResponsiveDataView` digunakan pada RAB dan tiga laporan arus kas: `FinanceCashFlowView` (reguler), `FinanceFinancingView` (pasca pembiayaan), serta `FinanceComparisonView` (perbandingan). Tabel desktop tetap tersedia, sedangkan 320–390 px memakai kartu atau accordion sesuai domain.
- Halaman Stok menjadi pilot `MetricCard` untuk empat ringkasan teratas. Kartu batch, mutasi, dan form tetap khusus domain Stok.

Catatan batas: fondasi ini **belum** menyelesaikan backlog proses/data. FIN-01 dan FIN-02 (persistensi impor dan isolasi skenario), FIN-04 sampai FIN-09, FIN-11, FIN-12, serta backlog halaman lain tetap ditunda dan harus ditangani sebagai pekerjaan terpisah. RAB menutup responsivitas FIN-03, ekspander Arus Kas reguler menutup FIN-10, dan FIN-07 hanya sebagian selesai pada permukaan Pembiayaan; bantuan data-skenario Perbandingan tetap tertunda.

### Fondasi yang sudah dapat dipakai

| Fondasi saat ini | Cakupan saat ini | Keputusan |
|---|---|---|
| `components/shared/page/PageShell`, `PageHeader`, `PageActionButton` | Sudah dipakai oleh Keuangan, Stok, Cuaca, Kalender, Kabar Pasar, dan Pengaturan. | Jadikan standar seluruh halaman Dashboard. Pindahkan Dashboard Home dari `components/ui/PageHeader` lama dan satukan header khusus Ensiklopedia ke kontrak ini. |
| `components/shared/DashboardChrome`, `MobileTopAppBar`, `MobileBottomNav`, `MobileFeatureSheet` | Shell desktop/mobile sudah terpusat. | Pertahankan sebagai satu-satunya shell navigasi; gunakan ulang saat menyatukan Pengaturan dan mengubah tur panduan. |
| `components/auth/AuthShell`, `AuthBrandPanel`, `ui/Button`, `ui/FormInput` | Login, Register, dan Lupa Sandi sudah memakai pola yang sama. | Pertahankan; perluas hit-area link/ikon, bukan membuat form autentikasi baru per halaman. |
| `components/news/NewsCard` dan `NewsCardSkeleton` | Dipakai ulang pada widget Dashboard dan Kabar Pasar. | Ini contoh reusable yang tepat; gunakan varian `widget`/`full` yang ada dan lengkapi state gagal memuat. |
| `components/ui/Card`, `Badge`, `EmptyState` | Primitif sudah tersedia, tetapi pemakaiannya masih sedikit dibanding banyaknya `Card`, `Chip`, dan state manual. | Jadikan token visual sebagai dasar komponen baru di bawah; hindari menyalin `sx` kartu/status pada tiap fitur. |
| `components/dashboard/KPICard` | Khusus Dashboard, sedangkan Keuangan dan Stok kembali merakit kartu metrik sendiri. | Ekstrak kontrak metric card yang sama, lalu izinkan varian domain tanpa memindahkan data/perhitungan ke komponen UI. |

### Temuan reuse yang perlu ditangani

| ID | Prioritas | Bukti pada kode | Komponen reusable yang disarankan | Cakupan penerapan |
|---|---|---|---|---|
| CMP-01 | P0 | Ada 18 file yang merakit `<Dialog>` sendiri, sementara `components/ui/Modal.tsx` belum memiliki konsumen. Header, tombol tutup, padding, radius, dan aksi footer berulang dengan variasi kecil. | Evolusikan `Modal` menjadi `AppDialog`: header dengan title/subtitle/close berlabel, body scroll, footer sticky, dan default fullscreen/bottom-sheet pada mobile. | Semua dialog Keuangan dan Stok, Pengaturan, Kalender, Ensiklopedia, serta Feedback. |
| CMP-02 | P0 | `TransactionEntryForm` dan `TransactionEditForm` menduplikasi jenis, tanggal, kategori, satuan, volume, harga, nominal, catatan, serta pengelolaan master data. | Buat `TransactionFormFields` murni presentasional; pembungkus entry/edit hanya menentukan mode, footer, dan callback. | Buku Besar Keuangan; bila kebutuhan stok penjualan matang, field uang/tanggal dapat memakai primitive field yang sama tanpa menyatukan skema bisnis. |
| CMP-03 | P1 | Masih ada 11 file dengan tabel manual. `ResponsiveDataView` sudah dipakai RAB serta tiga laporan arus kas: reguler, pasca pembiayaan, dan perbandingan; tabel domain lain belum konsisten pada mobile. | Perluas `ResponsiveDataView<T>` dengan `columns` untuk desktop, `renderMobileItem` untuk kartu/accordion, state async, dan indikator scroll bila tabel wajib dipertahankan. | Buku Besar, laporan Keuangan lain, batch/mutasi Stok, riwayat Cuaca, tabel transaksi Dashboard, dan dialog klasifikasi. |
| CMP-04 | P1 | `EmptyState` baru dipakai Keuangan; Skeleton/error/empty masih dirakit berbeda di Dashboard, Cuaca, Kabar Pasar, Stok, dan laporan. | Tambahkan `ContentState`/`AsyncSection` yang memisahkan `loading`, `empty`, `error`, dan `retry`, dibangun di atas `EmptyState`. | Semua data API dan laporan, terutama Dashboard, Cuaca, Kabar Pasar, Keuangan, serta Stok. |
| CMP-05 | P1 | Ada dua `PageHeader`: versi `components/ui` dipakai Dashboard Home, versi `components/shared/page` dipakai fitur dashboard; Ensiklopedia membuat header aksi sendiri. | Tetapkan satu `PageHeader` dashboard dengan slot title, meta, actions, dan mobile action-overflow. Hapus penggunaan versi legacy setelah migrasi. | Dashboard Home, Ensiklopedia, Keuangan, Stok, Cuaca, Kalender, Kabar Pasar, Pengaturan. |
| CMP-06 | P1 | Ada 19 file dengan `TextField` langsung. `FormInput` hanya dipakai pada autentikasi dan terikat React Hook Form, sedangkan form fitur memakai pola label, format Rupiah, error, select/autocomplete, serta tombol kelola master data berulang. | Tambahkan primitive presentasional `AppField` (text, number, currency, date, select, autocomplete) dan `FieldWithManageAction`; adapter React Hook Form tetap tipis dan terpisah. | Dialog proyek/RAB/asumsi/transaksi, Stok, Kalender, Cuaca, Pengaturan, dan form autentikasi. |
| CMP-07 | P2 | Kartu metrik dibuat ulang di Dashboard, Keuangan (ringkasan/RAB/pembiayaan), dan Stok dengan padding, warna status, serta hierarchy angka berbeda. | Buat `MetricCard` dan `MetricGrid` dengan `label`, `value`, `icon`, `intent`, `trend`, dan `loading`; angka tetap sudah diformat oleh controller/formatter. | Dashboard, Keuangan, Stok, Cuaca; bukan untuk kartu artikel atau kartu chat. |
| CMP-08 | P2 | `MasterDataDialog` berada di fitur Stok tetapi diimpor langsung dari path `app/dashboard/stok/...` oleh form Keuangan. | Pindahkan ke `components/shared/forms/MasterDataDialog` dan ubah menjadi view berbasis props/callback. | Kategori/satuan transaksi, kategori RAB, grade/lokasi Stok, dan master data lain yang setara. |
| CMP-09 | P2 | `Badge` hanya dipakai Keuangan/Stok, sedangkan jenis transaksi, status persediaan, status cuaca, dan filter lain masih memakai gaya lokal. | Standarkan `StatusBadge`/`StatusChip` dengan intent semantik (`success`, `warning`, `danger`, `info`, `neutral`) dan ukuran minimum 40-44 px saat interaktif. | Keuangan, Stok, Cuaca, Kalender, Kabar Pasar; chip filter tetap menggunakan mode interaktif, badge informasi menggunakan mode pasif. |
| CMP-10 | P2 | Tab Keuangan dan Stok memiliki kebutuhan horizontal-scroll yang sama, tetapi affordance serta fokus tab berbeda. | Buat `MobileTabBar` berbasis daftar item dan callback: scrollable, indikator/fade ujung, target 44 px, serta opsi `Lainnya`/overflow untuk tab sekunder. | Keuangan, Stok, Pengaturan modal; jangan digunakan untuk bottom navigation. |

### Matriks adopsi per halaman

| Area | Reuse yang diprioritaskan | Catatan batas domain |
|---|---|---|
| Autentikasi dan 404 | `AuthShell`, `Button`, `FormInput`/`AppField`, pola link 44 px. | Tetap berbeda dari shell Dashboard. |
| Dashboard Home | `PageShell`, `PageHeader` tunggal, `MetricGrid`, `ContentState`, `NewsCard`. | Grafik, peta Jawa Timur, dan perhitungan KPI tetap komponen domain. |
| Keuangan | `AppDialog`, `TransactionFormFields`, `ResponsiveDataView`, `MetricCard`, `ContentState`, `MobileTabBar`, `StatusBadge`. | RAB, laporan laba-rugi, arus kas, dan skenario tetap view domain; hanya surface dan struktur interaksinya yang disatukan. |
| Stok | `AppDialog`, `ResponsiveDataView`, `MetricCard`, `AppField`, `MasterDataDialog`, `MobileTabBar`, `StatusBadge`. | Logika batch, mutasi, dan stok keluar tidak digabung dengan transaksi Keuangan. |
| Cuaca | `PageShell`, `PageHeader`, `MetricCard`, `ResponsiveDataView`, `ContentState`, `StatusBadge`. | `WeatherIcon` serta aturan peringatan cuaca tetap domain-specific. |
| Kalender | `PageShell`, `PageHeader`, `AppDialog`, `ContentState`, `StatusBadge`. | `CalendarDayCell` dan aturan kejadian tetap khusus kalender; sel harus mengonsumsi token target sentuh/aksesibilitas bersama. |
| Ensiklopedia | `PageHeader` dengan mobile action-overflow, `AppDialog`, `ContentState`. | Gelembung percakapan, riwayat, dan prompt AI tetap komponen chat. |
| Kabar Pasar | `PageShell`, `PageHeader`, `NewsCard`, `ContentState`, `StatusChip`. | Tidak perlu membuat ulang kartu berita; perbaiki varian error image dan filter. |
| Pengaturan dan navigasi | `DashboardChrome`, `MobileFeatureSheet`, `AppDialog`/satu `SettingsPanel`, `MobileTabBar` bila tab tetap diperlukan. | Konsolidasikan dua jalur Pengaturan ke satu view/controller; jangan menduplikasi panel mobile dan modal desktop. |

### Kontrak implementasi agar tetap sesuai arsitektur

1. Komponen di `components/ui` dan `components/shared` hanya menerima data siap tampil serta callback. Komponen ini tidak memanggil API, router, Supabase, maupun menghitung hasil bisnis.
2. `useXxxController.ts` memegang fetch, mutasi, validasi bisnis, pemilihan skenario, state submit, dan state pemilihan data. View hanya meneruskan event dari `AppDialog`, `ResponsiveDataView`, atau form fields.
3. State visual yang tidak bermakna bisnis (misalnya accordion terbuka) boleh berada pada komponen view kecil bila perlu, tetapi state yang mengubah isi/hasil data harus dinaikkan ke controller. Saat ini beberapa view Keuangan masih menyimpan state lokal; refactor CMP-01 sampai CMP-03 harus memindahkannya bila state mempengaruhi aksi pengguna.
4. Jangan membuat `UniversalForm`, `UniversalCard`, atau tabel dengan logika domain tersembunyi. Parameterisasi berhenti pada presentasi dan interaksi umum; model RAB, transaksi, batch, serta laporan tetap memiliki View sendiri.

### Urutan refactor reusable

1. Bangun dan uji `AppDialog`, `TransactionFormFields`, serta ekstraksi `MasterDataDialog` (CMP-01, CMP-02, CMP-08). Ini mengurangi duplikasi paling besar tanpa mengubah alur data.
2. Pertahankan cakupan `ResponsiveDataView` pada RAB serta Arus Kas reguler, pasca pembiayaan, dan perbandingan; perluas berikutnya ke Buku Besar bersama FIN-06, lalu ke Stok dan laporan tabel lain (CMP-03).
3. Satukan `PageHeader`, `MetricCard`, `ContentState`, serta `StatusBadge` untuk menutup ketidaksamaan antar halaman (CMP-04, CMP-05, CMP-07, CMP-09).
4. Migrasikan `AppField` dan `MobileTabBar` secara bertahap setelah kontrak controller stabil (CMP-06, CMP-10).

## Urutan implementasi yang disarankan

1. Selesaikan FIN-01 dan FIN-02, lalu tambahkan pengujian import → refresh → pindah skenario → perbandingan.
2. Ringkas toolbar proyek dan kartu Buku Besar (FIN-04, FIN-06), lalu perluas pola kartu mobile RAB yang sudah selesai ke tabel prioritas lain.
3. Tambahkan preflight rekonsiliasi Excel (FIN-05) dan hasil impor yang dapat ditindaklanjuti (FIN-12).
4. Tambahkan bantuan data-skenario pada Perbandingan yang tersisa dari FIN-07, lalu lengkapi empty state metrik Laba/Rugi (FIN-11). Pembiayaan sudah memiliki satu CTA dan kartu responsif.
5. Terapkan standar target sentuh 44 px yang masih terbuka serta perbaikan navigasi/panduan lintas halaman (FIN-09, GEN-01 sampai GEN-08); ekspander Arus Kas reguler FIN-10 sudah selesai.

## Kriteria penerimaan regresi

- Impor file yang sama pada Proyeksi tetap ada setelah refresh dan tidak muncul di Realisasi kecuali pengguna memilih salin/konversi.
- Perbandingan menampilkan kedua skenario atau CTA yang langsung memperbaiki data yang kurang.
- RAB pada 320–390 px memperlihatkan seluruh informasi item tanpa mengandalkan kolom yang terpotong.
- Semua aksi yang dapat disentuh berukuran minimal 44 × 44 px atau memiliki hit-area ekuivalen.
- Semua state data membedakan loading, kosong, dan error serta tidak menyembunyikan kegagalan sinkronisasi.
