-- ============================================================
-- Migration Audit Log Data Model (Migrasi Data Lama)
-- Tanggal: 2026-08-04
-- Jalankan di: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS migration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES finance_projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('rab_category', 'rab_item', 'transaction')),
  entity_id uuid NOT NULL,
  previous_scenario_id uuid NULL REFERENCES finance_scenarios(id) ON DELETE SET NULL,
  new_scenario_id uuid NULL REFERENCES finance_scenarios(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('auto_migrate_rab', 'classify_transaction', 'rollback_classification')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS migration_audit_log_project_id_idx
  ON migration_audit_log (project_id);

CREATE INDEX IF NOT EXISTS migration_audit_log_entity_id_idx
  ON migration_audit_log (entity_id);

ALTER TABLE migration_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own migration audit logs"
  ON migration_audit_log
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
