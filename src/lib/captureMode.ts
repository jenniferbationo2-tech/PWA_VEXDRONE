// Mode d'acquisition média choisi au lancement d'une mission (voir
// LaunchMissionDialog). Envoyé au backend comme `capture_mode` dans
// POST /vols/ (voir startFlight, client.ts) — mais aussi mis en cache ici en
// localStorage, propre à cet appareil, car PhoneCaptureContext doit pouvoir
// relire ce choix localement sans redemander le vol à chaque render.
export type CaptureMode = "streaming" | "differe";

const KEY_PREFIX = "vexdrone_capture_mode:";

export function getCaptureMode(missionId: string): CaptureMode | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + missionId);
    return raw === "streaming" || raw === "differe" ? raw : null;
  } catch {
    return null;
  }
}

export function setCaptureMode(missionId: string, mode: CaptureMode): void {
  try {
    localStorage.setItem(KEY_PREFIX + missionId, mode);
  } catch {
    // Stockage indisponible (navigation privée...) — le mode retombera sur
    // son défaut (streaming pour une mission téléphone), pas bloquant.
  }
}
