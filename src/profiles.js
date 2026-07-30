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

export function getEgliseMaison(profil, session) {
  return profil?.eglise_maison?.trim()
    || session?.user?.user_metadata?.eglise_maison?.trim()
    || "";
}

/** Rapports visibles par un chef : même église de maison (ou les siens si église non définie). */
export function filtrerRapportsEquipe(rapports, profil, session) {
  const eglise = getEgliseMaison(profil, session);
  const userId = session?.user?.id;
  if (!eglise) {
    return rapports.filter((r) => r.user_id === userId);
  }
  const norm = eglise.toLowerCase();
  return rapports.filter((r) => (r.eglise || "").trim().toLowerCase() === norm);
}
