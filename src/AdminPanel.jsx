import React, { useMemo, useState } from "react";
import {
  Shield, Users, ClipboardList, Target, HandHeart, RefreshCw,
  ChevronDown, ChevronUp, Filter, UserCircle,
} from "lucide-react";
import { ListeRapports } from "./ListeRapports";

const ORANGE = "#DF7B1A";
const ORANGE_DARK = "#B45E0C";
const CREAM = "#FDFBF6";
const CARD = "#FBF1E3";
const BROWN = "#5C3A10";

export default function AdminPanel({
  rapports, profils, chargement, charger,
  modifier, supprimer, scoreFidelite, scoreMembre,
  currentUserId,
}) {
  const [filtreEglise, setFiltreEglise] = useState("");
  const [filtreChef, setFiltreChef] = useState("");
  const [filtreSemaine, setFiltreSemaine] = useState("");
  const [sousVue, setSousVue] = useState("rapports");
  const [ouverts, setOuverts] = useState({});

  const eglises = useMemo(() => {
    const s = new Set();
    rapports.forEach((r) => { if (r.eglise?.trim()) s.add(r.eglise.trim()); });
    return [...s].sort((a, b) => a.localeCompare(b, "fr"));
  }, [rapports]);

  const chefs = useMemo(() => {
    const s = new Set();
    rapports.forEach((r) => { if (r.chef?.trim()) s.add(r.chef.trim()); });
    return [...s].sort((a, b) => a.localeCompare(b, "fr"));
  }, [rapports]);

  const semaines = useMemo(() => {
    const s = new Set();
    rapports.forEach((r) => { if (r.semaine?.trim()) s.add(r.semaine.trim()); });
    return [...s].sort((a, b) => b.localeCompare(a, "fr"));
  }, [rapports]);

  const rapportsFiltres = useMemo(() => rapports.filter((r) => {
    if (filtreEglise && r.eglise !== filtreEglise) return false;
    if (filtreChef && r.chef !== filtreChef) return false;
    if (filtreSemaine && r.semaine !== filtreSemaine) return false;
    return true;
  }), [rapports, filtreEglise, filtreChef, filtreSemaine]);

  const disciples = useMemo(() => {
    const map = new Map();
    rapportsFiltres.forEach((r) => {
      (r.membres || []).forEach((m) => {
        if (!m.nom?.trim()) return;
        const cle = `${(r.eglise || "").trim().toLowerCase()}|${m.nom.trim().toLowerCase()}`;
        if (!map.has(cle)) {
          map.set(cle, {
            nom: m.nom.trim(),
            eglise: r.eglise || "—",
            chef: r.chef || "—",
            semaine: r.semaine || "—",
            score: scoreMembre(m),
            presence: m.presence,
          });
        }
      });
    });
    return [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [rapportsFiltres, scoreMembre]);

  const chefsActifs = profils.filter((p) => p.role !== "admin");

  const libelleRoleProfil = (role) => {
    if (role === "chef_chambre") return "Chef de chambre";
    return "Chef d'équipe";
  };

  const stats = useMemo(() => {
    const disciplesUniques = new Set();
    rapportsFiltres.forEach((r) => {
      (r.membres || []).forEach((m) => {
        if (m.nom?.trim()) {
          disciplesUniques.add(`${(r.eglise || "").trim().toLowerCase()}|${m.nom.trim().toLowerCase()}`);
        }
      });
    });
    const chefsUniques = new Set(
      rapportsFiltres.map((r) => (r.chef || "").trim().toLowerCase()).filter(Boolean)
    ).size;
    const totalPossibleFid = rapportsFiltres.length * 4;
    const totalFid = rapportsFiltres.reduce((acc, r) => acc + scoreFidelite(r.fidelite), 0);
    return {
      disciples: disciplesUniques.size,
      rapports: rapportsFiltres.length,
      chefs: chefsUniques,
      fidelite: totalPossibleFid ? Math.round((totalFid / totalPossibleFid) * 100) : 0,
    };
  }, [rapportsFiltres, scoreFidelite]);

  const resetFiltres = () => {
    setFiltreEglise("");
    setFiltreChef("");
    setFiltreSemaine("");
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
      <section className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "#2C1810", border: "1px solid #5C3A10" }}>
        <Shield className="w-6 h-6 text-white shrink-0" />
        <div>
          <p className="text-white font-bold text-sm" style={{ fontFamily: "system-ui, sans-serif" }}>
            Plateforme administrateur
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#D4A574" }}>
            Vue globale de tous les chefs d&apos;équipe, rapports et disciples.
          </p>
        </div>
      </section>

      {/* Stats globales */}
      <section className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: ORANGE }}>
        <div className="px-4 pt-4 pb-3" style={{ fontFamily: "system-ui, sans-serif" }}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-sm uppercase tracking-wider">Vue d&apos;ensemble</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { val: stats.disciples, label: "disciples" },
              { val: stats.chefs, label: "chefs actifs" },
              { val: stats.rapports, label: "rapports" },
              { val: `${stats.fidelite}%`, label: "fidélité moy." },
            ].map((s) => (
              <div key={s.label} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                <p className="text-white font-bold text-2xl leading-none">{s.val}</p>
                <p className="text-white/85 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filtres */}
      <section className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: ORANGE_DARK }} />
            <span className="text-sm font-bold" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>Filtres</span>
          </div>
          {(filtreEglise || filtreChef || filtreSemaine) && (
            <button type="button" onClick={resetFiltres} className="text-xs font-semibold" style={{ color: ORANGE_DARK }}>
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" style={{ fontFamily: "system-ui, sans-serif" }}>
          <FiltreSelect label="Église de maison" value={filtreEglise} onChange={setFiltreEglise}
            options={[{ value: "", label: "Toutes" }, ...eglises.map((e) => ({ value: e, label: e }))]} />
          <FiltreSelect label="Chef d'équipe" value={filtreChef} onChange={setFiltreChef}
            options={[{ value: "", label: "Tous" }, ...chefs.map((c) => ({ value: c, label: c }))]} />
          <FiltreSelect label="Semaine" value={filtreSemaine} onChange={setFiltreSemaine}
            options={[{ value: "", label: "Toutes" }, ...semaines.map((s) => ({ value: s, label: s }))]} />
        </div>
      </section>

      {/* Sous-onglets */}
      <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: CARD, fontFamily: "system-ui, sans-serif" }}>
        {[
          { id: "rapports", icone: ClipboardList, label: "Tous les rapports" },
          { id: "disciples", icone: Users, label: "Tous les disciples" },
          { id: "chefs", icone: UserCircle, label: "Chefs d'équipe" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSousVue(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold transition-colors"
            style={{
              backgroundColor: sousVue === t.id ? ORANGE : "transparent",
              color: sousVue === t.id ? "white" : ORANGE_DARK,
            }}
          >
            <t.icone className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={charger} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: ORANGE_DARK, fontFamily: "system-ui, sans-serif" }}>
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {sousVue === "rapports" && (
        <ListeRapports
          rapports={rapportsFiltres}
          ouverts={ouverts}
          setOuverts={setOuverts}
          modifier={modifier}
          supprimer={supprimer}
          scoreFidelite={scoreFidelite}
          scoreMembre={scoreMembre}
          currentUserId={currentUserId}
          canEditAll
          messageVide="Aucun rapport ne correspond aux filtres sélectionnés."
        />
      )}

      {sousVue === "disciples" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #F0DCBE" }}>
          {disciples.length === 0 ? (
            <p className="p-6 text-center text-sm" style={{ color: "#8A7358", fontFamily: "system-ui, sans-serif" }}>
              Aucun disciple trouvé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: "system-ui, sans-serif" }}>
                <thead>
                  <tr style={{ backgroundColor: CARD }}>
                    {["Disciple", "Église", "Chef", "Semaine", "Routines", "Présence"].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {disciples.map((d) => (
                    <tr key={`${d.eglise}|${d.nom}`} className="border-t" style={{ borderColor: "#F5E7CF" }}>
                      <td className="px-3 py-2.5 font-semibold">{d.nom}</td>
                      <td className="px-3 py-2.5">{d.eglise}</td>
                      <td className="px-3 py-2.5">{d.chef}</td>
                      <td className="px-3 py-2.5 text-xs">{d.semaine}</td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: ORANGE_DARK }}>{d.score}/12</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: d.presence ? "#EAF3E2" : "#F9E3DC", color: d.presence ? "#4A7C2A" : "#B3402A" }}>
                          {d.presence ? "Présent" : "Absent"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {sousVue === "chefs" && (
        <div className="space-y-2">
          {chefsActifs.length === 0 ? (
            <p className="p-6 text-center text-sm rounded-xl" style={{ color: "#8A7358", backgroundColor: "white", border: "1px solid #F0DCBE", fontFamily: "system-ui, sans-serif" }}>
              Aucun chef d&apos;équipe inscrit.
            </p>
          ) : (
            chefsActifs.map((p) => {
              const nbRapports = rapports.filter((r) => r.user_id === p.id).length;
              const nbMembres = new Set();
              rapports.filter((r) => r.user_id === p.id).forEach((r) => {
                (r.membres || []).forEach((m) => { if (m.nom?.trim()) nbMembres.add(m.nom.trim().toLowerCase()); });
              });
              return (
                <article key={p.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "white", border: "1px solid #F0DCBE" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                    style={{ backgroundColor: ORANGE, fontFamily: "system-ui, sans-serif" }}>
                    {(p.chef_name || p.email || "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate flex items-center gap-2 flex-wrap">
                      {p.chef_name || "Sans nom"}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: p.role === "chef_chambre" ? "#2C1810" : CARD,
                          color: p.role === "chef_chambre" ? "#FCE3C6" : ORANGE_DARK,
                        }}>
                        {libelleRoleProfil(p.role)}
                      </span>
                    </p>
                    <p className="text-xs truncate" style={{ color: "#8A7358" }}>
                      {p.eglise_maison ? `Église ${p.eglise_maison} · ` : ""}{p.email}
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-xs" style={{ fontFamily: "system-ui, sans-serif" }}>
                    <p className="font-bold" style={{ color: ORANGE_DARK }}>{nbRapports} rapport{nbRapports > 1 ? "s" : ""}</p>
                    <p style={{ color: "#8A7358" }}>{nbMembres.size} disciple{nbMembres.size > 1 ? "s" : ""}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function FiltreSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ORANGE_DARK }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{ border: "1px solid #E8D5B8", backgroundColor: CREAM }}
      >
        {options.map((o) => (
          <option key={o.value || "__all__"} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
