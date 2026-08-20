import type { Report } from "./api/types";

// Règle métier : au-delà de ce seuil, les rapports les plus anciens
// basculent automatiquement en archives (jamais supprimés).
export const MAX_ACTIVE_REPORTS = 15;

export function partitionReports(reports: Report[]): { active: Report[]; archived: Report[] } {
  const sorted = [...reports].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return {
    active: sorted.slice(0, MAX_ACTIVE_REPORTS),
    archived: sorted.slice(MAX_ACTIVE_REPORTS),
  };
}
