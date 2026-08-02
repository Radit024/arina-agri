-- ============================================================
-- Finance Scenarios (Proyeksi/Realisasi) Data Model
-- Tanggal: 2026-08-02
-- Jalankan di: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Scenario adalah entitas first-class: setiap proyek punya tepat satu scenario
-- PROJECTION dan satu scenario REALIZATION.
CREATE TABLE IF NOT EXISTS finance_scenarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES finance_projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  mode        text NOT NULL CHECK (mode IN ('PROJECTION', 'REALIZATION')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (project_id, mode)
);

CREATE INDEX IF NOT EXISTS finance_scenarios_project_id_idx
  ON finance_scenarios (project_id);

ALTER TABLE finance_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own finance scenarios"
  ON finance_scenarios
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RAB categories/items dan transactions mendapat scenario_id. project_id dipertahankan
-- sebagai denormalisasi untuk query lintas-scenario, kebenaran mode selalu dari scenario_id.
ALTER TABLE rab_categories ADD COLUMN IF NOT EXISTS scenario_id uuid REFERENCES finance_scenarios(id) ON DELETE CASCADE;
ALTER TABLE rab_items ADD COLUMN IF NOT EXISTS scenario_id uuid REFERENCES finance_scenarios(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS scenario_id uuid REFERENCES finance_scenarios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS rab_categories_scenario_id_idx ON rab_categories (scenario_id);
CREATE INDEX IF NOT EXISTS rab_items_scenario_id_idx ON rab_items (scenario_id);
CREATE INDEX IF NOT EXISTS transactions_scenario_id_idx ON transactions (scenario_id);

-- Asumsi produksi/penjualan: satu baris per scenario.
CREATE TABLE IF NOT EXISTS production_sales_assumptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id  uuid NOT NULL UNIQUE REFERENCES finance_scenarios(id) ON DELETE CASCADE,
  produksi     numeric,
  satuan       text,
  harga_jual   numeric,
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE production_sales_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own production/sales assumptions"
  ON production_sales_assumptions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM finance_scenarios
    WHERE finance_scenarios.id = production_sales_assumptions.scenario_id
      AND finance_scenarios.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM finance_scenarios
    WHERE finance_scenarios.id = production_sales_assumptions.scenario_id
      AND finance_scenarios.user_id = auth.uid()
  ));

-- Asumsi pembiayaan: satu baris per scenario.
CREATE TABLE IF NOT EXISTS financing_assumptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id         uuid NOT NULL UNIQUE REFERENCES finance_scenarios(id) ON DELETE CASCADE,
  saldo_kas_awal      numeric DEFAULT 0,
  modal_sendiri       numeric DEFAULT 0,
  nilai_pinjaman      numeric DEFAULT 0,
  bunga_per_periode   numeric DEFAULT 0,
  tanggal_pencairan   date,
  tanggal_pembayaran  date,
  biaya_lain          numeric DEFAULT 0,
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE financing_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own financing assumptions"
  ON financing_assumptions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM finance_scenarios
    WHERE finance_scenarios.id = financing_assumptions.scenario_id
      AND finance_scenarios.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM finance_scenarios
    WHERE finance_scenarios.id = financing_assumptions.scenario_id
      AND finance_scenarios.user_id = auth.uid()
  ));
