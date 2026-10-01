-- Rate limit terdistribusi lewat Postgres.
--
-- Alasan: aplikasi berjalan di banyak instance Vercel, sedangkan penyimpanan
-- in-memory hanya berlaku per instance sehingga limit efektifnya menjadi
-- `max x jumlah instance`. Setelah pengguna dan pemakaian fitur AI bertambah,
-- store ini bisa ditukar ke Upstash Redis tanpa mengubah pemanggilnya.
--
-- Fungsi `hit_rate_limit` harus dijalankan sebagai `security definer` karena
-- pemanggilnya adalah role `anon`, yang tidak diberi akses ke tabel ini.

create table if not exists public.rate_limit_buckets (
  bucket_key   text        not null,
  window_start timestamptz not null,
  hit_count    integer     not null default 0,
  primary key (bucket_key, window_start)
);

-- Housekeeping: baris yang jendelanya sudah lewat tidak pernah dibaca lagi.
create index if not exists rate_limit_buckets_window_start_idx
  on public.rate_limit_buckets (window_start);

alter table public.rate_limit_buckets enable row level security;

-- Tidak ada policy untuk role anon maupun authenticated: tabel ini hanya
-- boleh diakses lewat fungsi `hit_rate_limit` yang berjalan di bawah hak
-- service role.
revoke all on table public.rate_limit_buckets from anon, authenticated;

create or replace function public.hit_rate_limit(
  p_bucket_key text,
  p_window_ms  integer,
  p_max_hits   integer
)
returns table (hit_count integer, retry_after_ms integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
  v_ttl_ms       integer;
begin
  if p_bucket_key is null or p_window_ms is null or p_max_hits is null then
    raise exception 'Argumen rate limit tidak boleh null';
  end if;

  -- Jendela dihitung dari clock database, bukan dari jam instance Vercel:
  -- setiap instance bisa berbeda beberapa detik sehingga hasil hitungan
  -- antar instance tidak konsisten.
  v_window_start := to_timestamp(
    (extract(epoch from now()) * 1000)::bigint / p_window_ms * p_window_ms / 1000
  );

  insert into public.rate_limit_buckets as b (bucket_key, window_start, hit_count)
  values (p_bucket_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set hit_count = b.hit_count + 1
  returning b.hit_count into v_count;

  -- Sisa jendela dalam milidetik.
  v_ttl_ms := greatest(
    0,
    (extract(epoch from v_window_start) * 1000)::bigint
      + p_window_ms
      - (extract(epoch from now()) * 1000)::bigint
  );

  return query select v_count, v_ttl_ms::integer;
end;
$$;

-- Hanya service role yang boleh memanggil fungsi ini. Tanpa revoke ini,
-- `security definer` akan terbuka untuk role anon dan siapa pun bisa
-- menulis ke tabel rate limit.
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- Housekeeping opportunistik: menghapus jendela yang sudah lewat lebih dari
-- satu hari. Dipanggil dari sisi aplikasi sebelum menjalankan hit, jadi tabel
-- tetap kecil tanpa pg_cron atau scheduled job terpisah.
create or replace function public.purge_rate_limit_buckets()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.rate_limit_buckets
  where window_start < now() - interval '1 day';
$$;

revoke all on function public.purge_rate_limit_buckets() from public, anon, authenticated;
grant execute on function public.purge_rate_limit_buckets() to service_role;