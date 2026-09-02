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
export type MissionStatus = "en_attente" | "en_cours" | "terminee" | "annulee";
export type FlightStatus = "en_attente" | "en_cours" | "terminee";
export type CaptureDevice = "appareil_photo" | "drone";
export type DroneStatus = "disponible" | "en_vol" | "maintenance" | "hors_service";

export interface Drone {
  id: string;
  identifiant: string;
  modele: string;
  status: DroneStatus;
}

// Payload d'ajout d'un drone à la flotte — statut fixé à "disponible" par
// défaut côté API, pas besoin de le proposer à la création.
export interface NewDroneInput {
  identifiant: string;
  modele?: string;
}

export type EntrepriseStatus = "active" | "bloquee";
export type PlatformRole = "super_admin" | "admin" | "technicien";

export interface Entreprise {
  id: string;
  nom: string;
  status: EntrepriseStatus;
  createdAt: string;
}

// Compte tel que renvoyé par GET /users/ (superadmin) ou GET /users/team
// (admin) — pas le profil courant (voir User dans AuthContext.tsx, forme
// différente).
export interface PlatformUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: PlatformRole;
  entrepriseId?: string;
  isDeleted: boolean;
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

// Payload de création d'un technicien via POST /users/team — l'entreprise et
// le rôle sont forcés côté serveur à partir du compte Admin appelant, jamais
// dans le corps de la requête.
export interface NewTeamMemberInput {
  name: string;
  username: string;
  email: string;
  password: string;
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
  // Id (numérique côté API, string ici — même convention que PlatformUser.id)
  // du technicien propriétaire. Absent des payloads de création : la mission
  // appartient toujours à l'appelant, jamais choisi explicitement.
  userId?: string;
}

// Payload envoyé à la création — l'id et le status sont calculés/attribués ailleurs
export type NewMissionInput = Omit<Mission, "id" | "userId">;

// Forme générique des listes paginées de l'API (voir PaginatedListResponse[T]
// côté OpenAPI) — utilisé là où la pagination est réellement exploitée
// (GET /missions/entreprise), contrairement au reste du POC qui charge tout
// d'un coup avec un items_per_page large.
export interface Paginated<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  itemsPerPage: number;
}

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

// Statut d'analyse IA d'une image (BackendImage.statut_analyse) — seule
// source de verite pour savoir si une image a ete effectivement verifiee :
// ne jamais deduire cet etat de la reussite/echec de l'appel analyzeImage()
// lui-meme, qui ne fait que declencher l'analyse (voir client.ts, doc backend §6.2).
export type ImageAnalysisStatus = "en_attente" | "en_cours" | "analysee" | "echec";

export interface MissionImage {
  id: string;
  url: string;
  missionId: string;
  analysisStatus: ImageAnalysisStatus;
  capturedAt: string;
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
  // Nombre d'images de ce lot qui n'ont pas atteint le statut "analysee"
  // malgre les relances (voir waitForImagesResolved) — un job "terminee"
  // avec failedCount > 0 doit rester nuance cote UI, pas un succes plein.
  failedCount?: number;
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