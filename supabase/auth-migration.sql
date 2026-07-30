-- Si vous aviez déjà créé la table sans authentification, exécutez ceci :

alter table public.rapports
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Les anciennes lignes sans user_id devront être supprimées ou réassignées manuellement.
-- delete from public.rapports where user_id is null;

alter table public.rapports alter column user_id set not null;

drop policy if exists "lecture publique" on public.rapports;
drop policy if exists "insertion publique" on public.rapports;
drop policy if exists "mise a jour publique" on public.rapports;
drop policy if exists "suppression publique" on public.rapports;

create policy "lecture authentifiee" on public.rapports for select to authenticated using (true);
create policy "insertion propre" on public.rapports for insert to authenticated with check (auth.uid() = user_id);
create policy "modification propre" on public.rapports for update to authenticated using (auth.uid() = user_id);
create policy "suppression propre" on public.rapports for delete to authenticated using (auth.uid() = user_id);
