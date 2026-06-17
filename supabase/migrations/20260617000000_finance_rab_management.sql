alter table public.transactions
  add column if not exists project_id uuid,
  add column if not exists rab_category_id uuid,
  add column if not exists rab_item_id uuid,
  add column if not exists volume numeric,
  add column if not exists satuan text,
  add column if not exists harga_satuan numeric;

create table if not exists public.finance_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  commodity text not null default 'Padi',
  land_area numeric not null default 1,
  land_area_unit text not null default 'Ha',
  season_label text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rab_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.finance_projects(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rab_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.finance_projects(id) on delete cascade,
  category_id uuid not null references public.rab_categories(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  name text not null,
  volume numeric not null default 0,
  unit text not null default 'Unit',
  unit_price numeric not null default 0,
  planned_total numeric not null default 0,
  planned_cash_month text,
  aliases text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rab_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.finance_projects(id) on delete cascade,
  file_name text not null,
  status text not null check (status in ('success', 'failed')),
  summary text,
  errors text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists finance_projects_user_status_idx on public.finance_projects(user_id, status);
create index if not exists rab_categories_project_sort_idx on public.rab_categories(project_id, sort_order);
create index if not exists rab_items_project_sort_idx on public.rab_items(project_id, sort_order);
create index if not exists rab_imports_project_created_idx on public.rab_imports(project_id, created_at desc);
create index if not exists transactions_project_date_idx on public.transactions(project_id, tanggal desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_project_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_project_id_fkey
      foreign key (project_id) references public.finance_projects(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'transactions_rab_category_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_rab_category_id_fkey
      foreign key (rab_category_id) references public.rab_categories(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'transactions_rab_item_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_rab_item_id_fkey
      foreign key (rab_item_id) references public.rab_items(id) on delete set null;
  end if;
end $$;

alter table public.finance_projects enable row level security;
alter table public.rab_categories enable row level security;
alter table public.rab_items enable row level security;
alter table public.rab_imports enable row level security;

drop policy if exists "finance_projects_owner_all" on public.finance_projects;
create policy "finance_projects_owner_all" on public.finance_projects
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "rab_categories_owner_all" on public.rab_categories;
create policy "rab_categories_owner_all" on public.rab_categories
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "rab_items_owner_all" on public.rab_items;
create policy "rab_items_owner_all" on public.rab_items
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "rab_imports_owner_all" on public.rab_imports;
create policy "rab_imports_owner_all" on public.rab_imports
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
