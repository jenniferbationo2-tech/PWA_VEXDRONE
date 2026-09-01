// Mode d'acquisition média choisi au lancement d'une mission (voir
// LaunchMissionDialog). Aucun champ backend pour ça (VolCreate/VolUpdate et
// MissionUpdate n'ont rien de prévu pour un tel choix, vérifié contre le
// schéma OpenAPI live) : stockage local uniquement, propre à cet appareil —
// même limite assumée que adminSettings.ts.
export type CaptureMode = "streaming" | "upload";

const KEY_PREFIX = "vexdrone_capture_mode:";

export function getCaptureMode(missionId: string): CaptureMode | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + missionId);
    return raw === "streaming" || raw === "upload" ? raw : null;
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
