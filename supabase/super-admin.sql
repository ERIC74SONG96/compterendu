-- Grand administrateur (super_admin) sans retirer le rôle chef de chambre

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS super_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR super_admin = true)
  );
$$;

-- Promouvoir un grand administrateur :
-- UPDATE public.profiles SET super_admin = true WHERE email = 'votre@email.com';
