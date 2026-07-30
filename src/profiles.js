import { getSession, supabase } from "./auth";
import { eglisesCorrespondent } from "./eglises";

export async function loadProfil() {
  const session = await getSession();
  if (!session || !supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, chef_name, eglise_maison, email, super_admin")
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
  return profil?.role === "admin" || profil?.super_admin === true;
}

export function isChefChambre(profil) {
  return profil?.role === "chef_chambre";
}

/** Libellé affiché pour le responsable d'une église de maison (ex. La Cambre). */
export const LIBELLE_CHEF_EGLISE = "Chef d'église de maison";

export function isChefEquipe(profil) {
  return !profil?.role || profil.role === "team_leader";
}

export function getEgliseMaison(profil, session) {
  return profil?.eglise_maison?.trim()
    || session?.user?.user_metadata?.eglise_maison?.trim()
    || "";
}

export function libelleRole(profil) {
  const parts = [];
  if (isAdmin(profil)) parts.push("Grand administrateur");
  if (isChefChambre(profil)) parts.push(LIBELLE_CHEF_EGLISE);
  if (!parts.length) parts.push("Chef d'équipe");
  return parts.join(" · ");
}

/**
 * Responsable d'église de maison → tous les rapports de son église de maison.
 * Chef d'équipe → uniquement son propre rapport (son équipe).
 */
export function filtrerRapportsEquipe(rapports, profil, session) {
  const userId = session?.user?.id;
  if (isChefChambre(profil)) {
    const eglise = getEgliseMaison(profil, session);
    if (!eglise) return rapports.filter((r) => r.user_id === userId);
    return rapports.filter((r) => eglisesCorrespondent(r.eglise, eglise));
  }
  return rapports.filter((r) => r.user_id === userId);
}
