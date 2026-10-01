# Laporan Simulasi Buku Besar & RAB — Tambah Item Manual + Hubungkan RAB

- **Tanggal simulasi**: 25 Agustus 2026
- **Metode**: Playwright (Chromium), akun demo/guest lokal, data awal kosong; alur fungsional penuh ditambah uji logic (dangling link, mixed bulk, filter status)
- **Urutan**: Mobile (390×844, touch) dulu → Desktop (1440×900)
- **Skrip**: `e2e/keuangan-rab-link-simulation.spec.ts`
- **Artefak**: `playwright-report/keuangan-simulasi-rab/{mobile,desktop}/` (screenshot + `results.json`; 23 langkah & 28 temuan tercatat per perangkat)
- **Cara menjalankan ulang**: `npx playwright test keuangan-rab-link-simulation --project=chromium`

**Hasil akhir: kedua perangkat selesai 100%. Nol console error, nol page error, nol HTTP ≥400, nol horizontal overflow.** Ditemukan **1 logic bug signifikan**, **2 gap logic/parity**, dan beberapa temuan UX/a11y — rincian di bawah.

---

## 1. Alur yang Disimulasikan

| # | Langkah | Hasil |
|---|---------|-------|
| 1 | Buat proyek "Simulasi RAB Link" (Cabai Merah, MT-1 2026) | ✅ Berhasil, otomatis terpilih |
| 2 | **RAB — tambah item pengeluaran manual**: Saprodi · "Pupuk NPK 200kg" · 10 karung × Rp 850.000 · Bulan kas 2026-08 · alias "NPK, pupuk" | ✅ Berhasil; **Total Rencana terhitung live** Rp 8.500.000; kartu "Biaya Rencana" ter-update |
| 3 | RAB — probe validasi submit kosong | ⚠️ Validasi native browser (lihat UX-04) |
| 4 | **RAB — tambah item pendapatan manual**: Penjualan Hasil Panen · "Jual Cabai Merah" · 500 kg × Rp 12.000 | ✅ Berhasil; Pendapatan Rencana Rp 6.000.000 |
| 5 | **Buku Besar — 4 transaksi manual**: Pupuk Rp 1.700.000 (5/8), Penjualan Rp 1.200.000 (10/8), Pupuk Rp 850.000 (12/8), Tenaga Kerja Rp 300.000 (15/8) | ✅ Semua tersimpan; **fitur auto-saran RAB aktif** (lihat §3) |
| 6 | **Hubungkan manual**: transaksi → item RAB via dialog "Hubungkan RAB" | ✅ Berhasil; chip "RAB: {item}" muncul; snackbar sukses; chip "Disarankan" tampil |
| 7 | **Bulk**: pilih 2 transaksi → "Hubungkan RAB" → 1 item | ✅ Berhasil (desktop); snackbar "2 transaksi berhasil dihubungkan ke RAB" |
| 8 | **Bulk campuran jenis** (pendapatan + pengeluaran) | ⚠️ Dialog menampilkan peringatan + 0 opsi (lihat UX-03) |
| 9 | **Filter status link** ("✓ Terhubung RAB" / "⚠ Belum ke RAB") | ✅ Logic benar di mobile; **tidak tersedia di desktop** (LOGIC-04) |
| 10 | **Dangling link**: hapus item RAB yang masih terhubung | ⚠️ Chip jadi "RAB tersambung", tak bisa diputus (LOGIC-02) |
| 11 | Cek overflow di tiap layar | ✅ Nol overflow |

**Angka konsisten**: Buku Besar menampilkan Pemasukan Rp 1.200.000 / Pengeluaran Rp 2.850.000 / DEFISIT Rp 1.650.000 — semua benar. RAB: Pendapatan 6.000.000, Biaya 8.500.000 (lihat LOGIC-01 untuk "Laba Rencana").

---

## 2. Bug / Logic Mistake yang Perlu Diperbaiki

### LOGIC-01 — "Laba Rencana" tampil POSITIF padahal defisit (misleading) — **Prioritas Tinggi**
- **Bukti**: RAB 6.000.000 − 8.500.000 = **−2.500.000 (rugi)**, tapi kartu menampilkan "**Laba Rencana Rp 2.500.000**" tanpa tanda minus, tanpa label "Rugi/Defisit" (screenshot `04-rab-populated.png`, kedua perangkat).
- **Akar**: `app/dashboard/keuangan/_components/RabPlanningView.tsx:227` — `value={formatRupiah(Math.abs(rab.totals.plannedProfit))}`. Controller sudah menghitung benar (`useRabController.ts:176`, income − expense), tapi view membuang tanda minus dan label tidak berubah.
- **Dampak**: Pengguna membaca proyek RUGI 2,5 jt sebagai LABA 2,5 jt — kesalahan baca arus kas rencana yang berbahaya untuk keputusan.
- **Perbandingan**: Buku Besar sudah benar — label berubah jadi "DEFISIT ANGGARAN" saat negatif.
- **Saran**: Ikat label ke nilai (`plannedProfit < 0 ? 'Rugi Rencana'/'Defisit Rencana' : 'Laba Rencana'`) dan tampilkan nilai bertanda (atau label + abs), konsisten dengan pola Buku Besar.

### LOGIC-02 — Dangling link: hapus item RAB tidak membersihkan transaksi terhubung — **Prioritas Menengah**
- **Bukti** (kedua perangkat): setelah item "Alat Semprot Sekunder" dihapus, chip transaksi berubah menjadi "**RAB tersambung**" (fallback) dan filter mobile "✓ Terhubung RAB" **tetap menghitung** transaksi itu sebagai terhubung.
- **Akar**: `deleteRabItem` (`controllers/keuangan/useRabController.ts:432-440`) tidak menyentuh transaksi; label fallback `getRabLinkLabel` (`KeuanganView.tsx:379-383`); filter menganggap `rabItemId` apapun = terhubung (`useKeuanganController.tsx:551-554`).
- **Dampak**: Data link menggantung selamanya; laporan/ekspor yang memetakan `rabItemId → nama item` kehilangan referensi; pengguna tidak tahu linknya sudah mati (teks "RAB tersambung" ambigu — terdengar seperti sukses).
- **Saran**: (a) Saat hapus item, konfirmasi harus menyebut jumlah transaksi terhubung + tawarkan putuskan link; atau (b) tampilkan chip peringatan "RAB dihapus — putuskan" yang bisa diklik untuk unlink.

### LOGIC-03 — Tidak ada cara memutus link (unlink) di mana pun — **Prioritas Menengah**
- **Bukti**: Tidak ada tombol/aksi "putuskan/lepas RAB" di tabel desktop maupun kartu mobile; satu-satunya cara "membongkar" adalah menimpa dengan link lain.
- **Dampak**: Salah hubungkan = permanen dari sisi UI; koreksi data harus lewat edit transaksi manual.
- **Saran**: Tambah aksi "Putuskan RAB" pada chip link (klik chip → konfirmasi putus) atau opsi di dialog edit transaksi.

### LOGIC-04 — Parity gap: fitur bulk & filter status link tidak merata antar perangkat — **Prioritas Rendah–Menengah**
- **Bulk link** (pilih banyak transaksi → hubungkan sekaligus) hanya ada di **desktop** — kartu mobile tidak punya checkbox seleksi (`KeuanganView.tsx`: checkbox hanya di tabel desktop, baris 977 & 1081).
- **Filter "RAB Terhubung / Belum Terhubung"** hanya ada di **mobile** (`display: { xs: 'flex', md: 'none' }`, `KeuanganView.tsx:707-753`) — pengguna desktop tidak bisa memfilter status link sama sekali.
- **Saran**: Tambahkan checkbox di kartu mobile + pindahkan/ Duplikasi chip filter ke toolbar desktop.

### LOGIC-05 — Relink menimpa link lama tanpa peringatan — **Prioritas Rendah**
- **Bukti**: Transaksi yang sudah berchip "RAB: Pupuk NPK 200kg" di-link lagi ke item yang sama via bulk → langsung sukses, tanpa konfirmasi/warning "transaksi sudah terhubung ke ...".
- **Saran**: Jika `tx.rabItemId` sudah terisi dan berbeda dari target, tampilkan konfirmasi ringan; jika sama, tampilkan status "sudah terhubung".

### BUG-KECIL — Error backend di mode guest: `usage_events` FK violation — **Prioritas Rendah**
- **Bukti**: Log server saat simulasi guest: `Gagal mencatat usage event: insert or update on table "usage_events" violates foreign key constraint "usage_events_user_id_fkey"`.
- **Akar**: Usage event dicatat dengan user id mock guest yang tidak ada di tabel `users`.
- **Saran**: Skip `recordEvent` saat `isGuestMode`, atau upsert user demo.

---

## 3. Temuan UX / A11y

| # | Temuan | Detail & Ref | Prioritas |
|---|--------|--------------|-----------|
| UX-01 | **Kategori RAB ≠ kategori transaksi** | Preset RAB pengeluaran: *Saprodi, Tenaga Kerja, Jasa Alsintan, Irigasi & Air, Alat Tani, Operasional, Lainnya* (`useRabController.ts:36-39`); kategori transaksi: *Pupuk, Pestisida, Tenaga Kerja, ...* — "Pupuk" tidak ada di RAB. Auto-saran tetap bekerja lewat **alias/keterangan** (terbukti: alias "NPK" tersarankan ke transaksi "Beli 2 karung NPK"), tapi tanpa alias, transaksi "Pupuk" tidak tersarankan ke item "Saprodi". Pertimbangkan menyelaraskan preset atau memetakan sinonim. | Rendah |
| UX-02 | **Tab RAB tidak menampilkan realisasi** | Total RAB murni rencana; nominal transaksi terhubung tidak terlihat di tab RAB (baru muncul di ekspor/Perbandingan). Pengguna yang menghubungkan transaksi mengharapkan melihat "terpakai/terealisasi" di RAB. | Rendah–Menengah |
| UX-03 | **Bulk campuran jenis: dialog terbuka dengan 0 opsi** | Guard bekerja (pesan "Pilih transaksi dengan jenis yang sama..." + daftar kosong, terverifikasi desktop), tapi lebih baik tombol "Hubungkan RAB" diblokir/disabled sejak awal dengan tooltip alasan. | Rendah |
| UX-04 | **Validasi form RAB memakai native HTML5** | Submit kosong memunculkan tooltip browser "**Please fill out this field.**" (bahasa Inggris, tergantung browser) — pesan validasi Indonesia dari `validateRabItemDraft` (`useRabController.ts:130-144`) tidak pernah terpakai untuk field required. Gunakan validasi aplikasi agar konsisten berbahasa Indonesia. | Rendah |
| UX-05 | **A11y: dialog tanpa accessible name** | `RabItemDialog` & `RabTransactionLinkDialog` memakai MUI `Dialog` + `DialogTitle` mentah tanpa `aria-labelledby` — screen reader tidak membacakan judul dialog. Bandingkan `AppDialog` yang sudah benar (`components/ui/AppDialog.tsx:131`). | Rendah |
| UX-06 | **Chip link terpotong** | Chip "RAB: Pupuk N..." terpotong ellipsis di kolom Detail desktop; nama item RAB yang panjang tidak terbaca penuh (hover saja). | Rendah |

**Catatan metodologi (agar tidak salah tindak lanjut)**: selama analisis awal, filter "⚠ Belum ke RAB" sempat diduga salah menampilkan transaksi terhubung — setelah ditelusuri, itu **false positive skrip** (dua transaksi sama-sama berkategori "Pupuk", locator mengambil kartu pertama). Filter terbukti **benar**; yang perlu dijaga saat menambah test adalah keunikan kategori per transaksi.

---

## 4. Yang Berjalan Baik ✅

1. **Tambah item RAB manual** mulus (expense & income): Total Rencana live `volume × harga`, ringkasan Pendapatan/Biaya Rencana ter-update akurat.
2. **Auto-saran RAB cerdas**: alias/kata kunci mencocokkan keterangan transaksi ("NPK" → item "Pupuk NPK 200kg"), chip saran tampil di form, dan checkbox **"Hubungkan Otomatis"** bisa dimatikan untuk linking manual.
3. **Link manual single** di mobile & desktop: dialog ringkas (pencarian + kartu opsi), **filter jenis benar** (transaksi pendapatan hanya melihat item income — 1 opsi), chip "Disarankan" muncul, snackbar sukses, chip "RAB: {item}" langsung tampil.
4. **Bulk link** (desktop): 2 transaksi → 1 item RAB sekaligus, snackbar jumlah benar, seleksi otomatis dibersihkan setelah sukses.
5. **Guard campuran jenis** bekerja: tidak ada jalur salah-link lintas jenis.
6. **Filter status link mobile** logic-nya benar ("✓ Terhubung RAB" / "⚠ Belum ke RAB" menampilkan set yang tepat).
7. **Hapus item RAB** bekerja dengan transisi halus (220 ms) + dialog konfirmasi.
8. **Kesehatan teknis**: 0 console error, 0 page error, 0 request gagal, 0 horizontal overflow — di kedua perangkat, 23 langkah each.

---

## 5. Rekomendasi Prioritas

| Prioritas | Item | Effort |
|-----------|------|--------|
| 1 | LOGIC-01: label & tanda "Laba/Rugi Rencana" | Kecil |
| 2 | LOGIC-02+03: bersihkan/tandai dangling link + sediakan unlink | Menengah |
| 3 | LOGIC-04: parity bulk (mobile) & filter (desktop) | Menengah |
| 4 | UX-04: validasi Indonesia, UX-05: aria-labelledby dialog RAB | Kecil |
| 5 | UX-02: kolom/baris "terealisasi" di tab RAB | Menengah (produk) |
| 6 | LOGIC-05, UX-01, UX-03, UX-06, BUG-KECIL | Kecil |

---

## Lampiran — Artefak

```
playwright-report/keuangan-simulasi-rab/
├── mobile/   rab-empty, rab-form-expense, rab-form-validation, rab-populated,
│             ledger-4-transactions, link-dialog-{pupuk,penjualan-hasil-panen,
│             tenaga-kerja}, filter-belum-terhubung, final-state, results.json
└── desktop/  (serangkaian sama + link-dialog-bulk + link-dialog-mixed), results.json
```

Skrip: `e2e/keuangan-rab-link-simulation.spec.ts` · Laporan sebelumnya (alur new user): `docs/laporan-simulasi-keuangan-new-user.md`
