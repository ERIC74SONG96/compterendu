-- Rôles admin / chef d'équipe + restriction de lecture des rapports
-- Exécuter dans Supabase SQL Editor ou via migration MCP

-- Table profils liée à auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'team_leader'
    check (role in ('admin', 'team_leader')),
  chef_name text,
  eglise_maison text,
  email text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Fonction helper (security definer pour éviter récursion RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Trigger : créer un profil à chaque inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, chef_name, eglise_maison, email)
  values (
    new.id,
    'team_leader',
    coalesce(new.raw_user_meta_data->>'chef_name', ''),
    coalesce(new.raw_user_meta_data->>'eglise_maison', ''),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    chef_name = coalesce(nullif(excluded.chef_name, ''), profiles.chef_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rétro-remplissage des utilisateurs existants
insert into public.profiles (id, role, chef_name, eglise_maison, email)
select
  u.id,
  'team_leader',
  coalesce(u.raw_user_meta_data->>'chef_name', ''),
  coalesce(u.raw_user_meta_data->>'eglise_maison', ''),
  u.email
from auth.users u
on conflict (id) do nothing;

-- RLS profiles
drop policy if exists "lecture propre profil" on public.profiles;
drop policy if exists "lecture profils admin" on public.profiles;
drop policy if exists "mise a jour propre profil" on public.profiles;

create policy "lecture propre profil"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "lecture profils admin"
  on public.profiles for select to authenticated
  using (public.is_admin());

create policy "mise a jour propre profil"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- RLS rapports : admin = tous ; chef = sa chambre (même église de maison) + ses propres rapports
-- Voir aussi supabase/eglise-partage.sql pour les fonctions my_eglise_maison() et same_eglise()

create or replace function public.my_eglise_maison()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(eglise_maison), '')
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.same_eglise(eglise text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.my_eglise_maison() is not null
    and eglise is not null
    and trim(lower(eglise)) = trim(lower(public.my_eglise_maison()));
$$;

drop policy if exists "lecture authentifiee" on public.rapports;
drop policy if exists "lecture propre ou admin" on public.rapports;
drop policy if exists "modification propre" on public.rapports;
drop policy if exists "modification propre ou admin" on public.rapports;
drop policy if exists "suppression propre" on public.rapports;
drop policy if exists "suppression propre ou admin" on public.rapports;

create policy "lecture propre eglise ou admin"
  on public.rapports for select to authenticated
  using (
    public.is_admin()
    or auth.uid() = user_id
    or public.same_eglise(data->>'eglise')
  );

create policy "modification propre ou admin"
  on public.rapports for update to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "suppression propre ou admin"
  on public.rapports for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Promouvoir un administrateur (remplacer l'e-mail) :
-- update public.profiles set role = 'admin' where email = 'votre@email.com';
