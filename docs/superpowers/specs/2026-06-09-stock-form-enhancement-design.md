# Stock Form Enhancement — Design Spec

**Date:** 2026-06-09
**Status:** Approved
**Scope:** Penyempurnaan form Stock In dan Stock Out — data lebih lengkap, UX lebih cerdas

---

## Latar Belakang

Form Stock In dan Stock Out saat ini sudah berfungsi, tetapi kurang lengkap untuk kebutuhan:
- **BEP/HPP** — perlu harga realisasi aktual dan nama pembeli per transaksi
- **Traceability (blockchain-ready)** — perlu mencatat ke siapa barang dijual
- **UX petani** — form bisa lebih cerdas (auto-fill, validasi real-time, preview nilai)

---

## Goals

1. Tambah field `namaPembeli` dan `hargaRealisasi` pada form keluar
2. Simpan daftar pembeli sebagai master data per user
3. Buat form masuk lebih pintar: auto-suggest expiry, preview nilai stok
4. Buat form keluar lebih pintar: info batch, validasi berat, preview total transaksi

## Non-Goals

- Tidak menambah field `sumberLahan` ke form masuk (ditunda ke fase blockchain)
- Tidak membuat halaman manajemen pembeli terpisah (dikelola inline)
- Tidak mengubah struktur tab atau layout halaman utama stok

---

## Section 1 — Data Model

### Tabel baru: `buyers`

Menyimpan daftar nama pembeli per user. Diisi otomatis saat nama baru dimasukkan di form keluar.

```sql
CREATE TABLE buyers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,
  nama       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);
```

Constraint `UNIQUE (user_id, nama)` memastikan tidak ada duplikat per user. `upsert` digunakan saat submit form keluar.

### Kolom baru di `stock_mutations`

```sql
ALTER TABLE stock_mutations
  ADD COLUMN nama_pembeli    text,
  ADD COLUMN harga_realisasi numeric;
```

Keduanya nullable — tidak wajib diisi (transaksi internal atau pembuangan tidak selalu punya pembeli/harga).

### TypeScript Types

**`ApiStockMutation`** (di `lib/api.ts`):
```ts
namaPembeli?:    string;
hargaRealisasi?: number;
```

**`stockOutSchema`** (di `_lib/stockSchemas.ts`):
```ts
namaPembeli:    z.string().optional(),
hargaRealisasi: z.coerce.number().min(0).optional(),
```

**`ApiStockMutation` mock** di `hooks/useStok.ts` tidak perlu diubah (field opsional).

---

## Section 2 — Form Masuk (UX Improvements)

Tidak ada field baru ke database. Perubahan murni UX di controller dan view.

### 2a. Auto-suggest Tanggal Expired

- Saat `tanggalPanen` berubah, controller otomatis mengisi `estimasiKadaluarsa` = tanggalPanen + 14 hari
- Hanya auto-fill jika field `estimasiKadaluarsa` masih kosong (tidak menimpa input manual)
- Helper text muncul di bawah field: *"Terisi otomatis +14 hari dari tanggal panen"*
- Petani tetap bisa mengubah manual jika komoditas punya shelf life berbeda

**Implementasi:** `useEffect` di `StokController.tsx` watch `batchForm.watch('tanggalPanen')`.

### 2b. Preview Estimasi Nilai Stok

- Di bawah field `hargaJual`, muncul baris helper real-time
- Formula: `beratMasuk × hargaJual`
- Hanya tampil jika keduanya > 0
- Format: `📦 Estimasi Nilai: Rp 18.000.000 (400 kg × Rp 45.000)`
- Murni display di `StokView.tsx`, tidak ada state tambahan

---

## Section 3 — Form Keluar (Field Baru + UX Cerdas)

### 3a. Kartu Info Batch

Saat `batchId` dipilih dari dropdown, muncul kartu info ringkas:

```
┌─────────────────────────────────────────────┐
│  BATCH-001-A     [Grade A]  [Aman]           │
│  Sisa Stok: 280 kg  •  Expired: 26 Jun 2026 │
│  Harga Rencana: Rp 45.000/kg                │
└─────────────────────────────────────────────┘
```

- Menggunakan data `activeBatches` yang sudah ada di props (tidak ada API call baru)
- Hilang jika batchId dikosongkan

### 3b. Validasi Berat Real-time

- `berat` tidak boleh melebihi `stokTersisa` batch yang dipilih
- Validasi via Zod `superRefine` di controller (bukan di schema statis, karena butuh context batch yang dipilih)
- Error message inline: *"Melebihi stok tersisa (280 kg). Maksimal 280 kg."*
- Tombol submit di-disable selama ada error

### 3c. Nama Pembeli — Combobox

- MUI `Autocomplete` dengan `freeSolo` — bisa pilih dari daftar atau ketik bebas
- Daftar opsi: data dari tabel `buyers` (diload saat hook mount)
- Jika nama yang diketik belum ada di daftar → disimpan ke `buyers` saat form submit via `buyersApi.upsert`
- Field **opsional**

### 3d. Harga Realisasi — Auto-fill + Editable

- Saat `batchId` dipilih, `hargaRealisasi` otomatis terisi dari `batch.hargaJual`
- User bisa mengubah nilai tersebut
- Jika nilai berubah dari rencana, muncul keterangan selisih di bawah field:
  - Lebih rendah: `↓ Rp 3.000/kg di bawah harga rencana`
  - Lebih tinggi: `↑ Rp 2.000/kg di atas harga rencana`
- Field **opsional** (nullable di database)

### 3e. Preview Total Transaksi

- Di atas tombol submit, muncul baris summary:
- Formula: `berat × hargaRealisasi`
- Hanya tampil jika keduanya > 0
- Format: `💰 Total Transaksi: Rp 14.700.000 (350 kg × Rp 42.000)`
- Update real-time

---

## Section 4 — Arsitektur

### File yang Berubah

| File | Jenis Perubahan |
|------|----------------|
| `supabase/migrations/XXXXXX_stock_form_enhancement.sql` | Baru — buat tabel `buyers`, tambah kolom `stock_mutations` |
| `lib/api.ts` | Tambah `buyersApi` (getAll, upsert), update `stockOut` payload, update `mapMutation` |
| `hooks/useStok.ts` | Tambah `buyers` state + `loadBuyers`, update `stockOut` call |
| `app/dashboard/stok/_lib/stockSchemas.ts` | Update `stockOutSchema` tambah `namaPembeli`, `hargaRealisasi` |
| `controllers/stok/StokController.tsx` | Watch tanggalPanen auto-fill expiry, watch batchId auto-fill hargaRealisasi, buyers state, dynamic Zod refine |
| `app/dashboard/stok/_components/StokView.tsx` | BatchInfoCard, Autocomplete pembeli, harga realisasi + diff, preview total, preview nilai masuk |

### Alur Data Baru — Form Keluar

```
User pilih batchId
  → Controller: temukan batch dari activeBatches
  → Controller: set hargaRealisasi = batch.hargaJual (jika kosong)
  → View: tampilkan BatchInfoCard

User isi berat
  → Zod superRefine: berat <= stokTersisa?
  → View: update preview total transaksi

User isi / ubah hargaRealisasi
  → View: hitung dan tampilkan selisih vs harga rencana
  → View: update preview total transaksi

User submit
  → Jika namaPembeli tidak kosong && belum ada di buyers
      → buyersApi.upsert({ nama: namaPembeli, userId })
  → stokApi.stockOut({ batchId, berat, tujuan, tanggal, catatan,
                        namaPembeli, hargaRealisasi })
```

### Alur Data Baru — Form Masuk

```
User isi tanggalPanen
  → Controller useEffect: jika estimasiKadaluarsa kosong
      → set estimasiKadaluarsa = tanggalPanen + 14 hari

User isi beratMasuk atau hargaJual
  → View: hitung dan tampilkan preview estimasi nilai stok
```

---

## Komponen Baru di StokView

### `BatchInfoCard` (inline, bukan file terpisah)
```tsx
// Props: batch: ApiHarvestBatch | undefined
// Render: MUI Box dengan grade chip, status chip, sisa stok, expiry, harga rencana
// Kondisi: hanya render jika batch !== undefined
```

---

## Testing

- Unit test baru: `computeStockOutPreview(berat, hargaRealisasi)` → total
- Unit test baru: `computeBatchSuggestions(tanggalPanen)` → estimasiKadaluarsa
- E2E: tidak dalam scope iterasi ini

---

## Urutan Implementasi

1. Supabase migration (buyers table + stock_mutations columns)
2. Update `lib/api.ts` — buyersApi + update stockOut + mapMutation
3. Update `hooks/useStok.ts` — buyers state
4. Update `stockSchemas.ts`
5. Update `StokController.tsx` — auto-fill logic + buyers
6. Update `StokView.tsx` — semua UI baru
7. Tulis unit tests
