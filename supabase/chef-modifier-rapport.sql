-- Chef d'église de maison : peut modifier les rapports de son église (ex. retirer un membre)

drop policy if exists "modification propre ou admin" on public.rapports;

create policy "modification propre ou admin"
  on public.rapports for update to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin()
    or (public.is_chef_chambre() and public.same_eglise(data->>'eglise'))
  );
