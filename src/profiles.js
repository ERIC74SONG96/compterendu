import { getSession, supabase } from "./auth";

export async function loadProfil() {
  const session = await getSession();
  if (!session || !supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, chef_name, eglise_maison, email")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function loadAllProfils() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, chef_name, eglise_maison, email, created_at")
    .order("chef_name");

  if (error) throw error;
  return data || [];
}

export function isAdmin(profil) {
  return profil?.role === "admin";
}
