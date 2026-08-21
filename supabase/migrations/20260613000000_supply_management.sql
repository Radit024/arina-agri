-- Migration: Supply Items Management
-- Tanggal: 2026-06-13

-- Tabel supply items (bahan pendukung: pupuk, pestisida, alat)
CREATE TABLE IF NOT EXISTS supply_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'bahan_pendukung',
  satuan TEXT NOT NULL DEFAULT 'kg',
  stok_saat_ini NUMERIC(10,2) NOT NULL DEFAULT 0,
  harga_beli_terakhir NUMERIC(15,2),
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel mutasi stok bahan pendukung
CREATE TABLE IF NOT EXISTS supply_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES supply_items(id) ON DELETE CASCADE,
  tipe TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar', 'distribusi')),
  jumlah NUMERIC(10,2) NOT NULL CHECK (jumlah > 0),
  harga_satuan NUMERIC(15,2),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  linked_transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: supply_items
ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_supply_items" ON supply_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS: supply_mutations
ALTER TABLE supply_mutations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_supply_mutations" ON supply_mutations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at di supply_items
CREATE OR REPLACE FUNCTION update_supply_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supply_items_updated_at
  BEFORE UPDATE ON supply_items
  FOR EACH ROW EXECUTE FUNCTION update_supply_items_updated_at();
