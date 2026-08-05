# Desain: Integrasi UI Skenario Proyeksi/Realisasi (Sub-bagian B)

Tanggal: 2026-08-02
Status: Disetujui, menunggu implementation plan
Sub-bagian: B dari revisi besar Manajemen Keuangan (lihat `AUDIT_REVISI_MANAJEMEN_KEUANGAN.md` di
root repo dan sub-bagian A: `docs/superpowers/specs/2026-08-02-finance-scenario-model-calc-engine-design.md`)

## Latar Belakang

Sub-bagian A membangun skema data (`finance_scenarios`, `scenario_id` di RAB/transaksi) dan
calculation engine murni (`lib/finance/scenarioCalculations.ts`) tapi belum menyambungkannya ke UI
apa pun — halaman Keuangan hari ini masih tampil persis seperti sebelum revisi audit dimulai: masih
memakai `buildIncomeStatementComparison`/`buildCashFlowComparison` (model RAB-vs-transaksi lama),
tanpa pemilihan mode Proyeksi/Realisasi, tanpa Arus Kas Pasca Pembiayaan, tanpa PERBANDINGAN.

Sub-bagian B menyambungkan lapisan data dan UI untuk lima area: pemilih mode di toolbar, RAB
per-scenario, Catatan Transaksi Harian (Buku Besar) per-scenario, Laba Rugi per-scenario, dan Arus
Kas per-scenario. Arus Kas Pasca Pembiayaan (sub-bagian C) dan PERBANDINGAN (sub-bagian D) menyusul
terpisah. Mode-awareness untuk Import/Export/PDF/AI/Dashboard (fase P1) juga di luar cakupan ini,
kecuali penyesuaian minimal supaya fitur-fitur itu tidak diam-diam menghasilkan data yang salah
selama masa transisi (lihat Keputusan Desain #4 dan #5).

## Keputusan Desain

1. **Auto-provisioning scenario**: setiap proyek (baru maupun lama) otomatis mendapat 2 baris
   `finance_scenarios` (`PROJECTION` dan `REALIZATION`) saat pertama kali dibuka di modul Keuangan.
   Migrasi data lama (RAB/transaksi dengan `scenario_id` NULL) **tidak** termasuk cakupan ini — data
   itu tetap tidak terlihat di tampilan yang sudah difilter per-scenario sampai migrasi terpisah
   dijalankan. Ini kondisi yang disengaja, bukan bug yang perlu ditambal di sub-bagian ini.
2. **UI pemilihan mode**: dua Tabs besar **PROYEKSI | REALISASI**, menonjol di toolbar (bukan
   dropdown kecil), sesuai audit §6.3. Default REALIZATION (audit §9.3: default operasional).
3. **Layer data terpisah dari modul lain**: hook baru (`useRabItemsForScenario`,
   `useTransactionsForScenario`) dibuat terpisah dari `useRabItems`/`useTransactions` yang sudah
   ada — karena `useTransactions` juga dipakai modul Stok (`controllers/stok/StokController.tsx`)
   untuk mutasi stok yang tidak terkait konsep scenario sama sekali. Hook lama tidak diubah.
4. **Kode lama dihapus total**: `buildIncomeStatementComparison`, `buildCashFlowComparison`,
   `getVarianceStatus`, dan tipe-tipe terkait (`IncomeStatementComparison(Row)`,
   `CashFlowComparison(Row)`, `VarianceStatus`) di `lib/finance/rabCalculations.ts`/`rabTypes.ts`
   dihapus beserta test-nya — bukan dibiarkan sebagai kode mati.
5. **Export Excel, Export Laporan (PDF/AI) dinonaktifkan sementara** di toolbar (tombol disabled +
   pesan "tersedia setelah revisi mode-aware"), karena fitur-fitur itu mengonsumsi bentuk data dari
   fungsi yang dihapus di keputusan #4, dan mode-awareness-nya baru masuk fase P1. **Import Excel
   RAB tetap aktif** — hasil parsing-nya diberi `scenario_id` sama dengan mode yang sedang aktif
   saat tombol Import ditekan (tanpa menambah pilihan mode tujuan eksplisit di dialog — itu baru
   masuk P1).
6. **HPP/BEP/B-C ratio/status kelayakan tidak disentuh** di sub-bagian ini — metrik itu butuh data
   asumsi produksi-penjualan (`production_sales_assumptions`) yang UI input-nya belum ada. Tab Laba
   Rugi di sub-bagian ini hanya menampilkan Total Pendapatan/Pengeluaran/Laba-Rugi dari
   `computeLabaRugi`.

## Arsitektur

### Data Layer (baru, tidak mengganti yang lama)

```
hooks/useFinanceScenarios.ts
  → given projectId: fetch finance_scenarios rows; auto-create baris yang belum ada
    (idempotent — cek dulu mode mana yang sudah ada sebelum insert)
  → return { scenarios: FinanceScenarioEntity[], loading, error }

hooks/useRabItemsForScenario.ts
  → given scenarioId: fetch rab_categories + rab_items WHERE scenario_id = X
  → CRUD (create/update/delete) menyertakan scenario_id pada insert
  → bentuk return value semirip mungkin dengan useRabItems.ts yang sudah ada
    (categories, items, imports, loading, error, backendOnline, create*/update*/delete*)

hooks/useTransactionsForScenario.ts
  → given scenarioId: fetch transactions WHERE scenario_id = X
  → bentuk return value semirip mungkin dengan useTransactions.ts yang sudah ada
    (transactions, loading, error, addTransaction, updateTransaction, deleteTransaction, reload)

lib/api.ts (tambahan, bukan pengubahan fungsi yang sudah ada)
  → financeScenarioApi.getOrCreateForProject(projectId): Promise<FinanceScenarioEntity[]>
  → payload create RAB category/item dan transaksi menerima field scenarioId opsional
```

`useTransactions`/`useRabItems` (dan `transactionApi`/`rabApi` yang sudah ada) tetap dipakai apa
adanya oleh modul Stok dan konsumen lain — sub-bagian ini tidak mengubah signature/behavior mereka.

### Controller Layer

```
controllers/keuangan/useFinanceScenarioController.ts   (baru)
  → wraps useFinanceScenarios(projectId)
  → state activeMode: ScenarioMode, persist per-project via useLocalStorage
    (key: `arina-finance-scenario-mode-${projectId}`), default 'REALIZATION'
  → activeScenario = scenarios.find(s => s.mode === activeMode) ?? null
  → return { scenarios, activeMode, setActiveMode, activeScenario, loading }

controllers/keuangan/useRabController.ts                (dimodifikasi)
  → sumber data ganti dari useRabItems(project) ke useRabItemsForScenario(scenario?.id)
  → create/update RAB category/item menyertakan scenario_id dari scenario aktif

controllers/keuangan/useKeuanganController.tsx           (dimodifikasi)
  → wire financeScenario = useFinanceScenarioController(selectedProject?.id)
  → transaksi dari useTransactionsForScenario(financeScenario.activeScenario?.id)
    (bukan lagi useTransactions() + filter project_id di memo)
  → financeExport/PDF/AI handlers diberi guard baru: disabled selama sub-bagian ini
    (lihat Keputusan Desain #5) — UI-nya di toolbar, tapi flag "tersedia/tidak" berasal dari sini
    supaya konsisten dengan financeAccess yang sudah ada

controllers/keuangan/useFinanceReportController.ts        (dimodifikasi)
  → hapus panggilan buildIncomeStatementComparison/buildCashFlowComparison
  → return labaRugi = computeLabaRugi(transactions), arusKasBulanan =
    computeArusKasBulanan(transactions, startMonth, endMonth) dari
    lib/finance/scenarioCalculations.ts (sub-bagian A)
  → rabTotals via computeRabTotals(rabItems) untuk kartu ringkasan RAB (menggantikan
    penjumlahan ad-hoc yang sudah ada di useRabController jika relevan untuk konsistensi
    satu sumber aturan — detail eksekusi ditentukan saat implementation plan)

controllers/keuangan/useLabaRugiActionsController.ts       (dimodifikasi/disederhanakan)
  → hapus aksi openRabItemEditDialog/deleteRabItem (laporan jadi read-only, audit §5.3)
  → logic search/filter atas hasil laporan dipertahankan bila masih relevan di layout baru
```

### UI Components

```
app/dashboard/keuangan/_components/FinanceProjectToolbar.tsx   (dimodifikasi)
  → Tabs PROYEKSI | REALISASI, ditempatkan menonjol (di atas atau beriringan dengan
    Select "Proyek" yang sudah ada)
  → tombol "Export Excel" dan "Export Laporan" disabled, tooltip: pesan tersedia setelah
    revisi mode-aware
  → tombol "Import Excel" tetap aktif

app/dashboard/keuangan/_components/RabPlanningView.tsx          (dimodifikasi minimal)
  → sumber data dari rab controller yang sudah scenario-aware; tampilan tidak berubah
    drastis secara visual

app/dashboard/keuangan/_components/FinanceIncomeStatementView.tsx (dirombak)
  → hilangkan kolom Rencana|Aktual berdampingan dan tombol edit/hapus RAB per baris
  → tampilkan Total Pendapatan, Total Pengeluaran, Laba/Rugi untuk mode aktif
    (dari useFinanceReportController.labaRugi)

app/dashboard/keuangan/_components/FinanceCashFlowView.tsx        (dirombak)
  → tabel bulanan tunggal: Bulan | Kas Masuk | Kas Keluar | Kas Bersih | Kas Kumulatif
    untuk mode aktif (dari useFinanceReportController.arusKasBulanan)
```

## Error Handling & Edge Case

- Proyek tanpa baris `finance_scenarios` (proyek yang dibuat sebelum revisi ini) → dibuatkan
  otomatis (kedua mode) saat halaman Keuangan proyek itu pertama dibuka setelah revisi ini
  di-deploy. RAB/transaksi lama proyek tersebut (masih `scenario_id` NULL di database) tidak akan
  muncul di tampilan manapun sampai migrasi data lama (sub-bagian terpisah, di luar cakupan ini)
  dijalankan — perilaku ini didokumentasikan di sini secara eksplisit supaya tidak disalahartikan
  sebagai bug saat testing.
- Berpindah Tab mode (PROYEKSI ↔ REALISASI) saat ada draft belum tersimpan di dialog transaksi/RAB
  → tampilkan konfirmasi sebelum pindah, mengikuti pola dirty-state confirmation yang sudah ada di
  `TransactionBatchDialog.tsx`.
- Import Excel RAB: setiap item hasil parsing diberi `scenario_id` = `activeScenario.id` pada saat
  tombol Import ditekan (bukan pada saat file dipilih, untuk menghindari race jika user berpindah
  tab mode sambil dialog import masih terbuka).
- Tombol Export Excel/Export Laporan yang di-disable tetap menampilkan alasan (tooltip/helper text),
  bukan hanya menghilang, supaya user tahu fitur itu sementara tidak tersedia, bukan rusak.

## Testing

- Unit test `useFinanceScenarios`/`useRabItemsForScenario`/`useTransactionsForScenario` (mock
  Supabase): auto-create scenario yang belum ada, tidak duplikat scenario yang sudah ada, filter
  query benar berdasarkan `scenario_id`.
- Controller test `useFinanceScenarioController`: default mode REALIZATION, ganti mode memicu
  `activeScenario` berganti, persist ke localStorage per-project (bukan global).
- Controller test `useFinanceReportController`: `labaRugi`/`arusKasBulanan` dihitung dari
  `lib/finance/scenarioCalculations.ts`, bukan lagi memanggil fungsi yang sudah dihapus.
- Component test `FinanceProjectToolbar`: Tabs berpindah mode memicu callback yang benar; tombol
  Export Excel/Laporan disabled dengan pesan; tombol Import tetap enabled.
- Component test `FinanceIncomeStatementView`/`FinanceCashFlowView`: menampilkan struktur baru
  (satu set angka per mode), tidak ada lagi tombol edit/hapus RAB dari baris laporan.
- Hapus/tulis ulang: `tests/finance/rabCalculations.test.ts` (bagian
  `buildIncomeStatementComparison`/`buildCashFlowComparison`/`getVarianceStatus` dihapus, sisakan
  test untuk `sumRabItemsByType`/`buildMonthRange`/`toMonthKey`/`sumTransactionsByJenis` yang masih
  dipakai), `tests/components/FinanceIncomeStatementView.test.tsx`,
  `tests/components/RabPlanningView.test.tsx`, `tests/components/KeuanganView.test.tsx`.

## Out of Scope (sub-bagian/fase berikutnya)

- Migrasi data lama ke scenario yang benar (audit §14) — sub-bagian terpisah.
- Arus Kas Pasca Pembiayaan (UI + form asumsi pembiayaan) — sub-bagian C.
- PERBANDINGAN Proyeksi vs Realisasi (UI) — sub-bagian D.
- HPP, BEP Produksi, B/C ratio, status kelayakan di tab Laba Rugi, dan UI input asumsi
  produksi-penjualan (`production_sales_assumptions`) — menyusul setelah sub-bagian ini.
- Import Excel dengan pilihan mode tujuan eksplisit, Export Excel/PDF/AI mode-aware, Dashboard
  mode-aware — fase P1.
- Kalkulator BFA/HPP/BEP (bagian bawah `KeuanganView.tsx`) tetap memakai input manual localStorage
  seperti sekarang — tidak diubah di sub-bagian ini.
- Item P2 (design tokens/warna, modal standar, kategori/satuan, motion, responsive, refactor
  View/Controller lebih lanjut) — fase terpisah, dapat berjalan paralel tapi tidak dalam cakupan ini.
