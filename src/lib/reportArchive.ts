import type { Report } from "./api/types";

// Règle métier : au-delà de ce seuil, les rapports les plus anciens
// basculent automatiquement en archives (jamais supprimés).
export const MAX_ACTIVE_REPORTS = 15;

function toTime(value: string | undefined): number {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

// Tri "dernier rapport généré en premier" : completedAt (horodatage de
// clôture de la mission) prime sur r.date, qui n'est que la date PLANIFIÉE de
// la mission — une mission prévue il y a 10 jours mais terminée à l'instant
// doit quand même arriver en tête (et ne jamais tomber direct en archives).
export function partitionReports(
  reports: Report[],
  completedAt: (r: Report) => string | undefined = () => undefined
): { active: Report[]; archived: Report[] } {
  const sorted = [...reports].sort(
    (a, b) =>
      toTime(completedAt(b) ?? b.date) - toTime(completedAt(a) ?? a.date) ||
      b.date.localeCompare(a.date) ||
      a.id.localeCompare(b.id)
  );
  return {
    active: sorted.slice(0, MAX_ACTIVE_REPORTS),
    archived: sorted.slice(MAX_ACTIVE_REPORTS),
  };
}
