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
// "Lancer" ou une modification explicite.
export function getEffectiveStatus(mission: Pick<Mission, "status" | "dateFin">): MissionStatus {
  if (mission.status !== "terminee" && hasReachedEndDate(mission.dateFin)) return "terminee";
  return mission.status;
}