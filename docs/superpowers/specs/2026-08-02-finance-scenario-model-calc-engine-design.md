# Desain: Model Data Scenario (Proyeksi/Realisasi) + Calculation Engine

Tanggal: 2026-08-02
Status: Disetujui, menunggu implementation plan
Sub-bagian: A dari revisi besar Manajemen Keuangan (lihat `AUDIT_REVISI_MANAJEMEN_KEUANGAN.md` di root repo)

## Latar Belakang

`AUDIT_REVISI_MANAJEMEN_KEUANGAN.md` (audit pakar, 1 Agustus 2026) menyatakan model data keuangan
saat ini cacat pada level konsep: kode menganggap RAB sebagai "rencana" dan catatan transaksi
sebagai "aktual", lalu membandingkan keduanya sebagai laporan laba rugi/arus kas. Model yang benar
adalah setiap proyek punya dua **scenario** independen — **PROYEKSI** (workflow lengkap berisi
estimasi: RAB, catatan transaksi, laba rugi, arus kas, arus kas pasca pembiayaan) dan **REALISASI**
(workflow yang sama berisi angka aktual) — dan **PERBANDINGAN** adalah fitur terpisah yang
membandingkan output kedua scenario, bukan pengganti salah satu dari keduanya.

Audit ini menggantikan asumsi bisnis di `docs/superpowers/specs/2026-06-17-finance-management-rab-actual-design.md`
dan juga menggantikan pendekatan yang sudah diimplementasikan di branch
`feature/proyeksi-realisasi-scenario` (tabel `transactions_proyeksi` terpisah, RAB tetap satu set
bersama) — pendekatan itu hanya memisahkan transaksi, bukan RAB, sehingga tidak memenuhi model yang
diwajibkan audit. Branch tersebut belum di-merge ke `main` dan migrasi SQL-nya belum pernah
dijalankan di Supabase production, sehingga aman digantikan tanpa migrasi data nyata.

Dokumen ini adalah **sub-bagian A** dari revisi besar: mendesain ulang model data (scenario sebagai
entitas first-class) dan calculation engine (rumus RAB/HPP/BEP/laba/arus kas/pasca-pembiayaan/
perbandingan) sebagai lib murni dengan test golden fixture. UI, migrasi data lama, import/export,
PDF, AI, dan dashboard **tidak** termasuk cakupan ini — menyusul di sub-bagian B, C, D, dan fase P1/P2.

## Keputusan Desain

1. **Scenario sebagai entitas first-class**: tabel `finance_scenarios` (bukan kolom `mode` tersebar
   di tiap tabel), karena scenario punya atributnya sendiri (asumsi produksi/penjualan, asumsi
   pembiayaan) yang tidak masuk akal ditempel ke item RAB individual.
2. **`transactions_proyeksi` dilebur kembali** menjadi satu tabel `transactions` yang dibedakan
   `scenario_id`, konsisten dengan RAB dan entitas lain — bukan tabel terpisah per entitas per mode
   (menghindari ledakan jumlah tabel `rab_items_proyeksi`, dst).
3. **Cakupan sub-bagian A**: desain skema (belum dieksekusi ke Supabase production) + calculation
   engine sebagai fungsi murni + test golden fixture. Migrasi data lama, wiring UI, import/export,
   PDF/AI/dashboard, dan tampilan PERBANDINGAN eksplisit ditunda ke sub-bagian berikutnya.
4. **Formula dikunci sesuai audit §4 dan §6.4–§6.9** (lihat bagian Calculation Engine di bawah),
   bukan formula lama yang sudah terbukti salah (mis. BEP lama `keuntungan ÷ harga jual`).

## Arsitektur

### Data Model

```sql
finance_scenarios
  id            uuid PK
  project_id    uuid FK -> finance_projects(id) ON DELETE CASCADE
  user_id       uuid NOT NULL
  mode          text NOT NULL CHECK (mode IN ('PROJECTION', 'REALIZATION'))
  created_at    timestamptz DEFAULT now()
  updated_at    timestamptz DEFAULT now()
  UNIQUE (project_id, mode)

rab_categories
  + scenario_id uuid NOT NULL FK -> finance_scenarios(id) ON DELETE CASCADE

rab_items
  + scenario_id uuid NOT NULL FK -> finance_scenarios(id) ON DELETE CASCADE
  -- category_id tetap FK ke rab_categories; divalidasi (constraint/trigger atau application-level
  -- check) bahwa rab_categories.scenario_id milik scenario yang sama dengan rab_items.scenario_id

transactions
  + scenario_id uuid NOT NULL FK -> finance_scenarios(id) ON DELETE CASCADE
  -- rab_category_id / rab_item_id (nullable) divalidasi harus milik scenario yang sama
  -- (tidak boleh link lintas-scenario, sesuai audit §6.5)
  -- kolom lain tidak berubah dari `transactions` yang sudah ada

production_sales_assumptions   (tabel baru)
  id            uuid PK
  scenario_id   uuid NOT NULL UNIQUE FK -> finance_scenarios(id) ON DELETE CASCADE
  produksi      numeric
  satuan        text
  harga_jual    numeric
  updated_at    timestamptz DEFAULT now()

financing_assumptions          (tabel baru)
  id                    uuid PK
  scenario_id           uuid NOT NULL UNIQUE FK -> finance_scenarios(id) ON DELETE CASCADE
  saldo_kas_awal        numeric DEFAULT 0
  modal_sendiri         numeric DEFAULT 0
  nilai_pinjaman        numeric DEFAULT 0
  bunga_per_periode     numeric DEFAULT 0   -- persen per musim/periode, bukan annual rate
  tanggal_pencairan     date
  tanggal_pembayaran    date
  biaya_lain            numeric DEFAULT 0
  updated_at            timestamptz DEFAULT now()
```

Setiap `finance_projects` baru otomatis membuat 2 baris `finance_scenarios` (PROJECTION dan
REALIZATION) — dijamin oleh constraint `UNIQUE (project_id, mode)` dan logic penciptaan proyek
(detail penciptaan otomatis ini masuk sub-bagian B karena menyentuh `useFinanceProjectController`;
sub-bagian A hanya mendefinisikan skemanya).

`project_id` **tidak dihapus** dari `rab_categories`/`rab_items`/`transactions` meski query utama
sekarang lewat `scenario_id` — dipertahankan sebagai denormalisasi untuk mempermudah query lintas-
scenario (audit trail, migrasi, dashboard agregat) tanpa join berlapis.

### Calculation Engine

File baru `lib/finance/scenarioCalculations.ts`, kumpulan fungsi murni (tidak menyentuh
Supabase/React), dipakai bersama oleh UI, export Excel, PDF, dan AI report:

```typescript
// RAB & profitabilitas
computeRabTotals(rabItems: RabItem[]): { totalBiayaProduksi: number; totalPendapatanRab: number }
computePenerimaan(produksi: number, hargaJual: number): number | null
  // null jika produksi atau hargaJual invalid (negatif/NaN)
computeKeuntungan(penerimaan: number, totalBiayaProduksi: number): number
computeHpp(totalBiayaProduksi: number, produksi: number): number | null
  // null ('tidak dapat dihitung') jika produksi <= 0
computeBepProduksi(totalBiayaProduksi: number, hargaJual: number): number | null
  // = totalBiayaProduksi / hargaJual; null jika hargaJual <= 0
computeBcRatio(keuntungan: number, totalBiayaProduksi: number): number | null
  // = keuntungan / totalBiayaProduksi; null jika totalBiayaProduksi <= 0
computeKelayakanStatus(produksi: number, bepProduksi: number | null): 'rugi' | 'impas' | 'untung'
  // produksi === bepProduksi -> 'impas' (bukan 'tidak layak')

// Laba Rugi per mode (dihitung dari transaksi mode aktif, BUKAN RAB vs transaksi)
computeLabaRugi(transactions: FinanceTransactionForReport[]): {
  totalPendapatan: number; totalPengeluaran: number; labaRugi: number;
}

// Arus Kas per mode (dari tanggal transaksi, BUKAN RabItem.plannedCashMonth)
computeArusKasBulanan(
  transactions: FinanceTransactionForReport[],
  startMonth: string,
  endMonth: string,
): Array<{
  bulan: string; kasMasuk: number; kasKeluar: number; kasBersih: number; kasKumulatif: number;
}>
  // bulan tanpa transaksi tetap muncul dengan nilai 0 (bukan hilang)

// Arus Kas Pasca Pembiayaan per mode
computeKebutuhanModalKerja(arusKasBulanan: ReturnType<typeof computeArusKasBulanan>): number
  // = nilai absolut dari defisit kumulatif maksimum (kasKumulatif paling negatif) sebelum pembiayaan
computeBunga(pokokPinjaman: number, bungaPerPeriode: number): number
  // = pokokPinjaman * (bungaPerPeriode / 100)
computeArusKasPascaPembiayaan(
  arusKasBulanan: ReturnType<typeof computeArusKasBulanan>,
  financing: { nilaiPinjaman: number; bungaPerPeriode: number; biayaLain: number; tanggalPencairan: string; tanggalPembayaran: string },
): Array<{ bulan: string; kasSetelahPembiayaan: number; kasKumulatifSetelahPembiayaan: number }>
  // pelunasan = pokokPinjaman + bunga + biayaLain, dikurangkan pada bulan tanggalPembayaran

// Perbandingan Proyeksi vs Realisasi
compareScenarios(proyeksi: ScenarioOutput, realisasi: ScenarioOutput): ScenarioComparison
  // untuk tiap dimensi (pendapatan, biaya, laba, HPP, BEP, B/C, per-kategori, arus kas bulanan,
  // metrik pasca-pembiayaan): selisih = realisasi - proyeksi, selisih% = selisih / proyeksi
  // (proyeksi === 0 -> selisih% ditampilkan sebagai null, UI merender '—', bukan Infinity)
  // item yang hanya ada di salah satu scenario ditandai `unmatched: true`, tidak dihilangkan
```

Semua fungsi divalidasi terhadap edge case eksplisit: pembagi nol mengembalikan `null` (bukan `0`
atau `Infinity`), nilai negatif pada volume/harga/biaya/produksi ditolak di layer validasi input
(dilempar sebagai error atau diabaikan dengan warning — detail ditentukan di implementation plan,
bukan didesain berbeda tiap fungsi).

Fungsi RAB murni yang sudah ada di `lib/finance/rabCalculations.ts` (`sumRabItemsByType`,
`buildMonthRange`, dll — bukan `buildIncomeStatementComparison`/`buildCashFlowComparison` yang
mengunci model lama) dipertahankan dan dipakai ulang dari `scenarioCalculations.ts` di mana relevan,
bukan ditulis ulang dari nol.

### Testing — Golden Fixture Padi 1 Ha

`tests/finance/scenarioCalculations.test.ts`, dibangun dari `references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx`
dengan register koreksi audit §4 sudah diterapkan (transportasi Rp200.000 bukan Rp20.000; Sewa Lahan
Rp7.000.000 termasuk dalam total `Lain-lain`). Nilai yang wajib match persis:

| Indikator | Nilai |
|---|---:|
| Total Biaya Produksi | 22.159.000 |
| Penerimaan | 45.500.000 |
| Keuntungan | 23.341.000 |
| HPP | 3.165,571428... |
| BEP Produksi | 3.409,076923... |
| B/C ratio | 1,053341757... |
| Arus Kas Akhir | 23.341.000 |
| Bunga Pembiayaan | 450.000 |
| Arus Kas Akhir Pasca Biaya | 22.891.000 |

Arus kas bulanan (Juli–Desember): Rp0, -Rp13.464.000, -Rp1.330.000, -Rp840.000, -Rp3.235.000,
Rp42.210.000 (lihat audit §15.1 untuk tabel lengkap).

Kasus edge case yang wajib diuji: produksi = 0 (HPP/BEP → `null`), status kelayakan saat
produksi tepat sama dengan BEP (→ `'impas'`), `compareScenarios` dengan proyeksi = 0 (→ selisih%
`null`) dan item tidak berpasangan (→ `unmatched: true`, tetap muncul di hasil).

## Error Handling & Edge Case

- Pembagi nol pada HPP, BEP, dan B/C ratio → `null`, bukan `0`/`Infinity`/`NaN`. Konsumen (UI,
  export, PDF) bertanggung jawab merender `null` sebagai "tidak dapat dihitung" atau `—`.
- `rab_items`/`transactions` yang mencoba menaut ke `rab_category_id`/`rab_item_id` milik scenario
  lain adalah kondisi invalid — divalidasi di layer yang menulis data (bukan tanggung jawab
  calculation engine, yang hanya mengasumsikan input sudah konsisten scenario-nya).
- Bulan tanpa transaksi pada `computeArusKasBulanan` tetap muncul dengan nilai 0, tidak dihilangkan
  dari array hasil, supaya UI dapat menampilkan bulan kosong secara eksplisit (audit §6.7).
- `compareScenarios` tidak pernah menghilangkan item yang cuma ada di satu scenario — selalu ada di
  hasil dengan flag `unmatched: true` supaya UI bisa menandainya secara eksplisit.

## Out of Scope (sub-bagian berikutnya)

- Migrasi data lama (proyek/transaksi yang sudah ada sebelum revisi ini) — audit §14, masuk
  sub-bagian tersendiri.
- Auto-pembuatan 2 `finance_scenarios` saat proyek baru dibuat (`useFinanceProjectController`) —
  sub-bagian B, karena menyentuh controller/UI.
- Penggantian `buildIncomeStatementComparison`/`buildCashFlowComparison` lama dan wiring ke
  `useFinanceReportController`, `FinanceIncomeStatementView`, `FinanceCashFlowView` — sub-bagian B.
- Tampilan PERBANDINGAN di UI (fungsi `compareScenarios` disiapkan di sini, tapi belum ada
  komponen/route yang memanggilnya) — sub-bagian D.
- Import/export Excel mode-aware, PDF/AI/dashboard mode-aware — fase P1.
- Drop tabel `transactions_proyeksi` dan migrasi skema `transactions` menjadi `scenario_id`-based —
  bagian dari implementation plan sub-bagian ini SEBAGAI perubahan skema (SQL revisi), tapi karena
  belum pernah dijalankan di production, ini bukan "migrasi data", hanya revisi definisi skema.
