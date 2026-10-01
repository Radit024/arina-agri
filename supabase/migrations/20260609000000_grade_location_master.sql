-- Jalankan lewat Supabase CLI: supabase db push

CREATE TABLE IF NOT EXISTS stock_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  nama text NOT NULL,
  urutan int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);

CREATE TABLE IF NOT EXISTS storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  nama text NOT NULL,
  urutan int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nama)
);

-- Enable RLS
ALTER TABLE stock_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

-- Policies: users only see their own rows
CREATE POLICY "stock_grades_user" ON stock_grades
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "storage_locations_user" ON storage_locations
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
