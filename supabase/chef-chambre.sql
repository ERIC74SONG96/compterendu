-- Hiérarchie : chef de chambre (voit toute la chambre) vs chef d'équipe (voit seulement son équipe)

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'chef_chambre', 'team_leader'));

create or replace function public.is_chef_chambre()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'chef_chambre'
  );
$$;

drop policy if exists "lecture propre eglise ou admin" on public.rapports;
drop policy if exists "lecture propre chambre ou admin" on public.rapports;

create policy "lecture propre chambre ou admin"
  on public.rapports for select to authenticated
  using (
    public.is_admin()
    or auth.uid() = user_id
    or (public.is_chef_chambre() and public.same_eglise(data->>'eglise'))
  );

-- Nommer le chef de la chambre (exemple Gédéon) :
-- update public.profiles
-- set role = 'chef_chambre', eglise_maison = 'La Chambre'
-- where email = 'tchuisseugedeon@gmail.com';
