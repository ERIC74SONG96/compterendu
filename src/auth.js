import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase-config";

/** URL publique de l'app — utilisée pour la confirmation e-mail (jamais localhost). */
const APP_URL = (
  import.meta.env.VITE_APP_URL || "https://compterendu.vercel.app"
).replace(/\/$/, "");

/** URL de retour après confirmation e-mail (doit être autorisée dans Supabase Auth). */
export function getAuthRedirectUrl() {
  // Toujours la prod : évite localhost si inscription depuis le PC en dev,
  // ou si Supabase retombe sur Site URL quand redirect_to est invalide.
  return APP_URL;
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

/** Extrait un message lisible depuis une erreur Supabase (évite `{}` vide). */
function extraireMessageBrut(err) {
  if (!err) return "";
  if (typeof err === "string") return err.trim();

  if (typeof err.message === "object" && err.message !== null) {
    const m = err.message;
    if (typeof m.message === "string") return m.message.trim();
    if (typeof m.error === "string") return m.error.trim();
  }

  const candidats = [
    err.message,
    err.error_description,
    err.msg,
    err.error,
    err.details,
  ];

  for (const c of candidats) {
    if (typeof c === "string" && c.trim() && c.trim() !== "{}") return c.trim();
  }

  if (typeof err.message === "string") {
    try {
      const parsed = JSON.parse(err.message);
      if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
      if (parsed?.message) return String(parsed.message);
      if (parsed?.error) return String(parsed.error);
      if (parsed?.msg) return String(parsed.msg);
    } catch {
      /* message non JSON */
    }
  }

  if (err.code && typeof err.code === "string") return err.code.replace(/_/g, " ");
  return "";
}

/** Messages d'erreur auth en français (dont limite e-mail Supabase). */
export function traduireErreurAuth(err) {
  const raw = extraireMessageBrut(err);
  const msg = raw.toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  const status = Number(err?.status || err?.statusCode || 0);

  const estErreurSmtp = (
    msg.includes("error sending confirmation email")
    || msg.includes("error sending email")
    || msg.includes("smtp")
    || msg.includes("mailer")
    || msg.includes("535")
    || msg.includes("badcredentials")
    || msg.includes("username and password not accepted")
    || msg.includes("authentication failed")
    || code.includes("unexpected_failure")
    || (status === 500 && code.includes("unexpected"))
  );

  if (estErreurSmtp) {
    return {
      type: "smtp",
      texte: "Échec SMTP Gmail : le mot de passe Supabase est incorrect. Utilisez un mot de passe d'application Google (16 caractères), pas votre mot de passe Gmail habituel. Supabase → Authentication → SMTP Settings → Password.",
    };
  }

  if (
    msg.includes("rate limit")
    || msg.includes("rate_limit")
    || code.includes("over_email_send_rate_limit")
    || status === 429
    || msg.includes("email rate limit exceeded")
  ) {
    return {
      type: "rate_limit",
      texte: "Trop d'e-mails envoyés récemment. Attendez environ 1 heure, ou connectez-vous si votre compte existe déjà.",
    };
  }
  if (msg.includes("email_not_confirmed") || msg.includes("email not confirmed")) {
    return {
      type: "email_non_confirme",
      texte: "E-mail non confirmé. Consultez votre boîte mail (ou spam) et cliquez le lien de confirmation.",
    };
  }
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return { type: "generic", texte: "E-mail ou mot de passe incorrect." };
  }
  if (
    msg.includes("already registered")
    || msg.includes("user already registered")
    || code.includes("user_already_exists")
  ) {
    return {
      type: "deja_inscrit",
      texte: "Cet e-mail est déjà utilisé. Connectez-vous, ou confirmez d'abord votre e-mail si vous venez de vous inscrire.",
    };
  }
  if (msg.includes("password") && (msg.includes("weak") || msg.includes("short"))) {
    return { type: "generic", texte: "Mot de passe trop faible — minimum 6 caractères." };
  }
  if (msg.includes("unable to validate email") || msg.includes("invalid email")) {
    return { type: "generic", texte: "Adresse e-mail invalide." };
  }

  const texte = raw && raw !== "{}" ? raw : "Inscription impossible pour le moment. Réessayez ou passez à l'onglet Connexion si vous avez déjà un compte.";
  return { type: "generic", texte };
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
