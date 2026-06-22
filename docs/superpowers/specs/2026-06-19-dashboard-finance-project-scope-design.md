# Design Spec: Dashboard Finance Project Scope

**Tanggal:** 2026-06-19
**Status:** User-approved design
**Scope:** Dashboard utama untuk ringkasan keuangan saat user memiliki banyak project keuangan.

---

## Latar Belakang

Modul Keuangan sudah memiliki project atau siklus tanam, RAB, buku besar transaksi, laba rugi, dan arus kas. Dashboard utama sebelumnya menampilkan ringkasan keuangan dari transaksi user tanpa konteks project. Ketika user memiliki banyak project, angka tren keuangan dan kategori pengeluaran perlu diberi scope yang jelas agar tidak terasa bercampur tanpa penjelasan.

Keputusan produk yang dipilih adalah pendekatan hybrid:

- Default dashboard menampilkan agregasi **Semua Project**.
- User dapat memilih satu project tertentu dari filter dashboard.
- Filter dashboard independen dari pilihan project di halaman Keuangan.

---

## Perilaku Produk

### Default: Semua Project

Saat dashboard dibuka pertama kali, ringkasan keuangan memakai semua transaksi milik user dalam jendela data dashboard.

Yang ditampilkan:

- KPI total pengeluaran bulan ini.
- KPI estimasi laba bersih bulan ini.
- Tren pendapatan vs pengeluaran 6 bulan terakhir.
- Kategori pengeluaran bulan ini.
- Ringkasan performa project bulan ini untuk membedakan kontribusi antar project.

Transaksi lama yang belum punya `project_id` tetap ikut dalam agregasi semua project agar data lama tidak hilang. Di ringkasan performa project, transaksi seperti ini dikelompokkan sebagai `Tanpa Project`.

### Scope Project Tertentu

Jika user memilih satu project, seluruh KPI dan chart keuangan dashboard hanya memakai transaksi dengan `project_id` project tersebut.

Yang ditampilkan:

- KPI total pengeluaran project pada bulan berjalan.
- KPI estimasi laba bersih project pada bulan berjalan.
- Tren pendapatan vs pengeluaran project selama 6 bulan terakhir.
- Kategori pengeluaran project pada bulan berjalan.

Ringkasan performa antar project disembunyikan ketika satu project dipilih karena konteksnya sudah spesifik.

---

## Data Flow

1. `DashboardHomeController` menyimpan pilihan scope dashboard di local storage dengan key terpisah dari halaman Keuangan.
2. `useDashboardSummary` mengirim query parameter `financeProjectId` hanya saat user memilih satu project.
3. Route `/api/dashboard/summary` meneruskan `financeProjectId` ke service summary.
4. `getDashboardSummary` mengambil daftar project aktif user dan memvalidasi `financeProjectId`.
5. Jika `financeProjectId` valid, query transaksi difilter dengan `project_id`.
6. Jika `financeProjectId` kosong atau tidak valid, query transaksi memakai semua transaksi user.
7. Response dashboard membawa daftar opsi project, scope efektif, dan ringkasan performa project.

---

## UI

Dashboard utama menambahkan selector scope di area header kanan, dekat tanggal dashboard.

Pilihan selector:

- `Semua Project`
- Daftar project aktif atau draft milik user

Label chart menyebut scope yang sedang aktif agar user tahu apakah grafik membaca semua project atau satu project tertentu.

---

## Error Handling

- Jika local storage menyimpan project lama yang sudah tidak tersedia, server mengembalikan scope efektif `Semua Project`.
- Controller membersihkan pilihan stale setelah summary berhasil dimuat.
- Jika user belum memiliki project, selector tetap menampilkan `Semua Project`.
- Jika project dipilih tetapi belum punya transaksi, KPI bernilai 0 dan chart menampilkan empty state existing.

---

## Testing

Coverage yang diperlukan:

- URL hook dashboard menyertakan `financeProjectId` ketika dipilih.
- URL hook dashboard mengabaikan `financeProjectId` kosong.
- Kalkulasi performa project mengelompokkan project aktif dan transaksi tanpa project.
- API route meneruskan `financeProjectId` ke service summary.
- Service summary memfilter transaksi berdasarkan project id yang valid.
