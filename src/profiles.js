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

export function isChefChambre(profil) {
  return profil?.role === "chef_chambre";
}

export function isChefEquipe(profil) {
  return !profil?.role || profil.role === "team_leader";
}

export function getEgliseMaison(profil, session) {
  return profil?.eglise_maison?.trim()
    || session?.user?.user_metadata?.eglise_maison?.trim()
    || "";
}

export function libelleRole(profil) {
  if (isAdmin(profil)) return "Administrateur";
  if (isChefChambre(profil)) return "Chef de chambre";
  return "Chef d'équipe";
}

/**
 * Chef de chambre → tous les rapports de sa chambre.
 * Chef d'équipe → uniquement son propre rapport (son équipe).
 */
export function filtrerRapportsEquipe(rapports, profil, session) {
  const userId = session?.user?.id;
  if (isChefChambre(profil) || isAdmin(profil)) {
    const eglise = getEgliseMaison(profil, session);
    if (!eglise) return rapports.filter((r) => r.user_id === userId);
    const norm = eglise.toLowerCase();
    return rapports.filter((r) => (r.eglise || "").trim().toLowerCase() === norm);
  }
  return rapports.filter((r) => r.user_id === userId);
}
