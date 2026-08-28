// Types bruts tels que renvoyés par le backend FastAPI (VEXDRONE).
// Ne pas utiliser directement dans les composants — passer par mappers.ts.

export interface BackendMission {
  uuid: string;
  titre: string;
  zone: string;
  date_debut: string;
  date_fin: string;
  // Choix du dispositif de capture, fixé à la création (pas de champ dans le
  // PATCH, confirmé sur MissionUpdate). drone_uuid est obligatoire si "drone",
  // doit être absent sinon — voir missionPayload dans client.ts.
  appareil: "appareil_photo" | "drone";
  drone_uuid: string | null;
  statut: "planifiee" | "en_cours" | "terminee" | "annulee";
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

// Les 9 classes réelles du modèle IA (doc backend du 22/08/2026, §6.1) — les
// anciennes valeurs (fissure, vegetation, isolateur_endommage, cable_deteriore,
// structure_inclinee) ne sont plus renvoyées par l'API.
export type BackendAnomalyType =
  | "isolateur_casse"
  | "corrosion"
  | "antenne_endommagee"
  | "broken_tower"
  | "broken_cable"
  | "vegetation_cautious"
  | "vegetation_critical"
  | "vegetation_low"
  | "autre";

export interface BackendAnomaly {
  uuid: string;
  image_uuid: string;
  type_anomalie: BackendAnomalyType;
  confiance: number;
  bbox_x: number;
  bbox_y: number;
  bbox_largeur: number;
  bbox_hauteur: number;
  gravite: "faible" | "moyenne" | "elevee" | "critique";
  statut_notification: string;
  commentaire: string | null;
  validee_par_humain: boolean;
  created_at: string;
}

export interface BackendDashboardStats {
  flights_today: number;
  fleet_total: number;
  fleet_active: number;
  fleet_availability: number;
  critical_alerts_delta: number;
}

export interface BackendVol {
  uuid: string;
  mission_uuid: string;
  statut: "en_attente" | "en_cours" | "terminee";
  altitude: number;
  batterie: number;
  images_capturees: number;
  latitude: number | null;
  longitude: number | null;
  connexion_drone: "wifi" | "4g" | "hors_ligne";
  created_at: string;
  updated_at: string | null;
}

export interface BackendReport {
  mission_uuid: string;
  titre: string;
  zone: string;
  date_mission: string;
  nombre_anomalies: number;
  pdf_url: string | null;
}

export interface BackendDrone {
  uuid: string;
  identifiant: string;
  modele: string | null;
  statut: "disponible" | "en_vol" | "maintenance" | "hors_service";
  created_at: string;
  updated_at: string | null;
}

export interface BackendEntreprise {
  uuid: string;
  nom: string;
  statut: "active" | "bloquee";
  is_deleted: boolean;
  created_at: string;
  updated_at: string | null;
}

// UserRead (GET /users/, superadmin) — pas UserMeRead, forme différente
// (voir lib/Auth/AuthContext.tsx pour le profil du user courant).
export interface BackendPlatformUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: "superadmin" | "admin" | "utilisateur";
  entreprise_id: string | null;
}

export interface BackendImage {
  uuid: string;
  mission_uuid: string;
  chemin_fichier: string;
  latitude: number | null;
  longitude: number | null;
  date_capture: string | null;
  statut_analyse: string;
}