-- Coller ce script dans Supabase : SQL Editor → New query → Run

create table if not exists public.rapports (
  id text primary key,
  data jsonb not null,
  ts bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at timestamptz default now()
);

create index if not exists rapports_ts_idx on public.rapports (ts desc);

alter table public.rapports enable row level security;

drop policy if exists "lecture publique" on public.rapports;
drop policy if exists "insertion publique" on public.rapports;
drop policy if exists "mise a jour publique" on public.rapports;
drop policy if exists "suppression publique" on public.rapports;

create policy "lecture publique"
  on public.rapports for select
  using (true);

create policy "insertion publique"
  on public.rapports for insert
  with check (true);

create policy "mise a jour publique"
  on public.rapports for update
  using (true);

create policy "suppression publique"
  on public.rapports for delete
  using (true);
