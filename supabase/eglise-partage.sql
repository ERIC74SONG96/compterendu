-- Partage des rapports entre chefs de la même église de maison

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

drop policy if exists "lecture propre ou admin" on public.rapports;
drop policy if exists "lecture propre eglise ou admin" on public.rapports;

create policy "lecture propre eglise ou admin"
  on public.rapports for select to authenticated
  using (
    public.is_admin()
    or auth.uid() = user_id
    or (public.is_chef_chambre() and public.same_eglise(data->>'eglise'))
  );
