-- Script untuk membuat tabel commodity_prices di database Supabase

CREATE TABLE public.commodity_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  commodity text NOT NULL,
  location text NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  -- Mencegah duplikat harga untuk komoditas yang sama di lokasi dan tanggal yang sama
  UNIQUE(date, commodity, location)
);

CREATE INDEX idx_commodity_date ON public.commodity_prices(date DESC);

-- Opsi tambahan: Mengaktifkan RLS dan memberikan akses publik untuk SELECT jika dibutuhkan di frontend
-- ALTER TABLE public.commodity_prices ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Bisa dibaca publik" ON public.commodity_prices FOR SELECT USING (true);
