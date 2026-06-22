# Finance Project Input Gate Design

## Goal

Manajemen keuangan harus berbasis proyek. User tidak boleh membuat input keuangan apa pun sebelum ada proyek keuangan yang dipilih. Export juga tidak boleh digunakan hanya karena proyek sudah ada; export aktif setelah proyek memiliki data yang layak diekspor.

## Rules

- Jika belum ada proyek terpilih:
  - Semua aksi input keuangan nonaktif: catat transaksi, tambah item RAB, dan import Excel.
  - Semua aksi export nonaktif: export Excel dan export laporan PDF.
  - Aksi membuat proyek tetap aktif.
- Jika ada proyek terpilih tetapi belum ada data:
  - Input transaksi dan RAB aktif.
  - Export Excel dan PDF tetap nonaktif.
- Jika ada proyek terpilih dan proyek memiliki minimal satu transaksi atau item RAB:
  - Input aktif.
  - Export aktif.

## Architecture

Controller keuangan menjadi sumber aturan akses. `useKeuanganController` menghitung flag turunan:

- `hasSelectedProject`: proyek aktif tersedia.
- `hasProjectData`: ada minimal satu transaksi proyek atau item RAB.
- `canInputFinance`: sama dengan `hasSelectedProject`.
- `canExportFinance`: `hasSelectedProject && hasProjectData`.

View menerima flag tersebut dari controller dan hanya mengatur render, disabled state, serta empty state. Handler input tetap diberi guard agar panggilan langsung dari dialog atau test tidak dapat melewati aturan.

## UI Behavior

Toolbar proyek tetap menampilkan tombol `Buat Proyek`. Tombol import, export Excel, dan export laporan PDF mengikuti flag guard.

Buku Besar tetap dapat terlihat untuk konteks, tetapi tombol `Catat Transaksi` dan tombol empty-state `Tambah pertama` nonaktif jika belum ada proyek. Empty state menampilkan arahan untuk membuat proyek terlebih dahulu.

RAB planning sudah memiliki empty state tanpa proyek; form tambah RAB tetap dilindungi di controller agar tidak bisa submit tanpa proyek.

## Error Handling

Jika handler input terpanggil ketika belum ada proyek, controller tidak membuka dialog atau tidak submit payload. Pesan error singkat dapat ditampilkan di area yang sudah ada, tetapi tidak membuat state transaksi/RAB baru.

Jika export dipanggil ketika belum ada proyek atau belum ada data, controller export mengembalikan pesan yang spesifik:

- `Buat atau pilih proyek terlebih dahulu`
- `Tambahkan transaksi atau RAB sebelum export laporan`

## Testing

Tambahkan test component/controller keuangan untuk memastikan:

- Tanpa proyek, tombol input dan export nonaktif.
- Dengan proyek tanpa data, input aktif tetapi export nonaktif.
- Dengan proyek dan data, export aktif.

Jalankan targeted tests keuangan, lint, typecheck, dan `git diff --check`.
