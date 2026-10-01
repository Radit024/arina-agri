# Laporan Simulasi Pengguna Baru — Fitur Keuangan (Manajemen Keuangan)

- **Tanggal simulasi**: 25 Agustus 2026
- **Metode**: End-to-end automation dengan Playwright (Chromium), akun demo/guest lokal (`arina_auth_mode=local`), data awal kosong (kondisi pengguna baru sebenarnya)
- **Urutan pengujian**: Mobile dulu (390×844, touch emulation), lalu Desktop (1440×900)
- **Skrip simulasi**: `e2e/keuangan-new-user-simulation.spec.ts`
- **Artefak**: `playwright-report/keuangan-simulasi/{mobile,desktop}/` (56 screenshot + `results.json` per perangkat)
- **Cara menjalankan ulang**: `npx playwright test keuangan-new-user-simulation --project=chromium` (dev server otomatis start di `127.0.0.1:3100`)

**Hasil akhir: kedua alur (mobile & desktop) selesai 100% tanpa blocker.** Ditemukan **2 bug teknis** dan **beberapa ketidaksesuaian UI** yang dijelaskan di bawah.

---

## 1. Alur Penggunaan New User (Tersimulasi)

Alur yang dilalui identik di mobile dan desktop:

| # | Langkah | Hasil | Screenshot |
|---|---------|-------|------------|
| 1 | Landing di Dashboard sebagai pengguna baru | Guide global "Kenalan dengan Arina Agri" (8 langkah) auto-muncul | `guide-auto-0-*` |
| 2 | Navigasi ke Keuangan (bottom nav mobile / sidebar desktop) | Berhasil, URL `/dashboard/keuangan` | `mobile/09`, `desktop/09-12` |
| 3 | Buka Panduan fitur "Mulai memakai Keuangan" (4 langkah) | Berhasil via tombol **Panduan** (sidebar) / **Lainnya → Panduan** (mobile) | `guide-fitur-keuangan-*` |
| 4 | Kondisi awal tanpa proyek | Empty state jelas: "Buat proyek terlebih dahulu untuk mulai mencatat transaksi.", kartu ringkasan Rp 0, "0 transaksi ditampilkan" | `first-visit` |
| 5 | Proteksi sebelum ada proyek | Tombol **Catat Transaksi**, **Export Excel**, **Export Laporan** semuanya *disabled* ✓ | `first-visit` |
| 6 | Buat proyek ("Buat Proyek Baru": nama, komoditas, musim tanam, tanggal) | Berhasil, proyek otomatis terpilih; submit disabled saat form kosong (validasi preventif) ✓ | `project-dialog-*`, `project-created` |
| 7 | Catat 2 transaksi sekaligus (pendapatan Rp 2.750.000 + pengeluaran Rp 850.000) | Alur draft → "+ Tambah Transaksi Lagi" → Konfirmasi → "Simpan Semua (2 transaksi)" berjalan mulus; snackbar "2 transaksi berhasil disimpan" | `tx-dialog-*`, `tx-confirm` |
| 8 | Verifikasi ringkasan | Total Pemasukan Rp 2.750.000, Total Pengeluaran Rp 850.000, Estimasi Laba Bersih Rp 1.900.000 — **akurat** ✓ | `ledger-populated` |
| 9 | Jelajahi 6 tab: Buku Besar, RAB, Laba Rugi, Arus Kas, Arus Kas Pasca Pembiayaan, Perbandingan | Semua panel render benar; angka konsisten antar-tab; empty state RAB/Perbandingan memberi CTA yang jelas | `tab-*` |
| 10 | Ganti skenario Proyeksi ↔ Realisasi | Berhasil tanpa dialog konfirmasi yang mengganggu (tidak ada draft pending) | `scenario-proyeksi` |
| 11 | Cek horizontal overflow di setiap layar | **Tidak ada overflow** di semua langkah, mobile maupun desktop ✓ | — |

### Perbedaan Mobile vs Desktop
- **Mobile**: tabel Buku Besar diganti kartu transaksi (expand untuk lihat catatan & aksi link/edit/hapus), FAB `+` untuk catat transaksi, tombol Export dipindah ke menu **⋮ (Aksi lainnya)**, tab laporan scrollable dengan panah. Semua berfungsi.
- **Desktop**: tabel lengkap dengan sort/filter/pagination, semua tombol toolbar terlihat langsung.

---

## 2. Bug yang Ditemukan

### BUG-01 — Hydration error: `<button>` di dalam `<button>` pada kartu draft transaksi
- **Severity**: Sedang (muncul setiap kali pengguna menambah ≥2 transaksi di dialog Catat Transaksi; tampil di console + badge "2 Issues" Next.js dev overlay)
- **Bukti**: `results.json` → `consoleIssues` mobile & desktop (identik)
- **Akar masalah**: MUI v7 merender `AccordionSummary` sebagai `<button>` (ButtonBase), sementara `TransactionDraftCard` menaruh `IconButton` hapus ("Hapus transaksi ini") **di dalam** AccordionSummary tersebut — nesting button dalam button tidak valid HTML dan memicu hydration error React.
  - `app/dashboard/keuangan/_components/TransactionDraftCard.tsx:75-137` (AccordionSummary + IconButton hapus di baris 127-136)
- **Saran perbaikan**: Pindahkan IconButton hapus ke luar `AccordionSummary` (mis. header baris terpisah), atau ganti menjadi `Box role="button"` non-nesting, atau set `component="div"` pada summary dengan handler keyboard manual.

### BUG-02 — HTTP 400 ke Supabase saat mode guest/demo (mock project ID bukan UUID)
- **Severity**: Rendah–Sedang (hanya mode guest; aplikasi tetap berfungsi karena fallback ke sessionStorage, tapi request gagal + console error terjadi setiap kali proyek guest dibuat/dipilih)
- **Bukti**: `results.json` → `httpIssues`: `400 https://...supabase.co/rest/v1/transactions?select=*&project_id=eq.project-1787599421462-qnpvrd&scenario_id=is.null`
- **Akar masalah**: Mode guest membuat ID proyek lokal `project-<timestamp>-<random>` (`hooks/useFinanceProjects.ts:12`), lalu `getUnclassifiedTransactions` (`lib/api.ts:1750-1761`, dipakai banner migrasi transaksi tidak terklasifikasi) tetap mengirim query ke Supabase dengan ID tersebut → PostgREST menolak (bukan UUID) → 400.
- **Saran perbaikan**: Skip pemanggilan API ketika `isGuestMode` (seperti yang sudah dilakukan `useTransactionsForScenario.ts:24-27`), atau validasi format UUID sebelum query.

---

## 3. Ketidaksesuaian / Masalah UI

### UI-01 — Nominal transaksi terpotong di tabel Buku Besar (desktop)
- **Severity**: Sedang — nilai uang adalah informasi paling penting di ledger
- Nominal tampil terpotong dengan ellipsis: `+Rp 2.750. …` karena kolom NOMINAL (18%) terlalu sempit + `textOverflow: 'ellipsis'`.
- Ref: `app/dashboard/keuangan/_components/KeuanganView.tsx:1113-1126`
- Saran: perlebar kolom nominal / kecilkan font / izinkan wrap, dan hilangkan ellipsis khusus kolom nominal.

### UI-02 — Nilai kartu ringkasan Arus Kas terpotong (mobile)
- **Severity**: Sedang
- Di tab Arus Kas mobile (390px), kartu "Kas Masuk" menampilkan `Rp 2.750.00…` terpotong di tepi kartu (dua kartu berdampingan tidak muat untuk nominal 7 digit).
- Ref: `app/dashboard/keuangan/_components/FinanceCashFlowMobileCard.tsx` (grid ringkasan 2 kolom)
- Saran: susun kartu ringkasan 1 kolom penuh di layar sempit, atau pakai format ringkas (`Rp 2,75 jt`).

### UI-03 — Tanggal overflow menimpa kolom JENIS (desktop ledger)
- **Severity**: Rendah
- Tanggal `whiteSpace: nowrap` di kolom selebar 12% ("10 Agustus 2026") meluber ke kolom JENIS sehingga badge Pendapatan/Pengeluaran tampak menempel/menimpa teks tanggal, dan kolom JENIS terlihat kosong.
- Ref: `KeuanganView.tsx:1083-1095`
- Saran: format tanggal pendek (`10 Agu 2026`) atau perlebar kolom.

### UI-04 — Empty state RAB redundan
- **Severity**: Rendah
- Judul "Belum ada item RAB" diikuti subtitle "Belum ada item RAB." — teks sama diulang dua kali.
- Ref: `app/dashboard/keuangan/_components/RabPlanningView.tsx`
- Saran: subtitle diganti kalimat aksi, mis. "Tambahkan item pertama atau import dari Excel."

### UX-01 — Mode skenario default "Realisasi" untuk pengguna baru
- **Severity**: Rendah (keputusan produk)
- Setelah membuat proyek pertama, mode aktif langsung **Realisasi** (chip "Mode: Aktual"), padahal pengguna baru realistisnya mulai dari perencanaan (Proyeksi/RAB). Berisiko membingungkan karena data yang mereka isikan lewat "Catat Transaksi" tercatat sebagai aktual, bukan rencana.
- Ref: `controllers/keuangan/useFinanceScenarioController.ts`, `FinanceProjectToolbar.tsx:153`

### UX-02 — Panduan fitur Keuangan tidak pernah muncul otomatis (by design, perlu diketahui)
- Hanya guide global yang auto-muncul di `/dashboard` (komentar GEN-01, `components/shared/guide/GuideProvider.tsx:45-51`). Guide "Mulai memakai Keuangan" hanya bisa dibuka manual via **Panduan** (sidebar desktop) atau **Lainnya → Panduan** (mobile). Penempatan tombol ini cukup tersembunyi untuk pengguna baru di mobile.
- **Koreksi (pasca-verifikasi)**: dugaan bahwa sheet "Lainnya" tetap terbuka di belakang dialog panduan TIDAK terbukti — `handleFeatureSelect` (`components/shared/MobileBottomNav.tsx:128-133`) sudah memanggil `setSheetOpen(false)` sebelum `openGuide()`. Screenshot semula menangkap animasi transisi penutupan sheet. Bukan bug.

### Catatan non-bug (agar tidak salah laporkan nanti)
- **Dialog "Catat Transaksi" tampak transparan** pada beberapa screenshot (`tx-dialog-empty`) — itu **animasi fade-in** yang tertangkap screenshot, bukan bug. Setelah animasi selesai, dialog dan backdrop render sempurna (lihat `tx-dialog-drafts`, `tx-confirm`).
- Bottom nav "melayang" di tengah screenshot full-page mobile = artefak `position: fixed` pada screenshot fullPage Playwright, bukan bug layout.
- Badge merah "2 Issues" = overlay khusus mode dev Next.js (isi: BUG-01).

---

## 4. Yang Sudah Berjalan Baik ✓

1. **Proteksi pengguna baru konsisten** — Catat Transaksi, Export Excel, Export Laporan semua disabled sebelum ada proyek; tidak ada jalur buntu.
2. **Empty state informatif** — setiap kondisi kosong (tanpa proyek, tanpa transaksi, RAB kosong, Perbandingan tanpa data Proyeksi) disertai CTA yang jelas.
3. **Alur catat transaksi batch** (draft → konfirmasi → simpan semua) mulus di kedua perangkat, termasuk auto-hitung nominal dari Volume × Harga Satuan.
4. **Konsistensi angka antar-tab** — Buku Besar, Laba Rugi, Arus Kas (kas masuk/keluar/bersih/kumulatif), dan Perbandingan menampilkan angka yang sama dan benar.
5. **Onboarding guide** berjalan baik di mobile & desktop (global 8 langkah, fitur keuangan 4 langkah) dengan opsi Lewati/Kembali/Berikutnya.
6. **Nol horizontal overflow** di 11 titik pemeriksaan × 2 perangkat; **nol page error**; tidak ada failed request selain BUG-02.

---

## 5. Prioritas Rekomendasi

| Prioritas | Item | Effort |
|-----------|------|--------|
| 1 | BUG-01: perbaiki nesting button di `TransactionDraftCard` | Kecil |
| 2 | UI-01 & UI-02: nominal terpotong (ledger desktop + kartu arus kas mobile) | Kecil |
| 3 | BUG-02: skip API unclassified saat guest mode | Kecil |
| 4 | UX-01: pertimbangkan default skenario Proyeksi untuk proyek baru | Menengah (produk) |
| 5 | UI-03, UI-04, UX-02: polish minor | Kecil |

---

## Lampiran — Daftar Artefak

```
playwright-report/keuangan-simulasi/
├── mobile/   01–08 guide global, 09 sheet Lainnya, 10–13 guide keuangan,
│             14 first visit, 15–17 proyek, 18–20 dialog transaksi,
│             21 ledger, 22–26 tab RAB/Laba Rugi/Arus Kas/Pasca Pembiayaan/Perbandingan,
│             27 skenario Proyeksi, 28 menu Aksi lainnya, results.json
└── desktop/  01–08 guide global, 09–12 guide keuangan, 13 first visit,
              14–16 proyek, 17–19 dialog transaksi, 20 ledger,
              21–25 tab, 26 skenario Proyeksi, results.json
```

Skrip simulasi dapat dijalankan ulang kapan saja: `npx playwright test keuangan-new-user-simulation --project=chromium`

---

## 6. Status Perbaikan (25 Agustus 2026)

| Item | Status | Implementasi |
|------|--------|--------------|
| BUG-01 Hydration error button>button | ✅ Fixed | `TransactionDraftCard.tsx` — IconButton hapus dikeluarkan dari AccordionSummary (+ test regresi) |
| BUG-02 HTTP 400 guest mode | ✅ Fixed | `useUnclassifiedTransactions.ts` — skip API saat `isGuestMode` (+ test) |
| UI-01 Nominal terpotong (desktop) | ✅ Fixed | Kolom nominal 18%→20% + atribut `title` |
| UI-02 Kartu Arus Kas terpotong (mobile) | ✅ Fixed | Grid ringkasan 1 kolom di xs |
| UI-03 Tanggal overflow kolom JENIS | ✅ Fixed | `formatDateShort` ("10 Agu 2026") |
| UI-04 Empty state RAB redundan | ✅ Fixed | Subtitle menjadi kalimat aksi |
| UX-01 Default skenario | ✅ Fixed | Default `PROJECTION` di `useFinanceScenarioController` |
| UX-02 Sheet Lainnya di belakang panduan | ✅ Non-bug (terverifikasi) | Kode sudah menutup sheet; screenshot menangkap animasi |
| UX-02 Guide tidak auto-muncul | ℹ️ By design | On-demand via tombol Panduan (GEN-01) |

Verifikasi: unit test lulus (41/41), `npm run typecheck` bersih, `npm run lint` 0 error (9 warning pre-existing di luar file yang diubah), e2e `finance-cashflow-mobile` + `keuangan-new-user-simulation` lulus (4/4 test) dengan hydration error & HTTP 400 supabase tidak lagi muncul. Tersisa 1 console/network issue non-regresi: 404 pada gambar artikel eksternal ImageKit (`ik.imagekit.io/.../1787196233.jpg`) dari konten kabar pasar, di luar cakupan perbaikan keuangan. Catatan: spec `finance-cashflow-mobile` sesekali flaky saat dijalankan paralel 4 worker dengan dev server dingin (halaman belum selesai "Menyiapkan dashboard..."); lulus konsisten saat dijalankan serial.
