-- Comparaison souple des noms d'église de maison (préfixe, casse, chambre/cambre)

create or replace function public.eglise_key(eglise text)
returns text
language sql
immutable
as $$
  select replace(
    trim(lower(
      regexp_replace(
        regexp_replace(
          translate(coalesce(eglise, ''), 'éèêëàâäùûüôöîïç', 'eeeeaaauuuooiic'),
          '^eglise de maison d''?', '', 'i'
        ),
        '^eglise de maison de ', '', 'i'
      )
    )),
    'chambre', 'cambre'
  );
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
    and public.eglise_key(eglise) != ''
    and (
      public.eglise_key(eglise) = public.eglise_key(public.my_eglise_maison())
      or public.eglise_key(eglise) like '%' || public.eglise_key(public.my_eglise_maison()) || '%'
      or public.eglise_key(public.my_eglise_maison()) like '%' || public.eglise_key(eglise) || '%'
    );
$$;
