-- Liste officielle des églises de maison (évite les doublons Joseph / joseph / Joseph )

create table if not exists public.eglises_maison (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz default now()
);

create unique index if not exists eglises_maison_nom_unique
  on public.eglises_maison (lower(trim(nom)));

alter table public.eglises_maison enable row level security;

drop policy if exists "lecture eglises" on public.eglises_maison;
drop policy if exists "ajout eglises" on public.eglises_maison;

create policy "lecture eglises"
  on public.eglises_maison for select
  to authenticated
  using (true);

create policy "ajout eglises"
  on public.eglises_maison for insert
  to authenticated
  with check (true);

-- Importer les noms déjà utilisés dans les rapports
insert into public.eglises_maison (nom)
select distinct initcap(trim(r.data->>'eglise'))
from public.rapports r
where trim(coalesce(r.data->>'eglise', '')) <> ''
on conflict do nothing;
