import React, { useState } from "react";
import { AffichageMembreDisciple } from "./AffichageMembre";
import {
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Pencil, Trash2, ClipboardList,
} from "lucide-react";

const ORANGE = "#DF7B1A";
const ORANGE_DARK = "#B45E0C";
const CREAM = "#FDFBF6";
const CARD = "#FBF1E3";
const BROWN = "#5C3A10";
const INK = "#3B2B18";

const ROUTINES = [
  "La prière seul", "Le jeûne", "Les rencontres dynamiques quotidiennes avec Dieu",
  "La lecture biblique", "Les retraites pour le progrès spirituel", "Les dons à Dieu",
  "La prière avec les autres", "La lecture des livres chrétiens",
  "Le témoignage en vue du gagnement d'âmes", "Être disciple de Jésus-Christ",
  "L'engagement actif dans l'église locale", "Les comptes rendus",
];

const ROUTINES_PRIERE = new Set(["La prière seul", "La prière avec les autres"]);

const FIDELITE = [
  { key: "priere", label: "J'ai prié pour chaque membre avec le bulletin de prière des jeunes convertis", avecTemps: true },
  { key: "jeune", label: "J'ai fait mon jeûne partiel de la semaine pour mes disciples" },
  { key: "rencontre", label: "J'ai tenu la rencontre d'équipe en présentiel" },
  { key: "evangelisation", label: "J'ai évangélisé des étudiants cette semaine (campus, camarades, voisins)" },
];

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

function estRoutinePriere(routine) {
  return ROUTINES_PRIERE.has(routine);
}

function EnteteSectionRapport({ lettre, titre }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-t-lg" style={{ backgroundColor: CARD, borderBottom: "1px solid #F0DCBE" }}>
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: ORANGE, fontFamily: "system-ui, sans-serif" }}>
        {lettre}
      </span>
      <h3 className="text-xs font-bold uppercase tracking-wider leading-snug" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
        {titre}
      </h3>
    </div>
  );
}

function BlocSection({ lettre, titre, children }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #F0DCBE" }}>
      <EnteteSectionRapport lettre={lettre} titre={titre} />
      <div className="p-3" style={{ backgroundColor: "white" }}>{children}</div>
    </div>
  );
}

function AffichageComptePerso({ compte }) {
  const cp = {
    bible_chapitres: 0,
    priere_seul: { heures: 0, minutes: 0 },
    priere_groupe: { heures: 0, minutes: 0 },
    veilles_matinales: 0,
    meditations_nombre: 0,
    meditation_temps: { heures: 0, minutes: 0 },
    livre_nom: "",
    livre_pages: 0,
    ...compte,
  };
  const lignes = [
    cp.bible_chapitres > 0 && `Lecture biblique : ${cp.bible_chapitres} chapitre${cp.bible_chapitres > 1 ? "s" : ""}`,
    formaterTempsPriere(cp.priere_seul) && `Prière seul : ${formaterTempsPriere(cp.priere_seul)}`,
    formaterTempsPriere(cp.priere_groupe) && `Prière en groupe : ${formaterTempsPriere(cp.priere_groupe)}`,
    cp.veilles_matinales > 0 && `Veillées matinales : ${cp.veilles_matinales}`,
    cp.meditations_nombre > 0 && `Méditations : ${cp.meditations_nombre}${formaterTempsPriere(cp.meditation_temps) ? ` (${formaterTempsPriere(cp.meditation_temps)})` : ""}`,
    (cp.livre_nom?.trim() || cp.livre_pages > 0) && `Livre chrétien : ${cp.livre_nom?.trim() || "—"}${cp.livre_pages > 0 ? ` · ${cp.livre_pages} pages` : ""}`,
  ].filter(Boolean);

  if (!lignes.length) {
    return <p className="text-sm italic" style={{ color: "#8A7358" }}>Non renseigné pour cette semaine.</p>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {lignes.map((l) => (
        <li key={l} className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ORANGE_DARK }} />
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

export function ListeRapports({
  rapports, ouverts, setOuverts, modifier, supprimer,
  scoreFidelite, scoreMembre, currentUserId, canEditAll = false,
  messageVide = "Aucun rapport.",
}) {
  const [confirmation, setConfirmation] = useState(null);

  if (!rapports.length) {
    return (
      <div className="py-10 text-center rounded-xl" style={{ backgroundColor: "white", border: "1px solid #F0DCBE", fontFamily: "system-ui, sans-serif" }}>
        <ClipboardList className="w-8 h-8 mx-auto mb-2" style={{ color: ORANGE }} />
        <p className="text-sm" style={{ color: "#8A7358" }}>{messageVide}</p>
      </div>
    );
  }

  const semaines = {};
  rapports.forEach((r) => {
    const s = r.semaine || "Semaine non précisée";
    (semaines[s] = semaines[s] || []).push(r);
  });

  return (
    <div className="space-y-4">
      {Object.entries(semaines).map(([semaine, liste]) => (
        <div key={semaine}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-2 px-1" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
            {semaine} · {liste.length} rapport{liste.length > 1 ? "s" : ""}
          </h2>
          <div className="space-y-3">
            {liste.map((r) => {
              const ouvert = !!ouverts[r.id];
              const fid = scoreFidelite(r.fidelite);
              const peutEditer = canEditAll || !r.user_id || r.user_id === currentUserId;
              const nomsDisciples = (r.membres || []).map((m) => m.nom?.trim()).filter(Boolean);
              const chefNom = (r.chef || "?").trim();
              const initiale = chefNom.charAt(0).toUpperCase();
              const titre = chefNom;
              const sousTitre = [
                r.semaine || null,
                nomsDisciples.length ? `Disciples : ${nomsDisciples.join(", ")}` : null,
              ].filter(Boolean).join(" · ");
              return (
                <article key={r.id} className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
                  <button
                    type="button"
                    onClick={() => setOuverts((o) => ({ ...o, [r.id]: !o[r.id] }))}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                      style={{ backgroundColor: ORANGE, fontFamily: "system-ui, sans-serif" }}>
                      {initiale}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold leading-tight truncate">{titre}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#8A7358", fontFamily: "system-ui, sans-serif" }}>
                        {sousTitre}
                      </p>
                      {nomsDisciples.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {nomsDisciples.map((nom) => (
                            <span key={nom} className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: CREAM, color: ORANGE_DARK, border: "1px solid #F0DCBE" }}>
                              {nom}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: fid === 4 ? "#EAF3E2" : CARD, color: fid === 4 ? "#4A7C2A" : ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
                      Fidélité {fid}/4
                    </span>
                    {ouvert ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: BROWN }} />
                      : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: BROWN }} />}
                  </button>

                  {ouvert && (
                    <div className="px-4 pb-4 space-y-4 border-t pt-3" style={{ borderColor: "#F5E7CF" }}>
                      {/* A — Fidélité du chef */}
                      <BlocSection lettre="A" titre={`Fidélité du chef — ${chefNom}`}>
                        <ul className="space-y-1">
                          {FIDELITE.map((c) => {
                            const v = r.fidelite ? r.fidelite[c.key] : null;
                            const temps = c.avecTemps && v === true ? formaterTempsPriere(r.fidelite?.priere_temps) : null;
                            return (
                              <li key={c.key} className="flex items-start gap-2 text-sm">
                                {v === true ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#4A7C2A" }} />
                                  : v === false ? <XCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#B3402A" }} />
                                  : <span className="w-4 h-4 mt-0.5 shrink-0 rounded-full border" style={{ borderColor: "#C9B394" }} />}
                                <span style={{ color: v === false ? "#B3402A" : INK }}>
                                  {c.label}
                                  {temps && (
                                    <span className="block text-xs font-semibold mt-0.5" style={{ color: ORANGE_DARK }}>
                                      Temps de prière : {temps}
                                    </span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </BlocSection>

                      {/* B — Membres suivis (disciples) */}
                      {(r.membres || []).length > 0 && (
                        <BlocSection lettre="B" titre="Membres suivis — compte rendu de chaque disciple">
                          <div className="space-y-4">
                            {r.membres.filter((m) => m.nom?.trim()).map((m, i) => (
                              <AffichageMembreDisciple key={i} membre={m} scoreTotal={ROUTINES.length} />
                            ))}
                          </div>
                        </BlocSection>
                      )}

                      {/* C — Compte rendu personnel du chef */}
                      <BlocSection
                        lettre="C"
                        titre={chefNom ? `Compte rendu personnel du chef — ${chefNom}` : "Compte rendu personnel du chef"}
                      >
                        <AffichageComptePerso compte={r.compte_perso} />
                      </BlocSection>

                      {r.observations && (
                        <BlocSection lettre="D" titre="Observations et sujets de prière">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.observations}</p>
                        </BlocSection>
                      )}

                      {peutEditer && (
                        <div className="flex gap-2 pt-1" style={{ fontFamily: "system-ui, sans-serif" }}>
                          <button type="button" onClick={() => modifier(r)}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
                            style={{ border: `1.5px solid ${ORANGE}`, color: ORANGE_DARK }}>
                            <Pencil className="w-3.5 h-3.5" /> Modifier
                          </button>
                          {confirmation === r.id ? (
                            <button type="button" onClick={() => { supprimer(r.id); setConfirmation(null); }}
                              className="flex-1 py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1.5"
                              style={{ backgroundColor: "#B3402A" }}>
                              <Trash2 className="w-3.5 h-3.5" /> Confirmer la suppression
                            </button>
                          ) : (
                            <button type="button" onClick={() => setConfirmation(r.id)}
                              className="py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
                              style={{ border: "1.5px solid #D9A79A", color: "#B3402A" }}>
                              <Trash2 className="w-3.5 h-3.5" /> Supprimer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
