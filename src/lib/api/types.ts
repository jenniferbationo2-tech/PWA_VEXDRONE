/**
 * Contrat de données VEXDRON — PROPOSITION à valider avec le backend (FastAPI).
 *
 * Ces types sont déduits des maquettes (Dashboard, Missions, Vols, IA & Anomalies,
 * Carte, Rapports) et de l'architecture technique (PostgreSQL + PostGIS).
 * Objectif : servir de base de discussion pour le contrat OpenAPI réel.
 * Une fois le schéma FastAPI généré, on pourra remplacer ce fichier par des types
 * auto-générés (ex: openapi-typescript) sans changer le reste du code.
 */

export type Severity = "eleve" | "moyen" | "faible";
export type AnomalyStatus = "non_traitee" | "traitee";
export type MissionStatus = "en_attente" | "en_cours" | "terminee";
export type FlightStatus = "en_attente" | "en_cours" | "terminee";
export type CaptureDevice = "appareil_photo" | "drone";
export type DroneStatus = "disponible" | "en_vol" | "maintenance" | "hors_service";

export interface Drone {
  id: string;
  identifiant: string;
  modele: string;
  status: DroneStatus;
}

export type EntrepriseStatus = "active" | "bloquee";
export type PlatformRole = "super_admin" | "admin" | "technicien";

export interface Entreprise {
  id: string;
  nom: string;
  status: EntrepriseStatus;
  createdAt: string;
}

// Compte tel que renvoyé par GET /users/ (superadmin) — pas le profil
// courant (voir User dans AuthContext.tsx, forme différente).
export interface PlatformUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: PlatformRole;
  entrepriseId?: string;
}

// Payload pour créer un ADMIN d'entreprise (POST /users/, role forcé côté
// appelant) — le rôle utilisateur (technicien) se crée via /users/team côté
// admin, pas ici.
export interface NewAdminInput {
  name: string;
  username: string;
  email: string;
  password: string;
  entrepriseId: string;
}

export interface Anomaly {
  id: string;
  type: string;
  zone: string;
  confidence: number;
  severity: Severity;
  status: AnomalyStatus;
  detectedAt: string;
  gps: { lat: number; lng: number };
  missionId: string;
  imageUrl?: string;
  // Normalisee 0-1 (fraction de la largeur/hauteur de l'image), telle que
  // renvoyee par le modele IA — voir bbox_x/y/largeur/hauteur cote backend.
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface Mission {
  id: string;
  name: string;
  zone: string;
  dateDebut: string; // ISO 8601 (date seule, ex: "2026-08-20")
  dateFin: string; // ISO 8601
  description: string;
  status: MissionStatus;
  // Fixé à la création, jamais modifiable ensuite (aucun champ appareil dans
  // le PATCH côté API) — voir NewMissionModal.
  appareil: CaptureDevice;
  droneId?: string;
}

// Payload envoyé à la création — l'id et le status sont calculés/attribués ailleurs
export type NewMissionInput = Omit<Mission, "id">;

export interface Flight {
  id: string;
  missionId: string;
  status: FlightStatus;
  altitude: number;
  battery: number;
  imagesCaptured: number;
  gps: { lat: number; lng: number };
  droneConnection: "wifi" | "4g" | "hors_ligne";
}

export interface Report {
  id: string;
  missionId: string;
  missionName: string;
  zone: string;
  date: string;
  anomaliesCount: number;
  pdfUrl: string;
}

export type MediaAnalysisStatus = "attente" | "en_cours" | "terminee" | "echouee";

export interface MediaAnalysisJob {
  id: string;
  status: MediaAnalysisStatus;
  progress: number; // 0-100
  fileCount: number;
  errorMessage?: string;
}

export interface DashboardSummary {
  flightsToday: number;
  flightsTodayDelta: number;
  criticalAlerts: number;
  criticalAlertsDelta: number;
  fleetAvailability: number;
  fleetActive: number;
  fleetTotal: number;
  anomaliesResolved: number;
  anomaliesResolvedTotal: number;
  anomaliesTrend: { date: string; count: number }[];
  severityBreakdown: { severity: Severity; count: number }[];
  recentAlerts: Anomaly[];
}