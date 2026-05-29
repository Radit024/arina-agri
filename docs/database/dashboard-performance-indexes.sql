-- Dashboard performance indexes for Supabase/Postgres.
-- Run manually in SQL editor or convert into a Supabase migration once the project has a migrations folder.

create index if not exists transactions_user_tanggal_created_idx
  on public.transactions (user_id, tanggal desc, created_at desc);

create index if not exists calendar_events_user_date_idx
  on public.calendar_events (user_id, date asc);

create index if not exists commodity_prices_commodity_location_date_created_idx
  on public.commodity_prices (commodity, location, date desc, created_at desc);

create index if not exists harvest_batches_user_tanggal_panen_idx
  on public.harvest_batches (user_id, tanggal_panen desc);

create index if not exists stock_mutations_batch_tanggal_idx
  on public.stock_mutations (batch_id, tanggal desc);
