# Chat Input Backend Design (Telegram & WhatsApp)

## 1. Goal
Memungkinkan user mencatat transaksi keuangan (pemasukan/pengeluaran) dan mutasi stok (stok masuk/keluar) secara langsung melalui chat Telegram atau WhatsApp tanpa menggunakan n8n.

## 2. Arsitektur & Komponen Utama
- **Webhook Routes:** 
  - `app/api/webhook/telegram/route.ts`
  - `app/api/webhook/whatsapp/route.ts`
  Keduanya akan menerima payload dari platform masing-masing, memvalidasi sumber, dan meneruskan data ke prosesor utama.
- **Shared Processor:** `lib/server/chat-input/processor.ts`
  Mengelola logika utama: resolusi identitas, parsing perintah, penyimpanan ke database, idempotency, dan pengiriman balasan.
- **Idempotency:** 
  Tabel `inbound_message_logs` digunakan untuk mencatat ID pesan eksternal (`external_message_id`). Mencegah data digandakan (double-processing) jika webhook dipanggil ulang oleh Telegram/WA.

## 3. Penghubungan Akun (Identity Resolution)
Pendekatan: **Input Manual Username/Nomor di Web**
1. User masuk ke halaman Pengaturan Profil di web.
2. User memasukkan:
   - **Nomor WhatsApp** (misal: 08123456789)
   - **Username Telegram** (misal: @petanimaju)
3. Saat pesan Telegram masuk, sistem awalnya menerima `chat.id` (angka acak). Sistem akan mengecek tabel profil. Jika `chat.id` belum tersimpan, sistem akan mencari `profiles` dengan username yang cocok dengan username pengirim Telegram (`from.username`). Jika cocok, `chat.id` akan disimpan secara otomatis untuk penggunaan selanjutnya.
4. Pesan dari akun yang tidak terhubung akan ditolak dengan instruksi untuk menghubungkan akun.

## 4. Parser (Deterministik, Tanpa AI)
Sesuai prinsip "MVP command sederhana", parsing tidak menggunakan Gemini/AI untuk meminimalisir delay dan menjaga akurasi 100%. Parser menggunakan Regex (pencocokan kata).

**Format yang didukung:**
- **Keuangan:** 
  `[pengeluaran/pemasukan] [nominal] [kategori] [keterangan...]`
  *(contoh: pengeluaran 50000 pupuk beli NPK subsidi)*
- **Stok Masuk:** 
  `stok masuk [berat]kg grade [A/B/C] modal [angka] jual [angka] [lokasi] exp [YYYY-MM-DD]`
  *(contoh: stok masuk 50kg grade A modal 18000 jual 25000 gudang utama exp 2026-06-20)*
- **Stok Keluar:** 
  `stok keluar [berat]kg [kode batch] [tujuan]`
  *(contoh: stok keluar 20kg BATCH-001-A pasar lokal)*

## 5. Validasi & Balasan Otomatis
1. **Validasi:**
   - Mengecek apakah stok yang ada cukup sebelum melakukan mutasi stok keluar.
   - Nominal angka harus positif.
2. **Balasan Sukses (Konfirmasi 1 Langkah):**
   - Transaksi langsung disimpan jika format valid.
   - Bot membalas dengan ringkasan: *"Pengeluaran Rp50.000 untuk pupuk berhasil dicatat."*
3. **Penanganan Error:**
   - Jika stok tidak cukup, batal disimpan dan balas: *"Gagal: Stok tidak cukup."*
   - Jika format salah, balas dengan contoh format yang benar.

## 6. Rencana Implementasi Berikutnya
1. Membuat migrasi database untuk tabel `inbound_message_logs` dan penambahan kolom identitas di `profiles`.
2. Menambahkan UI di halaman Pengaturan.
3. Menulis unit test untuk parser Regex.
4. Mengimplementasikan Webhook dan Shared Processor.
