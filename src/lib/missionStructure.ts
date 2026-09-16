// Identifiant de structure/pylône inspecté(e) (ex. "P-114 / Tronçon B"),
// affiché sur le rapport de mission (voir pages/reports/MissionReportPrint.tsx)
// mais absent du modèle Mission côté backend (voir BACKEND_REQUESTS.md §8) —
// saisi et conservé ici en localStorage, propre à cet appareil, en attendant
// un vrai champ persisté côté API. Un seul identifiant par mission pour cette
// itération (le champ backend proposé pourrait être plus fin, par anomalie).
const KEY_PREFIX = "vexdrone_mission_structure:";

export function getMissionStructure(missionId: string): string {
  try {
    return localStorage.getItem(KEY_PREFIX + missionId) ?? "";
  } catch {
    return "";
  }
}

export function setMissionStructure(missionId: string, value: string): void {
  try {
    if (value.trim() === "") {
      localStorage.removeItem(KEY_PREFIX + missionId);
    } else {
      localStorage.setItem(KEY_PREFIX + missionId, value);
    }
  } catch {
    // Stockage indisponible (navigation privée...) — le champ retombera sur
    // "non renseigné" côté rapport, pas bloquant pour l'impression.
  }
}
