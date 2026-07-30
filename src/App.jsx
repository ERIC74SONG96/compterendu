import React, { useState, useEffect, useCallback } from "react";
import {
  Flame, Users, ClipboardList, Plus, Trash2, Pencil, ChevronDown,
  ChevronUp, CheckCircle2, XCircle, Loader2, RefreshCw, Save, X,
  Target, HandHeart, AlertCircle, LogOut, Calendar, ChevronLeft, ChevronRight, Shield
} from "lucide-react";
import AuthScreen from "./AuthScreen";
import AdminPanel from "./AdminPanel";
import { ListeRapports } from "./ListeRapports";
import { AffichageMembreDisciple } from "./AffichageMembre";
import { isConfigured, onAuthStateChange, signOut, updateProfil } from "./auth";
import { deleteRapport, loadRapports, saveRapport } from "./storage";
import { ajouterEglise, loadEglises } from "./eglises";
import { isAdmin, isChefChambre, loadAllProfils, loadProfil, filtrerRapportsEquipe, getEgliseMaison, libelleRole } from "./profiles";

// ============ Constantes ============
const ORANGE = "#DF7B1A";
const ORANGE_DARK = "#B45E0C";
const CREAM = "#FDFBF6";
const CARD = "#FBF1E3";
const BROWN = "#5C3A10";
const INK = "#3B2B18";

const ROUTINES = [
  "La prière seul",
  "Le jeûne",
  "Les rencontres dynamiques quotidiennes avec Dieu",
  "La lecture biblique",
  "Les retraites pour le progrès spirituel",
  "Les dons à Dieu",
  "La prière avec les autres",
  "La lecture des livres chrétiens",
  "Le témoignage en vue du gagnement d'âmes",
  "Être disciple de Jésus-Christ",
  "L'engagement actif dans l'église locale",
  "Les comptes rendus",
];

const ROUTINES_PRIERE = new Set(["La prière seul", "La prière avec les autres"]);

const FIDELITE = [
  { key: "priere", label: "J'ai prié pour chaque membre avec le bulletin de prière des jeunes convertis", avecTemps: true },
  { key: "jeune", label: "J'ai fait mon jeûne partiel de la semaine pour mes disciples" },
  { key: "rencontre", label: "J'ai tenu la rencontre d'équipe en présentiel" },
  { key: "evangelisation", label: "J'ai évangélisé des étudiants cette semaine (campus, camarades, voisins)" },
];

const tempsPriereVide = () => ({ heures: 0, minutes: 0 });

function estRoutinePriere(routine) {
  return ROUTINES_PRIERE.has(routine);
}

function formaterTempsPriere(temps) {
  if (!temps) return null;
  const h = Number(temps.heures) || 0;
  const m = Number(temps.minutes) || 0;
  if (h === 0 && m === 0) return null;
  const parts = [];
  if (h > 0) parts.push(`${h} h`);
  if (m > 0) parts.push(`${m} min`);
  return parts.join(" ");
}

const emptyMembre = () => ({ nom: "", routines: {}, routines_temps: {}, presence: false });

const emptyComptePerso = () => ({
  bible_chapitres: 0,
  priere_seul: tempsPriereVide(),
  priere_groupe: tempsPriereVide(),
  veilles_matinales: 0,
  meditations_nombre: 0,
  meditation_temps: tempsPriereVide(),
  livre_nom: "",
  livre_pages: 0,
});

const emptyForm = () => ({
  chef: "", eglise: "", semaine: "",
  fidelite: {
    priere: null, priere_temps: tempsPriereVide(),
    jeune: null, rencontre: null, evangelisation: null,
  },
  compte_perso: emptyComptePerso(),
  membres: [emptyMembre(), emptyMembre()],
  observations: "",
});

function formDepuisProfil(meta = {}) {
  return {
    ...emptyForm(),
    chef: meta.chef_name?.trim() || "",
    eglise: meta.eglise_maison?.trim() || "",
  };
}

// ============ Composant principal ============
export default function CompteRenduApp() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [vue, setVue] = useState("form"); // form | dashboard
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [rapports, setRapports] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState(null);
  const [erreurStockage, setErreurStockage] = useState(false);
  const [ouverts, setOuverts] = useState({});
  const [eglises, setEglises] = useState([]);
  const [profil, setProfil] = useState(null);
  const [profils, setProfils] = useState([]);
  const admin = isAdmin(profil);
  const chefChambre = isChefChambre(profil);

  const notifier = (texte, ok = true) => {
    setMessage({ texte, ok });
    setTimeout(() => setMessage(null), 3500);
  };

  useEffect(() => {
    if (!isConfigured()) {
      setAuthLoading(false);
      return;
    }
    const { data: { subscription } } = onAuthStateChange((s) => {
      setSession(s);
      setAuthLoading(false);
      if (s?.user && !editId) {
        const meta = s.user.user_metadata || {};
        setForm((f) => ({
          ...f,
          chef: f.chef.trim() ? f.chef : (meta.chef_name?.trim() || ""),
          eglise: f.eglise.trim() ? f.eglise : (meta.eglise_maison?.trim() || ""),
        }));
      }
    });
    return () => subscription.unsubscribe();
  }, [editId]);

  // ---- Chargement des rapports partagés ----
  const charger = useCallback(async () => {
    if (!isConfigured() || !session) {
      setRapports([]);
      setChargement(false);
      setErreurStockage(!isConfigured());
      return;
    }
    setChargement(true);
    setErreurStockage(false);
    try {
      const valides = await loadRapports();
      valides.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setRapports(valides);
    } catch {
      setRapports([]);
      setErreurStockage(true);
    }
    setChargement(false);
  }, [session]);

  useEffect(() => { if (session) charger(); }, [charger, session]);

  const chargerEglises = useCallback(async () => {
    if (!session) { setEglises([]); return; }
    try {
      setEglises(await loadEglises());
    } catch {
      setEglises([]);
    }
  }, [session]);

  useEffect(() => { if (session) chargerEglises(); }, [chargerEglises, session]);

  const chargerProfil = useCallback(async () => {
    if (!session) { setProfil(null); setProfils([]); return; }
    try {
      const p = await loadProfil();
      setProfil(p);
      if (isAdmin(p)) {
        setProfils(await loadAllProfils());
      } else {
        setProfils([]);
      }
    } catch {
      setProfil(null);
      setProfils([]);
    }
  }, [session]);

  useEffect(() => { if (session) chargerProfil(); }, [chargerProfil, session]);

  const rapportsEquipe = filtrerRapportsEquipe(rapports, profil, session);
  const egliseEquipe = getEgliseMaison(profil, session);
  const nomAffiche = profil?.chef_name?.trim()
    || session?.user?.user_metadata?.chef_name?.trim()
    || rapportsEquipe[0]?.chef?.trim()
    || session?.user?.email
    || "";

  // Actualisation automatique pour voir les rapports des autres membres
  useEffect(() => {
    if (vue !== "dashboard" && vue !== "admin") return;
    const interval = setInterval(charger, 45000);
    return () => clearInterval(interval);
  }, [vue, charger]);

  // ---- Enregistrement ----
  const enregistrer = async () => {
    if (!session) { notifier("Connectez-vous pour enregistrer.", false); return; }
    if (!form.chef.trim()) { notifier("Indiquez le nom du chef d'équipe.", false); return; }
    if (!form.semaine.trim()) { notifier("Indiquez la semaine concernée.", false); return; }
    if (!form.eglise.trim()) { notifier("Choisissez une église de maison.", false); return; }
    const egliseCanonique = eglises.find((e) => e.toLowerCase() === form.eglise.trim().toLowerCase());
    if (!egliseCanonique) {
      notifier("Choisissez une église dans la liste ou ajoutez-la avec le bouton +.", false);
      return;
    }
    setSauvegarde(true);
    const id = editId || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const donnees = {
      ...form,
      eglise: egliseCanonique,
      membres: form.membres.filter((m) => m.nom.trim() !== ""),
      id,
      user_id: editId ? (rapports.find((r) => r.id === editId)?.user_id || session.user.id) : session.user.id,
      ts: editId ? (rapports.find((r) => r.id === editId)?.ts || Date.now()) : Date.now(),
      modifie: editId ? Date.now() : undefined,
    };
    try {
      await saveRapport(donnees);
      if (form.eglise.trim() || form.chef.trim()) {
        await updateProfil({
          chefName: form.chef.trim() || undefined,
          egliseMaison: egliseCanonique || undefined,
        });
      }
      notifier(editId ? "Rapport mis à jour." : "Rapport enregistré et partagé avec le groupe.");
      setEditId(null);
      setForm({
        ...formDepuisProfil({
          ...session.user.user_metadata,
          chef_name: form.chef.trim() || session.user.user_metadata?.chef_name,
          eglise_maison: egliseCanonique || session.user.user_metadata?.eglise_maison,
        }),
      });
      await chargerEglises();
      await charger();
      setVue("dashboard");
    } catch {
      setErreurStockage(true);
      notifier("Impossible d'enregistrer. Réessayez.", false);
    }
    setSauvegarde(false);
  };

  const supprimer = async (id) => {
    try {
      await deleteRapport(id);
      notifier("Rapport supprimé.");
      setRapports((rs) => rs.filter((r) => r.id !== id));
    } catch {
      notifier("Suppression impossible. Réessayez.", false);
    }
  };

  const modifier = (r) => {
    if (r.user_id && session && r.user_id !== session.user.id && !admin) {
      notifier("Vous ne pouvez modifier que vos propres rapports.", false);
      return;
    }
    setForm({
      chef: r.chef || "", eglise: r.eglise || "", semaine: r.semaine || "",
      fidelite: {
        priere: null, jeune: null, rencontre: null, evangelisation: null,
        ...(r.fidelite || {}),
        priere_temps: r.fidelite?.priere_temps || tempsPriereVide(),
      },
      compte_perso: {
        ...emptyComptePerso(),
        ...(r.compte_perso || {}),
        priere_seul: { ...tempsPriereVide(), ...(r.compte_perso?.priere_seul || {}) },
        priere_groupe: { ...tempsPriereVide(), ...(r.compte_perso?.priere_groupe || {}) },
        meditation_temps: { ...tempsPriereVide(), ...(r.compte_perso?.meditation_temps || {}) },
      },
      membres: (r.membres && r.membres.length ? r.membres : [emptyMembre()]).map((m) => ({
        nom: m.nom || "",
        routines: m.routines || {},
        routines_temps: m.routines_temps || {},
        presence: !!m.presence,
      })),
      observations: r.observations || "",
    });
    setEditId(r.id);
    setVue("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- Helpers formulaire ----
  const setFidelite = (key, val) =>
    setForm((f) => {
      const fidelite = { ...f.fidelite, [key]: val };
      if (key === "priere" && val !== true) fidelite.priere_temps = tempsPriereVide();
      if (key === "priere" && val === true && !fidelite.priere_temps) fidelite.priere_temps = tempsPriereVide();
      return { ...f, fidelite };
    });

  const setFideliteTemps = (temps) =>
    setForm((f) => ({ ...f, fidelite: { ...f.fidelite, priere_temps: temps } }));

  const setMembre = (i, patch) =>
    setForm((f) => ({
      ...f,
      membres: f.membres.map((m, j) => (j === i ? { ...m, ...patch } : m)),
    }));

  const toggleRoutine = (i, routine) =>
    setForm((f) => ({
      ...f,
      membres: f.membres.map((m, j) => {
        if (j !== i) return m;
        const cochee = !m.routines[routine];
        const routines = { ...m.routines, [routine]: cochee };
        const routines_temps = { ...(m.routines_temps || {}) };
        if (estRoutinePriere(routine)) {
          if (cochee) routines_temps[routine] = routines_temps[routine] || tempsPriereVide();
          else delete routines_temps[routine];
        }
        return { ...m, routines, routines_temps };
      }),
    }));

  const setRoutineTemps = (i, routine, temps) =>
    setMembre(i, { routines_temps: { ...(form.membres[i]?.routines_temps || {}), [routine]: temps } });

  const ajouterMembre = () =>
    setForm((f) => (f.membres.length >= 8 ? f : { ...f, membres: [...f.membres, emptyMembre()] }));

  const retirerMembre = (i) =>
    setForm((f) => ({ ...f, membres: f.membres.filter((_, j) => j !== i) }));

  const scoreFidelite = (fid) => FIDELITE.filter((c) => fid && fid[c.key] === true).length;
  const scoreMembre = (m) => ROUTINES.filter((r) => m.routines && m.routines[r]).length;

  const handleAjouterEglise = async (nomBrut) => {
    try {
      const { nom, dejaExistant } = await ajouterEglise(nomBrut);
      await chargerEglises();
      setForm((f) => ({ ...f, eglise: nom }));
      if (dejaExistant) {
        notifier(`« ${nom} » existe déjà — sélectionné automatiquement.`, true);
      } else {
        notifier(`Église « ${nom} » ajoutée au groupe.`);
      }
      return nom;
    } catch {
      notifier("Impossible d'ajouter cette église.", false);
      throw new Error("ajout impossible");
    }
  };

  const deconnecter = async () => {
    await signOut();
    setRapports([]);
    setForm(emptyForm());
    setEditId(null);
    setVue("form");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CREAM, fontFamily: "system-ui, sans-serif", color: BROWN }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: ORANGE }} />
      </div>
    );
  }

  if (!isConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: CREAM, fontFamily: "system-ui, sans-serif" }}>
        <div className="max-w-md rounded-lg px-4 py-3 text-sm flex gap-3 items-start" style={{ backgroundColor: "#FFF4E5", border: "1px solid #F0DCBE", color: BROWN }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: ORANGE_DARK }} />
          <div>
            <p className="font-bold">Supabase non configuré</p>
            <p className="mt-1">Ajoutez vos clés dans <code>.env</code> ou sur Vercel.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onMessage={notifier} />;
  }

  // ============ RENDU ============
  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM, color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {/* Bandeau template : gris / orange / crème */}
      <div style={{ height: 6, backgroundColor: "#E6E6E6" }} />
      <header className="px-4 py-5 sm:py-6" style={{ backgroundColor: ORANGE }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-full p-2.5 shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight tracking-wide">
                  Compte rendu hebdomadaire
                </h1>
                <p className="text-sm mt-0.5 truncate" style={{ color: "#FCE3C6", fontFamily: "system-ui, sans-serif" }}>
                  <span className="font-semibold">{nomAffiche}</span>
                  {profil && (
                    <span className="ml-2 opacity-90">· {libelleRole(profil)}</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={deconnecter}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.18)", fontFamily: "system-ui, sans-serif" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Onglets */}
      <nav className="sticky top-0 z-20 border-b" style={{ backgroundColor: CREAM, borderColor: "#EFD9B8" }}>
        <div className="max-w-3xl mx-auto flex" style={{ fontFamily: "system-ui, sans-serif" }}>
          {[
            { id: "form", icone: ClipboardList, label: editId ? "Modifier le rapport" : "Mon rapport" },
            { id: "dashboard", icone: Users, label: chefChambre
              ? `Ma chambre (${rapportsEquipe.length})`
              : `Mon équipe (${rapportsEquipe.length})` },
            ...(admin ? [{ id: "admin", icone: Shield, label: "Grand admin" }] : []),
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setVue(t.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors"
              style={{
                borderColor: vue === t.id ? ORANGE : "transparent",
                color: vue === t.id ? ORANGE_DARK : "#8A7358",
              }}
            >
              <t.icone className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {!isConfigured() && (
        <div className="max-w-3xl mx-auto px-4 pt-3" style={{ fontFamily: "system-ui, sans-serif" }}>
          <div className="rounded-lg px-4 py-3 text-sm flex gap-3 items-start" style={{ backgroundColor: "#FFF4E5", border: "1px solid #F0DCBE", color: BROWN }}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: ORANGE_DARK }} />
            <div>
              <p className="font-bold">Supabase non configuré</p>
              <p className="mt-1 leading-relaxed">
                Créez un fichier <code className="px-1 rounded" style={{ backgroundColor: CARD }}>.env</code> avec vos clés Supabase
                (voir <code className="px-1 rounded" style={{ backgroundColor: CARD }}>.env.example</code>), puis relancez l&apos;app.
              </p>
            </div>
          </div>
        </div>
      )}

      {erreurStockage && isConfigured() && (
        <div className="max-w-3xl mx-auto px-4 pt-3" style={{ fontFamily: "system-ui, sans-serif" }}>
          <div className="rounded-lg px-4 py-2.5 text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: "#B3402A" }}>
            <XCircle className="w-4 h-4" />
            Connexion à Supabase impossible. Vérifiez vos clés et que la table est créée.
          </div>
        </div>
      )}

      {message && (
        <div className="max-w-3xl mx-auto px-4 pt-3" style={{ fontFamily: "system-ui, sans-serif" }}>
          <div
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-white flex items-center gap-2"
            style={{ backgroundColor: message.ok ? "#4A7C2A" : "#B3402A" }}
          >
            {message.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {message.texte}
          </div>
        </div>
      )}

      <main className={`mx-auto px-4 py-5 pb-16 ${vue === "admin" ? "max-w-5xl" : "max-w-3xl"}`}>
        {vue === "form" ? (
          <FormulaireRapport
            form={form} setForm={setForm} editId={editId}
            setFidelite={setFidelite} setFideliteTemps={setFideliteTemps}
            setMembre={setMembre} toggleRoutine={toggleRoutine} setRoutineTemps={setRoutineTemps}
            ajouterMembre={ajouterMembre} retirerMembre={retirerMembre} enregistrer={enregistrer}
            sauvegarde={sauvegarde} eglises={eglises}
            onAjouterEglise={handleAjouterEglise}
            annulerEdition={() => { setForm(formDepuisProfil(session.user.user_metadata)); setEditId(null); }}
          />
        ) : vue === "admin" && admin ? (
          <AdminPanel
            rapports={rapports}
            profils={profils}
            eglisesList={eglises}
            chargement={chargement}
            charger={charger}
            modifier={modifier}
            supprimer={supprimer}
            scoreFidelite={scoreFidelite}
            scoreMembre={scoreMembre}
            currentUserId={session.user.id}
          />
        ) : (
          <TableauDeBord
            rapports={rapportsEquipe} chargement={chargement} charger={charger}
            ouverts={ouverts} setOuverts={setOuverts}
            modifier={modifier} supprimer={supprimer}
            scoreFidelite={scoreFidelite} scoreMembre={scoreMembre}
            currentUserId={session.user.id}
            egliseMaison={egliseEquipe}
            chefChambre={chefChambre}
          />
        )}

        <p className="mt-8 text-center text-xs" style={{ color: "#A08A6B", fontFamily: "system-ui, sans-serif" }}>
          {admin
            ? "Grand administrateur — onglet « Grand admin » pour voir toutes les églises de maison, chefs et membres."
            : chefChambre && egliseEquipe
              ? `Chef de la chambre « ${egliseEquipe} » — vous voyez les rapports de toutes les équipes.`
              : chefChambre
                ? "Chef de chambre — choisissez votre église de maison dans « Mon rapport »."
                : "Chef d'équipe — vous voyez uniquement le rapport de votre équipe."}
        </p>
      </main>
    </div>
  );
}

// ============ Formulaire ============
function FormulaireRapport({
  form, setForm, editId, setFidelite, setFideliteTemps, setMembre, toggleRoutine, setRoutineTemps,
  ajouterMembre, retirerMembre, enregistrer, sauvegarde, annulerEdition, eglises, onAjouterEglise,
}) {
  return (
    <div className="space-y-5">
      {/* Identification */}
      <section className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
          <Champ label="Chef d'équipe" valeur={form.chef}
            onChange={(v) => setForm((f) => ({ ...f, chef: v }))} placeholder="Ex. : Junior" />
          <ChampEglise label="Église de maison" valeur={form.eglise}
            onChange={(v) => setForm((f) => ({ ...f, eglise: v }))}
            options={eglises} onAjouter={onAjouterEglise} />
          <ChampSemaine label="Semaine" valeur={form.semaine}
            onChange={(v) => setForm((f) => ({ ...f, semaine: v }))} />
        </div>
      </section>

      {/* A. Fidélité */}
      <section className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid #F0DCBE" }}>
        <TitreSection lettre="A" titre="Ma fidélité de chef d'équipe cette semaine" />
        <div className="divide-y" style={{ backgroundColor: "white", borderColor: "#F5E7CF" }}>
          {FIDELITE.map((c) => (
            <div key={c.key} className="px-4 py-3" style={{ backgroundColor: "white" }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm leading-snug flex-1">{c.label}</p>
                <div className="flex gap-1.5 shrink-0" style={{ fontFamily: "system-ui, sans-serif" }}>
                  <BoutonOuiNon actif={form.fidelite[c.key] === true} type="oui"
                    onClick={() => setFidelite(c.key, form.fidelite[c.key] === true ? null : true)} />
                  <BoutonOuiNon actif={form.fidelite[c.key] === false} type="non"
                    onClick={() => setFidelite(c.key, form.fidelite[c.key] === false ? null : false)} />
                </div>
              </div>
              {c.avecTemps && form.fidelite[c.key] === true && (
                <div className="mt-2 pl-1">
                  <ChampTempsPriere
                    label="Temps de prière"
                    value={form.fidelite.priere_temps || tempsPriereVide()}
                    onChange={setFideliteTemps}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* B. Membres */}
      <section className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid #F0DCBE" }}>
        <TitreSection lettre="B" titre="Suivi des membres — routines spirituelles" />
        <div className="p-3 space-y-3" style={{ backgroundColor: "white" }}>
          {form.membres.map((m, i) => (
            <CarteMembre key={i} index={i} membre={m}
              setMembre={setMembre} toggleRoutine={toggleRoutine} setRoutineTemps={setRoutineTemps}
              retirer={form.membres.length > 1 ? () => retirerMembre(i) : null} />
          ))}
          <button onClick={ajouterMembre}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{ border: `1.5px dashed ${ORANGE}`, color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
            <Plus className="w-4 h-4" /> Ajouter un membre
          </button>
        </div>
      </section>

      {/* C. Compte rendu personnel du chef */}
      <section className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid #F0DCBE" }}>
        <TitreSection lettre="C" titre="Compte rendu personnel du chef cette semaine" />
        <SectionComptePerso
          compte={form.compte_perso || emptyComptePerso()}
          onChange={(patch) => setForm((f) => ({
            ...f,
            compte_perso: { ...(f.compte_perso || emptyComptePerso()), ...patch },
          }))}
        />
      </section>

      {/* D. Observations */}
      <section className="rounded-xl overflow-hidden shadow-sm" style={{ border: "1px solid #F0DCBE" }}>
        <TitreSection lettre="D" titre="Observations et sujets de prière" />
        <div className="p-3" style={{ backgroundColor: "white" }}>
          <textarea
            value={form.observations}
            onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
            placeholder="Progrès, difficultés, nouveaux contacts étudiants…"
            rows={4}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-y"
            style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM, fontFamily: "system-ui, sans-serif" }}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
        {editId && (
          <button onClick={annulerEdition}
            className="px-4 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
            style={{ border: "1.5px solid #C9B394", color: BROWN }}>
            <X className="w-4 h-4" /> Annuler
          </button>
        )}
        <button onClick={enregistrer} disabled={sauvegarde}
          className="flex-1 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md transition-opacity"
          style={{ backgroundColor: ORANGE, opacity: sauvegarde ? 0.7 : 1 }}>
          {sauvegarde ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editId ? "Mettre à jour le rapport" : "Enregistrer et partager"}
        </button>
      </div>
    </div>
  );
}

// ============ Tableau de bord ============
function TableauDeBord({
  rapports, chargement, charger, ouverts, setOuverts,
  modifier, supprimer, scoreFidelite, scoreMembre, currentUserId,
  egliseMaison = "", chefChambre = false,
}) {
  if (chargement) {
    return (
      <div className="py-16 flex flex-col items-center gap-3" style={{ color: BROWN, fontFamily: "system-ui, sans-serif" }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: ORANGE }} />
        <p className="text-sm">Chargement de votre équipe…</p>
      </div>
    );
  }

  if (!rapports.length) {
    return (
      <div className="py-14 text-center" style={{ fontFamily: "system-ui, sans-serif" }}>
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: CARD }}>
          <ClipboardList className="w-7 h-7" style={{ color: ORANGE }} />
        </div>
        <p className="font-semibold" style={{ color: BROWN }}>
          {chefChambre ? "Aucun rapport dans la chambre" : "Aucun rapport pour votre équipe"}
        </p>
        <p className="text-sm mt-1" style={{ color: "#8A7358" }}>
          {chefChambre
            ? "Les chefs d'équipe de votre chambre n'ont pas encore enregistré de rapport cette semaine."
            : "Remplissez « Mon rapport » : il apparaîtra ici."}
        </p>
        <button onClick={charger} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: ORANGE_DARK }}>
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>
    );
  }

  // Membres uniques suivis (par nom + église, insensible à la casse)
  const disciplesUniques = new Set();
  rapports.forEach((r) => {
    (r.membres || []).forEach((m) => {
      if (m.nom && m.nom.trim()) {
        disciplesUniques.add(`${(r.eglise || "").trim().toLowerCase()}|${m.nom.trim().toLowerCase()}`);
      }
    });
  });
  const totalDisciples = disciplesUniques.size;
  const OBJECTIF = 100;
  const pourcentage = Math.min(100, Math.round((totalDisciples / OBJECTIF) * 100));

  const totalPossibleFid = rapports.length * 4;
  const totalFid = rapports.reduce((acc, r) => acc + scoreFidelite(r.fidelite), 0);
  const tauxFidelite = totalPossibleFid ? Math.round((totalFid / totalPossibleFid) * 100) : 0;

  return (
    <div className="space-y-6">
      {chefChambre && egliseMaison && (
        <p className="text-sm px-1" style={{ color: "#8A7358", fontFamily: "system-ui, sans-serif" }}>
          Chambre <strong style={{ color: ORANGE_DARK }}>{egliseMaison}</strong>
          {" "}— vous supervisez toutes les équipes et leurs membres.
        </p>
      )}
      {!chefChambre && rapports.some((r) => (r.membres || []).some((m) => m.nom?.trim())) && (
        <section className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
            Disciples de mon équipe
          </h2>
          <p className="text-xs" style={{ color: "#8A7358", fontFamily: "system-ui, sans-serif" }}>
            Compte rendu de chaque membre suivi par le chef cette semaine.
          </p>
          {rapports.flatMap((r) =>
            (r.membres || []).filter((m) => m.nom?.trim()).map((m) => (
              <AffichageMembreDisciple key={`${r.id}|${m.nom}`} membre={m} scoreTotal={ROUTINES.length} />
            ))
          )}
        </section>
      )}

      {/* Bandeau progression vers 100 disciples */}
      <section className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: ORANGE }}>
        <div className="px-4 pt-4 pb-3" style={{ fontFamily: "system-ui, sans-serif" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-sm uppercase tracking-wider">Vers 100 disciples au 31 déc. 2026</span>
            </div>
            <span className="text-white font-bold text-sm shrink-0">{pourcentage}%</span>
          </div>

          {/* Grand compteur */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-white font-bold leading-none" style={{ fontSize: 52, fontFamily: "Georgia, serif" }}>
              {totalDisciples}
            </span>
            <span className="text-white/90 font-semibold text-lg">/ {OBJECTIF} disciples suivis</span>
          </div>

          {/* Barre de progression */}
          <div className="mt-2 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.28)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pourcentage}%`, backgroundColor: "white" }} />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "#FCE3C6" }}>
            {totalDisciples < OBJECTIF
              ? `Encore ${OBJECTIF - totalDisciples} disciples pour atteindre l'objectif.`
              : "Objectif atteint — gloire à Dieu ! Continuons à bâtir."}
          </p>
        </div>

        {/* Sous-statistiques */}
        <div className="grid grid-cols-3 divide-x" style={{ borderColor: "rgba(255,255,255,0.25)", fontFamily: "system-ui, sans-serif" }}>
          <StatMini icone={Users} valeur={totalDisciples} label={totalDisciples > 1 ? "disciples" : "disciple"} />
          <StatMini icone={ClipboardList} valeur={rapports.length} label={rapports.length > 1 ? "rapports" : "rapport"} />
          <StatMini icone={HandHeart} valeur={`${tauxFidelite}%`} label="fidélité moyenne" />
        </div>
      </section>

      <div className="flex items-center justify-between" style={{ fontFamily: "system-ui, sans-serif" }}>
        <p className="text-xs" style={{ color: "#A08A6B" }}>
          Chaque disciple n'est compté qu'une fois, même suivi sur plusieurs semaines.
        </p>
        <button onClick={charger} className="inline-flex items-center gap-2 text-sm font-semibold shrink-0" style={{ color: ORANGE_DARK }}>
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>


      <ListeRapports
        rapports={rapports}
        ouverts={ouverts}
        setOuverts={setOuverts}
        modifier={modifier}
        supprimer={supprimer}
        scoreFidelite={scoreFidelite}
        scoreMembre={scoreMembre}
        currentUserId={currentUserId}
      />
    </div>
  );
}

// ============ Petits composants ============
function StatMini({ icone: Icone, valeur, label }) {
  return (
    <div className="px-2 py-3 flex flex-col items-center text-center">
      <Icone className="w-4 h-4 mb-1" style={{ color: "#FCE3C6" }} />
      <span className="text-white font-bold text-lg leading-none">{valeur}</span>
      <span className="text-white/85 text-xs mt-0.5 leading-tight">{label}</span>
    </div>
  );
}

function formatSemaine(isoLundi) {
  if (!isoLundi) return "";
  const debut = new Date(`${isoLundi}T12:00:00`);
  const fin = new Date(debut);
  fin.setDate(debut.getDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(/\.$/, "");
  return `${fmt(debut)} – ${fmt(fin)}`;
}

function isoDuLundi(date = new Date()) {
  const d = new Date(date);
  const jour = d.getDay();
  const diff = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function isoSemaineDepuisLundi(isoLundi) {
  const d = new Date(`${isoLundi}T12:00:00`);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const semaine1 = new Date(d.getFullYear(), 0, 4);
  const num = 1 + Math.round(
    ((d - semaine1) / 86400000 - 3 + ((semaine1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(num).padStart(2, "0")}`;
}

function lundiDepuisIsoSemaine(isoSemaine) {
  const [annee, sem] = isoSemaine.split("-W");
  const y = Number(annee);
  const w = Number(sem);
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const jour = simple.getDay();
  if (jour <= 4) simple.setDate(simple.getDate() - simple.getDay() + 1);
  else simple.setDate(simple.getDate() + 8 - simple.getDay());
  return simple.toISOString().slice(0, 10);
}

function dimancheDe(isoLundi) {
  const d = new Date(`${isoLundi}T12:00:00`);
  d.setDate(d.getDate() + 6);
  return d;
}

function fmtJourComplet(d) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function ChampSemaine({ label, valeur, onChange }) {
  const [lundi, setLundi] = useState(() => isoDuLundi());

  useEffect(() => {
    if (!valeur) onChange(formatSemaine(lundi));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const appliquer = (isoLundi) => {
    setLundi(isoLundi);
    onChange(formatSemaine(isoLundi));
  };

  const decalerSemaine = (delta) => {
    const d = new Date(`${lundi}T12:00:00`);
    d.setDate(d.getDate() + delta * 7);
    appliquer(d.toISOString().slice(0, 10));
  };

  const debut = new Date(`${lundi}T12:00:00`);
  const fin = dimancheDe(lundi);

  return (
    <div className="block">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>{label}</span>
      <p className="text-xs mt-0.5 mb-2" style={{ color: "#8A7358" }}>Semaine de 7 jours · lundi au dimanche</p>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM }}>
        <div className="flex items-center gap-1 p-1">
          <button type="button" onClick={() => decalerSemaine(-1)} aria-label="Semaine précédente"
            className="p-2 rounded-md shrink-0 hover:bg-white/80" style={{ color: ORANGE_DARK }}>
            <ChevronLeft className="w-5 h-5" />
          </button>

          <label className="flex-1 relative cursor-pointer">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#A08A6B" }} />
            <input
              type="week"
              value={isoSemaineDepuisLundi(lundi)}
              onChange={(e) => { if (e.target.value) appliquer(lundiDepuisIsoSemaine(e.target.value)); }}
              className="w-full rounded-md pl-8 pr-2 py-2 text-sm font-semibold text-center outline-none cursor-pointer bg-transparent"
              style={{ color: INK, fontFamily: "system-ui, sans-serif" }}
            />
          </label>

          <button type="button" onClick={() => decalerSemaine(1)} aria-label="Semaine suivante"
            className="p-2 rounded-md shrink-0 hover:bg-white/80" style={{ color: ORANGE_DARK }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 py-2.5 space-y-1 text-sm" style={{ backgroundColor: "white", borderTop: "1px solid #E8D5B8", fontFamily: "system-ui, sans-serif" }}>
          <p style={{ color: INK }}>
            <span className="font-bold" style={{ color: ORANGE_DARK }}>Lundi</span>
            {" "}{fmtJourComplet(debut)}
          </p>
          <p style={{ color: INK }}>
            <span className="font-bold" style={{ color: ORANGE_DARK }}>Dimanche</span>
            {" "}{fmtJourComplet(fin)}
          </p>
        </div>
      </div>

      {valeur && (
        <p className="text-xs mt-1.5 font-medium" style={{ color: ORANGE_DARK }}>{valeur}</p>
      )}
    </div>
  );
}

function ChampEglise({ label, valeur, onChange, options = [], onAjouter }) {
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [chargement, setChargement] = useState(false);

  const selectValue = options.includes(valeur) ? valeur : "";

  const soumettreAjout = async (e) => {
    e.preventDefault();
    if (!nouveauNom.trim()) return;
    setChargement(true);
    try {
      await onAjouter(nouveauNom);
      setNouveauNom("");
      setAjoutOuvert(false);
    } catch {
      /* message géré par le parent */
    }
    setChargement(false);
  };

  return (
    <div className="block">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>{label}</span>

      <select
        value={selectValue}
        onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
        required
        className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none cursor-pointer font-medium"
        style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM, color: selectValue ? INK : "#8A7358" }}
      >
        <option value="" disabled>{options.length ? "Choisir une église de maison" : "Aucune église — ajoutez la première"}</option>
        {options.map((nom) => (
          <option key={nom} value={nom}>{nom}</option>
        ))}
      </select>

      {!ajoutOuvert ? (
        <button type="button" onClick={() => setAjoutOuvert(true)}
          className="mt-2 w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
          style={{ border: `1.5px dashed ${ORANGE}`, color: ORANGE_DARK }}>
          <Plus className="w-4 h-4" /> Ajouter une église de maison
        </button>
      ) : (
        <form onSubmit={soumettreAjout} className="mt-2 p-3 rounded-lg space-y-2"
          style={{ backgroundColor: CARD, border: "1px solid #E8D5B8" }}>
          <p className="text-xs font-semibold" style={{ color: BROWN }}>Nouvelle église de maison</p>
          <input
            type="text"
            value={nouveauNom}
            onChange={(e) => setNouveauNom(e.target.value)}
            placeholder="Ex. : Joseph"
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: "1px solid #E8D5B8", backgroundColor: "white" }}
          />
          <p className="text-xs" style={{ color: "#8A7358" }}>
            Le nom est formaté automatiquement (ex. « joseph » → « Joseph »). Les doublons sont refusés.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAjoutOuvert(false); setNouveauNom(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold"
              style={{ border: "1px solid #C9B394", color: BROWN }}>
              Annuler
            </button>
            <button type="submit" disabled={chargement || !nouveauNom.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1"
              style={{ backgroundColor: ORANGE, opacity: chargement ? 0.7 : 1 }}>
              {chargement ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter"}
            </button>
          </div>
        </form>
      )}

      <p className="text-xs mt-1.5" style={{ color: "#8A7358" }}>
        Votre choix est mémorisé à chaque connexion. Une seule entrée par église dans la liste commune.
      </p>
    </div>
  );
}

function Champ({ label, valeur, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>{label}</span>
      <input
        type="text" value={valeur} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM }}
      />
    </label>
  );
}

function TitreSection({ lettre, titre }) {
  return (
    <div className="px-4 py-2.5 flex items-center gap-2.5" style={{ backgroundColor: ORANGE }}>
      <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-sm font-bold shrink-0"
        style={{ color: ORANGE, fontFamily: "system-ui, sans-serif" }}>
        {lettre}
      </span>
      <h2 className="text-white font-bold text-sm sm:text-base leading-tight">{titre}</h2>
    </div>
  );
}

function ChampNombre({ label, value, onChange, min = 0, max = 9999 }) {
  return (
    <label className="block" style={{ fontFamily: "system-ui, sans-serif" }}>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>{label}</span>
      <input
        type="number" min={min} max={max} inputMode="numeric"
        value={value ?? 0}
        onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value, 10) || 0)))}
        className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM }}
      />
    </label>
  );
}

function SectionComptePerso({ compte, onChange }) {
  const set = (key, val) => onChange({ [key]: val });

  return (
    <div className="p-4 space-y-4" style={{ backgroundColor: "white", fontFamily: "system-ui, sans-serif" }}>
      <ChampNombre
        label="Lecture biblique (nombre de chapitres)"
        value={compte.bible_chapitres}
        onChange={(v) => set("bible_chapitres", v)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChampTempsPriere
          label="Prière seul"
          value={compte.priere_seul || tempsPriereVide()}
          onChange={(t) => set("priere_seul", t)}
        />
        <ChampTempsPriere
          label="Prière en groupe"
          value={compte.priere_groupe || tempsPriereVide()}
          onChange={(t) => set("priere_groupe", t)}
        />
      </div>

      <ChampNombre
        label="Nombre de veillées matinales"
        value={compte.veilles_matinales}
        onChange={(v) => set("veilles_matinales", v)}
        max={31}
      />

      <div className="rounded-lg p-3 space-y-3" style={{ backgroundColor: CREAM, border: "1px solid #E8D5B8" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>Méditation</p>
        <ChampNombre
          label="Nombre de méditations"
          value={compte.meditations_nombre}
          onChange={(v) => set("meditations_nombre", v)}
          max={99}
        />
        <ChampTempsPriere
          label="Temps de méditation"
          value={compte.meditation_temps || tempsPriereVide()}
          onChange={(t) => set("meditation_temps", t)}
        />
      </div>

      <div className="rounded-lg p-3 space-y-3" style={{ backgroundColor: CREAM, border: "1px solid #E8D5B8" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>
          Lecture de livre chrétien
        </p>
        <Champ label="Nom du livre" valeur={compte.livre_nom || ""}
          onChange={(v) => set("livre_nom", v)} placeholder="Ex. : Pursuing the Will of God" />
        <ChampNombre
          label="Nombre de pages lues"
          value={compte.livre_pages}
          onChange={(v) => set("livre_pages", v)}
        />
      </div>
    </div>
  );
}

function AffichageComptePerso({ compte }) {
  const cp = { ...emptyComptePerso(), ...compte };
  const lignes = [
    cp.bible_chapitres > 0 && `Lecture biblique : ${cp.bible_chapitres} chapitre${cp.bible_chapitres > 1 ? "s" : ""}`,
    formaterTempsPriere(cp.priere_seul) && `Prière seul : ${formaterTempsPriere(cp.priere_seul)}`,
    formaterTempsPriere(cp.priere_groupe) && `Prière en groupe : ${formaterTempsPriere(cp.priere_groupe)}`,
    cp.veilles_matinales > 0 && `Veillées matinales : ${cp.veilles_matinales}`,
    cp.meditations_nombre > 0 && `Méditations : ${cp.meditations_nombre}${formaterTempsPriere(cp.meditation_temps) ? ` (${formaterTempsPriere(cp.meditation_temps)})` : ""}`,
    (cp.livre_nom?.trim() || cp.livre_pages > 0) && `Livre chrétien : ${cp.livre_nom?.trim() || "—"}${cp.livre_pages > 0 ? ` · ${cp.livre_pages} pages` : ""}`,
  ].filter(Boolean);

  if (!lignes.length) {
    return (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
          Compte rendu personnel du chef
        </h3>
        <p className="text-sm italic" style={{ color: "#8A7358" }}>Non renseigné pour cette semaine.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
        Compte rendu personnel du chef
      </h3>
      <ul className="space-y-1 text-sm">
        {lignes.map((l) => (
          <li key={l} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ORANGE_DARK }} />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BoutonOuiNon({ actif, type, onClick }) {
  const ok = type === "oui";
  return (
    <button type="button" onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
      style={{
        backgroundColor: actif ? (ok ? "#4A7C2A" : "#B3402A") : "#F3EADA",
        color: actif ? "white" : "#8A7358",
      }}>
      {ok ? "Oui" : "Non"}
    </button>
  );
}

function ChampTempsPriere({ label, value, onChange }) {
  const maj = (champ, raw) => {
    const max = champ === "heures" ? 23 : 59;
    const num = Math.min(max, Math.max(0, parseInt(raw, 10) || 0));
    onChange({ ...value, [champ]: num });
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>{label}</span>
      )}
      <div className="flex items-center gap-2 mt-1">
        <div className="flex items-center gap-1">
          <input
            type="number" min={0} max={23} inputMode="numeric"
            value={value?.heures ?? 0}
            onChange={(e) => maj("heures", e.target.value)}
            className="w-14 rounded-md px-2 py-1.5 text-sm text-center outline-none"
            style={{ border: "1px solid #E8D5B8", backgroundColor: "white" }}
          />
          <span className="text-xs" style={{ color: "#8A7358" }}>h</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number" min={0} max={59} inputMode="numeric"
            value={value?.minutes ?? 0}
            onChange={(e) => maj("minutes", e.target.value)}
            className="w-14 rounded-md px-2 py-1.5 text-sm text-center outline-none"
            style={{ border: "1px solid #E8D5B8", backgroundColor: "white" }}
          />
          <span className="text-xs" style={{ color: "#8A7358" }}>min</span>
        </div>
      </div>
    </div>
  );
}

function CarteMembre({ index, membre, setMembre, toggleRoutine, setRoutineTemps, retirer }) {
  const [ouvert, setOuvert] = useState(index === 0);
  const coches = ROUTINES.filter((r) => membre.routines[r]).length;

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM }}>
      <div className="px-3 py-2.5 flex items-center gap-2">
        <input
          type="text" value={membre.nom}
          onChange={(e) => setMembre(index, { nom: e.target.value })}
          placeholder={`Nom du membre ${index + 1}`}
          className="flex-1 rounded-md px-2.5 py-1.5 text-sm font-semibold outline-none min-w-0"
          style={{ border: "1px solid #E8D5B8", backgroundColor: "white", fontFamily: "system-ui, sans-serif" }}
        />
        <span className="text-xs font-bold shrink-0" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
          {coches}/{ROUTINES.length}
        </span>
        {retirer && (
          <button onClick={retirer} aria-label="Retirer ce membre" className="p-1.5 rounded-md" style={{ color: "#B3402A" }}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => setOuvert(!ouvert)} aria-label="Ouvrir la liste des routines" className="p-1.5 rounded-md" style={{ color: BROWN }}>
          {ouvert ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {ouvert && (
        <div className="px-3 pb-3 space-y-1.5" style={{ fontFamily: "system-ui, sans-serif" }}>
          {/* Présence à la rencontre */}
          <button
            onClick={() => setMembre(index, { presence: !membre.presence })}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-sm font-semibold"
            style={{
              backgroundColor: membre.presence ? "#EAF3E2" : "white",
              border: `1px solid ${membre.presence ? "#9CC27E" : "#E8D5B8"}`,
              color: membre.presence ? "#4A7C2A" : INK,
            }}>
            <Case cochee={membre.presence} />
            Présence à la rencontre d'équipe cette semaine
          </button>
          {/* Routines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {ROUTINES.map((r) => {
              const cochee = !!membre.routines[r];
              const priere = estRoutinePriere(r);
              return (
                <div key={r} className="space-y-1">
                  <button type="button" onClick={() => toggleRoutine(index, r)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-sm"
                    style={{
                      backgroundColor: cochee ? "#FBF1E3" : "white",
                      border: `1px solid ${cochee ? ORANGE : "#E8D5B8"}`,
                      color: INK,
                    }}>
                    <Case cochee={cochee} />
                    <span className="leading-tight">{r}</span>
                  </button>
                  {priere && cochee && (
                    <div className="px-2 pb-1">
                      <ChampTempsPriere
                        label="Durée"
                        value={membre.routines_temps?.[r] || tempsPriereVide()}
                        onChange={(t) => setRoutineTemps(index, r, t)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Case({ cochee }) {
  return (
    <span
      className="w-4.5 h-4.5 rounded flex items-center justify-center shrink-0"
      style={{
        width: 18, height: 18,
        backgroundColor: cochee ? ORANGE : "white",
        border: `1.5px solid ${cochee ? ORANGE : "#C9B394"}`,
      }}>
      {cochee && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
    </span>
  );
}
