// Mission dont "Résultat analyse" (Anomalies.tsx) affiche les résultats.
// Mis à jour uniquement au lancement d'une mission (bouton "Lancer" dans
// Missions.tsx) — jamais à sa clôture ni son annulation — pour que les
// résultats restent consultables tant qu'aucune nouvelle mission n'a
// démarré. Stocké en localStorage, propre à cet appareil (même convention
// que captureMode.ts).
const KEY = "vexdrone_current_mission";

export function getCurrentMissionId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCurrentMissionId(missionId: string): void {
  try {
    localStorage.setItem(KEY, missionId);
  } catch {
    // Stockage indisponible (navigation privée...) — pas bloquant, le
    // tableau retombera sur son fallback (mission la plus récente).
  }
}
