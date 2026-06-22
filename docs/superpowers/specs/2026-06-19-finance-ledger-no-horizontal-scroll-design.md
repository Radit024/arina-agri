# Finance Ledger No Horizontal Scroll Design

## Goal

Buku Besar Transaksi di halaman manajemen keuangan tidak boleh memunculkan scroll horizontal pada layout desktop. Semua kolom penting tetap terbaca dalam lebar kartu yang tersedia.

## Layout Decision

Tabel desktop tetap digunakan karena data transaksi perlu mudah dipindai dan dibandingkan. Layout dibuat lebih rapat dengan mengurangi jumlah kolom:

- Checkbox seleksi
- Tanggal
- Jenis
- Kategori
- Input
- Nominal
- Detail / Catatan
- Opsi

Kolom `Volume`, `Satuan`, dan `Harga Satuan` digabung menjadi satu kolom `Input` dengan format ringkas, misalnya `2 kg x Rp25.000`. Catatan panjang dipotong dengan ellipsis agar tidak memperlebar tabel.

## Behavior

- `TableContainer` tidak menggunakan horizontal overflow.
- `Table` memakai `width: 100%` dan `tableLayout: fixed`.
- Kolom memakai width eksplisit agar totalnya muat dalam kartu.
- Empty state tetap berada di tengah tabel dan tidak membuat scrollbar.
- Tampilan mobile card tidak diubah.

## Testing

Tambahkan assertion component test bahwa tabel desktop memakai kolom gabungan `Input`. Jalankan test KeuanganView, lint, typecheck, dan `git diff --check`.
