-- ============================================================
-- Finance Transaction Master Data Migration
-- Tanggal: 2026-06-17
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabel kategori transaksi keuangan kustom per user
CREATE TABLE IF NOT EXISTS finance_transaction_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,
  nama       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);

-- 2. Tabel satuan transaksi keuangan kustom per user
CREATE TABLE IF NOT EXISTS finance_transaction_satuans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,
  nama       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);

-- 3. RLS: aktifkan Row Level Security
ALTER TABLE finance_transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transaction_satuans    ENABLE ROW LEVEL SECURITY;

-- 4. Policy: user hanya bisa mengakses datanya sendiri
CREATE POLICY "Users can manage their own transaction categories"
  ON finance_transaction_categories
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own transaction satuans"
  ON finance_transaction_satuans
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
