import React, { useState } from "react";
import { Flame, Loader2, Mail, Lock, User, CheckCircle2, XCircle, Info } from "lucide-react";
import { signIn, signUp, renvoyerConfirmationEmail } from "./auth";

const ORANGE = "#DF7B1A";
const ORANGE_DARK = "#B45E0C";
const CREAM = "#FDFBF6";
const BROWN = "#5C3A10";
const INK = "#3B2B18";

export default function AuthScreen({ onMessage }) {
  const [mode, setMode] = useState("login");
  const [chef, setChef] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [chargement, setChargement] = useState(false);
  const [attenteConfirmation, setAttenteConfirmation] = useState(null);
  const [alerte, setAlerte] = useState(null);
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);

  const afficherAlerte = (texte, ok = true) => {
    setAlerte({ texte, ok });
    onMessage(texte, ok);
    if (ok && !texte.includes("e-mail")) {
      window.setTimeout(() => setAlerte(null), 5000);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!chef.trim()) { afficherAlerte("Indiquez votre nom de chef d'équipe.", false); return; }
      if (password.length < 6) { afficherAlerte("Le mot de passe doit contenir au moins 6 caractères.", false); return; }
      if (password !== confirm) { afficherAlerte("Les mots de passe ne correspondent pas.", false); return; }
    }

    setChargement(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) throw error;
        afficherAlerte("Connexion réussie.");
      } else {
        const { data, error } = await signUp(email.trim(), password, chef);
        if (error) throw error;
        const emailInscrit = email.trim();
        const confirmationRequise = !data.session
          || (data.user && !data.user.email_confirmed_at);

        if (confirmationRequise) {
          setAttenteConfirmation(emailInscrit);
          setMode("login");
          setPassword("");
          setConfirm("");
          afficherAlerte("Compte créé — consultez votre e-mail pour confirmer.");
        } else {
          afficherAlerte("Compte créé — bienvenue !");
        }
      }
    } catch (err) {
      const code = err.code || err.message || "";
      const msg = code.includes("email_not_confirmed") || err.message?.includes("Email not confirmed")
        ? "E-mail non confirmé. Consultez votre boîte mail (ou spam) et cliquez le lien de confirmation."
        : err.message?.includes("Invalid login")
          ? "E-mail ou mot de passe incorrect."
          : err.message?.includes("already registered")
            ? "Cet e-mail est déjà utilisé. Si vous venez de vous inscrire, confirmez d'abord votre e-mail."
            : err.message || "Erreur de connexion.";
      if (msg.includes("non confirmé") || msg.includes("confirmez")) {
        setAttenteConfirmation(email.trim());
      }
      afficherAlerte(msg, false);
    }
    setChargement(false);
  };

  const renvoyerEmail = async () => {
    if (!attenteConfirmation) return;
    setRenvoiEnCours(true);
    try {
      const { error } = await renvoyerConfirmationEmail(attenteConfirmation);
      if (error) throw error;
      afficherAlerte("Nouvel e-mail de confirmation envoyé. Vérifiez votre boîte mail.");
    } catch (err) {
      afficherAlerte(err.message || "Impossible de renvoyer l'e-mail.", false);
    }
    setRenvoiEnCours(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM, color: INK, fontFamily: "Georgia, serif" }}>
      <div style={{ height: 6, backgroundColor: "#E6E6E6" }} />
      <header className="px-4 py-8" style={{ backgroundColor: ORANGE }}>
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex rounded-full p-3 mb-3" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Compte rendu hebdomadaire</h1>
          <p className="text-sm mt-1" style={{ color: "#FCE3C6", fontFamily: "system-ui, sans-serif" }}>
            Connectez-vous pour remplir votre rapport
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-md mx-auto rounded-xl p-5 shadow-sm" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
          <div className="flex mb-5 rounded-lg overflow-hidden" style={{ backgroundColor: CREAM, fontFamily: "system-ui, sans-serif" }}>
            {[
              { id: "login", label: "Connexion" },
              { id: "signup", label: "Créer un compte" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setMode(t.id); if (t.id === "signup") setAttenteConfirmation(null); }}
                className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: mode === t.id ? ORANGE : "transparent",
                  color: mode === t.id ? "white" : ORANGE_DARK,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {attenteConfirmation && (
            <div
              className="mb-4 rounded-xl px-4 py-3.5 flex gap-3 items-start"
              style={{ backgroundColor: "#E8F4FD", border: "2px solid #5B9BD5", fontFamily: "system-ui, sans-serif" }}
              role="alert"
            >
              <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#2E6DA4" }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: "#1A4A72" }}>Confirmez votre adresse e-mail</p>
                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "#2E5A7A" }}>
                  Un message a été envoyé à{" "}
                  <strong className="break-all">{attenteConfirmation}</strong>.
                  Ouvrez votre boîte mail (vérifiez aussi les <strong>spams</strong>), cliquez sur le lien de confirmation — vous serez redirigé vers{" "}
                  <strong>compterendu.vercel.app</strong>, puis connectez-vous.
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={renvoyerEmail}
                    disabled={renvoiEnCours}
                    className="text-xs font-semibold underline disabled:opacity-60"
                    style={{ color: "#2E6DA4" }}
                  >
                    {renvoiEnCours ? "Envoi…" : "Renvoyer l'e-mail de confirmation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttenteConfirmation(null)}
                    className="text-xs font-semibold underline"
                    style={{ color: "#2E6DA4" }}
                  >
                    Masquer ce message
                  </button>
                </div>
              </div>
            </div>
          )}

          {alerte && (!attenteConfirmation || !alerte.ok) && (
            <div
              className="mb-4 rounded-lg px-4 py-2.5 text-sm font-medium text-white flex items-center gap-2"
              style={{ backgroundColor: alerte.ok ? "#4A7C2A" : "#B3402A", fontFamily: "system-ui, sans-serif" }}
              role="status"
            >
              {alerte.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {alerte.texte}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4" style={{ fontFamily: "system-ui, sans-serif" }}>
            {mode === "signup" && (
              <AuthField icone={User} label="Nom du chef d'équipe" type="text" value={chef}
                onChange={setChef} placeholder="Ex. : Junior" autoComplete="name" />
            )}
            <AuthField icone={Mail} label="Adresse e-mail" type="email" value={email}
              onChange={setEmail} placeholder="chef@exemple.com" autoComplete="email" />
            <AuthField icone={Lock} label="Mot de passe" type="password" value={password}
              onChange={setPassword} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            {mode === "signup" && (
              <AuthField icone={Lock} label="Confirmer le mot de passe" type="password" value={confirm}
                onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" />
            )}

            <button type="submit" disabled={chargement}
              className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: ORANGE, opacity: chargement ? 0.7 : 1 }}>
              {chargement ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <p className="text-xs text-center mt-4 leading-relaxed" style={{ color: "#8A7358" }}>
            Chaque chef d&apos;équipe remplit le rapport de son équipe. Le chef de chambre voit toutes les équipes de sa chambre.
          </p>
        </div>
      </main>
    </div>
  );
}

function AuthField({ icone: Icone, label, type, value, onChange, placeholder, autoComplete }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>{label}</span>
      <div className="relative mt-1">
        <Icone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A08A6B" }} />
        <input
          type={type} value={value} placeholder={placeholder} required
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none"
          style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM }}
        />
      </div>
    </label>
  );
}
