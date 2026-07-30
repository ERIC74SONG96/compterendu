import { supabase } from "./auth";

/** Clé de comparaison : ignore le préfixe « Église de maison » et la casse. */
export function cleEglise(nom) {
  if (!nom) return "";
  let s = nom.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/^eglise de maison d['']?/, "").replace(/^eglise de maison de /, "").trim();
  return s.replace(/\bchambre\b/g, "cambre");
}

export function eglisesCorrespondent(a, b) {
  const ka = cleEglise(a);
  const kb = cleEglise(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

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
