# Design Spec: Date Input dd-MM-yyyy

**Tanggal:** 2026-06-19
**Status:** User-approved design
**Scope:** Semua input tanggal aktif di aplikasi dashboard.

---

## Keputusan Produk

Semua input tanggal yang sebelumnya memakai browser native `type="date"` diganti menjadi input teks dengan format `dd-MM-yyyy`, contoh `05-06-2026`.

Nilai internal tetap disimpan sebagai ISO date `YYYY-MM-DD` agar query Supabase, sorting, filter bulan, export laporan, dan kalkulasi tanggal tidak berubah.

---

## Area Terdampak

- Keuangan: tanggal transaksi dan periode project.
- Kalender: tanggal jadwal.
- Stok: tanggal panen, estimasi kadaluarsa, tanggal keluar stok, dan filter mutasi.
- Supply: tanggal mutasi bahan pendukung.

---

## Data Flow

1. Field menerima input tampilan `dd-MM-yyyy`.
2. Helper reusable mengubah nilai valid ke `YYYY-MM-DD`.
3. Jika user sedang mengetik nilai parsial, nilai sementara tetap tampil agar typing tidak terputus.
4. Validasi submit menolak nilai tanggal yang bukan `dd-MM-yyyy` atau `YYYY-MM-DD`.
5. Payload API tetap menerima `YYYY-MM-DD`.

---

## Testing

- Helper formatter mengubah ISO ke `dd-MM-yyyy`.
- Helper parser mengubah `dd-MM-yyyy` ke ISO.
- Helper validator menolak tanggal tidak nyata seperti `31-02-2026`.
- Targeted tests untuk Keuangan, Stok, Kalender, dan Supply tetap berjalan.
