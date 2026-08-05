# Desain: Arus Kas Pasca Pembiayaan (Sub-bagian C)

Tanggal: 2026-08-02
Status: Disetujui, menunggu implementation plan
Sub-bagian: C dari revisi besar Manajemen Keuangan (lihat `AUDIT_REVISI_MANAJEMEN_KEUANGAN.md` di
root repo; bergantung pada sub-bagian A —
`docs/superpowers/specs/2026-08-02-finance-scenario-model-calc-engine-design.md` — dan sub-bagian B —
`docs/superpowers/specs/2026-08-02-finance-scenario-ui-integration-design.md`)

## Latar Belakang

Audit §6.8 mewajibkan **Arus Kas Pasca Pembiayaan** sebagai salah satu dari lima laporan inti per
mode (bersama RAB, Catatan Transaksi Harian, Laba Rugi, Arus Kas) — bukan fitur opsional yang boleh
ditunda atau digantikan worksheet perbandingan (audit §2, poin 4). Sub-bagian A sudah membangun
skema tabel `financing_assumptions` (satu baris per scenario) dan fungsi kalkulasi murni
(`computeKebutuhanModalKerja`, `computeBunga`, `computeArusKasPascaPembiayaan` di
`lib/finance/scenarioCalculations.ts`), sudah diverifikasi lewat golden fixture Padi 1 Ha. Sub-bagian
B sudah menyambungkan tab Arus Kas (mode aktif) yang menghasilkan `arusKasBulanan` — input yang
dibutuhkan `computeArusKasPascaPembiayaan`. Sub-bagian ini menyambungkan UI untuk mengisi asumsi
pembiayaan dan menampilkan hasilnya sebagai tab laporan kelima.

## Keputusan Desain

1. **Form asumsi pembiayaan sebagai dialog terpisah**, dibuka dari tombol di tab baru — mengikuti
   pola `RabItemDialog.tsx` yang sudah ada di modul ini, bukan form inline yang selalu terlihat.
2. **Tab baru ditempatkan setelah "Arus Kas"**: urutan tab menjadi Buku Besar | RAB | Laba Rugi |
   Arus Kas | **Arus Kas Pasca Pembiayaan** — mengikuti urutan lima laporan di audit, bukan
   sub-section di dalam tab Arus Kas yang sudah ada.
3. **Kontrak month-key vs full-date wajib ditangani eksplisit**: `financing_assumptions.tanggal_pencairan`/
   `tanggal_pembayaran` di database adalah kolom `date` penuh, sedangkan
   `computeArusKasPascaPembiayaan` (sub-bagian A) menerima `pencairanBulan`/`pembayaranBulan` sebagai
   *month key* (`'YYYY-MM'`) — perbedaan ini disengaja sejak sub-bagian A justru untuk mencegah bug
   silent-no-op. Layer yang menyambungkan keduanya di sub-bagian ini **wajib** memotong tanggal penuh
   ke month key (pakai `toMonthKey` yang sudah diekspor dari `lib/finance/rabCalculations.ts`)
   sebelum memanggil fungsi hitung.
4. **Satu baris asumsi pembiayaan per scenario** (bukan riwayat/banyak baris) — sesuai constraint
   `UNIQUE(scenario_id)` yang sudah ada di tabel `financing_assumptions`, jadi operasinya selalu
   upsert (create-jika-belum-ada, update-jika-sudah-ada), bukan create-baru-setiap-simpan.

## Arsitektur

### Data Layer

```
hooks/useFinancingAssumptions.ts
  → given scenarioId: fetch baris financing_assumptions WHERE scenario_id = X (bisa null/belum ada)
  → save(payload): upsert satu baris (insert jika belum ada, update jika sudah)
  → return { assumptions: FinancingAssumptions | null, loading, error, save }

lib/api.ts (tambahan)
  → financingAssumptionsApi.getByScenario(scenarioId)
  → financingAssumptionsApi.upsert(scenarioId, payload)
```

### Controller Layer

```
controllers/keuangan/useFinancingController.ts   (baru)
  → wraps useFinancingAssumptions(activeScenario?.id)
  → menghitung, dari arusKasBulanan (hasil useFinanceReportController, sub-bagian B):
      kebutuhanModalKerja = computeKebutuhanModalKerja(arusKasBulanan)   -- selalu tersedia,
        tidak butuh financing_assumptions
      bunga = computeBunga(assumptions.nilaiPinjaman, assumptions.bungaPerPeriode)  -- null jika
        assumptions belum ada
      arusKasPascaPembiayaan = computeArusKasPascaPembiayaan(arusKasBulanan, {
        nilaiPinjaman, bungaPerPeriode, biayaLain,
        pencairanBulan: toMonthKey(assumptions.tanggalPencairan),
        pembayaranBulan: toMonthKey(assumptions.tanggalPembayaran),
      })   -- null/kosong jika assumptions belum ada
  → dialogOpen state + openDialog/closeDialog, saveAssumptions(payload) memanggil
    useFinancingAssumptions.save lalu menutup dialog
```

### UI Components

```
app/dashboard/keuangan/_components/FinancingAssumptionsDialog.tsx   (baru)
  → form: saldo kas awal, modal sendiri, nilai pinjaman, bunga per periode (%),
    tanggal pencairan, tanggal pembayaran, biaya lain
  → validasi: nilai pinjaman/bunga/biaya lain tidak boleh negatif (ditolak di form,
    pesan error dekat field, mengikuti pola error placement yang sudah ada di modul ini)
  → submit memanggil useFinancingController.saveAssumptions

app/dashboard/keuangan/_components/FinanceFinancingView.tsx   (baru)
  → kartu ringkasan: Kebutuhan Modal Kerja (selalu tampil), Bunga, Kas Akhir Pasca Pembiayaan
    (dua yang terakhir menampilkan "—" / ajakan mengisi asumsi bila belum ada financing_assumptions)
  → tabel bulanan: Bulan | Kas Bersih (sebelum pembiayaan) | Kas Setelah Pembiayaan |
    Kas Kumulatif Setelah Pembiayaan
  → tombol "Atur Asumsi Pembiayaan" membuka FinancingAssumptionsDialog

app/dashboard/keuangan/_components/KeuanganView.tsx   (dimodifikasi)
  → tambah Tab kelima "Arus Kas Pasca Pembiayaan" setelah "Arus Kas"
  → render FinanceFinancingView saat tab itu aktif
```

## Error Handling & Edge Case

- Belum ada `financing_assumptions` tersimpan untuk scenario aktif → Kebutuhan Modal Kerja tetap
  dihitung dan ditampilkan (tidak bergantung pada asumsi pembiayaan), tapi kartu Bunga dan Kas Akhir
  Pasca Pembiayaan serta tabel bulanan menampilkan ajakan "Atur Asumsi Pembiayaan" alih-alih tabel
  kosong atau `0`.
- Validasi form: `nilaiPinjaman`, `bungaPerPeriode`, `biayaLain` negatif ditolak sebelum submit.
- `tanggalPencairan`/`tanggalPembayaran` di luar rentang bulan yang ditampilkan `arusKasBulanan`
  (mis. proyek berjalan Juli-Desember tapi user mengisi tanggal pencairan bulan Januari) → tidak
  divalidasi sebagai error di UI ini (perilaku `computeArusKasPascaPembiayaan` untuk kasus ini —
  arus masuk/keluar pembiayaan tidak pernah ter-apply — sudah diketahui dan didokumentasikan sebagai
  batasan fungsi murni sejak sub-bagian A); cukup pastikan form tidak mengizinkan tanggal yang jelas
  tidak masuk akal (mis. tanggal pembayaran sebelum tanggal pencairan).
- Berganti mode (Proyeksi ↔ Realisasi) mengganti scenario aktif → `useFinancingAssumptions`
  otomatis fetch ulang untuk `scenarioId` yang baru (masing-masing scenario punya asumsi
  pembiayaannya sendiri, tidak dibagi).

## Testing

- Unit test `useFinancingAssumptions`: fetch null saat belum ada baris, upsert insert lalu update
  konsisten pada scenario yang sama.
- Unit/controller test `useFinancingController`: `kebutuhanModalKerja` tersedia tanpa assumptions;
  `bunga`/`arusKasPascaPembiayaan` null saat assumptions belum ada; konversi `toMonthKey` diterapkan
  benar sebelum memanggil `computeArusKasPascaPembiayaan` (test khusus untuk memastikan tanggal
  penuh dari form benar-benar terpotong ke month key, bukan diteruskan mentah — ini titik yang
  paling mungkin salah tanpa test eksplisit).
- Component test `FinancingAssumptionsDialog`: validasi nilai negatif ditolak, submit memanggil
  save dengan payload benar.
- Component test `FinanceFinancingView`: tab kelima muncul di urutan yang benar, kartu ringkasan dan
  tabel bulanan menampilkan angka benar dari fixture, state "belum ada asumsi" tampil saat
  `financing_assumptions` kosong.

## Out of Scope

- PERBANDINGAN Proyeksi vs Realisasi untuk metrik pasca-pembiayaan — sub-bagian D (memakai
  `compareScenarios` yang sudah menerima `kebutuhanModalKerja`/`bunga`/`kasAkhirPascaPembiayaan`
  sebagai bagian dari `ScenarioOutput`, tapi UI perbandingannya sendiri di luar sub-bagian ini).
- Export/PDF/AI untuk laporan Arus Kas Pasca Pembiayaan — fase P1, sejalan dengan keputusan
  sub-bagian B yang menonaktifkan sementara Export/PDF/AI untuk seluruh modul.
- Migrasi data lama, termasuk asumsi pembiayaan proyek lama (yang memang tidak pernah ada sebelum
  fitur ini) — tidak relevan, proyek lama otomatis mulai tanpa `financing_assumptions`, sama seperti
  proyek baru sebelum diisi.
