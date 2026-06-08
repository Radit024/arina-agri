# Design Spec: Fitur Kalkulator BEP & HPP

**Tanggal:** 2026-06-09
**Status:** Approved — Implementasi setelah fitur Stok difinalisasi
**Scope:** Enhancement modal BEP/HPP di halaman Keuangan dengan integrasi data Stok

---

## Latar Belakang

Fitur BEP/HPP sudah ada sebagai modal di halaman Keuangan, namun menggunakan input manual penuh (jumlah produksi & harga jual diketik manual). Data yang sama sudah tersedia di modul Stok (batch panen, beratMasuk, hargaJual). Tujuan redesign ini adalah mengotomatiskan pengambilan data dari Stok agar kalkulasi lebih akurat dan efisien.

**Constraint:** Implementasi harus menunggu fitur Stok difinalisasi karena ada dependency langsung ke data batch panen.

---

## Pendekatan

**Pendekatan 2 — Redesign Modal dengan Mode Selector**

Modal BEP/HPP didesain ulang dengan dua mode yang bisa dipilih user. `useBepHppCalculator` dibuat sebagai hook murni yang reusable, sehingga di masa depan bisa dipromosikan ke halaman tersendiri tanpa refactor besar.

---

## Arsitektur

### Separation of Concerns

```
BepHppDialog.tsx          ← Pure UI (mode toggle, input fields, result cards)
        ↓ props
useKeuanganController     ← State management (dialog open/close, mode, batch/periode selection)
        ↓ calls
useBepHppCalculator       ← Pure kalkulasi, reusable hook ★
        ↓ reads
useStok + useTransactions ← Data source hooks yang sudah ada
```

### File yang Dibuat / Dimodifikasi

| File | Aksi | Keterangan |
|---|---|---|
| `hooks/useBepHppCalculator.ts` | **Baru** | Hook kalkulasi murni, reusable |
| `app/dashboard/keuangan/_components/KeuanganView.tsx` | **Modifikasi** | Ganti BepHppDialog inline dengan komponen terpisah |
| `app/dashboard/keuangan/_components/BepHppDialog.tsx` | **Baru** | Ekstrak UI modal ke komponen sendiri |
| `controllers/keuangan/useKeuanganController.tsx` | **Modifikasi** | Tambah state mode, selectedBatchId, bepPeriode |

---

## Data Flow

### Mode Per Batch

```
useStok.batches → batch terpilih (beratMasuk → jumlahProduksi, hargaJual)
useTransactions → totalPengeluaran (filter berdasarkan tanggal batch)
User input       → biayaTetap (disimpan localStorage)
                 ↓
useBepHppCalculator → { hppPerUnit, bepUnit, bepRupiah, marginKontribusi }
```

### Mode Per Periode

```
useStok.batches  → sum(beratMasuk) per periode, avg(hargaJual) per periode
useTransactions  → totalPengeluaran (filter bulan/periode)
User input       → biayaTetap (disimpan localStorage)
                 ↓
useBepHppCalculator → { hppPerUnit, bepUnit, bepRupiah, marginKontribusi }
```

---

## UI Modal

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Kalkulator HPP & BEP                          [✕]  │
│  Hitung titik impas dan biaya produksi               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [ Per Batch ]  [ Per Periode ]  ← Toggle tabs       │
│                                                      │
│  ── Mode Per Batch ──────────────────────────────── │
│  Pilih Batch Panen: [Dropdown batch dari Stok ▾]     │
│  ┌──────────────────┬──────────────────┐            │
│  │ Jumlah Produksi  │ Harga Jual/kg    │            │
│  │ 150 kg  ⚡ auto  │ Rp 18.000 ⚡auto │            │
│  └──────────────────┴──────────────────┘            │
│  Biaya Tetap: [Rp ____________] ✏️ manual           │
│                                                      │
│  ── Hasil Perhitungan ───────────────────────────── │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │HPP/unit  │BEP Unit  │BEP Rupiah│Margin    │      │
│  │Rp 12.400 │ 85 kg    │Rp 2.04jt │Rp 5.600 │      │
│  └──────────┴──────────┴──────────┴──────────┘      │
│                                                      │
│  ℹ️ Rumus: HPP = Total Biaya / Produksi             │
│                                          [Tutup]     │
└─────────────────────────────────────────────────────┘
```

### Behaviour

| Kondisi | Behaviour |
|---|---|
| Stok belum final / offline | Dropdown batch disabled, tampil info "Data stok tidak tersedia" |
| Batch dipilih | `jumlahProduksi` & `hargaJual` auto-fill, read-only |
| `biayaTetap` = 0 | Hasil BEP tetap tampil dengan warning kuning |
| `marginKontribusi` ≤ 0 | BEP tampil pesan error merah "Harga jual terlalu rendah" |
| Mode Per Periode | Dropdown batch diganti month picker, agregasi otomatis semua batch |

---

## Kalkulasi (useBepHppCalculator)

### Input

```ts
interface BepHppCalcInput {
  totalBiayaProduksi: number;   // dari totalPengeluaran transactions
  biayaTetap: number;           // manual input user
  jumlahProduksi: number;       // dari stok (beratMasuk) dalam kg
  hargaJualPerUnit: number;     // dari stok (hargaJual) dalam Rp/kg
  totalPendapatan: number;      // dari totalPendapatan transactions
}
```

### Output

```ts
interface BepHppCalcResult {
  biayaVariabelTotal: number;
  biayaVariabelPerUnit: number;
  hppPerUnit: number;
  marginKontribusiPerUnit: number;
  bepUnit: number | null;       // null jika tidak bisa dihitung
  bepRupiah: number | null;     // null jika tidak bisa dihitung
}
```

### Rumus

```
biayaVariabelTotal    = totalBiayaProduksi − biayaTetap  (min 0)
biayaVariabelPerUnit  = biayaVariabelTotal / jumlahProduksi
hppPerUnit            = totalBiayaProduksi / jumlahProduksi
marginKontribusiPerUnit = hargaJualPerUnit − biayaVariabelPerUnit
bepUnit               = biayaTetap / marginKontribusiPerUnit  (null jika margin ≤ 0)
bepRupiah             = biayaTetap / (1 − biayaVariabelTotal/totalPendapatan)  (null jika rasio ≤ 0)
```

---

## State Baru di Controller

```ts
type BepHppMode = 'per_batch' | 'per_periode';

// Tambahan di useKeuanganController:
const [bepMode, setBepMode] = useState<BepHppMode>('per_batch');
const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
const [bepPeriode, setBepPeriode] = useState<string>('semua');
```

---

## Migration Path (Future)

Karena `useBepHppCalculator` adalah hook murni tanpa dependency ke controller Keuangan, di masa depan bisa dipromosikan ke halaman `/dashboard/analisis` dengan hanya membuat controller baru dan halaman baru — tanpa mengubah hook kalkulasi.

---

## Dependencies

- Fitur Stok harus difinalisasi terlebih dahulu, khususnya:
  - `useStok` harus mengekspos: `batches[].beratMasuk`, `batches[].hargaJual`, `batches[].tanggalPanen`, `batches[].id`
  - API Stok harus sudah stabil (tidak akan ada breaking change pada shape data batch)
