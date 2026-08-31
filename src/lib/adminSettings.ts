// Réglages de vol & export par défaut, côté Admin.
//
// Aucun champ backend n'existe pour ça (Entreprise n'a qu'un "nom", voir
// BACKEND_REQUESTS.md §2) : stockage local uniquement, propre à cet appareil.
// Pas synchronisé entre appareils ni entre comptes Admin d'une même
// entreprise — assumé pour cette itération, à revoir si le backend expose un
// jour une vraie ressource EntrepriseSettings.

export type AltitudeUnit = "m" | "ft";
export type SpeedUnit = "kmh" | "kt";
export type ExportFormat = "pdf" | "csv" | "kml";

export interface AdminSettings {
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  timezone: string;
  defaultExportFormat: ExportFormat;
  // Toujours stockée en mètres en interne ; convertie à l'affichage selon
  // altitudeUnit (voir formatAltitude) pour ne pas dupliquer la valeur.
  defaultMaxAltitudeMeters: number;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  altitudeUnit: "m",
  speedUnit: "kmh",
  timezone: "UTC",
  defaultExportFormat: "pdf",
  defaultMaxAltitudeMeters: 120,
};

const STORAGE_KEY = "vexdrone_admin_settings";

export function getAdminSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADMIN_SETTINGS;
    return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADMIN_SETTINGS;
  }
}

export function saveAdminSettings(settings: AdminSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const METERS_PER_FOOT = 0.3048;

export function metersToDisplayAltitude(meters: number, unit: AltitudeUnit): number {
  return unit === "ft" ? Math.round(meters / METERS_PER_FOOT) : Math.round(meters);
}

export function displayAltitudeToMeters(value: number, unit: AltitudeUnit): number {
  return unit === "ft" ? Math.round(value * METERS_PER_FOOT) : Math.round(value);
}

export function formatAltitude(meters: number, unit: AltitudeUnit): string {
  return `${metersToDisplayAltitude(meters, unit)} ${unit}`;
}

const KMH_PER_KNOT = 1.852;

export function formatSpeed(kmh: number, unit: SpeedUnit): string {
  const value = unit === "kt" ? Math.round(kmh / KMH_PER_KNOT) : Math.round(kmh);
  return `${value} ${unit === "kt" ? "kt" : "km/h"}`;
}

export const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "Africa/Ouagadougou", label: "Afrique/Ouagadougou (UTC+0)" },
  { value: "Africa/Abidjan", label: "Afrique/Abidjan (UTC+0)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+1/+2)" },
];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  csv: "CSV",
  kml: "KML",
};
