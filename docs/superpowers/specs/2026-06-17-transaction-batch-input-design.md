# Design Spec: Modal Input Transaksi Batch

**Tanggal:** 2026-06-17  
**Status:** Approved  
**Branch:** codex/finance-rab-actual-management

---

## Ringkasan

Meningkatkan modal "Catat Transaksi" agar mendukung:
1. Input lebih dari satu transaksi sekaligus (batch) dengan pola Stepper + Accordion
2. Custom kategori yang dikelola via `MasterDataDialog` (tersimpan permanen di Supabase)
3. Custom satuan (unit) dengan preset bawaan + manajemen via `MasterDataDialog`
4. Field volume & harga satuan dengan auto-kalkulasi nominal (`volume × hargaSatuan`)

---

## Data Model

### TransactionDraft (state lokal modal)

```typescript
type TransactionDraft = {
  id: string;                          // temp local id (nanoid)
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  volume: string;                      // opsional
  satuan: string;                      // opsional
  hargaSatuan: string;                 // opsional, auto-hitung nominal
  nominal: string;                     // formatted Rp, auto-fill dari volume × hargaSatuan
  tanggal: string;
  keterangan: string;
};

type BatchStage = 'input' | 'confirm';
```

### Aturan Auto-hitung Nominal
- Jika `volume` **dan** `hargaSatuan` keduanya terisi → `nominal = volume × hargaSatuan` (otomatis)
- Field nominal tetap bisa diedit manual
- Jika salah satu kosong → nominal diisi manual seperti semula

### Penyimpanan Kategori & Satuan Custom
- **Kategori**: tabel Supabase baru `finance_transaction_categories` (global, tidak terikat proyek)
- **Satuan**: tabel Supabase baru `finance_transaction_satuans`
- **Preset satuan bawaan**: `['kg', 'gram', 'ton', 'liter', 'pcs', 'karung', 'ikat', 'botol', 'sak']` — selalu tampil meski tabel kosong

---

## Struktur Komponen

```
TransactionBatchDialog.tsx              (View — menggantikan inline Dialog di KeuanganView)
├── TransactionDraftCard.tsx            (View — satu accordion card per draft)
│   └── TransactionEntryForm.tsx        (View — semua field form per transaksi)
└── TransactionConfirmView.tsx          (View — step konfirmasi, daftar read-only)

controllers/keuangan/
├── useTransactionBatchController.ts    (Controller baru — state & logika dialog batch)
└── useTransactionMasterController.ts  (Controller baru — CRUD kategori & satuan custom)
```

**Perubahan pada controller yang ada:**  
State dan handler dialog transaksi (`txDialogOpen`, `editingId`, `onSubmit`, form control, dll.) dipindah dari `useKeuanganController` ke `useTransactionBatchController`. Controller induk mengonsumsinya via komposisi — tidak ada perubahan kontrak ke `KeuanganView` utama.

---

## UI/UX Flow

### Mode Tambah Baru

1. User klik "Catat Transaksi" → Dialog terbuka, Stepper di step **Input**, 1 draft kosong dalam keadaan expanded.
2. User isi form → klik **"+ Tambah Transaksi Lagi"**:
   - Validasi draft aktif. Jika tidak valid → error inline, tidak bisa lanjut.
   - Jika valid → draft aktif collapse jadi kartu ringkasan, form baru muncul expanded di bawah.
3. Kartu collapsed menampilkan: icon jenis, kategori, nominal, tanggal + tombol **Edit** (expand) + **Hapus**.
4. Hanya satu draft yang bisa expanded sekaligus. Klik Edit kartu lain → tutup yang terbuka, buka yang diklik.
5. User klik **"Konfirmasi →"** (disabled jika tidak ada draft valid):
   - Validasi semua draft. Draft tidak valid diberi tanda error, tetap di step input.
   - Semua valid → Stepper pindah ke step **Konfirmasi**.
6. Step Konfirmasi: tabel ringkasan semua transaksi (tanggal, kategori, jenis, nominal). Tombol **"← Kembali"** dan **"Simpan Semua (N transaksi)"**.
7. Klik Simpan → loading state, semua API call sekuensial. Sukses → dialog tutup, snackbar.

### Mode Edit

- Modal terbuka dengan 1 draft berisi data transaksi lama (expanded).
- User bisa langsung edit atau tambah draft baru di bawahnya.
- Saat submit: draft pertama → `PUT` (update), draft tambahan → `POST` (create baru).
- Label button: *"Simpan (1 diperbarui + N baru)"* jika ada campuran.

### Kelola Kategori & Satuan

- Di field **Kategori**: `IconButton` (SettingsIcon) di sebelah kanan dropdown → membuka `MasterDataDialog` untuk Kategori.
- Di field **Satuan**: `IconButton` (SettingsIcon) di sebelah kanan Autocomplete → membuka `MasterDataDialog` untuk Satuan.
- Kedua dialog bisa dibuka tanpa menutup modal utama (nested dialog).

---

## Controller Logic

### useTransactionBatchController.ts

```typescript
// State
drafts: TransactionDraft[]
expandedDraftId: string | null
stage: 'input' | 'confirm'
submitting: boolean
editingTransactionId: string | null   // id transaksi lama jika mode edit
dialogOpen: boolean

// Actions
openForCreate(): void
openForEdit(tx: ApiTransaction): void
addDraft(): void                      // validasi draft aktif → tambah draft baru
removeDraft(id: string): void
expandDraft(id: string): void
updateDraftField(id, field, value): void
handleVolumeOrHargaChange(id, field, value): void  // auto-hitung nominal
goToConfirm(): void                   // validasi semua → pindah stage
goBackToInput(): void
submitAll(): Promise<void>            // PUT jika editingId+idx===0, POST sisanya
```

### useTransactionMasterController.ts

```typescript
// State
customKategori: MasterDataItem[]
customSatuan: MasterDataItem[]
kategoriDialogOpen: boolean
satuanDialogOpen: boolean

// Computed
allKategori(jenis: 'pengeluaran' | 'pendapatan'): string[]
// preset bawaan difilter per jenis (pendapatan: Penjualan Hasil Panen, Jasa, Lainnya)
// (pengeluaran: Pupuk, Pestisida, Tenaga Kerja, Irigasi, Alat Tani, Lainnya)
// custom kategori muncul untuk SEMUA jenis (tidak difilter per jenis)
allSatuan: string[]
// PRESET_SATUAN + customSatuan (tidak difilter)

// Actions
addKategori(nama: string): Promise<void>
renameKategori(id: string, nama: string): Promise<void>
deleteKategori(id: string): Promise<void>
addSatuan(nama: string): Promise<void>
renameSatuan(id: string, nama: string): Promise<void>
deleteSatuan(id: string): Promise<void>
```

---

## Error Handling

| Skenario | Penanganan |
|---|---|
| Draft tidak valid saat "Tambah lagi" | Error inline pada field, draft tidak bisa collapse |
| Draft tidak valid saat "Konfirmasi" | Kembali ke step input, draft bermasalah otomatis expand, diberi border merah |
| API gagal sebagian | Snackbar: "2 berhasil, 1 gagal" — transaksi yang sudah masuk tidak di-rollback |
| Hapus kategori custom yang dipakai di draft | Tetap tersimpan di draft (string), tidak divalidasi ulang |
| Nominal 0 saat volume × hargaSatuan = 0 | Error: "Nominal harus lebih dari 0" |
| Modal ditutup saat ada draft terisi | Konfirmasi: "Yakin keluar? Data draft akan hilang." |

---

## Perubahan Backend

### Tabel Baru (Supabase)

```sql
-- Kategori transaksi custom (global)
CREATE TABLE finance_transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Satuan transaksi custom
CREATE TABLE finance_transaction_satuans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### API Functions Baru (lib/api.ts)

```typescript
transactionCategoryApi.getAll(): Promise<MasterDataItem[]>
transactionCategoryApi.create(nama: string): Promise<MasterDataItem>
transactionCategoryApi.update(id, nama): Promise<MasterDataItem>
transactionCategoryApi.delete(id): Promise<void>

transactionSatuanApi.getAll(): Promise<MasterDataItem[]>
transactionSatuanApi.create(nama: string): Promise<MasterDataItem>
transactionSatuanApi.update(id, nama): Promise<MasterDataItem>
transactionSatuanApi.delete(id): Promise<void>
```

---

## File yang Diubah / Dibuat

### Dibuat Baru
- `app/dashboard/keuangan/_components/TransactionBatchDialog.tsx`
- `app/dashboard/keuangan/_components/TransactionDraftCard.tsx`
- `app/dashboard/keuangan/_components/TransactionEntryForm.tsx`
- `app/dashboard/keuangan/_components/TransactionConfirmView.tsx`
- `controllers/keuangan/useTransactionBatchController.ts`
- `controllers/keuangan/useTransactionMasterController.ts`

### Diubah
- `controllers/keuangan/useKeuanganController.tsx` — hapus logika dialog transaksi, konsumsi controller baru
- `app/dashboard/keuangan/_components/KeuanganView.tsx` — ganti inline Dialog dengan `TransactionBatchDialog`
- `lib/api.ts` — tambah `transactionCategoryApi` dan `transactionSatuanApi`
