import type { MissionStatus } from "@/lib/api/types";

export function computeMissionStatus(dateDebut: string, dateFin: string): MissionStatus {
  const today = startOfDay(new Date());
  const debut = startOfDay(new Date(dateDebut));
  const fin = startOfDay(new Date(dateFin));

  if (debut > today) return "en_attente";
  if (fin < today) return "terminee";
  return "en_cours";
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isPastDate(dateStr: string): boolean {
  const today = startOfDay(new Date());
  return startOfDay(new Date(dateStr)) < today;
}