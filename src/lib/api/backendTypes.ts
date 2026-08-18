// Types bruts tels que renvoyés par le backend FastAPI (VEXDRONE).
// Ne pas utiliser directement dans les composants — passer par mappers.ts.

export interface BackendMission {
  uuid: string;
  titre: string;
  zone: string;
  date_mission: string;
  statut: "planifiee" | "en_cours" | "terminee" | "annulee";
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BackendAnomaly {
  uuid: string;
  image_uuid: string;
  type_anomalie: string;
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

export interface BackendImage {
  uuid: string;
  mission_uuid: string;
  chemin_fichier: string;
  latitude: number | null;
  longitude: number | null;
  date_capture: string | null;
  statut_analyse: string;
}