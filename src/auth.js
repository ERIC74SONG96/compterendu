import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase-config";

/** URL de retour après confirmation e-mail (doit être autorisée dans Supabase Auth). */
export function getAuthRedirectUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_APP_URL || "https://compterendu.vercel.app";
}

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
    },
  })
  : null;

export function isConfigured() {
  return Boolean(supabase);
}

/** Messages d'erreur auth en français (dont limite e-mail Supabase). */
export function traduireErreurAuth(err) {
  const raw = err?.message || "";
  const msg = raw.toLowerCase();
  const code = (err?.code || "").toLowerCase();

  if (
    msg.includes("rate limit")
    || msg.includes("rate_limit")
    || code.includes("over_email_send_rate_limit")
    || msg.includes("email rate limit exceeded")
  ) {
    return {
      type: "rate_limit",
      texte: "Trop d'e-mails envoyés récemment (limite Supabase : 2 par heure). Attendez environ 1 heure avant de réessayer, ou connectez-vous si votre compte existe déjà.",
    };
  }
  if (msg.includes("email_not_confirmed") || msg.includes("email not confirmed")) {
    return {
      type: "email_non_confirme",
      texte: "E-mail non confirmé. Consultez votre boîte mail (ou spam) et cliquez le lien de confirmation.",
    };
  }
  if (msg.includes("invalid login")) {
    return { type: "generic", texte: "E-mail ou mot de passe incorrect." };
  }
  if (msg.includes("already registered") || msg.includes("user already registered")) {
    return {
      type: "deja_inscrit",
      texte: "Cet e-mail est déjà utilisé. Connectez-vous, ou confirmez d'abord votre e-mail si vous venez de vous inscrire.",
    };
  }
  return { type: "generic", texte: raw || "Erreur de connexion." };
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event, session) => callback(session, event));
}

export async function signUp(email, password, chefName) {
  if (!supabase) throw new Error("SUPABASE_NON_CONFIGURE");
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { chef_name: chefName.trim() },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });
}

export async function renvoyerConfirmationEmail(email) {
  if (!supabase) throw new Error("SUPABASE_NON_CONFIGURE");
  return supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: getAuthRedirectUrl() },
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
  const result = await supabase.auth.updateUser({ data });

  const session = await getSession();
  if (session && (chefName !== undefined || egliseMaison !== undefined)) {
    const patch = {};
    if (chefName !== undefined) patch.chef_name = chefName;
    if (egliseMaison !== undefined) patch.eglise_maison = egliseMaison;
    await supabase.from("profiles").update(patch).eq("id", session.user.id);
  }

  return result;
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
