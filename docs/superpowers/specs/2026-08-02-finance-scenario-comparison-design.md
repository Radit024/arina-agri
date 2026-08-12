# Desain: PERBANDINGAN Proyeksi vs Realisasi (Sub-bagian D)

Tanggal: 2026-08-02
Status: Disetujui, menunggu implementation plan
Sub-bagian: D dari revisi besar Manajemen Keuangan (lihat `AUDIT_REVISI_MANAJEMEN_KEUANGAN.md` di
root repo; bergantung pada sub-bagian A —
`docs/superpowers/specs/2026-08-02-finance-scenario-model-calc-engine-design.md`, sub-bagian B —
`docs/superpowers/specs/2026-08-02-finance-scenario-ui-integration-design.md`, dan sub-bagian C —
`docs/superpowers/specs/2026-08-02-finance-scenario-financing-cashflow-design.md`)

## Latar Belakang

Audit §6.9 dan §3.3 menegaskan PERBANDINGAN adalah fitur analisis **terpisah** yang membandingkan
hasil lengkap PROYEKSI dan REALISASI — bukan nama mode input, dan tidak menggantikan salah satu dari
lima laporan utama. Sub-bagian A sudah membangun `compareScenarios` (menerima dua `ScenarioOutput`,
menghasilkan selisih & selisih% per metrik, per kategori, dan per bulan arus kas — dengan aturan
`selisihPercent` `null` saat basis Proyeksi nol, dan item yang tidak berpasangan tetap ditampilkan
bertanda `unmatched`). Sub-bagian B dan C sudah membangun jalur untuk menghitung metrik-metrik itu
untuk **scenario yang sedang aktif**. Sub-bagian ini menyambungkan UI perbandingan, yang butuh kedua
scenario sekaligus — bukan cuma yang aktif.

## Keputusan Desain

1. **Tab ke-6**, setelah "Arus Kas Pasca Pembiayaan": Buku Besar | RAB | Laba Rugi | Arus Kas |
   Arus Kas Pasca Pembiayaan | **Perbandingan**. Divisualkan berbeda (ikon/warna) dari lima tab
   lainnya supaya jelas ini laporan read-only lintas mode, bukan mode ketiga. Tab ini tetap dapat
   dibuka terlepas dari Tabs Proyeksi/Realisasi mana yang sedang dipilih di toolbar (tab itu
   mengontrol lima tab pertama, tidak memengaruhi tab Perbandingan).
2. **Ekstraksi `useScenarioOutput(scenarioId)` sebagai hook bersama**: logic perangkaian RAB totals →
   Laba Rugi → Arus Kas → Arus Kas Pasca Pembiayaan menjadi satu `ScenarioOutput`, yang sebelumnya
   tersebar terikat ke "scenario aktif" di `useFinanceReportController` (sub-bagian B) dan
   `useFinancingController` (sub-bagian C), diekstrak jadi satu hook yang bisa dipanggil untuk
   scenario ID mana pun. B dan C tetap memanggilnya dengan `activeScenario.id`; D memanggilnya dua
   kali (satu per scenario).
3. **Lazy loading**: data scenario yang TIDAK sedang aktif di Tabs baru diambil saat tab
   Perbandingan benar-benar dibuka pengguna — tidak berjalan di background selama pengguna hanya
   memakai satu mode.
4. **Gating data cukup**: bila salah satu scenario belum punya RAB item maupun transaksi sama
   sekali, tab menampilkan pesan yang menyebutkan mode mana yang perlu diisi dulu, bukan tabel penuh
   angka nol.

## Arsitektur

### Refactor Bersama (menyentuh kode dari sub-bagian B/C)

```
controllers/keuangan/useScenarioOutput.ts   (baru, diekstrak dari logic B/C)
  → given scenarioId: fetch RAB items, transactions, financing assumptions untuk scenario itu
    (via useRabItemsForScenario, useTransactionsForScenario, useFinancingAssumptions — hook
    dari sub-bagian B/C, dipakai ulang apa adanya)
  → rangkai ScenarioOutput lengkap:
      totalPendapatan/totalBiayaProduksi/labaRugi ← computeRabTotals + computeLabaRugi
      hpp/bepProduksi/bcRatio ← null untuk saat ini (belum ada UI asumsi produksi-penjualan,
        konsisten dengan cakupan sub-bagian B yang menunda metrik ini)
      kategoriTotals ← agregasi transaksi per kategori (key: `${jenis}:${kategori}`)
      arusKasBulanan ← computeArusKasBulanan
      kebutuhanModalKerja/bunga/kasAkhirPascaPembiayaan ← computeKebutuhanModalKerja/
        computeBunga/computeArusKasPascaPembiayaan (dengan konversi toMonthKey seperti di
        sub-bagian C)
  → return { output: ScenarioOutput, loading, error, hasData: boolean }
    (hasData = true bila RAB items atau transactions tidak kosong)

controllers/keuangan/useFinanceReportController.ts   (dimodifikasi)
  → panggil useScenarioOutput(activeScenario.id) alih-alih menghitung sendiri, ambil
    labaRugi/arusKasBulanan dari situ (tidak ada perubahan perilaku yang terlihat pengguna)

controllers/keuangan/useFinancingController.ts   (dimodifikasi)
  → panggil useScenarioOutput(activeScenario.id) untuk kebutuhanModalKerja/bunga/
    kasAkhirPascaPembiayaan, tidak menghitung ulang sendiri
```

### Controller & UI Baru

```
controllers/keuangan/useComparisonController.ts   (baru)
  → aktif hanya saat tab Perbandingan dibuka (lazy — di-trigger dari KeuanganView saat
    financeTab === 'perbandingan')
  → proyeksiOutput = useScenarioOutput(scenarios.find(s => s.mode === 'PROJECTION')?.id)
  → realisasiOutput = useScenarioOutput(scenarios.find(s => s.mode === 'REALIZATION')?.id)
  → hasEnoughData = proyeksiOutput.hasData && realisasiOutput.hasData
  → comparison = hasEnoughData ? compareScenarios(proyeksiOutput.output, realisasiOutput.output) : null

app/dashboard/keuangan/_components/FinanceComparisonView.tsx   (baru)
  → jika !hasEnoughData: tampilkan pesan yang menyebutkan scenario mana yang belum punya data
  → tabel metrik utama: label | Proyeksi | Realisasi | Selisih | Selisih%
    (selisihPercent null dirender '—', bukan kosong/Infinity)
  → tabel per-kategori: sama, baris unmatched diberi badge/penanda visual (mis. chip
    "hanya di Realisasi"), tetap tampil dalam tabel utama, tidak dipisah ke tabel lain
  → tabel arus kas bulanan berdampingan: Bulan | Proyeksi | Realisasi | Selisih

app/dashboard/keuangan/_components/KeuanganView.tsx   (dimodifikasi)
  → tambah Tab ke-6 "Perbandingan" (ikon/warna berbeda), render FinanceComparisonView
```

## Error Handling & Edge Case

- Salah satu/kedua scenario belum punya data → pesan gating spesifik (bukan tabel nol), sesuai
  Keputusan Desain #4.
- `selisihPercent` null (proyeksi = 0) → dirender sebagai `—`, konsisten dengan kontrak yang sudah
  diverifikasi di sub-bagian A.
- Item kategori `unmatched` → tetap muncul di tabel dengan penanda visual, tidak dihilangkan.
- Tab Perbandingan dibuka lalu ditutup lalu dibuka lagi tanpa mengubah scenario → tidak perlu
  fetch ulang selama data belum kedaluwarsa (mengikuti pola caching/reload yang sudah ada di hook
  lain di modul ini — tidak menambah mekanisme cache baru khusus untuk ini).

## Testing

- Unit test `useScenarioOutput`: assembly `ScenarioOutput` benar dari fixture RAB+transaksi+financing,
  `hasData` false saat scenario benar-benar kosong.
- Controller test `useComparisonController`: tidak memanggil `useScenarioOutput` untuk scenario
  manapun sebelum tab Perbandingan aktif (verifikasi lazy loading); `hasEnoughData` false saat salah
  satu scenario kosong; `compareScenarios` dipanggil dengan output yang benar saat keduanya siap.
- Component test `FinanceComparisonView`: pesan gating muncul saat data belum cukup; tabel metrik,
  kategori (termasuk unmatched), dan arus kas bulanan menampilkan angka benar dari fixture dua
  scenario yang berbeda; `selisihPercent` null dirender `—`.
- Regression test `useFinanceReportController`/`useFinancingController` (sub-bagian B/C): pastikan
  hasil yang terlihat pengguna tidak berubah setelah direfactor untuk memakai `useScenarioOutput`.

## Out of Scope

- Export/PDF/AI untuk laporan Perbandingan — fase P1, sejalan dengan keputusan sub-bagian B yang
  menonaktifkan sementara Export/PDF/AI untuk seluruh modul.
- HPP/BEP/B-C ratio dalam perbandingan — tetap null/tidak ditampilkan sampai UI asumsi
  produksi-penjualan dibangun (sejalan dengan cakupan sub-bagian B).
- Migrasi data lama — sub-bagian terpisah; proyek lama yang belum dimigrasi akan tampil sebagai
  "belum ada data" di kedua scenario sampai dimigrasi, sama seperti perilakunya di tab-tab lain.
