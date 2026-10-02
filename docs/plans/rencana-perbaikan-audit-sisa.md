# Urutan Perbaikan Sisa Audit

Rencana ini susunan setelah A1–A8 (pemecahan file besar) selesai. Semua item di sini
berasal dari audit yang dijalankan terhadap source, bukan dari daftar asumsi.

Status audit: `npm run ci` hijau. Sisa utang tercatat di `AGENTS.md` bagian
"Utang teknis yang diketahui".

---

## Prinsip urutan

Urutannya bukan dari yang paling-PAuh, tapi dari urutan yang minimize risiko:

1. **Test dulu, baru refactor.** Kalau sebuah View/refactor tidak punya test,
   pemecahan berikutnya tidak punya pengaman. Audit menemukan `StokView` dipecah
   tanpa test isi tab — itu bukti bahwa urutan "refactor dulu"cents once.
2. **Controller dulu, baru View.** 36 props di `FinanceLedgerView` dan 32 props di
   `CuacaNotificationPanel` bukan salah View; keduanya warisan controller yang
   masih memegang terlalu banyak state. Mengecilkan View tanpa memotong
   controller hanya menyembunyikan masalah.
3. **Fungsi murni sebelum komponen.** `storageKeys.ts` dan `themeColors.ts`
   murah, murni, dan mengunci bug yang benar-benar pernah terjadi.
4. **Ukuran file belakangan.** File besar itu gejala, bukan disease.

---

## Fase 0 — Guard test (blocking, harus sebelum Fase 1)

Target: supaya setiap refactor berikutnya punya jaring.

### 0.1 Test `lib/storageKeys.ts`

- **Alasan.** 27 baris, 4 export, nol test. Modul ini dibuat justru untuk
  memperbaiki bug "notifikasi cuaca diam-diam membaca key berbeda". Bug seperti itu
  hanya tertangkap test; secara visual tidak terlihat.
- **Isi test.** `WEATHER_WHATSAPP_PHONE_KEY`, `WEATHER_TELEGRAM_CONTACT_KEY`,
  `SELECTED_FINANCE_PROJECT_KEY` punya nilai distinct; `scopedStorageKey()`
 menghasilkan key berbeda per prefix; prefix dapat diubah di satu tempat.
- **Lokasi.** `tests/lib/storageKeys.test.ts`
- **Estimasi.** Kecil, 1 file.

### 0.2 Test `lib/themeColors.ts`

- **Alasan.** 39 baris fungsi warna murni, nol test. Warna salah = bug visual
  yang tidak terlihat di test manapun.
- **Lokasi.** `tests/lib/ui/themeColors.test.ts` (folder `ui/` sudah ada)

### 0.3 Test isi tab Stok

- **Alasan.** `tests/components/StokView.test.tsx` hanya menguji 4 kartu
  ringkasan dan select stock-out. Isi tab — `StokBatchListView` dan
  `StokMutationsView` — tidak pernah dirender. A6 selesai secara type-safe tapi
  tanpa pengaman.
- **Isi test.** Batch list: state loading / kosong / terisi, kartu mobile vs
  tabel desktop, baris BEP, tombol stock-out dan tutup batch. Mutations:
  penyaring grade, rentang tanggal + validasi, state kosong.
- **Catatan.** Ekstrak `StokBatchListView` dan `StokMutationsView` sekarang
  membantu: props-nya kecil dan sudah terisolasi, jadi test tidak perlu render
  seluruh `StokView`.

### 0.4 Test `EnsiklopediaMessagesView`

- **Alasan.** Dua test sudah ada lewat `EnsiklopediaView.test.tsx` (markdown
  table/math, dan retry). Sisanya—empty state, `hasUserMessages` sudah— belum.
  `_components/EnsiklopediaMessagesView.tsx` 450 baris dengan coverage parsial.

---

## Fase 1 — Controller (unblocks View props)

### 1.1 `useCuacaController` → pecah per concern

- **Sekarang.** ~605 baris. Lokasi sudah terpisah (`useCuacaoLocationSearch`).
  Sisa: notifikasi, jadwal, kanal WhatsApp.
- **Target.** `useNotificationSettings` (platform, kontak, status simpan) dan
  `useNotificationSchedule` (enable, waktu, platform, error).
- **Efek samping yang diinginkan.** `CuacaNotificationPanel` 32 props → ~12,
  dan ambang ">25 props" di AGENTS.md kembali terpenuhi.
- **Verifikasi.** `tests/app/dashboardCuacaPage.test.tsx` sudah mengasersi
  `[data-weather-notification-panel="sticky"]` dan
  `[data-weather-history-layout="stretch-column"]` — jadi ada pengaman.

### 1.2 `useKeuanganController` — audit sisa concern

- **Sekarang.** ~615 baris. Tabel ledger sudah terpisah (`useLedgerTable`).
- **Belum diaudit.** Perlu pemetaan ulang: masih ada concern RAB/transaction
  form yang layak dipisah atau tidak. Jadwalkan setelah audit, jangan diasumsikan.

---

## Fase 2 — View props dan View/Controller

### 2.1 `FinanceLedgerView` — 36 props

- **Sekarang.** 1194 baris, 36 props. Panel distribusi sudah terpisah (A5).
- **Sisa concerns.** Tabel desktop, kartu batch mobile, form filter.
- **Masalah utama.** 36 props melanggar ambang yang tertulis di AGENTS.md.
  Perlu dipotong per section(tab), bukan per baris.
- **Catatan.** `FinanceLedgerView` sudah punya test yang kuat
  (`tests/components/KeuanganView.test.tsx` 988 baris, mengasersi panel
  distribusi, filter, tabel). Pengaman adequate.

### 2.2 `SupplyItemsView` — 14 `useState` domain

- **Sekarang.** 315 baris, 14 `useState`: nilai, unit (`'kg'`), tipe
  (`'bahan_pendukung' | 'alat'`), tanggal (`new Date()`), 4 string form, plus
  flag. Tidak ada `fetch` di file.
- **Masalah.** Ini state form, bukan state UI sementara. AGENTS.md hanya
  mengizinkan "sheet/tab terbuka" di View.
- **Catatan.** Sudah ada `tests/components/SupplyItemsView.test.tsx`. Pindahkan
  state ke controller dulu, baru sesuaikan test.

---

## Fase 3 — Ukuran file tersisa

Setelah Fase 1 dan 2, file berikut masih besar:

| File | Baris | Catatan |
| :--- | :--- | :--- |
| `tests/components/KeuanganView.test.tsx` | 988 | Satu file untuk seluruh keuangan. Pecah per tab. |
| `components/shared/SettingsModalView.tsx` | 701 | Belum dipetakan per section. |
| `app/dashboard/keuangan/_components/KeuanganView.tsx` | 701 | Shell; cek dulu apakah masih sebesar itu setelah A5. |

---

## Fase 4 — Higienitas & kebijakan

### 4.1 `references/`

- Folder ini di luar peta struktur AGENTS.md. Isinya
  `CATATAN KEUANGAN PADI 1 Ha ADE.xlsx` — dokumen bisnis, bukan kode.
- **Keputusan dibutuhkan:** pindah ke `docs/`, atau tambahkan ke peta struktur,
  atau hapus. Jangan dibiarkan di luar peta.

### 4.2 Kebijakan `console.*`

- 15 file client/shared punya `console.*`, terbanyak di `useCuacaController` (4),
  `useLocalStorage` (2), `useSessionStorage` (2).
- AGENTS.md tidak punya aturan soal ini, jadi statusnya ambigu: tidak ada yang
  salah, tapi tidak jelas mana yang disengaja.
- **Butuh keputusan:** izinkan `console.error` di client dengan alasan, atau
  timelyhapus semuanya ke logger.

### 4.3 `.gitignore` dan root

- Audit: **bersih.** `.superpowers`, `.tmp`, `test-results`, `playwright-report`,
  `*.tsbuildinfo` sudah ter-cover.
- Root punya `playwright-report/` dan `test-results/` sebagai folder fisik,
  tapi keduanya sudah di-ignore. Tidak perlu tindakan.

---

## Ringkasan dependensi

```
Fase 0 (guard test)
   ├─ 0.1 storageKeys  ─┐
   ├─ 0.2 themeColors  ─┤  mandiri, bisa paralel
   ├─ 0.3 tab Stok     ─┘
   └─ 0.4 Ensiklopedia messages
              │
              ▼
Fase 1 (controller)
   ├─ 1.1 useCuacaController ──► 2.1 FinanceLedgerView (prop count)
   └─ 1.2 useKeuanganController audit
              │
              ▼
Fase 2 (View)
   ├─ 2.1 FinanceLedgerView
   └─ 2.2 SupplyItemsView
              │
              ▼
Fase 3 (ukuran file) ──► Fase 4 (hygiene)
```

Fase 0 harus selesai lebih dulu karena setiap refactor di Fase 1–2 bergantung
padanya. Fase 4 bisa kapan saja karena tidak menyentuh kode.

---

## Yang sudah selesai (konteks)

A1–A8 sudah selesai dan `npm run ci` hijau:

| Refactor | Dari | Ke |
| :--- | :--- | :--- |
| `useCuacaController` | 798 | 605 + `useCuacaoLocationSearch` |
| `useRabController` | 659 | 433 + `useRabImport` |
| `useKeuanganController` | 683 | 615 + `useLedgerTable` |
| `lib/finance/rabExcel.ts` | 956 | 4 modul (types/parse/export/barrel) |
| `FinanceLedgerView` | 1351 | 1194 + `FinanceDistributionPanel` |
| `StokView` | 1271 | 890 + 2 panel + `stockChips` |
| `EnsiklopediaView` | 1126 | 675 + `EnsiklopediaMessagesView` |
| `CuacaView` | 819 | 631 + `CuacaNotificationPanel` |