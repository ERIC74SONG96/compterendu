import React, { useState } from "react";
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
              const estMonRapport = r.user_id === currentUserId;
              const initiale = estMonRapport && nomsDisciples.length
                ? nomsDisciples[0].charAt(0).toUpperCase()
                : (r.chef || "?").trim().charAt(0).toUpperCase();
              const titre = estMonRapport && nomsDisciples.length
                ? nomsDisciples.join(", ")
                : (r.chef || "?");
              const sousTitre = estMonRapport
                ? (r.semaine ? `Mon équipe · ${r.semaine}` : "Mon équipe")
                : [
                    r.chef ? `Chef ${r.chef}` : null,
                    nomsDisciples.length ? `Disciples : ${nomsDisciples.join(", ")}` : "Aucun disciple",
                    r.eglise ? r.eglise : null,
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
                      {nomsDisciples.length > 0 && !estMonRapport && (
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
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
                          Fidélité du chef
                        </h3>
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
                      </div>

                      <AffichageComptePerso compte={r.compte_perso} />

                      {(r.membres || []).length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
                            Membres suivis
                          </h3>
                          <div className="space-y-2">
                            {r.membres.map((m, i) => (
                              <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: CREAM, border: "1px solid #F0DCBE" }}>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-sm">{m.nom}</p>
                                  <div className="flex items-center gap-2 text-xs" style={{ fontFamily: "system-ui, sans-serif" }}>
                                    <span className="font-bold" style={{ color: ORANGE_DARK }}>
                                      {scoreMembre(m)}/{ROUTINES.length} routines
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full font-semibold"
                                      style={{ backgroundColor: m.presence ? "#EAF3E2" : "#F9E3DC", color: m.presence ? "#4A7C2A" : "#B3402A" }}>
                                      {m.presence ? "Présent" : "Absent"}
                                    </span>
                                  </div>
                                </div>
                                {scoreMembre(m) > 0 && (
                                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#8A7358" }}>
                                    {ROUTINES.filter((rt) => m.routines && m.routines[rt]).map((rt) => {
                                      const temps = estRoutinePriere(rt) ? formaterTempsPriere(m.routines_temps?.[rt]) : null;
                                      return temps ? `${rt} (${temps})` : rt;
                                    }).join(" · ")}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {r.observations && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
                            Observations et sujets de prière
                          </h3>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.observations}</p>
                        </div>
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
