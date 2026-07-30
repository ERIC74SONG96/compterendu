import { supabase } from "./auth";

/** Formate un nom d'église de maison de façon uniforme */
export function normaliserNomEglise(nom) {
  return nom
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .join(" ");
}

export async function loadEglises() {
  const { data, error } = await supabase
    .from("eglises_maison")
    .select("nom")
    .order("nom", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => r.nom);
}

export async function ajouterEglise(nomBrut) {
  const nom = normaliserNomEglise(nomBrut);
  if (!nom) throw new Error("Nom vide");

  const existantes = await loadEglises();
  const doublon = existantes.find((e) => e.toLowerCase() === nom.toLowerCase());
  if (doublon) return { nom: doublon, dejaExistant: true };

  const { error } = await supabase.from("eglises_maison").insert({ nom });
  if (error) {
    if (error.code === "23505") {
      const again = existantes.find((e) => e.toLowerCase() === nom.toLowerCase());
      return { nom: again || nom, dejaExistant: true };
    }
    throw error;
  }
  return { nom, dejaExistant: false };
}
