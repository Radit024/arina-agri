# Audit dan Spesifikasi Revisi Manajemen Keuangan — Hasil Review Pakar

## PROYEKSI, REALISASI, dan PERBANDINGAN

- **Tanggal audit:** 1 Agustus 2026
- **Status:** Hasil audit codebase dan revisi pakar; siap dijadikan acuan penyusunan implementation plan
- **Prioritas:** Kritis/P0 untuk logika bisnis; P1-P2 untuk integrasi, keselamatan data, dan quality of life
- **Ruang lingkup:** Modul Manajemen Keuangan Arina Agri beserta import/export Excel, laporan PDF, laporan AI, ringkasan dashboard, serta konsistensi UI yang berkaitan
- **Source of truth:** `references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx`

---

## 1. Kedudukan Dokumen

Dokumen ini **menggantikan asumsi bisnis** dalam dokumen lama berikut:

- `docs/superpowers/specs/2026-06-17-finance-management-rab-actual-design.md`
- `docs/superpowers/plans/2026-06-17-finance-management-rab-actual-implementation.md`

Dokumen lama menetapkan RAB sebagai sumber rencana dan transaksi harian sebagai sumber aktual. Asumsi tersebut terbukti tidak sesuai dengan workflow pakar dan menjadi akar cacat laporan saat ini.

Bagian implementasi lama yang masih dapat dipakai hanyalah pola umum seperti pemisahan View/Controller, helper kalkulasi murni, dan penyimpanan berbasis proyek. Rumus, pemaknaan data, struktur laporan, import/export, serta konsep perbandingannya harus mengikuti dokumen ini.

Dokumen ini bukan permintaan untuk membuat antarmuka menyerupai Excel. Istilah *worksheet* dalam pembahasan pakar berarti kumpulan data dan alur input yang dapat dioperasikan melalui UI aplikasi.

---

## 2. Ringkasan Eksekutif

Modul keuangan saat ini belum layak digunakan untuk workflow pakar karena model datanya tidak dapat membedakan **PROYEKSI** dan **REALISASI**.

Kode saat ini secara implisit menganggap:

```text
RAB                 = rencana
Catatan transaksi   = aktual
RAB vs transaksi    = laporan laba rugi dan arus kas rencana vs aktual
```

Model yang benar:

```text
PROYEK
├── PROYEKSI
│   ├── RAB
│   ├── Catatan Transaksi Harian Proyeksi
│   ├── Laba Rugi Proyeksi
│   ├── Arus Kas Proyeksi
│   └── Arus Kas Pasca Pembiayaan Proyeksi
├── REALISASI
│   ├── RAB/Rekap Realisasi
│   ├── Catatan Transaksi Harian Aktual
│   ├── Laba Rugi Realisasi
│   ├── Arus Kas Realisasi
│   └── Arus Kas Pasca Pembiayaan Realisasi
└── PERBANDINGAN
    └── Membandingkan hasil lengkap PROYEKSI dengan REALISASI
```

Konsekuensi utamanya:

1. RAB dan catatan transaksi dalam satu mode adalah bagian dari satu workflow, bukan dua pihak yang dibandingkan.
2. Laba rugi dan arus kas harus dapat dihitung secara mandiri di dalam PROYEKSI maupun REALISASI.
3. PERBANDINGAN merupakan fitur terpisah yang membandingkan hasil kedua mode.
4. Arus Kas Pasca Pembiayaan wajib masuk cakupan inti, bukan ditunda atau digantikan oleh worksheet perbandingan.
5. Semua fitur turunan—import, export, PDF, AI, dashboard, kalkulator kelayakan, dan pengujian—harus memahami mode yang aktif.

---

## 3. Istilah Resmi

### 3.1 PROYEKSI

Konteks data sebelum pelaksanaan usaha tani. Seluruh angka merupakan estimasi, termasuk catatan transaksi hariannya.

PROYEKSI bukan hanya RAB. PROYEKSI mencakup workflow lengkap dari awal hingga akhir.

### 3.2 REALISASI

Konteks data selama atau setelah pelaksanaan usaha tani. Catatan transaksi hariannya merupakan kejadian aktual yang benar-benar dilakukan.

REALISASI menggunakan metode dan susunan laporan yang sama dengan PROYEKSI, tetapi berisi angka aktual.

### 3.3 PERBANDINGAN

Fitur analisis terpisah untuk membandingkan PROYEKSI dan REALISASI pada proyek yang sama.

PERBANDINGAN bukan nama mode input dan tidak boleh menggantikan salah satu dari lima laporan utama.

### 3.4 Catatan Transaksi Harian

- Di PROYEKSI: catatan berisi jadwal dan nilai transaksi yang diperkirakan.
- Di REALISASI: catatan berisi transaksi aktual.

Nama tabel yang konsisten disarankan sebagai **Catatan Transaksi Harian**, dengan badge mode yang selalu terlihat.

### 3.5 Proyek

Satu siklus usaha tani, misalnya `Padi 1 Ha MT 3`. Setiap proyek memiliki tepat satu konteks PROYEKSI dan satu konteks REALISASI, walaupun salah satunya masih kosong.

---

## 4. Register Koreksi Source of Truth

Workbook merupakan source of truth untuk **workflow, susunan laporan, kategori, hubungan data, dan metode perhitungan**. Namun audit menemukan beberapa typo/formula cacat yang tidak boleh disalin ke aplikasi.

### 4.1 Angka dasar studi kasus

| Indikator | Nilai |
|---|---:|
| Total Biaya Produksi | Rp22.159.000 |
| Proyeksi Produksi | 7.000 kg |
| Harga Jual | Rp6.500/kg |
| Penerimaan | Rp45.500.000 |
| Keuntungan | Rp23.341.000 |
| HPP | Rp3.165,57/kg |

Sumber: sheet `1. RAB PADI 1 Ha`, terutama `F47`, `C52`, `E52`, `F52`, `F53`, dan `F56`.

### 4.2 Koreksi BEP Produksi

Formula yang dikunci oleh pakar:

```text
BEP Produksi = Total Biaya Produksi ÷ Harga Jual per Unit
```

Perhitungan studi kasus:

```text
Rp22.159.000 ÷ Rp6.500/kg = 3.409,0769 kg
```

Tampilan yang disarankan:

- Presisi laporan: `3.409,08 kg`.
- Kebutuhan operasional bila harus dalam kg utuh: minimal `3.410 kg`.

Formula workbook saat ini di `F57` adalah `=F53/E52`, yaitu keuntungan dibagi harga jual, dan menghasilkan `3.590,92 kg`. Formula tersebut salah.

`Penerimaan ÷ Harga Jual` juga bukan BEP karena hanya mengembalikan volume penjualan proyeksi, yaitu `7.000 kg`.

### 4.3 Koreksi transportasi pada Arus Kas

Nilai transportasi yang konsisten pada sumber:

- RAB `F43`: Rp200.000.
- Catatan Transaksi Harian baris 37: Rp200.000.
- Laba Rugi `G33`: Rp200.000.

Pada Arus Kas `K36`, nilai tertulis Rp20.000. Ini adalah typo dan harus menjadi Rp200.000.

Dampak koreksi:

| Indikator | Workbook saat ini | Setelah koreksi |
|---|---:|---:|
| Pengeluaran Desember | Rp3.110.000 | Rp3.290.000 |
| Kas Bersih Desember | Rp42.390.000 | Rp42.210.000 |
| Arus Kas Akhir | Rp23.521.000 | Rp23.341.000 |

Setelah koreksi, Arus Kas Akhir kembali sama dengan keuntungan pada RAB/Laba Rugi.

### 4.4 Koreksi kolom total Arus Kas

Pada sheet `4. Arus kas`, Sewa Lahan sebesar Rp7.000.000 ditempatkan pada bulan terkait tetapi kolom total barisnya kosong. Akibatnya:

- Subtotal `Lain-lain` pada `L40` hanya Rp1.020.000 dan tidak memasukkan sewa lahan.
- `Total Pengeluaran` pada `L42` menjadi Rp14.979.000.
- Penjumlahan bulanan sebelum koreksi transportasi sebenarnya Rp21.979.000.
- Nilai yang benar setelah koreksi transportasi adalah Rp22.159.000.

Implementasi aplikasi wajib menghitung total dari data kanonik dan tidak mempercayai cached formula workbook secara buta.

### 4.5 Arus Kas Pasca Pembiayaan setelah koreksi

Workbook menggunakan:

| Komponen | Nilai |
|---|---:|
| Kebutuhan Modal Kerja | Rp18.869.000 |
| Modal Sendiri | Rp3.869.000 |
| Pinjaman | Rp15.000.000 |
| Bunga per musim | 3% |
| Nilai Bunga | Rp450.000 |
| Pelunasan Pokok + Bunga | Rp15.450.000 |

Arus kas akhir pasca pembiayaan pada workbook saat ini adalah Rp23.071.000. Setelah typo transportasi Rp180.000 dikoreksi, nilai akhirnya secara matematis menjadi:

```text
Rp23.341.000 - Rp450.000 = Rp22.891.000
```

### 4.6 B/C ratio

Workbook menggunakan:

```text
B/C ratio = Keuntungan ÷ Total Biaya Produksi
```

Hasil studi kasus: `23.341.000 ÷ 22.159.000 = 1,05334`.

Dokumen desain lama menyarankan `Penerimaan ÷ Total Biaya`, tetapi itu tidak sama dengan source of truth terbaru. Implementasi default harus mengikuti formula workbook di atas. Jika nomenclature B/C hendak diubah atau dibakukan, perubahan tersebut harus dikonfirmasi kembali oleh pakar dan tidak boleh dilakukan diam-diam oleh developer.

---

## 5. Kondisi Aktual Codebase dan Evidence

### 5.1 Model data tidak memiliki mode

`FinanceProject` hanya memiliki status `draft | active | archived`. `RabCategory`, `RabItem`, dan transaksi hanya memiliki `projectId`; tidak ada `PROJECTION` atau `REALIZATION`.

Associated files:

- `lib/finance/rabTypes.ts:13-64`
- `lib/supabase.ts:15-84`
- `lib/api.ts:334-406`
- `lib/api.ts:595-793`

Dampak:

- Aplikasi tidak dapat mengetahui apakah catatan harian adalah proyeksi atau realisasi.
- Data kedua mode berisiko bercampur dalam query, dashboard, export, dan laporan.
- Pemilihan mode tidak dapat diselesaikan hanya melalui perubahan label UI.

### 5.2 Laba rugi saat ini merupakan RAB versus transaksi

`buildIncomeStatementComparison` memetakan RAB sebagai `planned` dan transaksi sebagai `actual`. Controller laporan mengirim dua dataset itu secara langsung dan UI menampilkan `Laba Rugi Rencana vs Aktual`.

Associated files:

- `lib/finance/rabCalculations.ts:81-153`
- `controllers/keuangan/useFinanceReportController.ts:52-82`
- `app/dashboard/keuangan/_components/FinanceIncomeStatementView.tsx:82-239`
- `tests/finance/rabCalculations.test.ts:80-123`

Dampak:

- Catatan harian PROYEKSI salah diklasifikasikan sebagai aktual.
- Laporan mencampur dua tahapan dalam satu workflow.
- Test otomatis yang ada mengunci asumsi bisnis yang salah dan harus ditulis ulang, bukan sekadar dipertahankan agar regresi hijau.

### 5.3 Halaman laba rugi menjadi editor RAB kedua

Tombol edit/hapus pada laporan laba rugi langsung mengubah atau menghapus item RAB.

Associated files:

- `app/dashboard/keuangan/_components/FinanceIncomeStatementView.tsx:225-299`
- `controllers/keuangan/useLabaRugiActionsController.ts:43-63`

Dampak:

- Laporan yang seharusnya merupakan output dapat mengubah data sumber.
- Aksi hapus pada laporan menimbulkan risiko kehilangan data dan duplikasi jalur editing.

### 5.4 Arus kas bergantung pada bulan RAB yang tidak tersedia saat import

Arus kas `planned` mengambil bulan dari `RabItem.plannedCashMonth`, sedangkan arus kas `actual` mengambil bulan dari tanggal transaksi.

Parser import menetapkan `plannedCashMonth: undefined` untuk item RAB. Catatan harian yang diimpor kemudian masuk sebagai transaksi dan dianggap aktual.

Associated files:

- `lib/finance/rabCalculations.ts:158-224`
- `lib/finance/rabExcel.ts:158-250`
- `lib/finance/rabExcel.ts:314-365`
- `controllers/keuangan/useRabController.ts:394-500`
- `app/dashboard/keuangan/_components/FinanceCashFlowView.tsx:22-55`

Dampak langsung ketika source workbook diimpor:

- Sisi proyeksi dapat kosong.
- Catatan transaksi proyeksi tampil sebagai aktual.
- Hasil arus kas tidak merepresentasikan sheet sumber.

### 5.5 Arus Kas Pasca Pembiayaan tidak diimplementasikan

Export saat ini membuat sheet kelima `Perbandingan Rencana vs Aktual`, bukan `Arus Kas Pasca Pembiayaan`. PDF dan laporan AI juga tidak memiliki model pembiayaan yang diperlukan.

Associated files:

- `lib/finance/rabExcel.ts:609-629`
- `lib/pdfReport.ts:102-225`
- `lib/server/ai/gemini.ts:239-326`
- `tests/finance/rabExcel.test.ts:125-141`

### 5.6 Formula export RAB berpotensi salah saat Excel menghitung ulang

Baris `TOTAL PENDAPATAN RENCANA` menggunakan `SUMIF` berdasarkan kolom bulan kas yang tidak kosong:

```excel
SUMIF(G5:Gn,"<>",F5:Fn)
```

Formula tersebut tidak memfilter tipe pendapatan dan dapat menjumlahkan item biaya sekaligus ketika file dihitung ulang.

Associated file:

- `lib/finance/rabExcel.ts:374-424`

### 5.7 Dashboard, PDF, dan AI mewarisi klasifikasi yang salah

Dashboard merangkum transaksi tanpa mode. PDF dan AI menerima model `planned` versus `actual` yang sama dengan laporan saat ini.

Associated files:

- `lib/dashboard/summary.ts:142-248`
- `lib/server/dashboard/summary.ts:218-278`
- `lib/pdfReport.ts:151-225`
- `lib/server/ai/gemini.ts:262-326`

### 5.8 Kalkulator kelayakan berdiri sendiri dari proyek

Kalkulator BFA menyimpan `totalBiaya`, `proyeksiPanen`, dan `targetHargaJual` di localStorage pengguna. Rumus BEP kg-nya sudah benar, tetapi angkanya tidak berasal dari RAB/mode aktif sehingga dapat berbeda dari laporan proyek.

Associated files:

- `controllers/keuangan/useKeuanganController.tsx:26-66`
- `controllers/keuangan/useKeuanganController.tsx:252-282`
- `controllers/keuangan/useKeuanganController.tsx:403-416`
- `app/dashboard/keuangan/_components/KeuanganView.tsx:1260-1430`

Selain itu, `BEP (Rp)` saat ini memakai formula yang membutuhkan pemisahan biaya tetap dan biaya variabel, tetapi input BFA hanya menyediakan total biaya. Angka tersebut tidak ada dalam source workbook dan tidak boleh dianggap sebagai bagian dari parity sebelum definisinya divalidasi oleh pakar.

---

## 6. Business Rules Target

### 6.1 Invariant utama

1. Setiap data keuangan wajib memiliki `project` dan `mode` yang eksplisit.
2. Mode tidak boleh ditebak dari jenis tabel, tanggal, keberadaan RAB, atau nama sheet.
3. PROYEKSI dan REALISASI memakai calculation engine yang sama.
4. Laporan dalam satu mode tidak menampilkan kolom mode lain.
5. PERBANDINGAN hanya membaca output final kedua mode dan tidak menjadi sumber transaksi.
6. Data dari mode berbeda tidak boleh tercampur dalam query, cache, localStorage, dashboard, import, export, PDF, atau AI.
7. Laporan merupakan output/read-only. Koreksi data dilakukan pada sumbernya.
8. Total RAB, catatan harian, laba rugi, dan arus kas harus memiliki mekanisme rekonsiliasi agar perbedaan internal dapat terlihat dan tidak menyebabkan double count.

### 6.2 Model data logis yang disarankan

Model konseptual:

```text
finance_project
└── finance_scenario
    ├── mode: PROJECTION | REALIZATION
    ├── rab_categories
    ├── rab_items
    ├── transactions
    ├── production_and_sales_assumptions
    ├── financing_assumptions
    └── import_history
```

Implementasi dapat menggunakan tabel `finance_scenarios` atau kolom mode pada setiap tabel. Apa pun bentuk fisiknya, database harus menjamin:

- Satu proyek tidak memiliki dua scenario dengan mode yang sama.
- RAB item, kategori, transaksi, dan pembiayaan tidak dapat terhubung silang antar-scenario.
- Query selalu difilter berdasarkan user, project, dan mode.

### 6.3 Pemilihan mode pada UI

- Setelah proyek dipilih, UI menampilkan switch/tab yang jelas: `PROYEKSI` dan `REALISASI`.
- Badge mode tetap terlihat di toolbar dan setiap dialog input.
- Berganti mode mengganti seluruh dataset, bukan hanya label.
- Jika ada draft belum disimpan, perpindahan mode meminta konfirmasi.
- Fitur `PERBANDINGAN` ditempatkan terpisah dari switch mode.
- Tidak perlu dan tidak diinginkan membuat UI menyerupai grid Excel secara literal.

### 6.4 RAB per mode

Rumus dasar:

```text
Total Item = Volume × Harga Satuan
Subtotal Kategori = Σ Total Item dalam kategori
Total Biaya Produksi = Σ Seluruh Item Pengeluaran
Penerimaan = Produksi × Harga Jual
Keuntungan = Penerimaan - Total Biaya Produksi
HPP = Total Biaya Produksi ÷ Produksi
BEP Produksi = Total Biaya Produksi ÷ Harga Jual
B/C ratio sesuai workbook = Keuntungan ÷ Total Biaya Produksi
```

Aturan edge case:

- Pembagi nol menghasilkan `tidak dapat dihitung`, bukan `0` atau `Infinity`.
- Nilai negatif ditolak pada volume, harga, biaya, dan hasil panen kecuali ada tipe koreksi khusus yang didefinisikan.
- BEP dapat disimpan dalam presisi penuh dan ditampilkan maksimal dua desimal.
- Status kelayakan harus tiga keadaan: `rugi`, `impas`, dan `untung/layak`. Saat produksi sama dengan BEP, statusnya `impas`, bukan `tidak layak`.

### 6.5 Catatan Transaksi Harian per mode

Field minimal:

- Tanggal.
- Uraian.
- Jenis: pemasukan atau pengeluaran.
- Kategori.
- Volume.
- Satuan.
- Harga satuan.
- Nominal.
- Link opsional ke item RAB dalam scenario yang sama.

Aturan:

- Nominal dapat dihitung dari volume × harga satuan, tetapi hasil dan override manual harus jelas.
- Transaksi tidak boleh ditautkan ke RAB dari proyek/mode lain.
- PROYEKSI memakai tanggal rencana.
- REALISASI memakai tanggal kejadian aktual.
- Catatan tidak otomatis berubah arti hanya karena proyek sudah selesai.

### 6.6 Laba Rugi per mode

Laba rugi mengikuti struktur workbook dan dihitung dari dataset konsolidasi pada mode aktif.

```text
Total Pendapatan = Σ item pendapatan mode aktif
Total Pengeluaran = Σ item pengeluaran mode aktif
Laba/Rugi = Total Pendapatan - Total Pengeluaran
```

Catatan transaksi merupakan detail/timing untuk dataset yang sama, bukan kolom pembanding. Sistem perlu menunjukkan status rekonsiliasi apabila jumlah catatan yang terhubung tidak sama dengan jumlah konsolidasi, tetapi tidak boleh menjumlahkan RAB dan catatan sekaligus.

Pilihan apakah rekap RAB REALISASI diedit manual atau dibentuk otomatis dari catatan aktual dapat ditentukan saat implementation design. Namun harus ada satu nilai kanonik per mode agar tidak terjadi double count.

### 6.7 Arus Kas per mode

Arus kas harus menggunakan tanggal catatan transaksi pada mode aktif untuk menempatkan pemasukan dan pengeluaran ke bulan yang sesuai.

```text
Kas Masuk Bulan n = Σ pemasukan bertanggal pada bulan n
Kas Keluar Bulan n = Σ pengeluaran bertanggal pada bulan n
Kas Bersih Bulan n = Kas Masuk - Kas Keluar
Kas Kumulatif Bulan n = Kas Kumulatif Bulan n-1 + Kas Bersih Bulan n
```

Aturan:

- `plannedCashMonth` pada RAB tidak boleh menjadi satu-satunya sumber timing.
- Import source workbook harus dapat membangun arus kas dari tanggal Catatan Transaksi Harian.
- Total lintas bulan harus sama dengan total laporan mode setelah rekonsiliasi.
- Bulan tanpa transaksi tampil nol, bukan hilang.
- Rentang bulan mengikuti periode proyek tetapi dapat diperluas bila ada transaksi valid di luar periode setelah konfirmasi.

### 6.8 Arus Kas Pasca Pembiayaan per mode

Field minimal:

- Saldo kas awal.
- Kebutuhan modal kerja.
- Modal sendiri.
- Nilai pinjaman.
- Tingkat bunga per periode/musim.
- Tanggal/bulan pencairan.
- Tanggal/bulan pembayaran.
- Biaya pembiayaan lain bila ada.

Rumus minimal:

```text
Kebutuhan Modal Kerja = nilai absolut dari defisit kumulatif maksimum sebelum pembiayaan
Bunga = Pokok Pinjaman × Bunga per Periode
Pelunasan = Pokok Pinjaman + Bunga + Biaya Pembiayaan Lain
Kas Setelah Pembiayaan = Kas Sebelum Pembiayaan + Arus Masuk Pembiayaan - Arus Keluar Pembiayaan
Kas Kumulatif Setelah Pembiayaan = Σ Kas Setelah Pembiayaan per bulan
```

Annual rate dan seasonal rate tidak boleh disamakan tanpa konversi yang eksplisit. Source workbook menggunakan 3% untuk satu musim pada pinjaman Rp15.000.000 sehingga bunga menjadi Rp450.000.

### 6.9 PERBANDINGAN PROYEKSI dan REALISASI

PERBANDINGAN hanya tersedia jika kedua mode memiliki data yang cukup.

Dimensi minimal:

- Total pendapatan.
- Total biaya produksi.
- Laba/rugi.
- HPP.
- BEP produksi.
- B/C ratio sesuai formula yang dikunci.
- Nilai per kategori/item.
- Kas masuk, kas keluar, kas bersih, dan kumulatif per bulan.
- Kebutuhan modal, pinjaman, bunga, dan saldo akhir pasca pembiayaan.

Rumus selisih:

```text
Selisih = REALISASI - PROYEKSI
Selisih % = Selisih ÷ PROYEKSI
```

Jika nilai PROYEKSI nol, persentase ditampilkan `—` dan bukan `Infinity`.

Item yang hanya ada pada salah satu mode tetap ditampilkan sebagai `tidak memiliki pasangan`, bukan dihilangkan.

---

## 7. Import Excel

### 7.1 Alur wajib

1. Pengguna memilih proyek.
2. Pengguna memilih tujuan import: PROYEKSI atau REALISASI.
3. Sistem membaca seluruh sheet yang didukung.
4. Sistem menampilkan preview mapping dan warning.
5. Sistem menjalankan validasi serta rekonsiliasi.
6. Pengguna mengonfirmasi.
7. Sistem melakukan import atomik atau rollback bila gagal.
8. Sistem menampilkan ringkasan berhasil/gagal per sheet dan per row.

### 7.2 Sheet yang harus didukung

1. `RAB`
2. `Catatan Transaksi Harian`
3. `Laporan Laba Rugi`
4. `Arus Kas`
5. `Arus Kas Pasca Pembiayaan`

Laporan dapat dihitung ulang dari data sumber; formula/cached value pada workbook dipakai untuk validasi, bukan dipercaya sebagai data kanonik tanpa pemeriksaan.

### 7.3 Penanganan source workbook yang diketahui cacat

Parser harus:

- Mendeteksi perbedaan transportasi Rp20.000 versus Rp200.000.
- Menghitung ulang BEP menggunakan formula yang benar.
- Menghitung ulang total Arus Kas yang kehilangan Sewa Lahan.
- Menampilkan warning koreksi pada preview.
- Menyimpan nilai kanonik yang telah dikoreksi setelah persetujuan pengguna.

### 7.4 Keselamatan import

- Tidak boleh menelan error row individual dengan `catch {}`.
- Tidak boleh menghasilkan partial import tanpa status yang jelas.
- Hasil error mencantumkan sheet, row, field, nilai asal, dan alasan.
- Import ulang harus memiliki pilihan replace, merge, atau cancel dengan konsekuensi yang dijelaskan.
- Riwayat import menyimpan mode tujuan dan daftar warning/koreksi.

Associated files:

- `lib/finance/rabExcel.ts`
- `controllers/keuangan/useRabController.ts`
- `app/dashboard/keuangan/_components/RabImportDialog.tsx`
- `tests/finance/rabExcel.test.ts`
- `tests/components/RabImportDialog.test.tsx`

---

## 8. Export Excel

### 8.1 Export satu mode

Export PROYEKSI atau REALISASI menghasilkan lima sheet:

1. `RAB`
2. `Catatan Transaksi Harian`
3. `Laporan Laba Rugi`
4. `Arus Kas`
5. `Arus Kas Pasca Pembiayaan`

Nama mode harus terlihat pada judul/subjudul workbook, bukan mengubah arti kolom secara tersembunyi.

### 8.2 Export perbandingan

Export PERBANDINGAN dapat:

- Membuat workbook tersendiri; atau
- Menambahkan sheet keenam `Perbandingan PROYEKSI vs REALISASI` pada export gabungan.

Sheet perbandingan tidak boleh menggantikan Arus Kas Pasca Pembiayaan.

### 8.3 Formula dan format

- Formula aktif dan tidak mengandung external workbook reference.
- Total pendapatan hanya menjumlahkan pendapatan.
- Total biaya hanya menjumlahkan pengeluaran.
- Formula BEP mengikuti keputusan pakar.
- Format Rupiah, tanggal Indonesia, angka desimal, dan persen konsisten.
- Heading, grouping kategori, subtotal, border, freeze pane, lebar kolom, dan print area mengikuti source semaksimal mungkin.
- Nilai formula harus mempunyai cached result yang konsisten bila library mendukungnya.
- Workbook hasil export dibuka ulang dalam test untuk memverifikasi nama sheet, formula, dan nilai.

Associated files:

- `lib/finance/rabExcel.ts:374-629`
- `controllers/keuangan/useFinanceExportController.ts`
- `tests/finance/rabExcel.test.ts`

---

## 9. PDF, AI, dan Dashboard

### 9.1 PDF

Pengguna memilih jenis laporan:

- Laporan PROYEKSI.
- Laporan REALISASI.
- Laporan PERBANDINGAN.

Laporan lengkap per mode mencakup lima bagian utama, termasuk Arus Kas Pasca Pembiayaan. Judul, periode, proyek, dan mode harus tercetak di setiap laporan.

Associated file: `lib/pdfReport.ts`.

### 9.2 AI report

Payload AI wajib menyertakan mode dan tidak boleh menyebut data sebagai aktual hanya karena berasal dari tabel transaksi.

Prompt per mode membahas kesehatan data pada mode tersebut. Prompt perbandingan membahas deviasi PROYEKSI versus REALISASI.

Kuota AI tidak boleh hanya ditegakkan melalui localStorage karena dapat direset oleh browser. Batas harus memiliki sumber server-side tunggal; View hanya menerima nilai yang perlu ditampilkan.

Associated files:

- `lib/server/ai/gemini.ts`
- `app/api/ai/financial-report/route.ts`
- `controllers/keuangan/useKeuanganController.tsx`
- `app/dashboard/keuangan/_components/KeuanganView.tsx`

### 9.3 Dashboard

Dashboard wajib menyatakan konteks metrik:

- Default yang direkomendasikan untuk operasional adalah REALISASI.
- Jika menampilkan PROYEKSI, labelnya harus eksplisit.
- Pengguna dapat memfilter proyek dan mode.
- Data tanpa klasifikasi hasil migrasi tidak boleh diam-diam dihitung sebagai REALISASI.

Associated files:

- `lib/dashboard/summary.ts`
- `lib/server/dashboard/summary.ts`
- `hooks/useDashboardSummary.ts`
- `controllers/dashboard-home/useDashboardHomeController.ts`

---

## 10. Analisis Kelayakan Usaha (BFA/HPP/BEP)

### 10.1 Kondisi target

Kalkulator utama harus mengambil nilai default dari scenario aktif:

- Total biaya dari RAB mode aktif.
- Proyeksi/hasil produksi dari asumsi produksi mode aktif.
- Harga jual dari asumsi penjualan mode aktif.

Jika fitur *what-if* tetap dipertahankan, input manual harus diberi label sebagai simulasi sementara dan tidak boleh mengganti data proyek tanpa tindakan simpan yang eksplisit.

### 10.2 Formula wajib

```text
HPP = Total Biaya Produksi ÷ Produksi
BEP Produksi = Total Biaya Produksi ÷ Harga Jual
Proyeksi Laba = Produksi × Harga Jual - Total Biaya Produksi
```

### 10.3 BEP Rupiah

Formula BEP Rupiah yang ada saat ini tidak didukung input biaya tetap/variabel yang memadai dan tidak terdapat pada source workbook. Pilihan aman:

1. Hapus dari parity wajib; atau
2. Pertahankan hanya setelah model biaya dan rumusnya dikonfirmasi pakar.

Jangan menampilkan angka yang tampak presisi tetapi dibangun dari definisi biaya yang tidak lengkap.

### 10.4 Redundansi formula

Rumus BEP juga terdapat pada modul stok (`hooks/useStok.ts`). Formula bersama harus dipusatkan pada helper domain teruji agar perubahan rumus tidak menghasilkan perilaku berbeda antarfitur.

---

## 11. Quality of Life dan Konsistensi UI

### 11.1 Design tokens, warna, dan kontras

#### Kondisi saat ini

- `lib/theme.ts` memberi `contrastText` gelap pada success/error tertentu, terutama dark mode.
- Snackbar menggunakan `Alert variant="filled"`, sehingga mewarisi black-on-green atau black-on-red.
- Kartu BFA menggunakan hex terang hardcoded yang tidak menyesuaikan dark mode.
- Chart memakai fallback teal yang berbeda tone dari hijau utama.
- Radius komponen tersebar antara 1.5, 2, 3, 4, 8, dan nilai global yang berbeda.

Associated files:

- `lib/theme.ts:15-116`
- `lib/ui/dashboardDesign.ts:1-81`
- `controllers/keuangan/financeCategoryChart.ts:34-72`
- `app/dashboard/keuangan/_components/KeuanganView.tsx:1384-1428`
- `app/dashboard/keuangan/_components/TransactionBatchDialog.tsx:99-145`

#### Revisi

- Success notification: white-on-green.
- Destructive/error: white-on-red.
- Background hijau/merah harus cukup gelap agar teks putih memenuhi kontras aksesibilitas.
- Gunakan semantic tokens seperti `successSurface`, `dangerSurface`, `infoSurface`, `warningSurface`, dan pasangan foreground-nya.
- Hilangkan hex lokal pada fitur keuangan kecuali merupakan bagian dari palet yang didefinisikan terpusat.
- Chart menggunakan palet produk yang sama; teal hanya digunakan bila sengaja didefinisikan sebagai warna informasi.
- Radius, shadow, border, dan spacing mengambil token bersama.

### 11.2 Modal dan dialog

#### Kondisi saat ini

- Transaction batch memiliki konfirmasi draft saat keluar.
- Project dialog dan RAB dialog dapat ditutup langsung walaupun pengguna telah mengubah input.
- Header, close button, radius, padding, error placement, dan urutan action berbeda-beda.

Associated files:

- `app/dashboard/keuangan/_components/TransactionBatchDialog.tsx:98-277`
- `app/dashboard/keuangan/_components/FinanceProjectDialog.tsx:27-201`
- `app/dashboard/keuangan/_components/RabItemDialog.tsx:20-67`
- `app/dashboard/keuangan/_components/RabImportDialog.tsx:19-180`

#### Revisi

- Gunakan satu `FormDialog/AppDialog` bersama.
- Terapkan dirty-state confirmation untuk seluruh form yang dapat kehilangan input.
- Standarkan close icon, Escape, focus trap/restore, action order, padding, dan mobile fullscreen/bottom-sheet behavior.
- Error field diletakkan dekat field; error form diringkas dalam form; snackbar hanya untuk hasil operasi async.

### 11.3 Kategori dan satuan

#### Kondisi saat ini

- Kategori transaksi menggabungkan preset global dan custom.
- Kategori RAB tersimpan per proyek dan jenis.
- Satuan transaksi memakai `Autocomplete freeSolo`.
- Satuan RAB memakai `TextField` biasa.
- Kedua kategori dapat ditambah melalui `MasterDataDialog`, tetapi pola pilihan, scope, preset, dan pengelolaannya tidak konsisten.

Associated files:

- `app/dashboard/keuangan/_components/TransactionEntryForm.tsx:74-137`
- `app/dashboard/keuangan/_components/TransactionEditForm.tsx:89-151`
- `app/dashboard/keuangan/_components/RabItemForm.tsx:77-143`
- `app/dashboard/stok/_components/MasterDataDialog.tsx`
- `controllers/keuangan/useTransactionMasterController.ts`
- `controllers/keuangan/useRabController.ts:172-274`

#### Revisi

- Gunakan satu pola *creatable combobox* untuk kategori dan satuan.
- Pengguna dapat memilih, mengetik nilai baru, atau membuka pengelolaan master melalui affordance yang sama.
- Perbedaan scope diselesaikan di controller/data layer, bukan melalui perilaku UI yang berbeda.
- Preset ditandai read-only atau menyediakan aksi salin menjadi custom.
- Semua icon-only button memiliki `aria-label` yang spesifik.

### 11.4 Motion dan reduced motion

#### Kondisi saat ini

- RAB dan laba rugi menduplikasi animasi hapus 220 ms.
- Komponen transaksi tidak mengikuti pola animasi yang sama.
- Durasi tersebar pada 150 ms, 200 ms, 220 ms, dan default MUI.
- Tidak ditemukan penanganan `prefers-reduced-motion` pada komponen keuangan.

Associated files:

- `app/dashboard/keuangan/_components/RabPlanningView.tsx:41-61`
- `app/dashboard/keuangan/_components/RabPlanningView.tsx:256-270`
- `app/dashboard/keuangan/_components/FinanceIncomeStatementView.tsx:51-63`
- `app/dashboard/keuangan/_components/FinanceIncomeStatementView.tsx:194-203`
- `app/dashboard/keuangan/_components/KeuanganView.tsx:509-575`

#### Revisi

- Pusatkan token motion: cepat, normal, dan keluar.
- Interaksi setara memiliki motion setara.
- Reduced motion menghapus perpindahan/translasi dan artificial delay.
- Animasi tidak boleh digunakan untuk menutupi race condition atau refetch berulang.

### 11.5 Responsive tables dan touch target

#### Kondisi saat ini

- Buku besar memiliki representasi mobile khusus.
- RAB, laba rugi, dan arus kas hanya menggunakan tabel dengan horizontal overflow.
- Action button transaksi desktop berukuran 34×34 px.
- Banyak `IconButton size="small"` berada di bawah target sentuh yang nyaman.

Associated files:

- `app/dashboard/keuangan/_components/KeuanganView.tsx:841-1087`
- `app/dashboard/keuangan/_components/KeuanganView.tsx:1024-1059`
- `app/dashboard/keuangan/_components/RabPlanningView.tsx:216-310`
- `app/dashboard/keuangan/_components/FinanceIncomeStatementView.tsx:149-249`
- `app/dashboard/keuangan/_components/FinanceCashFlowView.tsx:26-55`

#### Revisi

- Touch target minimal 44×44 px.
- Laporan lebar memiliki stacked rows/cards atau progressive disclosure pada mobile, bukan hanya horizontal scroll.
- Gunakan tabular figures dan alignment angka yang konsisten.
- Header/kolom penting dapat sticky bila tidak membuat nested scroll yang membingungkan.
- Pertahankan breakdown tekstual chart agar informasi tidak bergantung pada warna atau tooltip.

### 11.6 Loading, empty, error, dan retry

#### Kondisi saat ini

`useTransactions` menyediakan `loading`, `error`, dan `reload`, tetapi `useKeuanganController` tidak menggunakannya. Kegagalan dapat terlihat seperti data kosong.

Beberapa controller menelan error dengan `catch {}`. Import juga mengabaikan kegagalan transaksi individual.

Associated files:

- `hooks/useTransactions.ts:19-72`
- `controllers/keuangan/useKeuanganController.tsx:59`
- `controllers/keuangan/useTransactionMasterController.ts:23-39`
- `controllers/keuangan/useRabController.ts:447-500`

#### Revisi

- Bedakan initial loading, empty after success, recoverable error, offline/local fallback, dan saving.
- Sediakan retry yang jelas.
- Jangan menampilkan empty state sebelum loading berhasil selesai.
- Jangan menelan error; log internal dan feedback pengguna harus sesuai konteks.
- Import menampilkan error per row dan summary yang akurat.

### 11.7 Terminologi dan i18n

- Ganti istilah produk `Rencana` menjadi `PROYEKSI` ketika merujuk nama mode.
- Pertahankan `REALISASI` sebagai nama mode.
- Gunakan `PERBANDINGAN` untuk fitur mode-vs-mode.
- String komponen keuangan yang masih hardcoded dalam Bahasa Indonesia harus dipindahkan ke message catalog bila aplikasi mendukung Bahasa Inggris.
- Pilih satu istilah konsisten untuk `Catatan Transaksi Harian`; jangan berganti antara buku besar, catatan keuangan, transaksi operasional, dan aktual tanpa penjelasan konteks.

Associated files:

- `messages/id.json`
- `messages/en.json`
- `app/dashboard/keuangan/_components/KeuanganView.tsx`
- Seluruh komponen pada `app/dashboard/keuangan/_components/`

---

## 12. Bulk Operation, UI Flicker, dan Revalidation

### 12.1 Kondisi saat ini

Bulk delete RAB berjalan satu per satu:

```text
for setiap ID:
    kirim delete
    perbarui items/localStorage
    render ulang
    berpotensi memicu loadData kembali
```

`RabPlanningView` menyembunyikan seluruh row selama 220 ms untuk menutupi flicker, tetapi controller tetap menghapus dan memperbarui state per item.

Lebih jauh, `loadData` pada `useRabItems` bergantung pada `localState`. Setiap `syncLocalState` dapat membentuk callback baru dan memicu effect pemuatan ulang. Refetch dapat beradu dengan rangkaian delete sehingga row sempat muncul kembali atau tabel berkedip.

Associated files:

- `controllers/keuangan/useRabController.ts:376-392`
- `hooks/useRabItems.ts:33-79`
- `hooks/useRabItems.ts:158-163`
- `app/dashboard/keuangan/_components/RabPlanningView.tsx:41-61`
- `lib/api.ts:776-781`
- `controllers/keuangan/useLabaRugiActionsController.ts:49-63`
- `controllers/keuangan/useKeuanganController.tsx:219-249`

### 12.2 Solusi wajib

Solusi utama **bukan debounce**.

Gunakan:

1. **Batch mutation:** hapus banyak ID dalam satu operasi API/database bila memungkinkan.
2. **Single optimistic update:** keluarkan semua ID terpilih dari UI dalam satu state update.
3. **Single persistence update:** local cache/localStorage diperbarui sekali.
4. **Single revalidation:** maksimal satu refetch setelah batch selesai jika memang diperlukan.
5. **Selective rollback:** jika sebagian gagal, kembalikan hanya item yang gagal atau rollback snapshot secara konsisten.
6. **Accurate feedback:** laporkan jumlah berhasil dan gagal.
7. **Mutation lock:** nonaktifkan action terkait selama operasi berlangsung.

### 12.3 Kedudukan debounce

Debounce tidak menjadi requirement bulk delete. Debounced/coalesced refresh hanya boleh dipakai sebagai pengaman tambahan jika beberapa sumber independen masih dapat meminta refresh pada waktu berdekatan.

Debounce tidak boleh digunakan untuk mempertahankan pola delete satu per satu yang salah.

### 12.4 Acceptance criteria bulk operation

- Menghapus 50 row menghasilkan satu perubahan visual, bukan 50 refresh visual.
- Row tidak muncul kembali sesaat setelah disembunyikan.
- API delete dipanggil satu kali untuk batch, atau state tetap di-commit satu kali bila backend belum mendukung batch.
- Revalidation maksimal satu kali setelah operasi.
- Reduced motion tidak menunggu artificial delay 220 ms.
- Kegagalan sebagian mengembalikan hanya row gagal dan menjelaskan hasilnya.
- Operasi hanya menyentuh project dan mode aktif.

---

## 13. Redundancy dan Separation of Concerns

### 13.1 View masih menyimpan state dan logic

Aturan repository mewajibkan View hanya menerima props serta melakukan rendering/styling. Namun beberapa View masih memakai `useState`, timer, dan orchestration aksi.

Contoh:

- `KeuanganView.tsx`: state pencarian, panel distribusi, dialog, chart highlight, dan focus timer.
- `RabPlanningView.tsx`: selection target hapus, pending IDs, dan orchestration animasi.
- `FinanceIncomeStatementView.tsx`: pending IDs dan orchestration delete.
- `RabImportDialog.tsx`: selected file dan drag state.

Associated files:

- `AGENTS.md:6-12`
- `app/dashboard/keuangan/_components/KeuanganView.tsx`
- `app/dashboard/keuangan/_components/RabPlanningView.tsx`
- `app/dashboard/keuangan/_components/FinanceIncomeStatementView.tsx`
- `app/dashboard/keuangan/_components/RabImportDialog.tsx`

### 13.2 File terlalu besar dan tanggung jawab bercampur

Snapshot audit:

- `KeuanganView.tsx`: sekitar 1.658 baris.
- `useKeuanganController.tsx`: sekitar 631 baris.
- `useRabController.ts`: sekitar 554 baris.
- `useTransactionBatchController.ts`: sekitar 395 baris.

Controller utama menangani transaksi, filter, sort, chart, delete, BFA, export, PDF, AI quota, dialog, dan snackbar sekaligus.

Revisi:

- Pisahkan controller project/mode, ledger, RAB, report, comparison, financing, import/export, BFA, dan feedback.
- Pecah View berdasarkan panel/fitur tanpa memindahkan business logic ke View baru.
- Letakkan formula dalam helper domain murni yang sama untuk UI, export, PDF, AI, dan test.

### 13.3 Form tambah dan edit transaksi terduplikasi

`TransactionEntryForm.tsx` dan `TransactionEditForm.tsx` memiliki mayoritas field yang sama tetapi dipelihara sebagai dua implementasi terpisah.

Revisi:

- Ekstrak `TransactionFormFields` bersama.
- Form create/edit hanya membedakan initial data, submit handler, loading, dan footer action.
- Satukan simbol perkalian menjadi `×`, helper text, validasi, dan accessibility props.

Associated files:

- `app/dashboard/keuangan/_components/TransactionEntryForm.tsx`
- `app/dashboard/keuangan/_components/TransactionEditForm.tsx`
- `app/dashboard/keuangan/_components/TransactionDraftCard.tsx`

### 13.4 Redundansi lain

- Animasi delete RAB dan laba rugi diduplikasi.
- Bulk delete di transaksi, RAB, dan laba rugi memiliki loop masing-masing.
- `MAX_AI_REPORTS_PER_MONTH` didefinisikan pada controller dan View.
- Formula BEP muncul pada keuangan dan stok.
- Master kategori/satuan memiliki controller berbeda dengan perilaku error yang tidak seragam.
- Laba rugi menjadi jalur edit/hapus RAB kedua.

Targetnya adalah satu sumber aturan untuk setiap domain, bukan sekadar mengekstrak fungsi visual.

---

## 14. Migrasi Data Lama

Data lama tidak memiliki mode sehingga tidak aman untuk langsung dianggap REALISASI.

Strategi yang disarankan:

1. Buat scenario PROYEKSI dan REALISASI untuk setiap proyek lama.
2. RAB lama dapat dipetakan ke PROYEKSI karena model lama secara eksplisit membuat RAB sebagai rencana.
3. Transaksi lama masuk status migrasi sementara `UNCLASSIFIED` atau antrean klasifikasi.
4. Pengguna memilih apakah kumpulan transaksi lama merupakan PROYEKSI atau REALISASI, dengan dukungan bulk assignment.
5. Jangan menggandakan transaksi ke kedua mode.
6. Jangan menghapus link RAB lama; validasi ulang setelah mode ditentukan.
7. Simpan audit trail migrasi dan sediakan rollback administratif.
8. Dashboard dan laporan mengecualikan data `UNCLASSIFIED` dari angka mode sampai diklasifikasikan, sambil menampilkan warning yang jelas.

Migration script wajib diuji pada salinan data dan tidak boleh melakukan perubahan destruktif tanpa backup/rollback.

---

## 15. Strategi Pengujian

### 15.1 Golden fixture Padi 1 Ha

Buat fixture dari source workbook yang sudah diberi correction register.

Expected utama:

```text
Total Biaya Produksi       = 22.159.000
Penerimaan                 = 45.500.000
Keuntungan                 = 23.341.000
HPP                        = 3.165,571428...
BEP Produksi               = 3.409,076923...
B/C ratio sesuai workbook  = 1,053341757...
Arus Kas Akhir             = 23.341.000
Bunga Pembiayaan           = 450.000
Arus Kas Akhir Pasca Biaya = 22.891.000
```

Arus kas bulanan setelah koreksi:

| Bulan | Kas Bersih |
|---|---:|
| Juli | Rp0 |
| Agustus | -Rp13.464.000 |
| September | -Rp1.330.000 |
| Oktober | -Rp840.000 |
| November | -Rp3.235.000 |
| Desember | Rp42.210.000 |

### 15.2 Unit tests

- Formula RAB, HPP, BEP, laba, dan B/C.
- Laba rugi satu mode.
- Arus kas dan kumulatif satu mode.
- Kebutuhan modal kerja dari defisit maksimum.
- Bunga dan arus kas pasca pembiayaan.
- Perbandingan mode, termasuk nilai proyeksi nol dan unmatched items.
- Parser source workbook dan correction warnings.
- Formula export dan round-trip workbook.
- Batch delete dan selective rollback.
- Migration classification.

### 15.3 Controller/component tests

- Pergantian mode mengganti dataset dan mempertahankan project.
- Draft confirmation saat pindah mode/menutup dialog.
- Import wajib memilih mode.
- Laporan mode tidak menampilkan data mode lain.
- PERBANDINGAN tidak muncul sebagai editor.
- Loading, empty, error, retry, offline, dan partial failure.
- Mobile report tidak memerlukan horizontal scroll untuk tugas utama.
- Touch targets dan accessible labels.
- Reduced motion.

### 15.4 Regression tests yang harus diubah

Test berikut saat ini mengunci domain lama dan harus ditulis ulang sesuai dokumen ini:

- `tests/finance/rabCalculations.test.ts`
- `tests/finance/rabExcel.test.ts`
- `tests/components/FinanceIncomeStatementView.test.tsx`
- `tests/components/FinanceCashFlowView.test.tsx` bila tersedia/ditambahkan
- `tests/components/RabPlanningView.test.tsx`
- `tests/components/KeuanganView.test.tsx`
- `tests/lib/pdfReport.test.ts`

### 15.5 Kondisi verifikasi audit

Pada saat audit, test runner tidak dapat dijalankan karena `node_modules` belum tersedia dan executable `vitest` tidak ditemukan. Temuan business logic dibuktikan melalui inspeksi source code dan workbook. Setelah dependency tersedia, implementation plan wajib memasukkan baseline test sebelum perubahan dan full regression test setelah perubahan.

---

## 16. Prioritas Implementasi

### P0 — Membuat aplikasi dapat digunakan

1. Finalisasi model project + scenario/mode.
2. Buat migration plan untuk data lama.
3. Tulis calculation engine per mode menggunakan golden fixture.
4. Implementasikan PROYEKSI dan REALISASI sebagai dataset terpisah.
5. Tulis ulang laba rugi dan arus kas per mode.
6. Implementasikan Arus Kas Pasca Pembiayaan.
7. Pindahkan PERBANDINGAN menjadi fitur tersendiri.

### P1 — Menutup seluruh jalur data

1. Import mode-aware dengan preview, warning, dan atomic commit.
2. Export lima sheet per mode dan export perbandingan terpisah.
3. PDF, AI, dan dashboard mode-aware.
4. Migrasi serta klasifikasi data lama.
5. Batch mutation, optimistic update, single revalidation, dan partial failure handling.
6. Laporan read-only dan deep-link ke sumber data.

### P2 — Quality of life dan konsistensi

1. Design tokens dan kontras warna.
2. Standard modal/form behavior.
3. Creatable category/unit pattern.
4. Motion consistency dan reduced motion.
5. Responsive report views dan touch target.
6. Loading/error/retry/offline states.
7. i18n dan terminologi.
8. Refactor View/Controller dan penghapusan redundansi.

P2 dapat dikerjakan paralel pada komponen yang disentuh P0/P1, tetapi tidak boleh mengalihkan fokus dari koreksi domain.

---

## 17. Definition of Done

Revisi dianggap selesai hanya jika seluruh kondisi berikut terpenuhi:

- [ ] Satu proyek memiliki PROYEKSI dan REALISASI yang benar-benar terpisah.
- [ ] Catatan Transaksi Harian dapat berfungsi sebagai proyeksi maupun aktual sesuai mode.
- [ ] Tidak ada kode yang menyimpulkan RAB = proyeksi dan transaksi = realisasi secara global.
- [ ] Laba rugi per mode sesuai calculation engine dan golden fixture.
- [ ] Arus kas per mode terisi dari tanggal catatan dan tidak bergantung pada `plannedCashMonth` saja.
- [ ] Arus Kas Pasca Pembiayaan tersedia di UI, export, dan laporan.
- [ ] PERBANDINGAN membandingkan PROYEKSI dan REALISASI, bukan RAB dan transaksi.
- [ ] BEP Produksi menggunakan Total Biaya Produksi ÷ Harga Jual.
- [ ] Studi kasus Padi 1 Ha menghasilkan BEP 3.409,08 kg.
- [ ] Koreksi transportasi dan kolom total arus kas diterapkan.
- [ ] Import meminta mode tujuan dan tidak menghasilkan partial data tanpa laporan.
- [ ] Export per mode memiliki lima sheet sesuai source.
- [ ] PDF, AI, dan dashboard memahami mode.
- [ ] Laporan tidak dapat menghapus/mengedit data sumber secara langsung.
- [ ] Bulk delete tidak berkedip, tidak melakukan N revalidation, dan mendukung partial failure.
- [ ] Notification success menggunakan white-on-green yang aksesibel.
- [ ] Destructive action menggunakan white-on-red yang aksesibel.
- [ ] Modal, kategori/satuan, motion, dan responsive behavior konsisten.
- [ ] View/Controller mengikuti aturan `AGENTS.md`.
- [ ] Golden tests dan regression tests lulus.

---

## 18. Daftar Associated Files

### Domain model dan API

- `lib/finance/rabTypes.ts`
- `lib/supabase.ts`
- `lib/api.ts`
- `lib/server/finance/transactions.ts`
- `hooks/useFinanceProjects.ts`
- `hooks/useRabItems.ts`
- `hooks/useTransactions.ts`

### Calculation dan reporting

- `lib/finance/rabCalculations.ts`
- `controllers/keuangan/useFinanceReportController.ts`
- `controllers/keuangan/useLabaRugiActionsController.ts`
- `lib/pdfReport.ts`
- `lib/server/ai/gemini.ts`
- `app/api/ai/financial-report/route.ts`

### Import/export

- `lib/finance/rabExcel.ts`
- `controllers/keuangan/useRabController.ts`
- `controllers/keuangan/useFinanceExportController.ts`
- `app/dashboard/keuangan/_components/RabImportDialog.tsx`

### UI/controller Keuangan

- `app/dashboard/keuangan/page.tsx`
- `app/dashboard/keuangan/_components/KeuanganView.tsx`
- `app/dashboard/keuangan/_components/FinanceProjectDialog.tsx`
- `app/dashboard/keuangan/_components/RabPlanningView.tsx`
- `app/dashboard/keuangan/_components/RabItemDialog.tsx`
- `app/dashboard/keuangan/_components/RabItemForm.tsx`
- `app/dashboard/keuangan/_components/FinanceIncomeStatementView.tsx`
- `app/dashboard/keuangan/_components/FinanceCashFlowView.tsx`
- `app/dashboard/keuangan/_components/TransactionBatchDialog.tsx`
- `app/dashboard/keuangan/_components/TransactionEntryForm.tsx`
- `app/dashboard/keuangan/_components/TransactionEditForm.tsx`
- `controllers/keuangan/useKeuanganController.tsx`
- `controllers/keuangan/useFinanceProjectController.ts`
- `controllers/keuangan/useRabController.ts`
- `controllers/keuangan/useTransactionBatchController.ts`
- `controllers/keuangan/useTransactionMasterController.ts`

### Dashboard dan integrasi lain

- `lib/dashboard/summary.ts`
- `lib/server/dashboard/summary.ts`
- `hooks/useDashboardSummary.ts`
- `controllers/dashboard-home/useDashboardHomeController.ts`
- `hooks/useStok.ts`

### Theme, shared UI, dan i18n

- `lib/theme.ts`
- `lib/ui/dashboardDesign.ts`
- `controllers/keuangan/financeCategoryChart.ts`
- `app/dashboard/stok/_components/MasterDataDialog.tsx`
- `messages/id.json`
- `messages/en.json`
- `AGENTS.md`

### Tests

- `tests/finance/rabCalculations.test.ts`
- `tests/finance/rabExcel.test.ts`
- `tests/controllers/useRabController.test.tsx`
- `tests/controllers/financeCategoryChart.test.ts`
- `tests/components/KeuanganView.test.tsx`
- `tests/components/FinanceIncomeStatementView.test.tsx`
- `tests/components/RabPlanningView.test.tsx`
- `tests/components/RabImportDialog.test.tsx`
- `tests/components/TransactionBatchDialog.test.tsx`
- `tests/lib/pdfReport.test.ts`

### Dokumen lama yang disupersede pada aspek bisnis

- `docs/superpowers/specs/2026-06-17-finance-management-rab-actual-design.md`
- `docs/superpowers/plans/2026-06-17-finance-management-rab-actual-implementation.md`
- Bagian formula/standalone state pada `docs/superpowers/specs/2026-06-09-bep-hpp-design.md`
- Bagian formula/standalone state pada `docs/superpowers/plans/2026-06-13-bfa-rebuild.md`

---

## 19. Catatan Penutup untuk Developer

Revisi ini bukan penambahan label mode di atas implementasi lama. Akar masalah berada pada pemaknaan data dan harus diperbaiki dari model, calculation engine, hingga seluruh output.

Jangan mempertahankan test lama hanya demi menghindari perubahan besar apabila test tersebut mengunci asumsi RAB-versus-transaksi yang salah. Gunakan workbook yang sudah dikoreksi sebagai golden fixture dan pastikan setiap jalur—UI, Excel, PDF, AI, serta dashboard—menghasilkan angka dari sumber aturan yang sama.

Urutan keputusan yang benar adalah:

```text
Benarkan domain → benarkan kalkulasi → migrasikan data → benarkan integrasi → rapikan UX/UI
```

Perbaikan visual penting, tetapi aplikasi belum dapat dianggap usable sampai logika PROYEKSI, REALISASI, laba rugi, arus kas, dan pasca pembiayaan telah bekerja end-to-end.
