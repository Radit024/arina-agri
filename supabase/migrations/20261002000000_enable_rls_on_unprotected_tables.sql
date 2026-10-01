-- Aktifkan RLS pada tabel yang sebelumnya tidak dilindungi.
--
-- Catatan: tabel-tabel ini dibuat tanpa `ENABLE ROW LEVEL SECURITY`, padahal
-- NEXT_PUBLIC_SUPABASE_ANON_KEY dikirim ke browser. Tanpa RLS, anon key cukup
-- untuk membaca seluruh isi tabel lewat PostgREST.

-- ─── inbound_message_logs ───────────────────────────────────────────────────
-- Berisi `raw_text` (isi pesan lengkap), `sender_id` (nomor WhatsApp atau
-- chat ID Telegram), `user_id`, dan `response_text` (ringkasan saldo pengguna).
-- Semua penulisan terjadi di sisi server melalui service role
-- (lib/server/chat-input/processor.ts), jadi policy hanya perlu untuk SELECT.
alter table public.inbound_message_logs enable row level security;

drop policy if exists "Users read own inbound message logs" on public.inbound_message_logs;
create policy "Users read own inbound message logs"
  on public.inbound_message_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Sengaja tidak ada policy INSERT/UPDATE/DELETE untuk pengguna:
-- idempotency dan pencatatan log harus tetap hanya bisa dari server.

-- ─── usage_events ───────────────────────────────────────────────────────────
-- Log metrik penggunaan. Hanya owner yang boleh melihat log miliknya.
alter table public.usage_events enable row level security;

drop policy if exists "Users read own usage events" on public.usage_events;
create policy "Users read own usage events"
  on public.usage_events
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Penulisan tetap via service role (lib/analytics/recordEvent.ts).

-- ─── buyers ────────────────────────────────────────────────────────────────
-- Daftar nama pembeli per pengguna. Kolom user_id masih bertipe text,
-- jadi perbandingan dilakukan terhadap auth.uid()::text.
alter table public.buyers enable row level security;

drop policy if exists "Users manage own buyers" on public.buyers;
create policy "Users manage own buyers"
  on public.buyers
  for all
  to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);