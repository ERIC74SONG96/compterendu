import React from "react";
import { CheckCircle2, XCircle, User, Trash2 } from "lucide-react";

const ORANGE = "#DF7B1A";
const ORANGE_DARK = "#B45E0C";
const CREAM = "#FDFBF6";
const CARD = "#FBF1E3";
const INK = "#3B2B18";

const ROUTINES_PRIERE = new Set(["La prière seul", "La prière avec les autres"]);

const ROUTINE_GROUPS = [
  {
    label: "Prière",
    items: ["La prière seul", "La prière avec les autres"],
  },
  {
    label: "Parole et vie avec Dieu",
    items: [
      "Les rencontres dynamiques quotidiennes avec Dieu",
      "La lecture biblique",
      "Les retraites pour le progrès spirituel",
      "Le jeûne",
    ],
  },
  {
    label: "Engagement et témoignage",
    items: [
      "Les dons à Dieu",
      "La lecture des livres chrétiens",
      "Le témoignage en vue du gagnement d'âmes",
      "Être disciple de Jésus-Christ",
      "L'engagement actif dans l'église locale",
      "Les comptes rendus",
    ],
  },
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

function LigneRoutine({ label, faite, temps }) {
  return (
    <li className="flex items-start gap-2 py-1.5 border-b last:border-0" style={{ borderColor: "#F5E7CF" }}>
      {faite ? (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#4A7C2A" }} />
      ) : (
        <XCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#C9B394" }} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: faite ? INK : "#8A7358" }}>{label}</p>
        {faite && temps && (
          <p className="text-xs font-semibold mt-0.5" style={{ color: ORANGE_DARK }}>Durée : {temps}</p>
        )}
      </div>
      {faite && (
        <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EAF3E2", color: "#4A7C2A" }}>
          Oui
        </span>
      )}
    </li>
  );
}

export function AffichageMembreDisciple({ membre, scoreTotal = 12, onSupprimer = null }) {
  if (!membre?.nom?.trim()) return null;

  const nom = membre.nom.trim();
  const score = ROUTINE_GROUPS.flatMap((g) => g.items).filter((r) => membre.routines?.[r]).length;

  return (
    <article className="rounded-xl overflow-hidden" style={{ border: "1px solid #F0DCBE", backgroundColor: CREAM }}>
      {/* En-tête disciple */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "white", borderBottom: "1px solid #F0DCBE" }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: ORANGE }}>
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base leading-tight">{nom}</p>
          <p className="text-xs mt-0.5" style={{ color: "#8A7358", fontFamily: "system-ui, sans-serif" }}>
            Compte rendu du disciple
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0" style={{ fontFamily: "system-ui, sans-serif" }}>
          {onSupprimer && (
            <button
              type="button"
              onClick={() => onSupprimer(nom)}
              className="text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
              style={{ backgroundColor: "#F9E3DC", color: "#B3402A", border: "1px solid #E8B4A8" }}
              title="Retirer ce membre du rapport"
            >
              <Trash2 className="w-3 h-3" /> Retirer
            </button>
          )}
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: CARD, color: ORANGE_DARK }}>
            {score}/{scoreTotal} routines
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: membre.presence ? "#EAF3E2" : "#F9E3DC",
              color: membre.presence ? "#4A7C2A" : "#B3402A",
            }}>
            {membre.presence ? "Présent à la rencontre" : "Absent à la rencontre"}
          </span>
        </div>
      </div>

      {/* Routines par catégorie */}
      <div className="p-3 space-y-3" style={{ fontFamily: "system-ui, sans-serif" }}>
        {ROUTINE_GROUPS.map((groupe) => {
          const faites = groupe.items.filter((r) => membre.routines?.[r]).length;
          return (
            <div key={groupe.label} className="rounded-lg overflow-hidden" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
              <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: CARD }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>
                  {groupe.label}
                </p>
                <span className="text-xs font-semibold" style={{ color: "#8A7358" }}>
                  {faites}/{groupe.items.length}
                </span>
              </div>
              <ul className="px-3 py-1">
                {groupe.items.map((routine) => {
                  const faite = !!membre.routines?.[routine];
                  const temps = ROUTINES_PRIERE.has(routine)
                    ? formaterTempsPriere(membre.routines_temps?.[routine])
                    : null;
                  return (
                    <LigneRoutine key={routine} label={routine} faite={faite} temps={temps} />
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function scoreMembreFromData(membre) {
  const all = ROUTINE_GROUPS.flatMap((g) => g.items);
  return all.filter((r) => membre.routines?.[r]).length;
}
