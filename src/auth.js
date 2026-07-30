import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase-config";

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export function isConfigured() {
  return Boolean(supabase);
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function signUp(email, password, chefName) {
  if (!supabase) throw new Error("SUPABASE_NON_CONFIGURE");
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { chef_name: chefName.trim() } },
  });
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("SUPABASE_NON_CONFIGURE");
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function updateProfil({ chefName, egliseMaison }) {
  if (!supabase) throw new Error("SUPABASE_NON_CONFIGURE");
  const data = {};
  if (chefName !== undefined) data.chef_name = chefName;
  if (egliseMaison !== undefined) data.eglise_maison = egliseMaison;
  return supabase.auth.updateUser({ data });
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
