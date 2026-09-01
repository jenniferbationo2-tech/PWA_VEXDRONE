import type { Mission, MissionStatus } from "@/lib/api/types";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isPastDate(dateStr: string): boolean {
  const today = startOfDay(new Date());
  return startOfDay(new Date(dateStr)) < today;
}

// "Atteinte" = aujourd'hui a rejoint ou dépassé la date de fin (le jour J compte).
export function hasReachedEndDate(dateFin: string): boolean {
  const today = startOfDay(new Date());
  return startOfDay(new Date(dateFin)) <= today;
}

// Statut affiché : une mission non terminée dont la date de fin est atteinte
// passe automatiquement en "Terminée", sans action manuelle ni écriture serveur.
// Le statut stocké (en_attente / en_cours), lui, ne change que via le bouton
// "Lancer" ou une modification explicite. Une mission "annulee" ne doit
// jamais être promue "Terminée" par cette règle, même après sa date de fin.
export function getEffectiveStatus(mission: Pick<Mission, "status" | "dateFin">): MissionStatus {
  const isTerminal = mission.status === "terminee" || mission.status === "annulee";
  if (!isTerminal && hasReachedEndDate(mission.dateFin)) return "terminee";
  return mission.status;
}

// Mapping badge partagé entre les deux écrans Missions (technicien et admin)
// — une seule source à corriger si un statut change de libellé ou de couleur.
export const MISSION_STATUS_BADGE = {
  en_attente: { variant: "pending", label: "En attente" },
  en_cours: { variant: "active", label: "En cours" },
  terminee: { variant: "neutral", label: "Terminée" },
  annulee: { variant: "neutral", label: "Annulée" },
} as const;

export function formatMissionDateRange(dateDebut: string, dateFin: string): string {
  const d1 = new Date(dateDebut).toLocaleDateString("fr-FR");
  const d2 = new Date(dateFin).toLocaleDateString("fr-FR");
  return dateDebut === dateFin ? d1 : `${d1} → ${d2}`;
}