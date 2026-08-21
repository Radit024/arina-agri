-- ============================================================
-- Stock Form Enhancement Migration
-- Tanggal: 2026-06-09
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabel buyers — menyimpan daftar nama pembeli per user
CREATE TABLE IF NOT EXISTS buyers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,
  nama       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);

-- 2. Tambah kolom ke stock_mutations
ALTER TABLE stock_mutations
  ADD COLUMN IF NOT EXISTS nama_pembeli    text,
  ADD COLUMN IF NOT EXISTS harga_realisasi numeric;
