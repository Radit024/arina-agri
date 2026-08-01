-- 2026-07-30-usage-analytics.sql
-- Usage analytics event log + admin allowlist column.

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  feature text not null check (feature in ('keuangan', 'stok', 'kalender', 'ai_chat')),
  event_type text not null check (event_type in ('page_view', 'action')),
  event_name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_feature_created_at_idx
  on usage_events (feature, created_at);

create index if not exists usage_events_user_id_created_at_idx
  on usage_events (user_id, created_at);

create index if not exists usage_events_event_name_created_at_idx
  on usage_events (event_name, created_at);

alter table profiles
  add column if not exists is_admin boolean not null default false;
