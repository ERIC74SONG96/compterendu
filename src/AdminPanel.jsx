import React, { useMemo, useState } from "react";
import {
  Shield, Users, ClipboardList, Target, RefreshCw, UserCircle,
  Search, ChevronRight, ArrowLeft, Church, Crown, User,
} from "lucide-react";
import { ListeRapports } from "./ListeRapports";
import { eglisesCorrespondent } from "./eglises";
import { LIBELLE_CHEF_EGLISE } from "./profiles";

const ORANGE = "#DF7B1A";
const ORANGE_DARK = "#B45E0C";
const CREAM = "#FDFBF6";
const CARD = "#FBF1E3";
const BROWN = "#5C3A10";

function normaliserTexte(texte) {
  return (texte || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function texteCorrespond(query, ...valeurs) {
  if (!query) return true;
  return valeurs.some((v) => normaliserTexte(v).includes(query));
}

export default function AdminPanel({
  rapports, profils, eglisesList, chargement, charger,
  modifier, supprimer, scoreFidelite, scoreMembre, currentUserId,
}) {
  const [vue, setVue] = useState("accueil");
  const [egliseActive, setEgliseActive] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [ouverts, setOuverts] = useState({});
  const [listeMembresOuverte, setListeMembresOuverte] = useState(true);
  const [listeChefsOuverte, setListeChefsOuverte] = useState(true);

  const registreMembres = useMemo(() => {
    const map = new Map();
    rapports.forEach((r) => {
      (r.membres || []).forEach((m) => {
        if (!m.nom?.trim()) return;
        const nom = m.nom.trim();
        const key = normaliserTexte(nom);
        const entree = map.get(key) || {
          nom,
          eglises: new Set(),
          chefs: new Set(),
          rapports: [],
        };
        if (r.eglise) entree.eglises.add(r.eglise);
        if (r.chef) entree.chefs.add(r.chef);
        entree.rapports.push({ rapport: r, membre: m, ts: r.ts || 0 });
        map.set(key, entree);
      });
    });
    return [...map.values()]
      .map((e) => {
        const dernier = [...e.rapports].sort((a, b) => b.ts - a.ts)[0];
        return {
          nom: e.nom,
          eglises: [...e.eglises],
          chefs: [...e.chefs],
          nbRapports: e.rapports.length,
          dernier,
        };
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [rapports]);

  const registreChefs = useMemo(() => {
    const byKey = new Map();

    const fusionner = (key, entree) => {
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { ...entree, rapports: [...(entree.rapports || [])] });
        return;
      }
      entree.rapports?.forEach((r) => {
        if (!prev.rapports.some((x) => x.id === r.id)) prev.rapports.push(r);
      });
      if (entree.profil && !prev.profil) prev.profil = entree.profil;
      if (entree.email && !prev.email) prev.email = entree.email;
      if (entree.eglise && entree.eglise !== "—") prev.eglise = entree.eglise;
    };

    profils.filter((p) => p.role !== "admin").forEach((p) => {
      const nom = p.chef_name?.trim() || p.email || "Sans nom";
      const rapportsChef = rapports.filter(
        (r) => r.user_id === p.id || normaliserTexte(r.chef) === normaliserTexte(nom),
      );
      fusionner(p.id, {
        nom,
        email: p.email,
        eglise: p.eglise_maison || rapportsChef[0]?.eglise || "—",
        role: p.role === "chef_chambre" ? LIBELLE_CHEF_EGLISE : "Chef d'équipe",
        profil: p,
        rapports: rapportsChef,
      });
    });

    rapports.forEach((r) => {
      if (!r.chef?.trim()) return;
      const nom = r.chef.trim();
      const nomNorm = normaliserTexte(nom);
      const existant = [...byKey.entries()].find(
        ([, e]) => e.profil?.id === r.user_id || normaliserTexte(e.nom) === nomNorm,
      );
      if (existant) {
        const [, e] = existant;
        if (!e.rapports.some((x) => x.id === r.id)) e.rapports.push(r);
      } else {
        fusionner(`rapport|${nomNorm}`, {
          nom,
          email: null,
          eglise: r.eglise || "—",
          role: "Chef d'équipe",
          rapports: [r],
        });
      }
    });

    return [...byKey.values()]
      .map((e) => {
        const tri = [...e.rapports].sort((a, b) => (b.ts || 0) - (a.ts || 0));
        return { ...e, rapport: tri[0] || null, nbRapports: tri.length };
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [profils, rapports]);

  const chefVersHit = (entry) => ({
    type: "chef",
    nom: entry.nom,
    eglise: entry.eglise,
    chef: entry.role,
    semaine: entry.email || "—",
    score: null,
    rapportId: entry.rapport?.id || entry.profil?.id,
    rapport: entry.rapport,
    profil: entry.profil,
    nbRapports: entry.nbRapports,
  });

  const toutesEglises = useMemo(() => {
    const noms = new Set([...(eglisesList || []), ...rapports.map((r) => r.eglise).filter(Boolean), ...profils.map((p) => p.eglise_maison).filter(Boolean)]);
    return [...noms].sort((a, b) => a.localeCompare(b, "fr"));
  }, [eglisesList, rapports, profils]);

  const ficheEglises = useMemo(() => toutesEglises.map((nom) => {
    const rapportsEglise = rapports.filter((r) => eglisesCorrespondent(r.eglise, nom));
    const profilsEglise = profils.filter((p) => p.role !== "admin" && eglisesCorrespondent(p.eglise_maison, nom));
    const chefChambre = profilsEglise.find((p) => p.role === "chef_chambre");
    const sousChefs = profilsEglise.filter((p) => p.role === "team_leader" || !p.role);
    const disciples = new Set();
    rapportsEglise.forEach((r) => {
      (r.membres || []).forEach((m) => { if (m.nom?.trim()) disciples.add(m.nom.trim().toLowerCase()); });
    });
    const totalPossibleFid = rapportsEglise.length * 4;
    const totalFid = rapportsEglise.reduce((acc, r) => acc + scoreFidelite(r.fidelite), 0);
    return {
      nom,
      rapports: rapportsEglise,
      profils: profilsEglise,
      chefChambre,
      sousChefs,
      nbDisciples: disciples.size,
      nbRapports: rapportsEglise.length,
      fidelite: totalPossibleFid ? Math.round((totalFid / totalPossibleFid) * 100) : 0,
    };
  }), [toutesEglises, rapports, profils, scoreFidelite]);

  const ficheActive = useMemo(
    () => ficheEglises.find((f) => f.nom === egliseActive) || null,
    [ficheEglises, egliseActive],
  );

  const resultatsChefs = useMemo(() => {
    const q = normaliserTexte(recherche);
    if (!q) return [];
    return registreChefs
      .filter((entry) => texteCorrespond(q, entry.nom, entry.email, entry.eglise, entry.role))
      .map(chefVersHit)
      .sort((a, b) => {
        const exactA = normaliserTexte(a.nom) === q;
        const exactB = normaliserTexte(b.nom) === q;
        if (exactA !== exactB) return exactA ? -1 : 1;
        return a.nom.localeCompare(b.nom, "fr");
      });
  }, [registreChefs, recherche]);

  const resultatsDisciples = useMemo(() => {
    const q = normaliserTexte(recherche);
    if (!q) return [];
    return registreMembres
      .filter((entry) => texteCorrespond(q, entry.nom, ...entry.eglises))
      .map((entry) => {
        const hit = entry.dernier;
        return {
          type: "membre",
          nom: entry.nom,
          eglise: hit.rapport.eglise || "—",
          chef: hit.rapport.chef || "—",
          semaine: hit.rapport.semaine || "—",
          score: scoreMembre(hit.membre),
          presence: hit.membre.presence,
          rapportId: hit.rapport.id,
          rapport: hit.rapport,
          nbRapports: entry.nbRapports,
        };
      });
  }, [registreMembres, recherche, scoreMembre]);

  const resultatsRecherche = useMemo(
    () => [...resultatsChefs, ...resultatsDisciples],
    [resultatsChefs, resultatsDisciples],
  );

  const membresAffiches = useMemo(() => {
    const q = normaliserTexte(recherche);
    if (!q) return registreMembres;
    return registreMembres.filter((entry) => texteCorrespond(q, entry.nom, ...entry.eglises));
  }, [registreMembres, recherche]);

  const chefsAffiches = useMemo(() => {
    const q = normaliserTexte(recherche);
    if (!q) return registreChefs;
    return registreChefs.filter((entry) => texteCorrespond(q, entry.nom, entry.email, entry.eglise, entry.role));
  }, [registreChefs, recherche]);

  const statsGlobales = useMemo(() => ({
    eglises: toutesEglises.length,
    rapports: rapports.length,
    disciples: registreMembres.length,
    chefs: registreChefs.length,
  }), [rapports, toutesEglises, registreMembres, registreChefs]);

  const ouvrirEglise = (nom) => {
    setEgliseActive(nom);
    setVue("eglise");
    setOuverts({});
  };

  const resoudreEglise = (nom) => {
    if (!nom || nom === "—") return null;
    return toutesEglises.find((e) => eglisesCorrespondent(e, nom)) || nom;
  };

  const ouvrirRapportDepuisRecherche = (hit) => {
    const eglise = resoudreEglise(hit.eglise);
    if (!eglise) return;
    setEgliseActive(eglise);
    setVue("eglise");
    if (hit.rapport?.id) setOuverts({ [hit.rapport.id]: true });
    setRecherche("");
  };

  if (chargement) {
    return (
      <div className="py-16 flex flex-col items-center gap-3" style={{ color: BROWN, fontFamily: "system-ui, sans-serif" }}>
        <RefreshCw className="w-7 h-7 animate-spin" style={{ color: ORANGE }} />
        <p className="text-sm">Chargement de la plateforme administrateur…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <section className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "#2C1810", border: "1px solid #5C3A10" }}>
        <Shield className="w-6 h-6 text-white shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm" style={{ fontFamily: "system-ui, sans-serif" }}>
            Grand administrateur
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#D4A574" }}>
            Églises de maison → rapport global → rapports individuels
          </p>
        </div>
        <button type="button" onClick={charger} className="shrink-0 p-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
          <RefreshCw className="w-4 h-4 text-white" />
        </button>
      </section>

      {/* Recherche membres */}
      <section className="rounded-xl p-4" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
        <label className="block" style={{ fontFamily: "system-ui, sans-serif" }}>
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: ORANGE_DARK }}>
            <Search className="w-3.5 h-3.5" /> Rechercher un disciple ou un chef
          </span>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom du disciple, chef d'équipe, église…"
            className="mt-2 w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM }}
          />
        </label>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "#8A7358", fontFamily: "system-ui, sans-serif" }}>
          Les <strong>chefs d&apos;équipe</strong> (ex. Emma) et les <strong>disciples</strong> (ex. Reine) sont listés séparément. Tapez un nom pour filtrer.
        </p>

        {recherche.trim() && (
          <div className="mt-3 space-y-3 max-h-80 overflow-y-auto">
            {resultatsRecherche.length === 0 ? (
              <p className="text-sm py-2 text-center" style={{ color: "#8A7358" }}>Aucun résultat pour « {recherche} »</p>
            ) : (
              <>
                {resultatsChefs.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: ORANGE_DARK }}>
                      Chefs ({resultatsChefs.length})
                    </p>
                    <div className="space-y-1.5">
                      {resultatsChefs.map((hit) => (
                        <button
                          key={`chef|${hit.rapportId}|${hit.nom}`}
                          type="button"
                          onClick={() => ouvrirRapportDepuisRecherche(hit)}
                          className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors hover:opacity-90"
                          style={{ backgroundColor: "#2C1810", border: "1px solid #5C3A10", fontFamily: "system-ui, sans-serif" }}
                        >
                          <Crown className="w-4 h-4 shrink-0" style={{ color: "#FCE3C6" }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate text-white">{hit.nom}</p>
                            <p className="text-xs truncate" style={{ color: "#D4A574" }}>
                              {hit.eglise} · {hit.chef}
                              {hit.nbRapports > 0 ? ` · ${hit.nbRapports} rapport${hit.nbRapports > 1 ? "s" : ""}` : " · inscrit, pas encore de rapport"}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#D4A574" }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {resultatsDisciples.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: ORANGE_DARK }}>
                      Disciples ({resultatsDisciples.length})
                    </p>
                    <div className="space-y-1.5">
                      {resultatsDisciples.map((hit) => (
                        <button
                          key={`membre|${hit.rapportId}|${hit.nom}`}
                          type="button"
                          onClick={() => ouvrirRapportDepuisRecherche(hit)}
                          className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors hover:opacity-90"
                          style={{ backgroundColor: CARD, border: "1px solid #F0DCBE", fontFamily: "system-ui, sans-serif" }}
                        >
                          <User className="w-4 h-4 shrink-0" style={{ color: ORANGE_DARK }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{hit.nom}</p>
                            <p className="text-xs truncate" style={{ color: "#8A7358" }}>
                              {hit.eglise} · Chef {hit.chef} · {hit.semaine}
                              {hit.nbRapports > 1 ? ` · ${hit.nbRapports} rapports` : ""}
                            </p>
                          </div>
                          <span className="text-xs font-bold shrink-0" style={{ color: ORANGE_DARK }}>{hit.score}/12</span>
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#A08A6B" }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #F0DCBE" }}>
          <button
            type="button"
            onClick={() => setListeChefsOuverte((o) => !o)}
            className="w-full flex items-center justify-between text-left"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>
              Tous les chefs d&apos;équipe ({registreChefs.length})
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${listeChefsOuverte ? "rotate-90" : ""}`} style={{ color: "#A08A6B" }} />
          </button>
          {listeChefsOuverte && (
            <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
              {chefsAffiches.length === 0 ? (
                <p className="text-sm py-3 text-center rounded-lg" style={{ color: "#8A7358", backgroundColor: CREAM }}>
                  {recherche.trim() ? `Aucun chef pour « ${recherche} »` : "Aucun chef inscrit."}
                </p>
              ) : (
                chefsAffiches.map((entry) => (
                  <button
                    key={entry.profil?.id || entry.nom}
                    type="button"
                    onClick={() => ouvrirRapportDepuisRecherche(chefVersHit(entry))}
                    className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 hover:opacity-90"
                    style={{ backgroundColor: "#2C1810", border: "1px solid #5C3A10", fontFamily: "system-ui, sans-serif" }}
                  >
                    <Crown className="w-4 h-4 shrink-0" style={{ color: "#FCE3C6" }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate text-white">{entry.nom}</p>
                      <p className="text-xs truncate" style={{ color: "#D4A574" }}>
                        {entry.eglise} · {entry.role}
                        {entry.nbRapports > 0 ? ` · ${entry.nbRapports} rapport${entry.nbRapports > 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#D4A574" }} />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #F0DCBE" }}>
          <button
            type="button"
            onClick={() => setListeMembresOuverte((o) => !o)}
            className="w-full flex items-center justify-between text-left"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>
              Tous les disciples suivis ({registreMembres.length})
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${listeMembresOuverte ? "rotate-90" : ""}`} style={{ color: "#A08A6B" }} />
          </button>
          {listeMembresOuverte && (
            <div className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
              {membresAffiches.length === 0 ? (
                <p className="text-sm py-3 text-center rounded-lg" style={{ color: "#8A7358", backgroundColor: CREAM }}>
                  {recherche.trim()
                    ? `Aucun disciple pour « ${recherche} »`
                    : "Aucun disciple enregistré — les chefs d'équipe doivent remplir la section B de leur rapport."}
                </p>
              ) : (
                membresAffiches.map((entry) => {
                  const hit = entry.dernier;
                  return (
                    <button
                      key={entry.nom}
                      type="button"
                      onClick={() => ouvrirRapportDepuisRecherche({
                        type: "membre",
                        nom: entry.nom,
                        eglise: hit.rapport.eglise || "—",
                        chef: hit.rapport.chef || "—",
                        semaine: hit.rapport.semaine || "—",
                        score: scoreMembre(hit.membre),
                        rapportId: hit.rapport.id,
                        rapport: hit.rapport,
                        nbRapports: entry.nbRapports,
                      })}
                      className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 hover:opacity-90"
                      style={{ backgroundColor: CREAM, border: "1px solid #F0DCBE", fontFamily: "system-ui, sans-serif" }}
                    >
                      <User className="w-4 h-4 shrink-0" style={{ color: ORANGE_DARK }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{entry.nom}</p>
                        <p className="text-xs truncate" style={{ color: "#8A7358" }}>
                          {[...new Set(entry.eglises)].join(" · ")} · Chef {[...new Set(entry.chefs)].join(", ")}
                          {entry.nbRapports > 1 ? ` · ${entry.nbRapports} rapports` : ""}
                        </p>
                      </div>
                      <span className="text-xs font-bold shrink-0" style={{ color: ORANGE_DARK }}>
                        {scoreMembre(hit.membre)}/12
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#A08A6B" }} />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </section>

      {vue === "accueil" && (
        <>
          <section className="rounded-xl overflow-hidden" style={{ backgroundColor: ORANGE }}>
            <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
              {[
                { val: statsGlobales.eglises, label: "églises de maison" },
                { val: statsGlobales.chefs, label: "chefs inscrits" },
                { val: statsGlobales.disciples, label: "disciples suivis" },
                { val: statsGlobales.rapports, label: "rapports" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                  <p className="text-white font-bold text-2xl leading-none">{s.val}</p>
                  <p className="text-white/85 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1 flex items-center gap-2" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
              <Church className="w-4 h-4" /> Églises de maison
            </h2>
            <div className="space-y-3">
              {ficheEglises.length === 0 ? (
                <p className="text-sm text-center py-8 rounded-xl" style={{ color: "#8A7358", backgroundColor: "white", border: "1px solid #F0DCBE" }}>
                  Aucune église de maison enregistrée.
                </p>
              ) : (
                ficheEglises.map((f) => (
                  <button
                    key={f.nom}
                    type="button"
                    onClick={() => ouvrirEglise(f.nom)}
                    className="w-full text-left rounded-xl px-4 py-4 flex items-start gap-3 transition-shadow hover:shadow-md"
                    style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: ORANGE }}>
                      <Church className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold leading-tight" style={{ fontFamily: "Georgia, serif" }}>{f.nom}</p>
                      {f.chefChambre && (
                        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
                          <Crown className="w-3 h-3" /> {LIBELLE_CHEF_EGLISE} : {f.chefChambre.chef_name || f.chefChambre.email}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: "#8A7358", fontFamily: "system-ui, sans-serif" }}>
                        {f.sousChefs.length} chef{f.sousChefs.length > 1 ? "s" : ""} d&apos;équipe · {f.nbDisciples} disciple{f.nbDisciples > 1 ? "s" : ""} · {f.nbRapports} rapport{f.nbRapports > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>{f.fidelite}%</p>
                      <p className="text-xs" style={{ color: "#8A7358" }}>fidélité</p>
                      <ChevronRight className="w-5 h-5 mt-1 ml-auto" style={{ color: "#A08A6B" }} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {vue === "eglise" && ficheActive && (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => { setVue("accueil"); setEgliseActive(null); setOuverts({}); }}
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}
          >
            <ArrowLeft className="w-4 h-4" /> Toutes les églises de maison
          </button>

          <section className="rounded-xl overflow-hidden" style={{ backgroundColor: ORANGE }}>
            <div className="px-4 py-4" style={{ fontFamily: "system-ui, sans-serif" }}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm uppercase tracking-wider">Rapport global — {ficheActive.nom}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { val: ficheActive.nbDisciples, label: "disciples" },
                  { val: ficheActive.sousChefs.length + (ficheActive.chefChambre ? 1 : 0), label: "chefs" },
                  { val: `${ficheActive.fidelite}%`, label: "fidélité moy." },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                    <p className="text-white font-bold text-xl">{s.val}</p>
                    <p className="text-white/85 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Chefs et sous-chefs */}
          <section className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
              <UserCircle className="w-4 h-4" /> Chefs et sous-chefs
            </h3>
            {ficheActive.chefChambre && (
              <ChefLigne profil={ficheActive.chefChambre} role={LIBELLE_CHEF_EGLISE} rapports={ficheActive.rapports} />
            )}
            {ficheActive.sousChefs.map((p) => (
              <ChefLigne key={p.id} profil={p} role="Chef d'équipe" rapports={ficheActive.rapports} />
            ))}
            {!ficheActive.chefChambre && ficheActive.sousChefs.length === 0 && (
              <p className="text-sm" style={{ color: "#8A7358" }}>Aucun chef inscrit pour cette église.</p>
            )}
          </section>

          {/* Rapports individuels */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 px-1 flex items-center gap-2" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
              <ClipboardList className="w-4 h-4" /> Rapports individuels
            </h3>
            <ListeRapports
              rapports={ficheActive.rapports}
              ouverts={ouverts}
              setOuverts={setOuverts}
              modifier={modifier}
              supprimer={supprimer}
              scoreFidelite={scoreFidelite}
              scoreMembre={scoreMembre}
              currentUserId={currentUserId}
              canEditAll
              messageVide="Aucun rapport pour cette église de maison."
            />
          </section>
        </div>
      )}
    </div>
  );
}

function ChefLigne({ profil, role, rapports }) {
  const nbRapports = rapports.filter((r) => r.user_id === profil.id).length;
  const nbMembres = new Set();
  rapports.filter((r) => r.user_id === profil.id).forEach((r) => {
    (r.membres || []).forEach((m) => { if (m.nom?.trim()) nbMembres.add(m.nom.trim()); });
  });
  return (
    <article className="rounded-lg px-3 py-2.5 flex items-center gap-3" style={{ backgroundColor: CREAM, border: "1px solid #F0DCBE", fontFamily: "system-ui, sans-serif" }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shrink-0 text-sm" style={{ backgroundColor: ORANGE }}>
        {(profil.chef_name || "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{profil.chef_name || "Sans nom"}</p>
        <p className="text-xs truncate" style={{ color: "#8A7358" }}>{profil.email}</p>
      </div>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ backgroundColor: role === LIBELLE_CHEF_EGLISE ? "#2C1810" : CARD, color: role === LIBELLE_CHEF_EGLISE ? "#FCE3C6" : ORANGE_DARK }}>
        {role}
      </span>
      <div className="text-right text-xs shrink-0">
        <p className="font-bold" style={{ color: ORANGE_DARK }}>{nbRapports} rapp.</p>
        <p style={{ color: "#8A7358" }}>{nbMembres.size} memb.</p>
      </div>
    </article>
  );
}
