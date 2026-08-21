-- Channel identity and idempotency support for Telegram/WhatsApp inbound input.
-- Run manually in Supabase SQL editor or convert into a Supabase migration.
-- All DDL operations are idempotent (safe to re-run).

-- ─── Profiles: Channel Identity Columns ───────────────────────────────────────
alter table public.profiles
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username  text,
  add column if not exists whatsapp_phone     text;

-- Unique partial indexes – prevents two profiles claiming the same identifier.
create unique index if not exists profiles_telegram_chat_id_idx
  on public.profiles (telegram_chat_id)
  where telegram_chat_id is not null and telegram_chat_id <> '';

create unique index if not exists profiles_telegram_username_idx
  on public.profiles (telegram_username)
  where telegram_username is not null and telegram_username <> '';

create unique index if not exists profiles_whatsapp_phone_idx
  on public.profiles (whatsapp_phone)
  where whatsapp_phone is not null and whatsapp_phone <> '';

-- ─── Inbound Message Logs (Idempotency) ───────────────────────────────────────
-- Records every inbound chat message to prevent double-processing.
create table if not exists public.inbound_message_logs (
  id                  uuid        primary key default gen_random_uuid(),
  channel             text        not null check (channel in ('telegram', 'whatsapp')),
  external_message_id text        not null,
  user_id             uuid        references public.profiles(id) on delete set null,
  sender_id           text        not null,
  raw_text            text        not null,
  command_type        text,
  status              text        not null check (status in ('received', 'processed', 'ignored', 'failed')),
  response_text       text,
  error_message       text,
  created_at          timestamptz not null default now(),
  processed_at        timestamptz
);

-- Unique index on (channel, external_message_id) – duplicate webhook delivery returns a
-- constraint violation which is used as the idempotency guard in the processor.
create unique index if not exists inbound_message_logs_channel_external_idx
  on public.inbound_message_logs (channel, external_message_id);

-- Index for querying a user's recent message history.
create index if not exists inbound_message_logs_user_created_idx
  on public.inbound_message_logs (user_id, created_at desc);

-- ─── Harvest Batches: Unique batch_code per user ──────────────────────────────
-- Prevents race-condition duplicate batch codes when two stok-masuk messages
-- arrive at nearly the same time.
create unique index if not exists harvest_batches_user_batch_code_idx
  on public.harvest_batches (user_id, batch_code);
