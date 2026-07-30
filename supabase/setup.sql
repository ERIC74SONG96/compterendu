-- Script complet : SQL Editor → New query → Run
-- Active aussi Email dans Authentication → Providers

create table if not exists public.rapports (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  ts bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at timestamptz default now()
);

create index if not exists rapports_ts_idx on public.rapports (ts desc);
create index if not exists rapports_user_idx on public.rapports (user_id);

alter table public.rapports enable row level security;

drop policy if exists "lecture publique" on public.rapports;
drop policy if exists "insertion publique" on public.rapports;
drop policy if exists "mise a jour publique" on public.rapports;
drop policy if exists "suppression publique" on public.rapports;
drop policy if exists "lecture authentifiee" on public.rapports;
drop policy if exists "insertion propre" on public.rapports;
drop policy if exists "modification propre" on public.rapports;
drop policy if exists "suppression propre" on public.rapports;

create policy "lecture authentifiee"
  on public.rapports for select
  to authenticated
  using (true);

create policy "insertion propre"
  on public.rapports for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "modification propre"
  on public.rapports for update
  to authenticated
  using (auth.uid() = user_id);

create policy "suppression propre"
  on public.rapports for delete
  to authenticated
  using (auth.uid() = user_id);
