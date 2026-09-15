// Source de la caméra pour une mission "streaming" (voir LaunchMissionDialog).
// Volontairement séparé de CaptureMode (captureMode.ts) : CaptureMode est
// envoyé au backend comme `capture_mode` (POST /vols/), qui ne connaît rien
// de "distante" — ce choix reste un concept purement frontend/local, mis en
// cache ici en localStorage comme CaptureMode, propre à cet appareil.
export type CameraSource = "locale" | "distante";

const KEY_PREFIX = "vexdrone_camera_source:";

export function getCameraSource(missionId: string): CameraSource | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + missionId);
    return raw === "locale" || raw === "distante" ? raw : null;
  } catch {
    return null;
  }
}

export function setCameraSource(missionId: string, source: CameraSource): void {
  try {
    localStorage.setItem(KEY_PREFIX + missionId, source);
  } catch {
    // Stockage indisponible (navigation privée...) — retombe sur son défaut
    // (caméra locale), pas bloquant.
  }
}
