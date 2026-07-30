import React, { useState } from "react";
import { Flame, Loader2, Mail, Lock, User } from "lucide-react";
import { signIn, signUp } from "./auth";

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

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!chef.trim()) { onMessage("Indiquez votre nom de chef d'équipe.", false); return; }
      if (password.length < 6) { onMessage("Le mot de passe doit contenir au moins 6 caractères.", false); return; }
      if (password !== confirm) { onMessage("Les mots de passe ne correspondent pas.", false); return; }
    }

    setChargement(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) throw error;
        onMessage("Connexion réussie.");
      } else {
        const { data, error } = await signUp(email.trim(), password, chef);
        if (error) throw error;
        if (data.session) {
          onMessage("Compte créé — bienvenue !");
        } else {
          onMessage("Compte créé. Vérifiez votre e-mail pour confirmer, puis connectez-vous.");
          setMode("login");
        }
      }
    } catch (err) {
      const code = err.code || err.message || "";
      const msg = code.includes("email_not_confirmed") || err.message?.includes("Email not confirmed")
        ? "E-mail non confirmé. Consultez votre boîte mail (ou spam) et cliquez le lien de confirmation."
        : err.message?.includes("Invalid login")
          ? "E-mail ou mot de passe incorrect."
          : err.message?.includes("already registered")
            ? "Cet e-mail est déjà utilisé."
            : err.message || "Erreur de connexion.";
      onMessage(msg, false);
    }
    setChargement(false);
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
                onClick={() => setMode(t.id)}
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
            Chaque chef d&apos;équipe dispose de son propre compte et ne voit que les rapports de son équipe.
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
